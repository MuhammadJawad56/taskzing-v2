import { loadStripe, Stripe } from "@stripe/stripe-js";

// Your Stripe publishable key - replace with your actual key
// For testing, use your test publishable key (starts with pk_test_)
// For production, use your live publishable key (starts with pk_live_)
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_your_publishable_key_here";

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

export { STRIPE_PUBLISHABLE_KEY };

