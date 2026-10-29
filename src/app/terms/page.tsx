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
    <div className="min-h-screen bg-[#f8faff] text-[#151c28] py-12 px-4 sm:px-6 max-w-4xl mx-auto font-sans">
      <div className="mb-8">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#45474b] hover:text-[#0051d5] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back / العودة</span>
        </Link>
      </div>

      <div className="rounded-[24px] bg-white border border-[#e2e8f9] shadow-xs p-6 sm:p-10 space-y-10">
        {/* Header */}
        <div className="flex items-center gap-4 pb-6 border-b border-[#e2e8f9]">
          <div className="p-3.5 rounded-2xl bg-[#f0f3ff] text-[#0051d5] border border-[#dce2f3] shadow-xs">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#151c28]">Terms of Service</h1>
            <p className="text-sm font-arabic text-[#45474b] mt-1" dir="rtl">
              شروط وقواعد استخدام المنصة
            </p>
          </div>
        </div>

        {/* English Section */}
        <section className="space-y-6 text-sm leading-relaxed" dir="ltr">
          <div className="flex items-center gap-2 text-[#0051d5] font-bold text-xs uppercase tracking-wider">
            <span>English (Official)</span>
          </div>

          <div className="space-y-4 text-[#151c28]">
            <p className="text-[#45474b]">
              By accessing or using <strong className="text-[#151c28]">Life</strong>, you agree to comply with and be bound by the following transparent terms:
            </p>

            <ul className="space-y-3 text-[#45474b] list-none pl-0">
              <li className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f8faff] border border-[#e2e8f9]">
                <CheckCircle2 className="w-5 h-5 text-[#0051d5] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#151c28]">1. Account Authenticity & Security:</strong>{" "}
                  {AUTH_MODE === "email"
                    ? "You are responsible for maintaining the confidentiality of your email and password credentials. Any action initiated under your session is your responsibility."
                    : AUTH_MODE === "google"
                    ? "You are responsible for maintaining the confidentiality of your authenticated Google credentials. Any action initiated under your session is your responsibility."
                    : "You are responsible for maintaining the confidentiality of your sign-in credentials (email and password or authenticated Google credentials). Any action initiated under your session is your responsibility."}
                </div>
              </li>

              <li className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f8faff] border border-[#e2e8f9]">
                <CheckCircle2 className="w-5 h-5 text-[#0051d5] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#151c28]">2. Permitted Personal Use:</strong> Life is provided for personal habit, productivity, wellness, and self-optimization tracking. Reverse engineering, scraping, automated API bombardment, or subverting rate limits is strictly prohibited.
                </div>
              </li>

              <li className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f8faff] border border-[#e2e8f9]">
                <ShieldAlert className="w-5 h-5 text-[#ba1a1a] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#151c28]">3. Medical & Clinical Disclaimer:</strong> Life is a wellness and self-tracking tool. It does not provide medical advice, diagnosis, treatment, or clinical nutrition prescriptions. You must not rely on the application as a substitute for professional healthcare consultations.
                </div>
              </li>

              <li className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f8faff] border border-[#e2e8f9]">
                <CheckCircle2 className="w-5 h-5 text-[#0051d5] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#151c28]">4. AI-Assisted Nutrition Logging:</strong> You acknowledge that AI food parsing estimations (powered by Google Gemini) are approximations for convenience and should be verified by you before logging.
                </div>
              </li>
            </ul>

            <div className="p-4 rounded-2xl bg-[#f0f3ff] border border-[#dce2f3] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-[#151c28]">
                <Mail className="w-4 h-4 text-[#0051d5]" />
                <span className="font-semibold">Contact for Terms & Compliance:</span>
              </div>
              <a
                href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
                className="text-[#0051d5] font-semibold underline hover:text-[#0043b3]"
              >
                {PRIVACY_CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </section>

        {/* Arabic Section */}
        <section className="space-y-6 text-sm leading-relaxed pt-8 border-t border-[#e2e8f9]" dir="rtl">
          <div className="flex items-center gap-2 text-[#0051d5] font-bold text-xs uppercase tracking-wider">
            <span>العربية (النسخة المعتمدة)</span>
          </div>

          <div className="space-y-4 text-[#151c28]">
            <p className="text-[#45474b]">
              باستخدامك لتطبيق <strong className="text-[#151c28]">لايف</strong>، فإنك توافق على الالتزام بالشروط والبنود التالية:
            </p>

            <ul className="space-y-3 text-[#45474b] list-none pr-0">
              <li className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f8faff] border border-[#e2e8f9]">
                <CheckCircle2 className="w-5 h-5 text-[#0051d5] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#151c28]">١. أمان الحساب والبيانات:</strong>{" "}
                  {AUTH_MODE === "email"
                    ? "تقع على عاتقك مسؤولية الحفاظ على سرية وأمان بريدك الإلكتروني وكلمة المرور الخاصة بك. أي إجراء يتم عبر جلستك المعتمدة يعد من مسؤوليتك المباشرة."
                    : AUTH_MODE === "google"
                    ? "تقع على عاتقك مسؤولية الحفاظ على أمان حساب Google المستخدم لتسجيل الدخول. أي إجراء يتم عبر جلستك المعتمدة يعد من مسؤوليتك المباشرة."
                    : "تقع على عاتقك مسؤولية الحفاظ على أمان بيانات تسجيل الدخول الخاصة بك (البريد الإلكتروني وكلمة المرور أو حساب Google المستخدم لتسجيل الدخول). أي إجراء يتم عبر جلستك المعتمدة يعد من مسؤوليتك المباشرة."}
                </div>
              </li>

              <li className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f8faff] border border-[#e2e8f9]">
                <CheckCircle2 className="w-5 h-5 text-[#0051d5] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#151c28]">٢. الاستخدام الشخصي العادل:</strong> صُمم لايف لمتابعة أهدافك الشخصية وعاداتك الرياضية والذهنية. يُمنع منعاً باتاً استخراج البيانات بطرق آلية غير مصرح بها أو استهداف واجهات البرمجة بما يتجاوز حدود الاستخدام العادل.
                </div>
              </li>

              <li className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f8faff] border border-[#e2e8f9]">
                <ShieldAlert className="w-5 h-5 text-[#ba1a1a] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#151c28]">٣. إخلاء مسؤولية طبي وسريري:</strong> لايف أداة للمتابعة الذاتية والتطوير الشخصي، ولا يقدم أي استشارات أو تشخيصات أو علاجات طبية أو خطط علاجية سريرية. لا تغني المنصة إطلاقاً عن استشارة الطبيب المؤهل.
                </div>
              </li>

              <li className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f8faff] border border-[#e2e8f9]">
                <CheckCircle2 className="w-5 h-5 text-[#0051d5] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#151c28]">٤. التقديرات الذكية للتغذية:</strong> تقر بأن تحليلات الوجبات عبر الذكاء الاصطناعي (Google Gemini) هي تقديرات تقريبية لتسهيل التسجيل، وينبغي عليك مراجعتها قبل اعتمادها.
                </div>
              </li>
            </ul>

            <div className="p-4 rounded-2xl bg-[#f0f3ff] border border-[#dce2f3] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-[#151c28]">
                <Mail className="w-4 h-4 text-[#0051d5]" />
                <span className="font-semibold">البريد المعتمد للشروط والأحكام:</span>
              </div>
              <a
                href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
                className="text-[#0051d5] font-semibold underline hover:text-[#0043b3]"
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
