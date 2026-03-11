const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { resolveSteamId, fetchSteamInventory, fetchSteamProfileName } = require('../services/cs2Service');
const { fetchCS2BulkPrices, getExchangeRate } = require('../services/priceService');

const prisma = new PrismaClient();

// GET /api/cs2/preview
router.get('/preview', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Missing url parameter' });
    const steamId = await resolveSteamId(url);
    const skins = await fetchSteamInventory(steamId);
    res.json({ steamId, count: skins.length, skins });
  } catch (error) {
    console.error('CS2 preview error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/cs2/import — SSE stream
router.post('/import', async (req, res) => {
  const userId = req.session.userId;
  const { steamId, steamUrl, portfolioId, currency = 'EUR', minValue = 1 } = req.body;

  if (!steamId || !portfolioId) return res.status(400).json({ error: 'Missing steamId or portfolioId' });

  const portfolio = await prisma.portfolio.findFirst({ where: { id: portfolioId, userId } });
  if (!portfolio) return res.status(403).json({ error: 'Portfolio not found or access denied' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const profileName = await fetchSteamProfileName(steamId);
    await prisma.steamProfile.upsert({
      where: { userId_steamId: { userId, steamId } },
      create: { userId, steamId, steamUrl: steamUrl || null, profileName, portfolioId, currency, minValue },
      update: { steamUrl: steamUrl || null, profileName, portfolioId, currency, minValue }
    });

    const skins = await fetchSteamInventory(steamId);
    const total = skins.length;

    const [bulkPrices, rate] = await Promise.all([
      fetchCS2BulkPrices(),
      getExchangeRate('USD', currency)
    ]);

    const importNotes = `Steam import:${steamId}`;

    // Pre-load existing data to avoid per-skin DB lookups
    const [existingTxRows, existingHoldingRows] = await Promise.all([
      prisma.transaction.findMany({
        where: { portfolioId, notes: importNotes },
        select: { assetId: true }
      }),
      prisma.holding.findMany({
        where: { portfolioId },
        select: { id: true, assetId: true, quantity: true, avgPrice: true }
      })
    ]);
    const existingTxAssetIds = new Set(existingTxRows.map(t => t.assetId));
    const holdingsMap = new Map(existingHoldingRows.map(h => [h.assetId, h]));

    const results = { imported: 0, skipped: 0, noPrice: 0, belowMin: 0 };
    const noPriceList = [];

    for (let i = 0; i < skins.length; i++) {
      const { marketHashName, count, iconUrl } = skins[i];
      res.write(`data: ${JSON.stringify({ current: i + 1, total, skinName: marketHashName })}\n\n`);

      const priceUsd = bulkPrices.get(marketHashName) || 0;
      if (priceUsd === 0) { noPriceList.push(marketHashName); results.noPrice++; continue; }
      const price = priceUsd * rate;
      if (price * count < minValue) { results.belowMin++; continue; }

      // Upsert asset (1 query instead of find + conditional create)
      const asset = await prisma.asset.upsert({
        where: { symbol: marketHashName },
        create: { symbol: marketHashName, name: marketHashName, type: 'cs2skin', logoUrl: iconUrl || null },
        update: {}
      });

      // Anti-duplicate check from in-memory set (0 DB queries)
      if (existingTxAssetIds.has(asset.id)) { results.skipped++; continue; }

      await prisma.transaction.create({
        data: { portfolioId, assetId: asset.id, type: 'buy', quantity: count, pricePerUnit: price, fees: 0, currency, date: new Date(), notes: importNotes }
      });

      // Holding update using pre-loaded map (0 DB queries for lookup)
      const holding = holdingsMap.get(asset.id);
      if (holding) {
        const existingQty = parseFloat(holding.quantity);
        const newQty = existingQty + count;
        const newAvg = ((existingQty * parseFloat(holding.avgPrice)) + (count * price)) / newQty;
        await prisma.holding.update({ where: { id: holding.id }, data: { quantity: newQty, avgPrice: newAvg } });
        holdingsMap.set(asset.id, { ...holding, quantity: String(newQty), avgPrice: String(newAvg) });
      } else {
        await prisma.holding.create({ data: { portfolioId, assetId: asset.id, quantity: count, avgPrice: price, currency } });
        holdingsMap.set(asset.id, { assetId: asset.id, quantity: String(count), avgPrice: String(price) });
      }

      results.imported++;
    }

    const ignoredCount = results.noPrice + results.skipped;
    const ignoredAssets = [
      ...noPriceList.map(n => `${n} — prix introuvable`),
      ...(results.skipped > 0 ? [`${results.skipped} skin(s) déjà importé(s)`] : [])
    ];
    try {
      await prisma.$executeRaw`
        INSERT INTO "ImportHistory" (id, "portfolioId", "fileName", "totalRows", "successCount", "ignoredCount", "errorCount", "ignoredAssets", errors, "createdAt")
        VALUES (gen_random_uuid()::text, ${portfolioId}, ${'Steam: ' + steamId}, ${total}, ${results.imported}, ${ignoredCount}, ${0}, ${JSON.stringify(ignoredAssets)}::jsonb, ${JSON.stringify([])}::jsonb, NOW())
      `;
    } catch (e) {
      console.error('Failed to save import history:', e.message);
    }

    res.write(`data: ${JSON.stringify({ done: true, results })}\n\n`);
    res.end();
  } catch (error) {
    console.error('CS2 import error:', error.message);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// GET /api/cs2/profiles
router.get('/profiles', async (req, res) => {
  try {
    const userId = req.session.userId;
    const [profiles, portfolios] = await Promise.all([
      prisma.steamProfile.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } }),
      prisma.portfolio.findMany({ where: { userId } })
    ]);
    const portfolioMap = Object.fromEntries(portfolios.map(p => [p.id, p.name]));
    res.json(profiles.map(p => ({ ...p, portfolioName: p.portfolioId ? (portfolioMap[p.portfolioId] || null) : null })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/cs2/resync — SSE stream
router.post('/resync', async (req, res) => {
  const userId = req.session.userId;
  const { steamId, portfolioId, currency = 'EUR', minValue = 1 } = req.body;

  if (!steamId || !portfolioId) return res.status(400).json({ error: 'Missing steamId or portfolioId' });

  const portfolio = await prisma.portfolio.findFirst({ where: { id: portfolioId, userId } });
  if (!portfolio) return res.status(403).json({ error: 'Portfolio not found or access denied' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const profileName = await fetchSteamProfileName(steamId);
    await prisma.steamProfile.upsert({
      where: { userId_steamId: { userId, steamId } },
      create: { userId, steamId, portfolioId, currency, minValue, profileName },
      update: { portfolioId, currency, minValue, profileName }
    });

    const skins = await fetchSteamInventory(steamId);
    const total = skins.length;
    const [bulkPrices, rate] = await Promise.all([fetchCS2BulkPrices(), getExchangeRate('USD', currency)]);

    // Pre-load all holdings for this portfolio
    const existingHoldingRows = await prisma.holding.findMany({
      where: { portfolioId },
      select: { id: true, assetId: true, quantity: true, avgPrice: true }
    });
    const holdingsMap = new Map(existingHoldingRows.map(h => [h.assetId, h]));

    const results = { imported: 0, skipped: 0, belowMin: 0, noPrice: 0 };

    for (let i = 0; i < skins.length; i++) {
      const { marketHashName, count, iconUrl } = skins[i];
      res.write(`data: ${JSON.stringify({ current: i + 1, total, skinName: marketHashName })}\n\n`);

      const priceUsd = bulkPrices.get(marketHashName) || 0;
      if (priceUsd === 0) { results.noPrice++; continue; }
      const price = priceUsd * rate;

      const asset = await prisma.asset.upsert({
        where: { symbol: marketHashName },
        create: { symbol: marketHashName, name: marketHashName, type: 'cs2skin', logoUrl: iconUrl || null },
        update: {}
      });

      // Delta from pre-loaded map (0 DB queries)
      const holding = holdingsMap.get(asset.id);
      const holdingQty = holding ? parseFloat(holding.quantity) : 0;
      const delta = count - holdingQty;
      if (delta <= 0) { results.skipped++; continue; }
      if (price * delta < minValue) { results.belowMin++; continue; }

      await prisma.transaction.create({
        data: { portfolioId, assetId: asset.id, type: 'buy', quantity: delta, pricePerUnit: price, fees: 0, currency, date: new Date(), notes: `Steam resync:${steamId}` }
      });

      if (holding) {
        const newQty = holdingQty + delta;
        const newAvg = (holdingQty * parseFloat(holding.avgPrice) + delta * price) / newQty;
        await prisma.holding.update({ where: { id: holding.id }, data: { quantity: newQty, avgPrice: newAvg } });
        holdingsMap.set(asset.id, { ...holding, quantity: String(newQty), avgPrice: String(newAvg) });
      } else {
        await prisma.holding.create({ data: { portfolioId, assetId: asset.id, quantity: delta, avgPrice: price, currency } });
        holdingsMap.set(asset.id, { assetId: asset.id, quantity: String(delta), avgPrice: String(price) });
      }

      results.imported++;
    }

    res.write(`data: ${JSON.stringify({ done: true, results })}\n\n`);
    res.end();
  } catch (error) {
    console.error('CS2 resync error:', error.message);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

module.exports = router;
