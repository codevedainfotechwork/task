const express = require('express');
const auth = require('../middleware/auth');
const PushSubscription = require('../models/PushSubscription');
const { getPublicKey } = require('../utils/pushNotifications');

const router = express.Router();

router.get('/vapid-public-key', auth, async (_req, res) => {
  res.json({ publicKey: getPublicKey() });
});

router.post('/subscribe', auth, async (req, res) => {
  try {
    const { subscription } = req.body || {};
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ message: 'Invalid push subscription.' });
    }

    await PushSubscription.upsert({
      userId: req.user._id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      expirationTime: subscription.expirationTime || null,
      userAgent: req.headers['user-agent'] || null,
    });

    res.json({ message: 'Push subscription saved.' });
  } catch (error) {
    console.error('Push subscribe error:', error);
    res.status(500).json({ message: 'Failed to save push subscription.' });
  }
});

router.delete('/unsubscribe', auth, async (req, res) => {
  try {
    const { endpoint } = req.body || {};
    if (!endpoint) {
      return res.status(400).json({ message: 'Endpoint is required.' });
    }

    await PushSubscription.deleteByEndpoint(endpoint);
    res.json({ message: 'Push subscription removed.' });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    res.status(500).json({ message: 'Failed to remove push subscription.' });
  }
});

module.exports = router;
