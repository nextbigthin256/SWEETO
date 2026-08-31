// File: api/webhook/whatsapp.js
// Vercel Serverless Function for Meta WhatsApp Webhook Verification

export default function handler(req, res) {
  const VERIFY_TOKEN = 'sweeto@256';

  // 1. GET Request: Meta Webhook Verification
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'] || req.query['hub_mode'];
    const token = req.query['hub.verify_token'] || req.query['hub_verify_token'];
    const challenge = req.query['hub.challenge'] || req.query['hub_challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ [Vercel Webhook] Meta subscription verified successfully!');
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(challenge);
    }
    
    res.setHeader('Content-Type', 'text/plain');
    return res.status(403).send('Forbidden');
  }

  // 2. POST Request: Meta Incoming Event Payload
  if (req.method === 'POST') {
    console.log('📩 [Vercel Webhook Event Received]:', req.body);
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send('EVENT_RECEIVED');
  }

  return res.status(405).send('Method Not Allowed');
}
