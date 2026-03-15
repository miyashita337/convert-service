import { Hono } from "hono";
import type { Env, AppVariables } from "../types/env";
import { createStripeClient, PLAN_CONFIGS, isValidPlanId } from "../services/stripe";

const checkout = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// POST /api/checkout — create Stripe Checkout Session
checkout.post("/", async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json(
      { error: "authentication_required", message: "Please log in to purchase a plan." },
      401
    );
  }

  const body = await c.req.json<{ planId: string }>().catch(() => null);
  if (!body?.planId || !isValidPlanId(body.planId)) {
    return c.json(
      { error: "invalid_plan", message: "Invalid plan ID. Use pass_7d or pass_30d." },
      400
    );
  }

  const plan = PLAN_CONFIGS[body.planId];
  const stripe = createStripeClient(c.env);
  const frontendUrl = c.env.APP_URL.replace("api.", "");

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: plan.currency,
            product_data: {
              name: plan.name,
            },
            unit_amount: plan.amount,
          },
          quantity: 1,
        },
      ],
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
    return c.json(
      { error: "checkout_failed", message: "Failed to create checkout session." },
      500
    );
  }
});

export default checkout;
