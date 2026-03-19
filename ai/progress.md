# Progress
## Built
- Cloudflare Workers + D1 + Workers AI の最小ループを実装
- action executor registry と `/action-executors` を追加
- Cloudflare 本番 D1 `nonui-cfo` を作成して接続確認
- remote dev で `ledger -> AI -> action` を確認
- unified `econ_event` schema を導入
- manual / stripe event の normalization layer を追加
- rule-first evaluation と `/rules` を追加
- rule priority / stopProcessing / conflict handling を追加
- event idempotency を追加
- `relatedEventIds` と `eventVersion` を schema に追加
- rules のテストを追加
- `decisionAction` と `executionAction` を分離
- action payload に decision / execution semantics を保存
- action queue の read model を追加
- executor worker loop と retry policy を追加
- `causationId` / `correlationId` を econ_event に追加
- Stripe mapping を `invoice.payment_failed` / `customer.created` まで拡張
- `/actions/run` による queue worker 実行を追加
- actions retry column を migration 付きで整理
- Stripe webhook の local flow を `verify -> normalize -> ledger -> queue` で確認
- `payment.failed` と `customer.created` が revenue に誤分類されないよう rule / heuristic を修正
- Cloudflare 本番 Worker を deploy し `workers.dev` endpoint を有効化
- Stripe live webhook endpoint を作成し production Worker に接続
- 署名付き webhook を本番 endpoint に送って `200 OK` を確認
- `econ_event` table を source of truth として追加
- `POST /replay` と `npm run replay` を追加
- replay で ledger / actions / balances / cashflow を deterministic に rebuild できるようにした
- replay dryRun / partial replay / replay_runs logging を追加
- balances / cashflow projection と read endpoints を追加
- `/` に英日切替の LP を追加して、既存 Worker と同居させた
- LP の CTA を D1 保存の waitlist 導線に変更した

## Files changed
- `actions.ts`
- `worker.ts`
- `landing.ts`
- `waitlist.ts`
- `wrangler.toml`
- `rules.ts`
- `types.ts`
- `event.ts`
- `ledger.ts`
- `schema.sql`
- `migrations/0001_actions_retry_columns.sql`
- `migrations/0002_replay_schema.sql`
- `migrations/0003_waitlist_signups.sql`
- `package.json`
- `tests/ai.test.ts`
- `tests/rules.test.ts`
- `tests/waitlist.test.ts`
- `replay.ts`
- `scripts/replay.ts`
- `ai/protocol.md`
- `README.md`
- `tests/landing.test.ts`

## Decisions
- repo state を truth として進める
- action 実行は registry ベースで管理する
- AI より前に deterministic rule layer を評価する
- event ingestion は `econ_event` に統一してから ledger に落とす
- duplicate event は idempotency layer で早期に無視する
- rules は priority order で評価し、`stopProcessing` で打ち切る
- rules と AI は `decisionAction` だけを返し、executor が `executionAction` に変換する
- action queue は raw actions とは別に read model API で観測する
- executor は enqueue と worker 実行を分離し、retry policy を actions table に持たせる
- fresh schema と既存 DB migration を分離する
- Stripe failure / operational event は raw event type を見て heuristic fallback でも分岐する
- Stripe webhook secret は実 endpoint の signing secret に合わせて Worker secret を更新する
- econ_event を projection とは分離した source of truth にする
- replay 中は AI を deterministic heuristic に固定して LLM を呼ばない
- balances / cashflow は replay と live ingest の両方で再計算可能にする
- LP は別フロントエンドを増やさず Worker の root HTML として配信する
- 初期言語は English / Japanese に絞り、中国語は実需が見えてから追加する
- 取得導線は最小 friction を優先して email-only の waitlist から始める

## Blockers
- Stripe refund executor は未実装
- remote action worker 実行導線は未実装

## Next suggestions
- Stripe refund executor の実装
- remote action worker 実行導線の追加
- balances / cashflow から runway / monthly revenue を出す read model 拡張
