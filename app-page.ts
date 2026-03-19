type AppLocale = "en" | "ja";

type AppCopy = {
  eyebrow: string;
  title: string;
  body: string;
  refresh: string;
  back: string;
  balances: string;
  cashflow: string;
  queue: string;
  activeBuckets: string;
  latestPeriods: string;
  pendingActions: string;
  totalNet: string;
  latestMonth: string;
  queueState: string;
  empty: string;
  loading: string;
};

const appCopy: Record<AppLocale, AppCopy> = {
  en: {
    eyebrow: "Connected to the app",
    title: "econ app",
    body: "A live readout of balances, monthly cashflow, and queued actions from the current Worker backend.",
    refresh: "Refresh data",
    back: "Back to landing page",
    balances: "Balances",
    cashflow: "Cashflow",
    queue: "Action queue",
    activeBuckets: "Balance buckets",
    latestPeriods: "Cashflow periods",
    pendingActions: "Queued actions",
    totalNet: "Total net balance",
    latestMonth: "Latest monthly net",
    queueState: "Latest queue status",
    empty: "No data yet",
    loading: "Loading...",
  },
  ja: {
    eyebrow: "アプリ接続済み",
    title: "econ app",
    body: "現在の Worker バックエンドから、残高・月次キャッシュフロー・実行キューをそのまま読み出す最小ビューです。",
    refresh: "再読み込み",
    back: "LPに戻る",
    balances: "残高",
    cashflow: "キャッシュフロー",
    queue: "アクションキュー",
    activeBuckets: "残高カテゴリ数",
    latestPeriods: "キャッシュフロー期間数",
    pendingActions: "キュー済みアクション",
    totalNet: "合計ネット残高",
    latestMonth: "最新月の純額",
    queueState: "最新キュー状態",
    empty: "まだデータがありません",
    loading: "読み込み中...",
  },
};

export function renderAppPage(locale: AppLocale): string {
  const copy = appCopy[locale];

  return `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>econ app</title>
    <style>
      :root {
        color-scheme: light;
        --panel: rgba(255, 255, 255, 0.84);
        --panel-strong: #ffffff;
        --text: #111827;
        --muted: #5b6677;
        --line: rgba(148, 163, 184, 0.22);
        --accent: #2563eb;
        --shadow: 0 28px 90px rgba(15, 23, 42, 0.10);
        --max: 1180px;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        font-family: "SF Pro Display", "SF Pro Text", "Segoe UI", sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top, rgba(37, 99, 235, 0.12), transparent 32%),
          linear-gradient(180deg, #f9fbff 0%, #f3f6fb 100%);
      }

      a { color: inherit; text-decoration: none; }
      button { font: inherit; cursor: pointer; }

      .shell { width: min(calc(100% - 32px), var(--max)); margin: 0 auto; }

      .nav {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 24px 0 8px;
      }

      .brand { display: flex; align-items: center; gap: 12px; }

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

      .nav-actions {
        display: flex;
        gap: 10px;
        align-items: center;
      }

      .pill, .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 46px;
        padding: 0 16px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.78);
      }

      .button-primary {
        background: #111827;
        border-color: #111827;
        color: #fff;
      }

      .hero { padding: 28px 0 34px; }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        border-radius: 999px;
        background: rgba(37, 99, 235, 0.10);
        color: var(--accent);
        font-size: 0.94rem;
        margin-bottom: 18px;
      }

      .eyebrow::before {
        content: "";
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: currentColor;
      }

      h1, h2, h3 { margin: 0; letter-spacing: -0.035em; }

      h1 {
        font-size: clamp(2.8rem, 7vw, 5rem);
        line-height: 0.95;
      }

      .lede {
        max-width: 62ch;
        margin: 18px 0 0;
        color: var(--muted);
        font-size: 1.05rem;
        line-height: 1.7;
      }

      .summary-grid, .panel-grid { display: grid; gap: 16px; }

      .summary-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
        margin: 26px 0 42px;
      }

      .panel-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        padding-bottom: 56px;
      }

      .card, .panel {
        background: var(--panel);
        border: 1px solid rgba(255, 255, 255, 0.76);
        box-shadow: var(--shadow);
        backdrop-filter: blur(18px);
      }

      .card {
        border-radius: 24px;
        padding: 20px;
      }

      .card-label, .panel-subtitle, .muted, .row small { color: var(--muted); }
      .card-value { font-size: 2rem; font-weight: 700; margin-top: 10px; }

      .panel {
        border-radius: 28px;
        padding: 22px;
      }

      .panel-subtitle { margin-top: 8px; margin-bottom: 18px; line-height: 1.6; }
      .rows { display: grid; gap: 12px; }

      .row {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
        padding: 14px 16px;
        border-radius: 18px;
        background: var(--panel-strong);
        border: 1px solid var(--line);
      }

      .row strong { display: block; margin-bottom: 4px; }

      .status {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: var(--accent);
        font-size: 0.92rem;
      }

      .status::before {
        content: "";
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: currentColor;
      }

      @media (max-width: 1024px) {
        .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .panel-grid { grid-template-columns: 1fr; }
      }

      @media (max-width: 640px) {
        .shell { width: min(calc(100% - 20px), var(--max)); }
        .nav { flex-direction: column; align-items: flex-start; gap: 12px; }
        .nav-actions, .summary-grid { width: 100%; }
        .nav-actions { flex-wrap: wrap; }
        .pill, .button { width: 100%; }
        .summary-grid { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <nav class="nav">
        <div class="brand">
          <div class="brand-mark">e</div>
          <div>
            <strong>econ</strong>
            <div class="muted">${copy.eyebrow}</div>
          </div>
        </div>
        <div class="nav-actions">
          <a class="pill" href="/?lang=${locale}">${copy.back}</a>
          <a class="pill" href="/app?lang=en">EN</a>
          <a class="pill" href="/app?lang=ja">JA</a>
          <button id="refreshButton" class="button button-primary" type="button">${copy.refresh}</button>
        </div>
      </nav>

      <main class="hero">
        <div class="eyebrow">${copy.eyebrow}</div>
        <h1>${copy.title}</h1>
        <p class="lede">${copy.body}</p>

        <section class="summary-grid">
          <article class="card">
            <div class="card-label">${copy.activeBuckets}</div>
            <div id="balanceCount" class="card-value">${copy.loading}</div>
          </article>
          <article class="card">
            <div class="card-label">${copy.latestPeriods}</div>
            <div id="cashflowCount" class="card-value">${copy.loading}</div>
          </article>
          <article class="card">
            <div class="card-label">${copy.pendingActions}</div>
            <div id="queueCount" class="card-value">${copy.loading}</div>
          </article>
          <article class="card">
            <div class="card-label">${copy.latestMonth}</div>
            <div id="latestNet" class="card-value">${copy.loading}</div>
          </article>
        </section>

        <section class="panel-grid">
          <article class="panel">
            <h2>${copy.balances}</h2>
            <p class="panel-subtitle">${copy.totalNet}</p>
            <div id="balancesRows" class="rows"><div class="row"><span>${copy.loading}</span></div></div>
          </article>
          <article class="panel">
            <h2>${copy.cashflow}</h2>
            <p class="panel-subtitle">${copy.latestMonth}</p>
            <div id="cashflowRows" class="rows"><div class="row"><span>${copy.loading}</span></div></div>
          </article>
          <article class="panel">
            <h2>${copy.queue}</h2>
            <p class="panel-subtitle">${copy.queueState}</p>
            <div id="queueRows" class="rows"><div class="row"><span>${copy.loading}</span></div></div>
          </article>
        </section>
      </main>
    </div>

    <script>
      const copy = ${JSON.stringify(copy)};
      const locale = ${JSON.stringify(locale)};
      const endpoints = {
        balances: "/balances?limit=6",
        cashflow: "/cashflow?limit=6",
        queue: "/action-queue?limit=6"
      };

      const formatAmount = (value, currency) => {
        if (typeof value !== "number" || Number.isNaN(value)) return copy.empty;
        const resolvedCurrency = typeof currency === "string" && currency ? currency : "USD";
        return new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", {
          style: "currency",
          currency: resolvedCurrency,
          maximumFractionDigits: 0
        }).format(value);
      };

      const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
      };

      const renderRows = (id, rows, renderer) => {
        const container = document.getElementById(id);
        if (!container) return;
        if (!Array.isArray(rows) || rows.length === 0) {
          container.innerHTML = '<div class="row"><span>' + copy.empty + '</span></div>';
          return;
        }
        container.innerHTML = rows.map(renderer).join("");
      };

      async function loadDashboard() {
        try {
          const [balancesResponse, cashflowResponse, queueResponse] = await Promise.all([
            fetch(endpoints.balances),
            fetch(endpoints.cashflow),
            fetch(endpoints.queue)
          ]);

          const [balancesData, cashflowData, queueData] = await Promise.all([
            balancesResponse.json(),
            cashflowResponse.json(),
            queueResponse.json()
          ]);

          const balances = Array.isArray(balancesData.results) ? balancesData.results : [];
          const cashflow = Array.isArray(cashflowData.results) ? cashflowData.results : [];
          const queueResults = Array.isArray(queueData.results) ? queueData.results : [];
          const queueSummary = queueData.summary || {};

          setText("balanceCount", String(balances.length));
          setText("cashflowCount", String(cashflow.length));
          setText("queueCount", String(Number(queueSummary.queued || 0)));
          setText("latestNet", cashflow[0] ? formatAmount(cashflow[0].net_amount, cashflow[0].currency) : copy.empty);

          renderRows("balancesRows", balances, (row) => {
            return '<div class="row">' +
              '<div><strong>' + (row.category || "uncategorized") + '</strong><small>' + (row.currency || "USD") + '</small></div>' +
              '<div class="status">' + formatAmount(row.net_amount, row.currency) + '</div>' +
            '</div>';
          });

          renderRows("cashflowRows", cashflow, (row) => {
            return '<div class="row">' +
              '<div><strong>' + row.period + '</strong><small>in: ' + formatAmount(row.inflow_amount, row.currency) + ' / out: ' + formatAmount(row.outflow_amount, row.currency) + '</small></div>' +
              '<div class="status">' + formatAmount(row.net_amount, row.currency) + '</div>' +
            '</div>';
          });

          renderRows("queueRows", queueResults, (row) => {
            return '<div class="row">' +
              '<div><strong>' + row.type + '</strong><small>' + (row.executionAction || row.decisionAction || copy.empty) + '</small></div>' +
              '<div class="status">' + (row.status || copy.empty) + '</div>' +
            '</div>';
          });
        } catch (error) {
          console.error(error);
          ["balanceCount", "cashflowCount", "queueCount", "latestNet"].forEach((id) => setText(id, copy.empty));
          ["balancesRows", "cashflowRows", "queueRows"].forEach((id) => {
            const container = document.getElementById(id);
            if (container) container.innerHTML = '<div class="row"><span>' + copy.empty + '</span></div>';
          });
        }
      }

      document.getElementById("refreshButton")?.addEventListener("click", loadDashboard);
      loadDashboard();
    </script>
  </body>
</html>`;
}
