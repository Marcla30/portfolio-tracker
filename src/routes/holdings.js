const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { getCurrentPrice } = require('../services/priceService');
const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const where = {};
    if (req.query.portfolioId) where.portfolioId = req.query.portfolioId;
    
    const holdings = await prisma.holding.findMany({
      where,
      include: { asset: true, portfolio: true }
    });

    const enriched = await Promise.all(holdings.map(async h => {
      const price = await getCurrentPrice(h.asset, req.query.currency || 'EUR');
      const value = parseFloat(h.quantity) * price;
      return { ...h, currentPrice: price, currentValue: value };
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { quantity, avgPrice } = req.body;
    const updated = await prisma.holding.update({
      where: { id: req.params.id },
      data: { quantity, avgPrice }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const holding = await prisma.holding.findUnique({ 
      where: { id: req.params.id },
      include: { asset: true }
    });
    
    // Delete all transactions for this asset and portfolio
    await prisma.transaction.deleteMany({
      where: {
        assetId: holding.assetId,
        portfolioId: holding.portfolioId
      }
    });
    
    // Delete the holding
    await prisma.holding.delete({ where: { id: req.params.id } });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
