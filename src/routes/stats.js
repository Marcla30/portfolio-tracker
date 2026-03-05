const express = require('express');
const { getPortfolioStats, getRecommendations } = require('../services/statsService');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const stats = await getPortfolioStats(req.query.portfolioId, req.query.currency);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/recommendations', async (req, res) => {
  try {
    const recommendations = await getRecommendations(req.query.portfolioId);
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/history-peaks', async (req, res) => {
  try {
    const { getHistoryPeaks } = require('../services/statsService');
    const peaks = await getHistoryPeaks(req.query.portfolioId, req.query.currency);
    res.json(peaks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
