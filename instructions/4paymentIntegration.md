# Payment Integration (Stripe)

## 1. Stripe Setup
1. Create a Stripe account
2. Add Stripe keys to `.env`:
```ini
STRIPE_SECRET_KEY=<YOUR_STRIPE_SECRET>
STRIPE_WEBHOOK_SECRET=<YOUR_WEBHOOK_SECRET>
```

## 2. Checkout API Route
Create `pages/api/payments/checkout.ts`:
```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2022-11-15' });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { competitionId, userEmail, userId } = req.body;

      // Create a Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'gbp',
              product_data: {
                name: 'Last Man Standing Entry Fee',
              },
              unit_amount: 500, // in pence, e.g., £5
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${req.headers.origin}/payment-success?competitionId=${competitionId}`,
        cancel_url: `${req.headers.origin}/payment-cancel`,
        metadata: { userId, competitionId },
      });

      res.status(200).json({ url: session.url });
    } catch (err) {
      console.log(err);
      res.status(500).json({ error: err.message });
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}
```

## 3. Webhook Handler
Create `pages/api/payments/webhook.ts`:
```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2022-11-15' });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const sig = req.headers['stripe-signature'] as string;
    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        // Update DB: mark paymentStatus as paid, add user to competition
      }
      res.json({ received: true });
    } catch (error: any) {
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}

export const config = {
  api: {
    bodyParser: false, // Stripe requires raw body for webhooks
  },
};
```

## Notes
- Ensure webhook endpoint is properly configured in Stripe dashboard
- Test webhooks locally using Stripe CLI
- Handle payment failures and edge cases
- Update database records after successful payment
- Consider implementing payment retry logic
