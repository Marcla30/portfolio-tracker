const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { syncWallets } = require('../jobs/walletSync');
const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const wallets = await prisma.walletAddress.findMany({
      include: { portfolio: true }
    });
    res.json(wallets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const wallet = await prisma.walletAddress.create({
      data: req.body
    });
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
    await prisma.walletAddress.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
