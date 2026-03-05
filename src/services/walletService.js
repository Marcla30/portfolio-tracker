const axios = require('axios');

async function fetchWalletTransactions(address, blockchain) {
  switch (blockchain.toLowerCase()) {
    case 'btc':
    case 'bitcoin':
      return fetchBitcoinTransactions(address);
    case 'eth':
    case 'ethereum':
      return fetchEthereumTransactions(address);
    default:
      return [];
  }
}

async function fetchBitcoinTransactions(address) {
  try {
    const response = await axios.get(`https://blockchain.info/rawaddr/${address}`);
    return response.data.txs.map(tx => ({
      hash: tx.hash,
      timestamp: tx.time * 1000,
      value: tx.result / 100000000,
      type: tx.result > 0 ? 'receive' : 'send'
    }));
  } catch (error) {
    console.error('Bitcoin fetch error:', error.message);
    return [];
  }
}

async function fetchEthereumTransactions(address) {
  try {
    const response = await axios.get(`https://api.blockchair.com/ethereum/dashboards/address/${address}`);
    const data = response.data.data[address];
    return data.calls?.map(tx => ({
      hash: tx.transaction_hash,
      timestamp: new Date(tx.time).getTime(),
      value: parseFloat(tx.value) / 1e18,
      type: tx.recipient === address ? 'receive' : 'send'
    })) || [];
  } catch (error) {
    console.error('Ethereum fetch error:', error.message);
    return [];
  }
}

module.exports = {
  fetchWalletTransactions
};
