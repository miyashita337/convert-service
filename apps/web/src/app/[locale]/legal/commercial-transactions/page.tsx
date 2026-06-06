import { setRequestLocale } from "next-intl/server";
import { Breadcrumb } from "@/components/breadcrumb";
import { BreadcrumbJsonLd } from "@/components/json-ld";
import { locales, type Locale } from "@/lib/i18n/config";
import { buildPageMetadata } from "@/lib/metadata";
import type { Metadata } from "next";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    title: "特定商取引法に基づく表記 | QuickConv",
    description:
      "QuickConv の特定商取引法に基づく表記。販売事業者・販売価格・支払方法・役務の提供時期・返金/解約ポリシーを記載しています。",
    locale: locale as Locale,
    path: "/legal/commercial-transactions",
  });
}

// 特定商取引法に基づく表記（日本の法令に基づく開示。日英共通で日本語表記を掲載する）。
// NOTE: 「販売事業者」は個人事業主の氏名（実名）。デプロイ前に実名へ差し替えること。
const OPERATOR_NAME = "宮下 寛之"; // TODO(#357): 運営責任者の実名に確定。仮置き。
const SUPPORT_EMAIL = "quickconv.cc@gmail.com";

const ROWS: { label: string; value: string }[] = [
  { label: "販売事業者", value: OPERATOR_NAME },
  { label: "運営統括責任者", value: OPERATOR_NAME },
  {
    label: "所在地",
    value: "個人事業のため、ご請求をいただいた場合は遅滞なく開示いたします。",
  },
  {
    label: "電話番号",
    value: "個人事業のため、ご請求をいただいた場合は遅滞なく開示いたします。",
  },
  { label: "メールアドレス", value: SUPPORT_EMAIL },
  { label: "販売URL", value: "https://quickconv.cc" },
  {
    label: "販売価格",
    value:
      "各料金ページおよびご購入手続き画面に表示する金額（消費税込）。例: API Starter ¥980/月、API Pro ¥4,980/月。料金ページ（/pricing, /developers）に最新の価格を表示します。",
  },
  {
    label: "商品代金以外の必要料金",
    value: "なし。インターネット接続料金・通信料金等はお客様のご負担となります。",
  },
  { label: "支払方法", value: "クレジットカード（Stripe による決済）。" },
  {
    label: "支払時期",
    value:
      "買い切り商品は購入手続き時に即時課金。サブスクリプションは初回購入時、および毎月（または毎年）の自動更新時に課金されます。",
  },
  {
    label: "役務の提供時期",
    value: "決済完了後、ただちにサービスをご利用いただけます。",
  },
  {
    label: "返品・キャンセル・解約",
    value:
      "デジタルサービスの性質上、決済完了後の返金・返品は原則としてお受けできません。サブスクリプションはアカウントページからいつでも解約でき、解約後は次回更新日以降の課金は発生しません（既にお支払い済みの期間の日割り返金はありません）。",
  },
  {
    label: "動作環境",
    value: "最新版の主要ブラウザ（Google Chrome / Safari / Firefox / Microsoft Edge）。",
  },
];

export default async function CommercialTransactionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const title = "特定商取引法に基づく表記";

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <BreadcrumbJsonLd locale={locale as Locale} items={[{ name: title }]} />
      <Breadcrumb items={[{ label: title }]} />
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {locale === "en" && (
        <p className="mt-2 text-sm text-muted-foreground">
          This is the disclosure required under Japan&rsquo;s Act on Specified Commercial
          Transactions (特定商取引法). It is presented in Japanese as required by law.
        </p>
      )}

      <dl className="mt-8 divide-y divide-border border-y border-border">
        {ROWS.map((row) => (
          <div key={row.label} className="grid grid-cols-1 gap-1 py-4 sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-semibold">{row.label}</dt>
            <dd className="text-sm text-muted-foreground sm:col-span-2">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
