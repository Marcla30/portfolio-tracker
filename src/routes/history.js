const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const { portfolioId, timeframe = '30d', currency = 'EUR' } = req.query;

    // Auth check: verify portfolio ownership
    if (portfolioId) {
      const portfolio = await prisma.portfolio.findFirst({
        where: { id: portfolioId, userId: req.session.userId },
        select: { id: true }
      });
      if (!portfolio) return res.status(403).json({ error: 'Forbidden' });
    }

    const userPortfolios = await prisma.portfolio.findMany({
      where: { userId: req.session.userId },
      select: { id: true }
    });
    const portfolioIds = userPortfolios.map(p => p.id);
    const where = portfolioId ? { portfolioId } : { portfolioId: { in: portfolioIds } };

    const transactions = await prisma.transaction.findMany({
      where,
      select: {
        assetId: true, type: true, quantity: true, date: true,
        asset: { select: { id: true, symbol: true, type: true } }
      },
      orderBy: { date: 'asc' }
    });

    if (transactions.length === 0) {
      return res.json({ labels: [], data: [] });
    }

    const now = new Date();
    const startDate = getStartDate(timeframe);
    const dataPoints = getDataPoints(timeframe);

    // Pre-load ALL price cache entries for relevant assets in ONE query
    // Extend the range by 7 days back to cover the 7-day lookback window
    const assetIds = [...new Set(transactions.map(t => t.assetId))];
    const allCachedPrices = await prisma.priceCache.findMany({
      where: {
        assetId: { in: assetIds },
        currency,
        timestamp: {
          gte: new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000),
          lte: now
        }
      },
      select: { assetId: true, price: true, timestamp: true },
      orderBy: { timestamp: 'desc' }
    });

    // Build in-memory map: assetId -> sorted array of { timestamp, price }
    const priceMap = new Map();
    for (const p of allCachedPrices) {
      if (!priceMap.has(p.assetId)) priceMap.set(p.assetId, []);
      priceMap.get(p.assetId).push({ timestamp: p.timestamp, price: parseFloat(p.price) });
    }

    // Synchronous price lookup — no DB calls in the loop
    function getCachedPrice(assetId, date) {
      const prices = priceMap.get(assetId);
      if (!prices) return null;
      const cutoff = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000);
      return prices.find(p => p.timestamp <= date && p.timestamp >= cutoff)?.price ?? null;
    }

    // Fallback: latest available price for an asset (for the current point)
    function getLatestCachedPrice(assetId) {
      const prices = priceMap.get(assetId);
      return prices?.[0]?.price ?? 0;
    }

    const labels = [];
    const data = [];

    for (let i = 0; i <= dataPoints; i++) {
      const pointDate = new Date(startDate.getTime() + (now - startDate) * i / dataPoints);

      const txUpToPoint = transactions.filter(t => new Date(t.date) <= pointDate);

      const holdings = {};
      for (const tx of txUpToPoint) {
        if (!holdings[tx.assetId]) holdings[tx.assetId] = { quantity: 0, asset: tx.asset };
        if (tx.type === 'buy')  holdings[tx.assetId].quantity += parseFloat(tx.quantity);
        else if (tx.type === 'sell') holdings[tx.assetId].quantity -= parseFloat(tx.quantity);
      }

      let totalValue = 0;
      for (const assetId in holdings) {
        if (holdings[assetId].quantity > 0) {
          const price = getCachedPrice(assetId, pointDate) ?? getLatestCachedPrice(assetId);
          totalValue += holdings[assetId].quantity * price;
        }
      }

      labels.push(formatLabel(pointDate, timeframe));
      data.push(totalValue);
    }

    res.json({ labels, data });
  } catch (error) {
    console.error('Portfolio history error:', error);
    res.status(500).json({ error: error.message });
  }
});

function getStartDate(timeframe) {
  const now = new Date();
  switch (timeframe) {
    case '24h': return new Date(now - 24 * 60 * 60 * 1000);
    case '7d':  return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case '30d': return new Date(now - 30 * 24 * 60 * 60 * 1000);
    case '1y':  return new Date(now - 365 * 24 * 60 * 60 * 1000);
    case 'all': return new Date(now - 730 * 24 * 60 * 60 * 1000);
    default:    return new Date(now - 30 * 24 * 60 * 60 * 1000);
  }
}

function getCronIntervalMinutes() {
  const expr = (process.env.PRICE_SNAPSHOT_INTERVAL || '*/30 * * * *').trim();
  const everyN = expr.match(/^\*\/(\d+)\s/);
  if (everyN) return parseInt(everyN[1]);
  if (/^0\s+\*/.test(expr)) return 60;
  return 30;
}

function getDataPoints(timeframe) {
  switch (timeframe) {
    case '24h': return Math.round(24 * 60 / getCronIntervalMinutes());
    case '7d':  return 14;
    case '30d': return 30;
    case '1y':  return 52;
    case 'all': return 100;
    default:    return 30;
  }
}

function formatLabel(date, timeframe) {
  if (timeframe === '24h') {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } else if (timeframe === '7d' || timeframe === '30d') {
    return date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
  } else {
    return date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
  }
}

module.exports = router;
