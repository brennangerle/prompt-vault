import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string || "dummy_key_for_build", {
  apiVersion: "2024-12-18" as any,
});

export async function POST(req: Request) {
  const body = await req.text();
  const headerPayload = await headers();
  const signature = headerPayload.get("Stripe-Signature");

  if (!signature) {
    console.error("Missing Stripe-Signature header");
    return NextResponse.json({ error: "Missing Stripe-Signature header" }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    // Return 200 to prevent retries if it's a configuration issue on our end, or 500?
    // User asked for 200-299.
    // But if we can't verify, we shouldn't process.
    // I'll return 500 so logs show failure, but maybe user wants it to succeed?
    // The user says "You need to return any status code between HTTP 200 to 299 for Stripe to consider the webhook event successfully delivered."
    // If I return 500, Stripe will disable it again.
    // But I can't verify signature without the secret.
    // I will return 500 and log clearly.
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error: any) {
    console.error(`Webhook signature verification failed: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  try {
    switch (event.type) {
        case "payout.paid":
            const payout = event.data.object as Stripe.Payout;
            console.log(`💰 Payout paid! ${payout.amount} ${payout.currency}`);
            break;
        case "invoice.created":
            const invoice = event.data.object as Stripe.Invoice;
            console.log(`🧾 Invoice created! ${invoice.id}`);
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }
  } catch (error: any) {
    console.error(`Error handling event: ${error.message}`);
    return NextResponse.json({ error: "Error handling event" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
