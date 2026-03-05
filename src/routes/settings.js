const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    let settings = await prisma.settings.findFirst();
    if (!settings) {
      settings = await prisma.settings.create({ data: {} });
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/', async (req, res) => {
  try {
    console.log('Settings update request body:', req.body);
    const settings = await prisma.settings.findFirst();
    const updated = await prisma.settings.update({
      where: { id: settings.id },
      data: req.body
    });
    console.log('Settings updated:', updated);
    res.json(updated);
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
