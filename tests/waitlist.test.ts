import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWaitlistRedirect,
  isValidWaitlistEmail,
  normalizeWaitlistEmail,
  normalizeWaitlistLocale,
  resolveWaitlistStatus,
} from "../waitlist";

test("normalizeWaitlistEmail trims and lowercases", () => {
  assert.equal(normalizeWaitlistEmail("  Hello+Test@Example.COM "), "hello+test@example.com");
});

test("isValidWaitlistEmail accepts basic valid addresses", () => {
  assert.equal(isValidWaitlistEmail("hello@example.com"), true);
  assert.equal(isValidWaitlistEmail("not-an-email"), false);
});

test("normalizeWaitlistLocale defaults to english", () => {
  assert.equal(normalizeWaitlistLocale("ja"), "ja");
  assert.equal(normalizeWaitlistLocale("zh"), "en");
});

test("resolveWaitlistStatus handles known query values", () => {
  assert.equal(resolveWaitlistStatus("success"), "success");
  assert.equal(resolveWaitlistStatus("weird"), "idle");
});

test("buildWaitlistRedirect keeps locale and target section", () => {
  assert.equal(buildWaitlistRedirect("ja", "exists"), "/?lang=ja&waitlist=exists#cta");
});
