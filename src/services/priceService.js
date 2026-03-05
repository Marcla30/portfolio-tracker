const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CACHE_DURATION = 5 * 60 * 1000;

async function getCurrentPrice(asset, currency = 'EUR') {
  const cached = await prisma.priceCache.findFirst({
    where: {
      assetId: asset.id,
      currency,
      timestamp: { gte: new Date(Date.now() - CACHE_DURATION) }
    },
    orderBy: { timestamp: 'desc' }
  });

  if (cached) {
    console.log(`Cache hit for ${asset.symbol} in ${currency}: ${cached.price}`);
    return parseFloat(cached.price);
  }

  console.log(`Fetching price for ${asset.symbol} in ${currency}`);
  let price;
  switch (asset.type) {
    case 'crypto':
      price = await getCryptoPrice(asset.symbol, currency);
      break;
    case 'stock':
    case 'etf':
      price = await getStockPrice(asset.symbol, currency);
      break;
    case 'metal':
      price = await getMetalPrice(asset.symbol, currency);
      break;
    case 'cash':
      price = await getExchangeRate(asset.symbol, currency);
      break;
    default:
      price = 0;
  }

  await prisma.priceCache.create({
    data: { assetId: asset.id, price, currency }
  });

  console.log(`Cached price for ${asset.symbol} in ${currency}: ${price}`);
  return price;
}

async function getCryptoPrice(symbol, currency = 'EUR') {
  try {
    const coinId = getCoinGeckoId(symbol);
    const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
      params: { ids: coinId, vs_currencies: currency.toLowerCase() }
    });
    return response.data[coinId]?.[currency.toLowerCase()] || 0;
  } catch (error) {
    console.error(`Error fetching crypto price for ${symbol}:`, error.message);
    return 0;
  }
}

async function getStockPrice(symbol, currency = 'EUR') {
  try {
    const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`);
    let price = response.data.chart.result[0].meta.regularMarketPrice || 0;
    const stockCurrency = response.data.chart.result[0].meta.currency;
    
    // Convert if needed
    if (stockCurrency !== currency && price > 0) {
      const rate = await getExchangeRate(stockCurrency, currency);
      price *= rate;
    }
    
    return price;
  } catch (error) {
    console.error(`Error fetching stock price for ${symbol}:`, error.message);
    return 0;
  }
}

async function getMetalPrice(symbol, currency = 'EUR') {
  try {
    const metalMap = {
      'XAU': 'XAU',
      'XAG': 'XAG'
    };
    
    const metalSymbol = metalMap[symbol.toUpperCase()];
    if (!metalSymbol) return 0;
    
    // Using gold-api.com free endpoint
    const response = await axios.get(`https://api.gold-api.com/price/${metalSymbol}`);
    
    let price = response.data.price || 0;
    
    // Price is in USD per troy ounce, convert to requested currency
    if (currency !== 'USD' && price > 0) {
      const rate = await getExchangeRate('USD', currency);
      price *= rate;
    }
    
    return price;
  } catch (error) {
    console.error(`Error fetching metal price for ${symbol}:`, error.message);
    // Fallback to approximate prices in USD
    const fallbackPrices = {
      'XAU': 5080,
      'XAG': 62
    };
    let price = fallbackPrices[symbol.toUpperCase()] || 0;
    
    if (currency !== 'USD' && price > 0) {
      const rate = await getExchangeRate('USD', currency);
      price *= rate;
    }
    
    return price;
  }
}

async function getExchangeRate(from, to) {
  if (from === to) return 1;
  
  try {
    const response = await axios.get(`https://api.frankfurter.app/latest`, {
      params: { from, to }
    });
    return response.data.rates[to] || 1;
  } catch (error) {
    console.error(`Error fetching exchange rate ${from}/${to}:`, error.message);
    return 1;
  }
}

async function getHistoricalPrice(asset, date, currency = 'EUR') {
  const dateStr = date.toISOString().split('T')[0];
  
  try {
    switch (asset.type) {
      case 'crypto':
        return await getCryptoHistoricalPrice(asset.symbol, dateStr, currency);
      case 'stock':
      case 'etf':
        return await getStockHistoricalPrice(asset.symbol, dateStr, currency);
      default:
        return await getCurrentPrice(asset, currency);
    }
  } catch (error) {
    console.error(`Error fetching historical price:`, error.message);
    return 0;
  }
}

async function getCryptoHistoricalPrice(symbol, date, currency) {
  const coinId = getCoinGeckoId(symbol);
  const [day, month, year] = date.split('-').reverse();
  
  const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}/history`, {
    params: { date: `${day}-${month}-${year}` }
  });
  
  return response.data.market_data?.current_price?.[currency.toLowerCase()] || 0;
}

async function getStockHistoricalPrice(symbol, date, currency) {
  try {
    const timestamp = Math.floor(new Date(date).getTime() / 1000);
    const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
      params: { 
        period1: timestamp - 86400,
        period2: timestamp + 86400,
        interval: '1d'
      }
    });
    
    const result = response.data.chart.result[0];
    const quotes = result.indicators.quote[0];
    
    // Try to get close price, fallback to open or high
    let price = quotes.close?.find(p => p !== null) || 
                quotes.open?.find(p => p !== null) || 
                quotes.high?.find(p => p !== null) || 0;
    
    // If still no price, try current price
    if (price === 0) {
      price = result.meta.regularMarketPrice || 0;
    }
    
    // Convert if needed
    if (currency !== 'EUR' && result.meta.currency === 'EUR' && price > 0) {
      const rate = await getExchangeRate('EUR', currency);
      price *= rate;
    } else if (currency !== 'USD' && result.meta.currency === 'USD' && price > 0) {
      const rate = await getExchangeRate('USD', currency);
      price *= rate;
    }
    
    console.log(`Historical price for ${symbol} on ${date}: ${price}`);
    return price;
  } catch (error) {
    console.error(`Error fetching historical stock price for ${symbol}:`, error.message);
    return 0;
  }
}

const coinGeckoMap = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'BNB': 'binancecoin',
  'USDT': 'tether',
  'USDC': 'usd-coin',
  'XRP': 'ripple',
  'ADA': 'cardano',
  'SOL': 'solana',
  'DOGE': 'dogecoin',
  'TRX': 'tron',
  'MATIC': 'matic-network',
  'DOT': 'polkadot',
  'ATOM': 'cosmos',
  'CRO': 'crypto-com-chain'
};

function getCoinGeckoId(symbol) {
  return coinGeckoMap[symbol.toUpperCase()] || symbol.toLowerCase();
}

module.exports = {
  getCurrentPrice,
  getHistoricalPrice,
  getExchangeRate
};
