import type { WaitlistStatus } from "./waitlist";

type LandingLocale = "en" | "ja";

type LandingCopy = {
  localeLabel: string;
  navTagline: string;
  heroEyebrow: string;
  heroTitle: string;
  heroBody: string;
  primaryCta: string;
  secondaryCta: string;
  heroSteps: string[];
  heroPanelTitle: string;
  heroPanelItems: Array<{ label: string; status: string }>;
  problemKicker: string;
  problemTitle: string;
  problemPoints: string[];
  solutionKicker: string;
  solutionTitle: string;
  solutionBody: string;
  solutionNote: string;
  outputsKicker: string;
  outputsTitle: string;
  outputs: Array<{ title: string; body: string }>;
  stepsKicker: string;
  stepsTitle: string;
  steps: string[];
  trustKicker: string;
  trustTitle: string;
  trustItems: string[];
  faqKicker: string;
  faqTitle: string;
  faqs: Array<{ question: string; answer: string }>;
  closingTitle: string;
  closingBody: string;
  closingNote: string;
  footer: string;
  waitlistLabel: string;
  waitlistPlaceholder: string;
  waitlistButton: string;
  waitlistMicrocopy: string;
  waitlistMessages: Record<Exclude<WaitlistStatus, "idle">, string>;
};

const copyByLocale: Record<LandingLocale, LandingCopy> = {
  en: {
    localeLabel: "English",
    navTagline: "Your financial operating partner",
    heroEyebrow: "See where your money is going.",
    heroTitle: "Automatically manage household spending and subscriptions.",
    heroBody:
      "Connect card statements, Stripe, billing emails, and bank feeds. econ keeps watch on renewals, price increases, and waste before they quietly pile up.",
    primaryCta: "Start for free",
    secondaryCta: "See how it works",
    heroSteps: ["Connect", "Detect automatically", "Review proposals"],
    heroPanelTitle: "Live spend review",
    heroPanelItems: [
      { label: "Recurring charge found", status: "Detected" },
      { label: "Price increase noticed", status: "Needs review" },
      { label: "Cancel recommendation", status: "Awaiting approval" },
    ],
    problemKicker: "Problem",
    problemTitle: "Most people lose track before they lose money.",
    problemPoints: [
      "You do not have a clear view of what you pay for every month.",
      "Cancellation is annoying, so unused subscriptions stay alive.",
      "Renewals and price hikes get noticed only after payment happens.",
    ],
    solutionKicker: "Solution",
    solutionTitle: "econ continuously reads spend and organizes the next best action.",
    solutionBody:
      "It turns card activity, invoices, and payment signals into a clean subscription view, cost increase alerts, and savings opportunities.",
    solutionNote: "Detection is automatic. Execution only happens after your approval.",
    outputsKicker: "What econ finds",
    outputsTitle: "A clear operating view of recurring spend",
    outputs: [
      {
        title: "Subscription detection",
        body: "Find repeated charges across card statements, invoices, and bank activity.",
      },
      {
        title: "Cost increase alerts",
        body: "Spot silent price changes before they become normal.",
      },
      {
        title: "Cancel recommendation",
        body: "Surface low-value contracts that should not renew.",
      },
      {
        title: "Downgrade or refund suggestion",
        body: "Catch cases where a cheaper plan or recovery action makes sense.",
      },
    ],
    stepsKicker: "How it works",
    stepsTitle: "Simple flow, human approval at the end",
    steps: [
      "Connect Stripe, card statements, billing emails, and bank statements.",
      "econ detects recurring spend and subscription candidates automatically.",
      "Renewals, price increases, and unnecessary contracts are sorted into proposals.",
      "Nothing changes until you review and approve the action.",
    ],
    trustKicker: "Trust",
    trustTitle: "Control stays with you",
    trustItems: [
      "Review the full decision history any time.",
      "See the reason behind every proposal.",
      "Automatic actions run only after explicit approval.",
    ],
    faqKicker: "FAQ",
    faqTitle: "Common questions",
    faqs: [
      {
        question: "Will econ cancel things without asking?",
        answer: "No. Every cancellation or change waits for your approval first.",
      },
      {
        question: "Is the data safe?",
        answer: "econ reads only the financial data needed to analyze spend and does not resell it to third parties.",
      },
      {
        question: "Does this work for Japan too?",
        answer: "Yes. Detection is designed around card statements, invoices, and bank statements, including Japanese payment flows.",
      },
    ],
    closingTitle: "econ keeps working quietly in the background as your financial partner.",
    closingBody: "Start with visibility. Then act on the right savings opportunities with confidence.",
    closingNote: "English and Japanese are included first. Add more languages after traction shows where demand actually is.",
    footer: "Built for clarity, approval, and calmer money decisions.",
    waitlistLabel: "Email",
    waitlistPlaceholder: "you@example.com",
    waitlistButton: "Join the waitlist",
    waitlistMicrocopy: "Early access starts with a simple email. No spam, no automatic charges.",
    waitlistMessages: {
      success: "You are on the waitlist. We will reach out when early access opens.",
      exists: "This email is already on the waitlist.",
      invalid: "Enter a valid email address.",
      error: "Something went wrong. Try again in a moment.",
    },
  },
  ja: {
    localeLabel: "日本語",
    navTagline: "あなたの財務パートナー",
    heroEyebrow: "See where your money is going.",
    heroTitle: "家計とサブスクを自動で管理する、あなたのパートナー。",
    heroBody:
      "カード明細、Stripe、請求メール、銀行明細をつなぐだけ。econ が更新、値上げ、不要な支出を静かに見張り、気づく前に整理します。",
    primaryCta: "Start for free",
    secondaryCta: "仕組みを見る",
    heroSteps: ["接続", "自動検出", "提案を確認"],
    heroPanelTitle: "支出レビュー",
    heroPanelItems: [
      { label: "継続課金を検出", status: "Detected" },
      { label: "値上げを検知", status: "Needs review" },
      { label: "解約候補を整理", status: "Awaiting approval" },
    ],
    problemKicker: "Problem",
    problemTitle: "見えないまま払い続ける状態が、いちばん強い損失です。",
    problemPoints: [
      "何に毎月いくら払っているのか分からない。",
      "解約手続きが面倒で、使っていないサブスクも放置してしまう。",
      "更新や値上げに気づいたときには、すでに支払いが発生している。",
    ],
    solutionKicker: "Solution",
    solutionTitle: "econ は支出を継続的に読み取り、次に見るべき判断を整理します。",
    solutionBody:
      "カード利用、請求書、メール、銀行明細からサブスク一覧、コスト増加、削減候補をまとめて見える状態にします。",
    solutionNote: "検出は自動。実行は、あなたの承認後だけです。",
    outputsKicker: "What econ finds",
    outputsTitle: "継続支出を、行動しやすい単位で整理します",
    outputs: [
      {
        title: "Subscription detection",
        body: "カード明細、請求書、銀行明細にまたがる継続課金を自動で拾います。",
      },
      {
        title: "Cost increase alerts",
        body: "気づきにくい値上げを、当たり前になる前に検知します。",
      },
      {
        title: "Cancel recommendation",
        body: "使っていない、または価値の薄い契約を更新前に浮かび上がらせます。",
      },
      {
        title: "Downgrade or refund suggestion",
        body: "より安いプランや返金交渉の余地がある支出を示します。",
      },
    ],
    stepsKicker: "How it works",
    stepsTitle: "流れはシンプル。最後の判断は人が持つ",
    steps: [
      "Stripe、カード明細、請求書メール、銀行明細を接続します。",
      "econ が継続支出とサブスク候補を自動で検出します。",
      "更新、値上げ、不要な契約を提案として整理します。",
      "解約や変更は、あなたの確認後にだけ実行されます。",
    ],
    trustKicker: "Trust",
    trustTitle: "主導権は、常にあなた側にあります",
    trustItems: [
      "すべての判断履歴を確認できます。",
      "提案理由をいつでも確認できます。",
      "自動処理はあなたの承認後のみです。",
    ],
    faqKicker: "FAQ",
    faqTitle: "よくある質問",
    faqs: [
      {
        question: "勝手に解約されますか？",
        answer: "いいえ。解約や変更は必ず承認後に実行されます。",
      },
      {
        question: "データは安全ですか？",
        answer: "必要な金融データのみを読み取り、第三者提供はしません。",
      },
      {
        question: "日本の支払いにも対応しますか？",
        answer: "はい。カード、請求書、銀行明細を軸に、日本の支払いフローも含めて検出します。",
      },
    ],
    closingTitle: "econ は裏側で動き続ける、あなたの財務パートナーです。",
    closingBody: "まずはお金の流れを見える状態にし、そのあとで削減や変更を正しく判断できます。",
    closingNote: "まずは英語と日本語で十分です。中国語は実需が見えてから追加する方が設計も運用もぶれません。",
    footer: "理解から始めて、承認で終える。静かな財務オペレーション。",
    waitlistLabel: "メールアドレス",
    waitlistPlaceholder: "you@example.com",
    waitlistButton: "ウェイトリストに参加",
    waitlistMicrocopy: "まずはメールだけで十分です。スパム送信や自動課金はありません。",
    waitlistMessages: {
      success: "ウェイトリストに登録しました。早期アクセス開始時に連絡します。",
      exists: "このメールアドレスはすでに登録済みです。",
      invalid: "有効なメールアドレスを入力してください。",
      error: "エラーが発生しました。少し待ってから再度お試しください。",
    },
  },
};

export function resolveLandingLocale(langParam: string | undefined, acceptLanguage: string | undefined): LandingLocale {
  if (langParam === "ja" || langParam === "en") {
    return langParam;
  }

  if (acceptLanguage?.toLowerCase().startsWith("ja")) {
    return "ja";
  }

  return "en";
}

export function renderLandingPage(locale: LandingLocale, waitlistStatus: WaitlistStatus = "idle"): string {
  const copy = copyByLocale[locale];
  const otherLocale = locale === "en" ? "ja" : "en";
  const waitlistMessage = waitlistStatus === "idle" ? "" : copy.waitlistMessages[waitlistStatus];
  const waitlistStateClass = waitlistStatus === "success" ? "waitlist-feedback success" : "waitlist-feedback";

  return `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>econ</title>
    <meta
      name="description"
      content="${copy.heroEyebrow} ${copy.heroTitle} ${copy.heroBody}"
    />
    <style>
      :root {
        color-scheme: light;
        --bg: #f5f7fb;
        --panel: rgba(255, 255, 255, 0.82);
        --panel-strong: #ffffff;
        --text: #111827;
        --muted: #526074;
        --line: rgba(148, 163, 184, 0.24);
        --accent: #2563eb;
        --accent-soft: rgba(37, 99, 235, 0.12);
        --shadow: 0 24px 80px rgba(15, 23, 42, 0.10);
        --radius-xl: 28px;
        --radius-lg: 22px;
        --radius-md: 18px;
        --max: 1120px;
      }

      * {
        box-sizing: border-box;
      }

      html {
        scroll-behavior: smooth;
      }

      body {
        margin: 0;
        font-family: "SF Pro Display", "SF Pro Text", "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top, rgba(37, 99, 235, 0.14), transparent 32%),
          linear-gradient(180deg, #fbfdff 0%, #f5f7fb 56%, #eef3fb 100%);
        color: var(--text);
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      .shell {
        width: min(calc(100% - 32px), var(--max));
        margin: 0 auto;
      }

      .nav {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 24px 0 10px;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .brand-mark {
        width: 40px;
        height: 40px;
        border-radius: 14px;
        background: linear-gradient(135deg, #111827 0%, #2563eb 100%);
        color: #fff;
        display: grid;
        place-items: center;
        font-weight: 700;
      }

      .brand-copy {
        display: grid;
        gap: 2px;
      }

      .brand-copy strong {
        font-size: 1rem;
        letter-spacing: -0.02em;
      }

      .brand-copy span,
      .meta,
      .kicker,
      .lede,
      .point,
      .step,
      .faq summary span:last-child,
      .faq p,
      .footer {
        color: var(--muted);
      }

      .lang-switch {
        display: inline-flex;
        gap: 8px;
        padding: 6px;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.75);
        backdrop-filter: blur(18px);
      }

      .lang-switch a {
        padding: 8px 14px;
        border-radius: 999px;
        font-size: 0.95rem;
      }

      .lang-switch a.active {
        background: #111827;
        color: #fff;
      }

      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1.15fr) minmax(300px, 0.85fr);
        gap: 28px;
        padding: 32px 0 88px;
        align-items: center;
      }

      .hero-card,
      .section-card,
      .metric-card,
      .faq details {
        background: var(--panel);
        border: 1px solid rgba(255, 255, 255, 0.72);
        box-shadow: var(--shadow);
        backdrop-filter: blur(18px);
      }

      .hero-card {
        padding: 28px;
        border-radius: var(--radius-xl);
      }

      .hero h1,
      h2,
      h3 {
        letter-spacing: -0.035em;
        margin: 0;
      }

      .hero h1 {
        font-size: clamp(3rem, 8vw, 5.6rem);
        line-height: 0.94;
        max-width: 11ch;
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent);
        font-size: 0.95rem;
        margin-bottom: 18px;
      }

      .eyebrow::before {
        content: "";
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: currentColor;
      }

      .lede {
        max-width: 58ch;
        font-size: 1.08rem;
        line-height: 1.7;
        margin: 22px 0 0;
      }

      .hero-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        margin-top: 28px;
      }

      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 48px;
        padding: 0 18px;
        border-radius: 999px;
        font-weight: 600;
      }

      .button-primary {
        background: #111827;
        color: #fff;
      }

      .button-secondary {
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.68);
      }

      .step-strip {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 24px;
      }

      .step-chip {
        padding: 10px 14px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.8);
        border: 1px solid var(--line);
        font-size: 0.95rem;
      }

      .dashboard {
        position: relative;
        padding: 26px;
        border-radius: 32px;
        background:
          linear-gradient(160deg, rgba(37, 99, 235, 0.14), rgba(255, 255, 255, 0.78)),
          rgba(255, 255, 255, 0.88);
        border: 1px solid rgba(255, 255, 255, 0.74);
        box-shadow: var(--shadow);
        min-height: 420px;
        overflow: hidden;
      }

      .dashboard::after {
        content: "";
        position: absolute;
        inset: auto -60px -80px auto;
        width: 240px;
        height: 240px;
        background: radial-gradient(circle, rgba(37, 99, 235, 0.22), transparent 68%);
      }

      .meta {
        font-size: 0.95rem;
        margin-top: 6px;
      }

      .metrics {
        display: grid;
        gap: 14px;
        margin-top: 26px;
      }

      .metric-card {
        position: relative;
        padding: 18px 18px 20px;
        border-radius: var(--radius-md);
      }

      .metric-card strong {
        display: block;
        font-size: 1.05rem;
        margin-bottom: 8px;
      }

      .metric-status {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 0.92rem;
        color: var(--accent);
      }

      .metric-status::before {
        content: "";
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: currentColor;
      }

      section {
        padding: 0 0 84px;
      }

      .section-card {
        border-radius: var(--radius-xl);
        padding: 28px;
      }

      .section-head {
        margin-bottom: 24px;
        max-width: 60ch;
      }

      .kicker {
        text-transform: uppercase;
        letter-spacing: 0.14em;
        font-size: 0.78rem;
        margin-bottom: 14px;
      }

      h2 {
        font-size: clamp(2rem, 5vw, 3.2rem);
        line-height: 1.02;
      }

      .grid-3,
      .grid-4,
      .steps-grid,
      .trust-grid {
        display: grid;
        gap: 16px;
      }

      .grid-3 {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .grid-4 {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .steps-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .trust-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .panel {
        padding: 22px;
        border-radius: var(--radius-lg);
        background: var(--panel-strong);
        border: 1px solid var(--line);
      }

      .panel strong,
      .panel h3 {
        font-size: 1.05rem;
        margin-bottom: 10px;
        display: block;
      }

      .point,
      .step,
      .panel p {
        margin: 0;
        line-height: 1.65;
      }

      .solution-note {
        margin-top: 20px;
        padding: 18px 20px;
        border-radius: var(--radius-md);
        background: linear-gradient(135deg, rgba(37, 99, 235, 0.10), rgba(15, 23, 42, 0.04));
        border: 1px solid rgba(37, 99, 235, 0.14);
        color: #153e75;
        font-weight: 600;
      }

      .step-number {
        display: inline-grid;
        place-items: center;
        width: 34px;
        height: 34px;
        border-radius: 999px;
        background: #111827;
        color: #fff;
        font-size: 0.95rem;
        margin-bottom: 14px;
      }

      .faq {
        display: grid;
        gap: 12px;
      }

      .faq details {
        border-radius: var(--radius-md);
        padding: 0 20px;
      }

      .faq summary {
        list-style: none;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        padding: 20px 0;
        font-weight: 600;
        cursor: pointer;
      }

      .faq summary::-webkit-details-marker {
        display: none;
      }

      .faq p {
        margin: 0 0 20px;
        line-height: 1.7;
      }

      .cta {
        padding-bottom: 52px;
      }

      .cta-card {
        padding: 34px;
        border-radius: 34px;
        background:
          linear-gradient(145deg, rgba(17, 24, 39, 0.96), rgba(30, 64, 175, 0.92)),
          #111827;
        color: #fff;
        box-shadow: 0 28px 90px rgba(15, 23, 42, 0.28);
      }

      .cta-card .kicker,
      .cta-card .meta,
      .cta-card .footer {
        color: rgba(255, 255, 255, 0.72);
      }

      .cta-actions {
        display: grid;
        gap: 16px;
        margin-top: 24px;
      }

      .cta-card .button-primary {
        background: #fff;
        color: #111827;
      }

      .cta-card .button-secondary {
        border-color: rgba(255, 255, 255, 0.18);
        background: rgba(255, 255, 255, 0.08);
        color: #fff;
      }

      .footer {
        margin-top: 16px;
        font-size: 0.95rem;
      }

      .waitlist-form {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 12px;
      }

      .waitlist-field {
        display: grid;
        gap: 8px;
      }

      .waitlist-field label {
        font-size: 0.92rem;
        color: rgba(255, 255, 255, 0.78);
      }

      .waitlist-field input {
        width: 100%;
        min-height: 52px;
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.18);
        background: rgba(255, 255, 255, 0.10);
        color: #fff;
        padding: 0 16px;
        font: inherit;
      }

      .waitlist-field input::placeholder {
        color: rgba(255, 255, 255, 0.44);
      }

      .waitlist-feedback {
        margin: 0;
        padding: 12px 14px;
        border-radius: 14px;
        background: rgba(248, 113, 113, 0.14);
        color: #fee2e2;
        border: 1px solid rgba(248, 113, 113, 0.24);
      }

      .waitlist-feedback.success {
        background: rgba(134, 239, 172, 0.14);
        color: #dcfce7;
        border-color: rgba(134, 239, 172, 0.24);
      }

      @media (max-width: 960px) {
        .hero,
        .grid-4,
        .grid-3,
        .steps-grid,
        .trust-grid {
          grid-template-columns: 1fr;
        }

        .hero h1 {
          max-width: 100%;
        }
      }

      @media (max-width: 640px) {
        .shell {
          width: min(calc(100% - 20px), var(--max));
        }

        .nav {
          flex-direction: column;
          align-items: flex-start;
          gap: 16px;
        }

        .hero {
          padding-top: 12px;
          padding-bottom: 56px;
        }

        .hero-card,
        .section-card,
        .cta-card,
        .dashboard {
          padding: 22px;
        }

        .button,
        .lang-switch {
          width: 100%;
        }

        .waitlist-form {
          grid-template-columns: 1fr;
        }

        .lang-switch {
          justify-content: space-between;
        }

        .lang-switch a {
          flex: 1;
          text-align: center;
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <nav class="nav">
        <div class="brand">
          <div class="brand-mark">e</div>
          <div class="brand-copy">
            <strong>econ</strong>
            <span>${copy.navTagline}</span>
          </div>
        </div>
        <div class="lang-switch" aria-label="Language switch">
          <a class="${locale === "en" ? "active" : ""}" href="/?lang=en">English</a>
          <a class="${locale === "ja" ? "active" : ""}" href="/?lang=ja">日本語</a>
        </div>
      </nav>

      <main>
        <section class="hero">
          <div class="hero-card">
            <div class="eyebrow">${copy.heroEyebrow}</div>
            <h1>${copy.heroTitle}</h1>
            <p class="lede">${copy.heroBody}</p>
            <div class="hero-actions">
              <a class="button button-primary" href="#cta">${copy.primaryCta}</a>
              <a class="button button-secondary" href="#how-it-works">${copy.secondaryCta}</a>
            </div>
            <div class="step-strip">
              ${copy.heroSteps.map((step) => `<span class="step-chip">${step}</span>`).join("")}
            </div>
          </div>

          <aside class="dashboard" aria-label="${copy.heroPanelTitle}">
            <strong>${copy.heroPanelTitle}</strong>
            <div class="meta">${copy.localeLabel}</div>
            <div class="metrics">
              ${copy.heroPanelItems
                .map(
                  (item) => `
                    <div class="metric-card">
                      <strong>${item.label}</strong>
                      <span class="metric-status">${item.status}</span>
                    </div>`,
                )
                .join("")}
            </div>
          </aside>
        </section>

        <section>
          <div class="section-card">
            <div class="section-head">
              <div class="kicker">${copy.problemKicker}</div>
              <h2>${copy.problemTitle}</h2>
            </div>
            <div class="grid-3">
              ${copy.problemPoints
                .map(
                  (point) => `
                    <article class="panel">
                      <strong>${copy.problemKicker}</strong>
                      <p class="point">${point}</p>
                    </article>`,
                )
                .join("")}
            </div>
          </div>
        </section>

        <section>
          <div class="section-card">
            <div class="section-head">
              <div class="kicker">${copy.solutionKicker}</div>
              <h2>${copy.solutionTitle}</h2>
              <p class="lede">${copy.solutionBody}</p>
            </div>
            <div class="solution-note">${copy.solutionNote}</div>
          </div>
        </section>

        <section>
          <div class="section-card">
            <div class="section-head">
              <div class="kicker">${copy.outputsKicker}</div>
              <h2>${copy.outputsTitle}</h2>
            </div>
            <div class="grid-4">
              ${copy.outputs
                .map(
                  (item) => `
                    <article class="panel">
                      <h3>${item.title}</h3>
                      <p>${item.body}</p>
                    </article>`,
                )
                .join("")}
            </div>
          </div>
        </section>

        <section id="how-it-works">
          <div class="section-card">
            <div class="section-head">
              <div class="kicker">${copy.stepsKicker}</div>
              <h2>${copy.stepsTitle}</h2>
            </div>
            <div class="steps-grid">
              ${copy.steps
                .map(
                  (step, index) => `
                    <article class="panel">
                      <div class="step-number">${index + 1}</div>
                      <p class="step">${step}</p>
                    </article>`,
                )
                .join("")}
            </div>
          </div>
        </section>

        <section>
          <div class="section-card">
            <div class="section-head">
              <div class="kicker">${copy.trustKicker}</div>
              <h2>${copy.trustTitle}</h2>
            </div>
            <div class="trust-grid">
              ${copy.trustItems
                .map(
                  (item) => `
                    <article class="panel">
                      <strong>${copy.trustKicker}</strong>
                      <p>${item}</p>
                    </article>`,
                )
                .join("")}
            </div>
          </div>
        </section>

        <section>
          <div class="section-card">
            <div class="section-head">
              <div class="kicker">${copy.faqKicker}</div>
              <h2>${copy.faqTitle}</h2>
            </div>
            <div class="faq">
              ${copy.faqs
                .map(
                  (item, index) => `
                    <details ${index === 0 ? "open" : ""}>
                      <summary>
                        <span>${item.question}</span>
                        <span>+</span>
                      </summary>
                      <p>${item.answer}</p>
                    </details>`,
                )
                .join("")}
            </div>
          </div>
        </section>

        <section id="cta" class="cta">
          <div class="cta-card">
            <div class="kicker">CTA</div>
            <h2>${copy.closingTitle}</h2>
            <p class="lede">${copy.closingBody}</p>
            <div class="cta-actions">
              <form class="waitlist-form" method="post" action="/waitlist">
                <input type="hidden" name="locale" value="${locale}" />
                <div class="waitlist-field">
                  <label for="email">${copy.waitlistLabel}</label>
                  <input id="email" name="email" type="email" placeholder="${copy.waitlistPlaceholder}" required />
                </div>
                <button class="button button-primary" type="submit">${copy.waitlistButton}</button>
              </form>
              ${waitlistMessage ? `<p class="${waitlistStateClass}">${waitlistMessage}</p>` : ""}
              <a class="button button-secondary" href="/?lang=${otherLocale}#cta">
                ${otherLocale === "en" ? "View in English" : "日本語で見る"}
              </a>
            </div>
            <p class="meta">${copy.waitlistMicrocopy}</p>
            <p class="meta">${copy.closingNote}</p>
            <div class="footer">${copy.footer}</div>
          </div>
        </section>
      </main>
    </div>
  </body>
</html>`;
}
