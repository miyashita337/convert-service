import { Hono } from "hono";
import type { Env, AppVariables } from "../types/env";
import { createStripeClient, PLAN_CONFIGS, isValidPlanId } from "../services/stripe";

const checkout = new Hono<{ Bindings: Env; Variables: AppVariables }>();

checkout.post("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "authentication_required", message: "Please log in to purchase." }, 401);
  }

  const body = await c.req.json<{ planId: string }>().catch(() => null);
  if (!body?.planId || !isValidPlanId(body.planId)) {
    return c.json({ error: "invalid_plan", message: "Invalid plan ID." }, 400);
  }

  const plan = PLAN_CONFIGS[body.planId];
  const stripe = createStripeClient(c.env);
  const frontendUrl = c.env.APP_URL.replace("api.", "");

  try {
    if (plan.mode === "subscription") {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: plan.currency,
            product_data: { name: plan.name },
            unit_amount: plan.amount,
            recurring: { interval: plan.interval! },
          },
          quantity: 1,
        }],
        metadata: { planId: body.planId, userEmail: user.email, stripeCustomerId: user.stripeCustomerId || "" },
        customer_email: user.email,
        success_url: `${frontendUrl}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/purchase/cancel`,
      });
      return c.json({ url: session.url });
    }

    // One-time payment (pass)
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: plan.currency,
          product_data: { name: plan.name },
          unit_amount: plan.amount,
        },
        quantity: 1,
      }],
      metadata: {
        planId: body.planId,
        userEmail: user.email,
        stripeCustomerId: user.stripeCustomerId || "",
        durationDays: String(plan.durationDays),
      },
      customer_email: user.email,
      success_url: `${frontendUrl}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/purchase/cancel`,
    });
    return c.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return c.json({ error: "checkout_failed", message: "Failed to create checkout session." }, 500);
  }
});

export default checkout;
