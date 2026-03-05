const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

router.delete('/cache/metals', async (req, res) => {
  try {
    const result = await prisma.priceCache.deleteMany({
      where: {
        asset: {
          type: 'metal'
        }
      }
    });
    res.json({ success: true, deleted: result.count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
