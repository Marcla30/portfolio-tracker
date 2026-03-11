const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

router.get('/vapid-public-key', async (req, res) => {
  try {
    const settings = await prisma.settings.findUnique({ where: { userId: req.session.userId } });
    res.json({ publicKey: settings?.vapidPublicKey });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/subscribe', async (req, res) => {
  try {
    const settings = await prisma.settings.findUnique({ where: { userId: req.session.userId } });
    const subscriptions = settings?.pushSubscriptions ? JSON.parse(settings.pushSubscriptions) : [];
    subscriptions.push(req.body);
    await prisma.settings.update({
      where: { userId: req.session.userId },
      data: { pushSubscriptions: JSON.stringify(subscriptions) }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
