const fs = require('fs');
const path = require('path');
const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

const generatedDir = path.join(__dirname, '..', 'generated');
const vapidFile = path.join(generatedDir, 'vapid-keys.json');

function loadOrCreateVapidKeys() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (publicKey && privateKey) {
    return {
      publicKey,
      privateKey,
      subject: process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
    };
  }

  if (fs.existsSync(vapidFile)) {
    const stored = JSON.parse(fs.readFileSync(vapidFile, 'utf8'));
    if (stored.publicKey && stored.privateKey) {
      return {
        publicKey: stored.publicKey,
        privateKey: stored.privateKey,
        subject: stored.subject || process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
      };
    }
  }

  const keys = webpush.generateVAPIDKeys();
  const payload = {
    ...keys,
    subject: process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
  };

  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
  }
  fs.writeFileSync(vapidFile, JSON.stringify(payload, null, 2), 'utf8');
  return payload;
}

const vapid = loadOrCreateVapidKeys();
webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

function getPublicKey() {
  return vapid.publicKey;
}

async function sendPushNotification(userId, payload) {
  if (!userId) return;
  const subscriptions = await PushSubscription.findByUserId(userId);
  if (!subscriptions.length) return;

  await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      };

      try {
        const enrichedPayload = {
          ...payload,
          data: {
            ...(payload?.data || {}),
            actions: Array.isArray(payload?.data?.actions) ? payload.data.actions : [
              { action: 'open', title: 'Open Task' },
              { action: 'mark-read', title: 'Mark Read' },
            ],
          },
        };

        await webpush.sendNotification(pushSubscription, JSON.stringify(enrichedPayload));
      } catch (error) {
        const statusCode = error?.statusCode || error?.statusCode === 0 ? error.statusCode : error?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await PushSubscription.deleteByEndpoint(subscription.endpoint);
        }
      }
    })
  );
}

module.exports = {
  getPublicKey,
  sendPushNotification,
};
