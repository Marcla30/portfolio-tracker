const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { fetchWalletTransactions } = require('../services/walletService');
const { sendPushNotification } = require('../services/pushService');
const prisma = new PrismaClient();

async function syncWallets() {
  const wallets = await prisma.walletAddress.findMany({
    where: { isActive: true }
  });

  for (const wallet of wallets) {
    try {
      const transactions = await fetchWalletTransactions(wallet.address, wallet.blockchain);
      
      if (transactions.length > 0) {
        const latestTx = transactions[0];
        
        if (latestTx.hash !== wallet.lastTxHash) {
          await prisma.walletAddress.update({
            where: { id: wallet.id },
            data: { lastTxHash: latestTx.hash, lastSync: new Date() }
          });

          const shortAddr = `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`;
          await sendPushNotification(
            'New Wallet Transaction',
            `${shortAddr}: ${latestTx.type} ${latestTx.value.toFixed(4)}`,
            { type: 'wallet_tx', walletId: wallet.id, txHash: latestTx.hash }
          );
        }
      }
    } catch (error) {
      console.error(`Wallet sync error for ${wallet.address}:`, error.message);
    }
  }
}

function startWalletSyncJob() {
  const interval = process.env.CRON_WALLET_SYNC_INTERVAL || '0 * * * *';
  cron.schedule(interval, syncWallets);
  console.log('Wallet sync job started');
}

module.exports = { startWalletSyncJob, syncWallets };
