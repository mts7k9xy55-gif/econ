import test from "node:test";
import assert from "node:assert/strict";
import { renderAppPage } from "../app-page";

test("renderAppPage includes app data endpoints", () => {
  const page = renderAppPage("en");
  assert.match(page, /\/balances\?limit=6/);
  assert.match(page, /\/cashflow\?limit=6/);
  assert.match(page, /\/action-queue\?limit=6/);
});

test("renderAppPage includes Japanese copy", () => {
  const page = renderAppPage("ja");
  assert.match(page, /アプリ接続済み/);
  assert.match(page, /キャッシュフロー/);
});
