import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(secretKey, {
    apiVersion: "2026-01-28.clover",
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentMethodId, amount, userId } = body;

    if (!paymentMethodId || !amount || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    // Create a payment intent for $1.00 (100 cents)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Amount in cents (100 = $1.00)
      currency: "usd",
      payment_method: paymentMethodId,
      confirm: true,
      return_url: `${request.headers.get("origin") || ""}/signup`,
      metadata: {
        userId,
        purpose: "provider_verification",
      },
    });

    if (paymentIntent.status === "succeeded") {
      return NextResponse.json({
        success: true,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
      });
    } else {
      return NextResponse.json(
        { error: "Payment failed", status: paymentIntent.status },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Stripe charge error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process payment" },
      { status: 500 }
    );
  }
}
