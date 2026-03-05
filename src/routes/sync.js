const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

router.post('/sync', async (req, res) => {
  try {
    // Get all transactions
    const transactions = await prisma.transaction.findMany({
      orderBy: { date: 'asc' }
    });

    // Delete all holdings
    await prisma.holding.deleteMany();

    // Recalculate holdings from transactions
    const holdingsMap = new Map();

    for (const tx of transactions) {
      const key = `${tx.portfolioId}-${tx.assetId}`;
      
      if (!holdingsMap.has(key)) {
        holdingsMap.set(key, {
          portfolioId: tx.portfolioId,
          assetId: tx.assetId,
          quantity: 0,
          totalCost: 0
        });
      }

      const holding = holdingsMap.get(key);

      if (tx.type === 'buy') {
        holding.totalCost += parseFloat(tx.quantity) * parseFloat(tx.pricePerUnit);
        holding.quantity += parseFloat(tx.quantity);
      } else if (tx.type === 'sell') {
        holding.quantity -= parseFloat(tx.quantity);
      }
    }

    // Create new holdings
    for (const [key, data] of holdingsMap) {
      if (data.quantity > 0) {
        await prisma.holding.create({
          data: {
            portfolioId: data.portfolioId,
            assetId: data.assetId,
            quantity: data.quantity,
            avgPrice: data.totalCost / data.quantity
          }
        });
      }
    }

    res.json({ success: true, message: 'Holdings synchronized' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
