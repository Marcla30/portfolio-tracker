require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeVapidKeys } = require('./services/pushService');
const { startWalletSyncJob } = require('./jobs/walletSync');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/portfolios', require('./routes/portfolios'));
app.use('/api/assets', require('./routes/assets'));
app.use('/api/holdings', require('./routes/holdings'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/wallets', require('./routes/wallets'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api', require('./routes/sync'));
app.use('/api', require('./routes/import'));
app.use('/api', require('./routes/cache'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

async function start() {
  try {
    await initializeVapidKeys();
    startWalletSyncJob();
    
    app.listen(PORT, () => {
      console.log(`Portfolio Tracker running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
