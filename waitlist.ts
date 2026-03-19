export type WaitlistLocale = "en" | "ja";

export type WaitlistStatus = "idle" | "success" | "exists" | "invalid" | "error";

export type WaitlistInput = {
  email: string;
  locale: WaitlistLocale;
  sourcePath: string;
  userAgent: string | null;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeWaitlistLocale(value: string | undefined): WaitlistLocale {
  return value === "ja" ? "ja" : "en";
}

export function normalizeWaitlistEmail(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function isValidWaitlistEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

export function resolveWaitlistStatus(value: string | undefined): WaitlistStatus {
  switch (value) {
    case "success":
    case "exists":
    case "invalid":
    case "error":
      return value;
    default:
      return "idle";
  }
}

export function buildWaitlistRedirect(locale: WaitlistLocale, status: Exclude<WaitlistStatus, "idle">): string {
  return `/?lang=${locale}&waitlist=${status}#cta`;
}
