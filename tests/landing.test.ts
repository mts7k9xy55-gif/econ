import test from "node:test";
import assert from "node:assert/strict";
import { renderLandingPage, resolveLandingLocale } from "../landing";

test("resolveLandingLocale prefers explicit query parameter", () => {
  assert.equal(resolveLandingLocale("ja", "en-US,en;q=0.9"), "ja");
  assert.equal(resolveLandingLocale("en", "ja-JP,ja;q=0.9"), "en");
});

test("resolveLandingLocale falls back to Accept-Language", () => {
  assert.equal(resolveLandingLocale(undefined, "ja-JP,ja;q=0.9"), "ja");
  assert.equal(resolveLandingLocale(undefined, "en-US,en;q=0.9"), "en");
});

test("renderLandingPage includes Japanese hero copy", () => {
  const page = renderLandingPage("ja");
  assert.match(page, /家計とサブスクを自動で管理する、あなたのパートナー。/);
  assert.match(page, /See where your money is going\./);
});

test("renderLandingPage includes English trust copy", () => {
  const page = renderLandingPage("en");
  assert.match(page, /Control stays with you/);
  assert.match(page, /Start for free/);
});

test("renderLandingPage links primary CTA to app", () => {
  const page = renderLandingPage("en");
  assert.match(page, /href="\/app\?lang=en"/);
  assert.match(page, /Start for free/);
});
