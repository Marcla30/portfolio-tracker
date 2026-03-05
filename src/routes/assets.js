const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { getCurrentPrice } = require('../services/priceService');
const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const assets = await prisma.asset.findMany();
    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id: req.params.id },
      include: { transactions: { orderBy: { date: 'desc' } } }
    });
    res.json(asset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const asset = await prisma.asset.create({ data: req.body });
    res.json(asset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/price', async (req, res) => {
  try {
    const asset = await prisma.asset.findUnique({ where: { id: req.params.id } });
    const price = await getCurrentPrice(asset, req.query.currency || 'EUR');
    res.json({ price });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
