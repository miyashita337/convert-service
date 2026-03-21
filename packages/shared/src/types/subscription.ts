/** サブスクリプション・プラン階層に関する共有型定義 */

/** ユーザープラン種別 */
export type UserPlan = "free" | "pass" | "plus" | "pro";

/** プラン優先度（高い数値が上位） */
const PLAN_PRIORITY: Record<UserPlan, number> = {
  free: 0,
  pass: 1,
  plus: 2,
  pro: 3,
};

/** 上位プランを返す */
export function higherPlan(a: UserPlan, b: UserPlan): UserPlan {
  return PLAN_PRIORITY[a] >= PLAN_PRIORITY[b] ? a : b;
}

/** Stripe サブスクリプションのステータス */
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "unpaid"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

/** サブスクリプション情報 */
export interface Subscription {
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  planType: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

/** アクティブなサブスクリプションか判定 */
export function isActiveSubscription(status: SubscriptionStatus): boolean {
  return status === "active" || status === "trialing";
}
