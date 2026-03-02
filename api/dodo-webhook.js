export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  // TODO Phase 3: verify Dodo signature, upgrade user plan
  console.log('[dodo-webhook]', req.body?.type);
  res.status(200).json({ received: true });
}
