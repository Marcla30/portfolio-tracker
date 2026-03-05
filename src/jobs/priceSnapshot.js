const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { getCurrentPrice } = require('../services/priceService');
const prisma = new PrismaClient();

async function saveDailyPrices() {
  console.log('Starting daily price snapshot...');
  
  try {
    // Get all unique assets from holdings and recent transactions
    const assets = await prisma.asset.findMany({
      where: {
        OR: [
          { holdings: { some: {} } },
          { transactions: { some: { date: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } } } }
        ]
      }
    });

    const settings = await prisma.settings.findFirst();
    const currency = settings?.defaultCurrency || 'EUR';

    let saved = 0;
    for (const asset of assets) {
      try {
        const price = await getCurrentPrice(asset, currency);
        
        if (price > 0) {
          await prisma.priceCache.create({
            data: {
              assetId: asset.id,
              price,
              currency,
              timestamp: new Date()
            }
          });
          saved++;
        }
      } catch (error) {
        console.error(`Error saving price for ${asset.symbol}:`, error.message);
      }
    }

    console.log(`Daily price snapshot completed: ${saved}/${assets.length} prices saved`);
  } catch (error) {
    console.error('Daily price snapshot error:', error);
  }
}

function startDailyPriceJob() {
  // Run every day at 00:00
  cron.schedule('0 0 * * *', saveDailyPrices);
  console.log('Daily price snapshot job scheduled (00:00)');
  
  // Run immediately on startup if no prices saved today
  checkAndRunInitial();
}

async function checkAndRunInitial() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayPrices = await prisma.priceCache.count({
      where: {
        timestamp: { gte: today }
      }
    });
    
    if (todayPrices === 0) {
      console.log('No prices saved today, running initial snapshot...');
      await saveDailyPrices();
    }
  } catch (error) {
    console.error('Initial price check error:', error);
  }
}

module.exports = { startDailyPriceJob, saveDailyPrices };
