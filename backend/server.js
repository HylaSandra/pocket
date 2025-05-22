require('dotenv').config();
const express    = require('express');
const webpush    = require('web-push');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
// Middleware
app.use(helmet());
app.use(express.json());
app.use(morgan('tiny'));

// CORS – frontend host
const allowedOrigins = [process.env.FRONTEND_ORIGIN];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  }
}));

// MongoDB connection
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, { tlsAllowInvalidCertificates: true });
let txCol, subsCol;

// Web-push setup
webpush.setVapidDetails(
  process.env.VAPID_MAILTO,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// API router
const router = express.Router();

// Health-check
router.get('/health', (req, res) => res.send('OK'));

// VAPID public key
router.get('/vapidPublicKey', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// Save subscription
router.post('/save-subscription', async (req, res) => {
  try {
    const sub = req.body;
    await subsCol.updateOne({ endpoint: sub.endpoint }, { $set: sub }, { upsert: true });
    res.status(201).json({ message: 'Subscription saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

// Send notifications
router.post('/send-notification', async (req, res) => {
  const { title = 'Pocket', body = 'New notification', url = '/' } = req.body;
  const payload = JSON.stringify({ title, body, url });
  try {
    const subs = await subsCol.find().toArray();
    await Promise.all(
      subs.map(sub => webpush.sendNotification(sub, payload).catch(e => console.warn(e)))
    );
    res.json({ message: 'Notifications sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Push error' });
  }
});

// Transactions
router.post('/transactions', async (req, res) => {
  try {
    const result = await txCol.insertOne(req.body);
    const newTx = await txCol.findOne({ _id: result.insertedId });
    res.status(201).json(newTx);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Insert failed' });
  }
});
router.get('/transactions', async (req, res) => {
  try {
    const list = await txCol.find().toArray();
    res.json({ transactions: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fetch failed' });
  }
});
router.post('/transactions/sync', async (req, res) => {
  const { transactions } = req.body;
  if (!Array.isArray(transactions)) return res.status(400).json({ error: 'Expected array' });
  try {
    await txCol.deleteMany({});
    if (transactions.length) await txCol.insertMany(transactions);
    res.json({ message: 'Sync OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sync failed' });
  }
});
router.delete('/transactions/:id', async (req, res) => {
  try {
    await txCol.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

app.use('/api', router);

// Start server
async function start() {
  try {
    await client.connect();
    const db = client.db(process.env.MONGO_DBNAME);
    txCol = db.collection('transactions');
    subsCol = db.collection('subscriptions');
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server up on port ${PORT}`));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
start();