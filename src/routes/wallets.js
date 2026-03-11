const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { syncWallets } = require('../jobs/walletSync');
const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const wallets = await prisma.walletAddress.findMany({
      where: { portfolio: { userId: req.session.userId } },
      include: { portfolio: { select: { id: true, name: true } } }
    });
    res.json(wallets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { portfolioId } = req.body;
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userId: req.session.userId }
    });
    if (!portfolio) return res.status(403).json({ error: 'Forbidden' });
    const wallet = await prisma.walletAddress.create({ data: req.body });
    res.json(wallet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sync', async (req, res) => {
  try {
    await syncWallets();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const wallet = await prisma.walletAddress.findUnique({
      where: { id: req.params.id },
      select: { portfolio: { select: { userId: true } } }
    });
    if (!wallet || wallet.portfolio.userId !== req.session.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await prisma.walletAddress.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
