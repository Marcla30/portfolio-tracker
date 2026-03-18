const express = require('express');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { getCurrentPrice } = require('../services/priceService');
const { getHistoricalPrice } = require('../services/historicalPriceService');
const router = express.Router();
const prisma = new PrismaClient();

// Search endpoint for Yahoo Finance stocks/ETFs
router.get('/search', async (req, res) => {
  try {
    const { q, type } = req.query;
    if (!q || q.length < 2) {
      return res.json({ quotes: [] });
    }

    const yahooUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0`;
    const response = await axios.get(yahooUrl, { timeout: 10000 });

    // Filter by type if specified
    let quotes = response.data.quotes || [];
    if (type === 'stock') {
      quotes = quotes.filter(q => q.quoteType === 'EQUITY');
    } else if (type === 'etf') {
      quotes = quotes.filter(q => q.quoteType === 'ETF');
    }

    res.json({ quotes });
  } catch (error) {
    console.error('Yahoo Finance search error:', error.message);
    res.status(500).json({ error: 'Search failed', quotes: [] });
  }
});

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
    const currency = req.query.currency || 'EUR';
    // Validate currency code format
    if (!/^[A-Z]{3}$/.test(currency)) {
      return res.status(400).json({ error: 'Invalid currency code. Must be 3-letter ISO code (e.g. EUR, USD)' });
    }
    const asset = await prisma.asset.findUnique({ where: { id: req.params.id } });
    const price = await getCurrentPrice(asset, currency);
    res.json({ price });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/historical-price', async (req, res) => {
  try {
    const { date, currency = 'EUR' } = req.query;
    if (!date) return res.status(400).json({ error: 'date required' });
    // Validate currency code format
    if (!/^[A-Z]{3}$/.test(currency)) {
      return res.status(400).json({ error: 'Invalid currency code. Must be 3-letter ISO code (e.g. EUR, USD)' });
    }
    const asset = await prisma.asset.findUnique({ where: { id: req.params.id } });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    const price = await getHistoricalPrice(asset, new Date(date), currency);
    res.json({ price });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
