/**
 * Legal & Compliance Configuration
 * Enforces production build failure unless NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL is set to a real address in Vercel.
 */

export const PRIVACY_CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL ||
  (process.env.NODE_ENV !== "production" ? "support-dev@lifemaxxing.internal" : "");

if (process.env.NODE_ENV === "production") {
  const email = process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL;
  if (
    !email ||
    !email.includes("@") ||
    email.includes("placeholder") ||
    email.includes("example.com") ||
    email.trim() === "support@lifemaxxing.app"
  ) {
    throw new Error(
      `[FATAL] Production build failed: NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL is required in production and must be set to a real contact email in Vercel. Provided: "${email || ""}"`
    );
  }
}
