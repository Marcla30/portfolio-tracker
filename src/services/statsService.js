const { PrismaClient } = require('@prisma/client');
const { getCurrentPrice } = require('./priceService');
const prisma = new PrismaClient();

async function getPortfolioStats(portfolioId, currency = 'EUR') {
  const holdings = await prisma.holding.findMany({
    where: portfolioId ? { portfolioId } : {},
    include: { asset: true, portfolio: true }
  });

  let totalValue = 0;
  const assetValues = [];

  for (const holding of holdings) {
    const currentPrice = await getCurrentPrice(holding.asset, currency);
    const value = parseFloat(holding.quantity) * currentPrice;
    totalValue += value;

    assetValues.push({
      asset: holding.asset,
      quantity: parseFloat(holding.quantity),
      currentPrice,
      value,
      avgPrice: parseFloat(holding.avgPrice),
      unrealizedPL: value - (parseFloat(holding.quantity) * parseFloat(holding.avgPrice))
    });
  }

  return { totalValue, holdings: assetValues };
}

async function getRecommendations(portfolioId) {
  const settings = await prisma.settings.findFirst();
  const { totalValue, holdings } = await getPortfolioStats(portfolioId);
  const recommendations = [];

  holdings.forEach(h => {
    const concentration = (h.value / totalValue) * 100;
    if (concentration > settings.maxAssetConcentration) {
      recommendations.push({
        type: 'warning',
        severity: 'high',
        message: `${h.asset.name} represents ${concentration.toFixed(1)}% of portfolio (max: ${settings.maxAssetConcentration}%)`
      });
    }
  });

  const byType = {};
  holdings.forEach(h => {
    byType[h.asset.type] = (byType[h.asset.type] || 0) + h.value;
  });

  Object.entries(byType).forEach(([type, value]) => {
    const concentration = (value / totalValue) * 100;
    if (concentration > settings.maxCategoryConcentration) {
      recommendations.push({
        type: 'warning',
        severity: 'medium',
        message: `${type} category represents ${concentration.toFixed(1)}% (max: ${settings.maxCategoryConcentration}%)`
      });
    }
  });

  return recommendations;
}

async function getHistoryPeaks(portfolioId, currency = 'EUR') {
  const transactions = await prisma.transaction.findMany({
    where: portfolioId ? { portfolioId } : {},
    include: { asset: true },
    orderBy: { date: 'asc' }
  });

  if (transactions.length === 0) {
    return { peak: null, valley: null };
  }

  const dailyValues = new Map();
  const holdings = new Map();

  for (const tx of transactions) {
    const date = tx.date.toISOString().split('T')[0];
    const key = `${tx.assetId}`;
    
    if (!holdings.has(key)) {
      holdings.set(key, { quantity: 0, asset: tx.asset });
    }
    
    const holding = holdings.get(key);
    if (tx.type === 'buy') {
      holding.quantity += parseFloat(tx.quantity);
    } else {
      holding.quantity -= parseFloat(tx.quantity);
    }
    
    let totalValue = 0;
    for (const [, h] of holdings) {
      if (h.quantity > 0) {
        const price = await getCurrentPrice(h.asset, currency);
        totalValue += h.quantity * price;
      }
    }
    
    dailyValues.set(date, totalValue);
  }

  let peak = { date: null, value: -Infinity };
  let valley = { date: null, value: Infinity };

  for (const [date, value] of dailyValues) {
    if (value > peak.value) {
      peak = { date, value };
    }
    if (value < valley.value) {
      valley = { date, value };
    }
  }

  return { peak, valley };
}

module.exports = { getPortfolioStats, getRecommendations, getHistoryPeaks };
