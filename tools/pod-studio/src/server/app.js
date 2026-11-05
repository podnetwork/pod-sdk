/**
 * Pod Network Studio Web Server
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { POD_CONFIG } from '../config.js';
import { defaultPodProvider } from '../core/pod-provider.js';
import { defaultVerifiableLogEngine } from '../core/verifiable-log.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_ROOT = path.join(__dirname, '../../web');

const app = express();
const PORT = process.env.PORT || 3430;

app.use(cors());
app.use(express.json());
app.use(express.static(WEB_ROOT));

// 1. Config & Network Info
app.get('/api/config', (req, res) => {
  res.json({
    network: POD_CONFIG.network,
    components: POD_CONFIG.sdkComponents,
    sampleOrders: POD_CONFIG.sampleOrders,
  });
});

// 2. Submit MEV-Free Order via PodProvider
app.post('/api/order/submit', (req, res) => {
  try {
    const order = defaultPodProvider.submitOrder(req.body);
    res.json({ success: true, order });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 3. Orders History
app.get('/api/order/history', (req, res) => {
  res.json(defaultPodProvider.getOrders());
});

// 4. Verify VerifiableLog Proof
app.post('/api/proof/verify', (req, res) => {
  const proof = defaultVerifiableLogEngine.verifyLogProof(req.body);
  res.json(proof);
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`⚡ Pod Network MEV-Free L1 & Alloy SDK Studio Running!`);
    console.log(`🌐 Web Dashboard: http://localhost:${PORT}`);
    console.log(`🛡️  Architecture: Purpose-Built MEV-Free Global Market L1`);
    console.log(`======================================================\n`);
  });
}

export default app;
