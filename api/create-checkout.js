const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const { user_email, business_id, plan } = req.body;

  const priceId = plan === "annual" 
    ? process.env.REACT_APP_STRIPE_PRICE_ID_ANNUAL 
    : process.env.REACT_APP_STRIPE_PRICE_ID_MONTHLY;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: user_email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${req.headers.origin}/?success=true&business_id=${business_id}`,
      cancel_url: `${req.headers.origin}/?canceled=true`,
      metadata: { business_id },
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
