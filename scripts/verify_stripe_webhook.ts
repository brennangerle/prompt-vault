import { spawn } from "child_process";
import Stripe from "stripe";

const STRIPE_SECRET_KEY = "sk_test_dummy";
const STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
const PORT = 9002; // Matches package.json "dev" script

// Initialize Stripe
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia" as any,
});

async function main() {
  console.log(`Starting Next.js server on port ${PORT}...`);

  const server = spawn("npm", ["run", "dev"], {
    env: {
      ...process.env,
      STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET,
    },
    // inherit stdio to see server logs (useful for debugging)
    // but we can silence it if it's too much. I'll keep it for now.
    stdio: "inherit",
  });

  // Wait for server to be ready
  const maxRetries = 60; // Wait up to 60 seconds
  let ready = false;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}/`);
      if (res.ok || res.status === 404) { // 404 is fine, means server is reachable
        ready = true;
        break;
      }
    } catch (e) {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (!ready) {
    console.error("Server failed to start within timeout.");
    server.kill();
    process.exit(1);
  }

  console.log("Server is ready. Running tests...");

  try {
    // Test 1: Valid Signature
    const payload = JSON.stringify({
      id: "evt_test_webhook",
      object: "event",
      type: "payout.paid",
      data: {
        object: {
          id: "po_123",
          object: "payout",
          amount: 1000,
          currency: "usd",
        }
      }
    });

    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: STRIPE_WEBHOOK_SECRET,
    });

    console.log("Sending valid webhook...");
    const res1 = await fetch(`http://localhost:${PORT}/api/webhooks/stripe`, {
      method: "POST",
      headers: {
        "Stripe-Signature": header,
        "Content-Type": "application/json",
      },
      body: payload,
    });

    if (res1.status === 200) {
      console.log("✅ Valid webhook test passed (200 OK)");
    } else {
      console.error(`❌ Valid webhook test failed. Status: ${res1.status}`);
      const text = await res1.text();
      console.error("Response:", text);
      process.exitCode = 1;
    }

    // Test 2: Invalid Signature
    console.log("Sending invalid webhook...");
    const res2 = await fetch(`http://localhost:${PORT}/api/webhooks/stripe`, {
      method: "POST",
      headers: {
        "Stripe-Signature": "t=123,v1=invalid_signature",
        "Content-Type": "application/json",
      },
      body: payload,
    });

    if (res2.status === 400) {
      console.log("✅ Invalid webhook test passed (400 Bad Request)");
    } else {
      console.error(`❌ Invalid webhook test failed. Status: ${res2.status}`);
      const text = await res2.text();
      console.error("Response:", text);
      process.exitCode = 1;
    }

  } catch (error) {
    console.error("Test execution failed:", error);
    process.exitCode = 1;
  } finally {
    console.log("Stopping server...");
    server.kill();
    process.exit();
  }
}

main();
