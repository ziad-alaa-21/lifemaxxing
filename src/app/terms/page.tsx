import React from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Mail, ShieldAlert, CheckCircle2 } from "lucide-react";
import { PRIVACY_CONTACT_EMAIL } from "@/lib/legalConfig";
import { AUTH_MODE } from "@/lib/authConfig";

export const metadata = {
  title: "Terms of Service • Life",
  description: "Terms and conditions for utilizing the Life productivity and wellness platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-surface text-on-surface py-12 px-4 sm:px-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-xs font-mono text-on-surface-variant hover:text-primary-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back / العودة</span>
        </Link>
      </div>

      <div className="stitch-card p-6 sm:p-10 space-y-10">
        {/* Header */}
        <div className="flex items-center gap-4 pb-6 border-b border-border-subtle">
          <div className="p-3.5 rounded-2xl bg-surface-container-high text-primary-ink border border-primary-ink/20 shadow-md">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Terms of Service</h1>
            <p className="text-sm font-arabic text-on-surface-variant mt-1" dir="rtl">
              شروط وقواعد استخدام المنصة
            </p>
          </div>
        </div>

        {/* English Section */}
        <section className="space-y-6 text-sm leading-relaxed" dir="ltr">
          <div className="flex items-center gap-2 text-primary-ink font-bold font-mono uppercase text-xs tracking-wider">
            <span>English (Official)</span>
          </div>

          <div className="space-y-4 text-on-surface">
            <p>
              By accessing or using <strong>Life</strong>, you agree to comply with and be bound by the following transparent terms:
            </p>

            <ul className="space-y-3 text-on-surface-variant list-none pl-0">
              <li className="flex items-start gap-3 p-3 rounded-2xl bg-surface-container-low border border-border-subtle">
                <CheckCircle2 className="w-5 h-5 text-primary-ink shrink-0 mt-0.5" />
                <div>
                  <strong className="text-on-surface">1. Account Authenticity & Security:</strong>{" "}
                  {AUTH_MODE === "email"
                    ? "You are responsible for maintaining the confidentiality of your email and password credentials. Any action initiated under your session is your responsibility."
                    : AUTH_MODE === "google"
                    ? "You are responsible for maintaining the confidentiality of your authenticated Google credentials. Any action initiated under your session is your responsibility."
                    : "You are responsible for maintaining the confidentiality of your sign-in credentials (email and password or authenticated Google credentials). Any action initiated under your session is your responsibility."}
                </div>
              </li>

              <li className="flex items-start gap-3 p-3 rounded-2xl bg-surface-container-low border border-border-subtle">
                <CheckCircle2 className="w-5 h-5 text-primary-ink shrink-0 mt-0.5" />
                <div>
                  <strong className="text-on-surface">2. Permitted Personal Use:</strong> Life is provided for personal habit, productivity, wellness, and self-optimization tracking. Reverse engineering, scraping, automated API bombardment, or subverting rate limits is strictly prohibited.
                </div>
              </li>

              <li className="flex items-start gap-3 p-3 rounded-2xl bg-surface-container-low border border-border-subtle">
                <ShieldAlert className="w-5 h-5 text-crimson-alert shrink-0 mt-0.5" />
                <div>
                  <strong className="text-on-surface">3. Medical & Clinical Disclaimer:</strong> Life is a wellness and self-tracking tool. It does not provide medical advice, diagnosis, treatment, or clinical nutrition prescriptions. You must not rely on the application as a substitute for professional healthcare consultations.
                </div>
              </li>

              <li className="flex items-start gap-3 p-3 rounded-2xl bg-surface-container-low border border-border-subtle">
                <CheckCircle2 className="w-5 h-5 text-primary-ink shrink-0 mt-0.5" />
                <div>
                  <strong className="text-on-surface">4. AI-Assisted Nutrition Logging:</strong> You acknowledge that AI food parsing estimations (powered by Google Gemini) are approximations for convenience and should be verified by you before logging.
                </div>
              </li>
            </ul>

            <div className="p-4 rounded-2xl bg-surface-container-high border border-border-subtle flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-on-surface">
                <Mail className="w-4 h-4 text-primary-ink" />
                <span>Contact for Terms & Compliance:</span>
              </div>
              <a
                href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
                className="text-primary-ink underline hover:text-primary-ink-dim"
              >
                {PRIVACY_CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </section>

        {/* Arabic Section */}
        <section className="space-y-6 text-sm leading-relaxed pt-8 border-t border-border-subtle" dir="rtl">
          <div className="flex items-center gap-2 text-primary-ink font-bold font-mono uppercase text-xs tracking-wider">
            <span>العربية (النسخة المعتمدة)</span>
          </div>

          <div className="space-y-4 text-on-surface">
            <p>
              باستخدامك لتطبيق <strong>لايف</strong>، فإنك توافق على الالتزام بالشروط والبنود التالية:
            </p>

            <ul className="space-y-3 text-on-surface-variant list-none pr-0">
              <li className="flex items-start gap-3 p-3 rounded-2xl bg-surface-container-low border border-border-subtle">
                <CheckCircle2 className="w-5 h-5 text-primary-ink shrink-0 mt-0.5" />
                <div>
                  <strong className="text-on-surface">١. أمان الحساب والبيانات:</strong>{" "}
                  {AUTH_MODE === "email"
                    ? "تقع على عاتقك مسؤولية الحفاظ على سرية وأمان بريدك الإلكتروني وكلمة المرور الخاصة بك. أي إجراء يتم عبر جلستك المعتمدة يعد من مسؤوليتك المباشرة."
                    : AUTH_MODE === "google"
                    ? "تقع على عاتقك مسؤولية الحفاظ على أمان حساب Google المستخدم لتسجيل الدخول. أي إجراء يتم عبر جلستك المعتمدة يعد من مسؤوليتك المباشرة."
                    : "تقع على عاتقك مسؤولية الحفاظ على أمان بيانات تسجيل الدخول الخاصة بك (البريد الإلكتروني وكلمة المرور أو حساب Google المستخدم لتسجيل الدخول). أي إجراء يتم عبر جلستك المعتمدة يعد من مسؤوليتك المباشرة."}
                </div>
              </li>

              <li className="flex items-start gap-3 p-3 rounded-2xl bg-surface-container-low border border-border-subtle">
                <CheckCircle2 className="w-5 h-5 text-primary-ink shrink-0 mt-0.5" />
                <div>
                  <strong className="text-on-surface">٢. الاستخدام الشخصي العادل:</strong> صُمم لايف لمتابعة أهدافك الشخصية وعاداتك الرياضية والذهنية. يُمنع منعاً باتاً استخراج البيانات بطرق آلية غير مصرح بها أو استهداف واجهات البرمجة بما يتجاوز حدود الاستخدام العادل.
                </div>
              </li>

              <li className="flex items-start gap-3 p-3 rounded-2xl bg-surface-container-low border border-border-subtle">
                <ShieldAlert className="w-5 h-5 text-crimson-alert shrink-0 mt-0.5" />
                <div>
                  <strong className="text-on-surface">٣. إخلاء مسؤولية طبي وسريري:</strong> لايف أداة للمتابعة الذاتية والتطوير الشخصي، ولا يقدم أي استشارات أو تشخيصات أو علاجات طبية أو خطط علاجية سريرية. لا تغني المنصة إطلاقاً عن استشارة الطبيب المؤهل.
                </div>
              </li>

              <li className="flex items-start gap-3 p-3 rounded-2xl bg-surface-container-low border border-border-subtle">
                <CheckCircle2 className="w-5 h-5 text-primary-ink shrink-0 mt-0.5" />
                <div>
                  <strong className="text-on-surface">٤. التقديرات الذكية للتغذية:</strong> تقر بأن تحليلات الوجبات عبر الذكاء الاصطناعي (Google Gemini) هي تقديرات تقريبية لتسهيل التسجيل، وينبغي عليك مراجعتها قبل اعتمادها.
                </div>
              </li>
            </ul>

            <div className="p-4 rounded-2xl bg-surface-container-high border border-border-subtle flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-on-surface">
                <Mail className="w-4 h-4 text-primary-ink" />
                <span>البريد المعتمد للشروط والأحكام:</span>
              </div>
              <a
                href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
                className="text-primary-ink underline hover:text-primary-ink-dim"
                dir="ltr"
              >
                {PRIVACY_CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
