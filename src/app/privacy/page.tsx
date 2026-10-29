import React from "react";
import Link from "next/link";
import { ArrowLeft, Shield, Mail, Database, Brain, Trash2, HeartHandshake } from "lucide-react";
import { PRIVACY_CONTACT_EMAIL } from "@/lib/legalConfig";
import { AUTH_MODE } from "@/lib/authConfig";

export const metadata = {
  title: "Privacy Policy • Life",
  description: "How your data is collected, processed, and safeguarded in Life.",
};

export default function PrivacyPage() {
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
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#151c28]">Privacy Policy</h1>
            <p className="text-sm font-arabic text-[#45474b] mt-1" dir="rtl">
              سياسة الخصوصية وسيادة البيانات
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
              At <strong className="text-[#151c28]">Life</strong>, we believe your personal telemetry, habits, and health metrics belong strictly to you. This Privacy Policy details exactly how your information is stored, processed, and protected.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-[#f8faff] border border-[#e2e8f9] space-y-2">
                <div className="flex items-center gap-2 text-[#0051d5] font-semibold text-xs uppercase">
                  <Database className="w-4 h-4" />
                  <span>1. What We Store & Where</span>
                </div>
                <p className="text-xs text-[#45474b]">
                  We store your workouts, nutrition logs, sleep records, focus timer sessions, mental math drills, discipline habits, reading progress, and academic schedule.{" "}
                  {AUTH_MODE === "email"
                    ? "Account sign-in uses your email address and password via Supabase Auth (passwords are securely hashed and never stored in plain text)."
                    : AUTH_MODE === "google"
                    ? "Account sign-in uses your authenticated Google account via Supabase Auth."
                    : "Account sign-in uses your email address and password or your authenticated Google account via Supabase Auth."}{" "}
                  All persistent application data is hosted securely in <strong>Supabase</strong> with database-enforced <strong>Row-Level Security (RLS)</strong>. Only your authenticated user ID can read or mutate your records.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#f8faff] border border-[#e2e8f9] space-y-2">
                <div className="flex items-center gap-2 text-[#0051d5] font-semibold text-xs uppercase">
                  <Brain className="w-4 h-4" />
                  <span>2. Third-Party AI Processing</span>
                </div>
                <p className="text-xs text-[#45474b]">
                  When you use the AI Food Parser or Smart Nutrition Logger, <strong>your food text descriptions are transmitted to Google&apos;s Generative AI (Gemini API)</strong> solely to parse ingredient quantities, calories, and macronutrients. No personally identifiable telemetry or passwords are ever sent to the AI model.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#f8faff] border border-[#e2e8f9] space-y-2">
                <div className="flex items-center gap-2 text-[#0051d5] font-semibold text-xs uppercase">
                  <Trash2 className="w-4 h-4" />
                  <span>3. Data Export & Deletion</span>
                </div>
                <p className="text-xs text-[#45474b]">
                  You maintain 100% data sovereignty. From the <strong>Settings &rarr; Data</strong> tab, you can download a full archive (JSON/CSV) of all your tables at any time. You can also wipe all telemetry via <strong>&ldquo;Delete My Data&rdquo;</strong> (preserving your module selections) or permanently erase your profile and authentication records via <strong>&ldquo;Delete My Account&rdquo;</strong>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#f8faff] border border-[#e2e8f9] space-y-2">
                <div className="flex items-center gap-2 text-[#ba1a1a] font-semibold text-xs uppercase">
                  <HeartHandshake className="w-4 h-4" />
                  <span>4. Not Medical Advice</span>
                </div>
                <p className="text-xs text-[#45474b]">
                  Life is designed strictly for personal habit tracking, productivity optimization, and lifestyle calibration. <strong>The application, its scores, and its AI telemetry do NOT constitute medical advice, clinical diagnoses, or prescribed dietetics.</strong> Always consult certified healthcare professionals for medical guidance.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#f0f3ff] border border-[#dce2f3] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-[#151c28]">
                <Mail className="w-4 h-4 text-[#0051d5]" />
                <span className="font-semibold">Privacy Inquiries & Compliance Contact:</span>
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
              في تطبيق <strong className="text-[#151c28]">لايف</strong>، نؤمن بأن بياناتك الشخصية وعاداتك الصحية ملكك أنت وحدك. توضح هذه السياسة بدقة وشفافية كيفية تخزين ومعالجة وحماية بياناتك:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-right">
              <div className="p-4 rounded-2xl bg-[#f8faff] border border-[#e2e8f9] space-y-2">
                <div className="flex items-center gap-2 text-[#0051d5] font-semibold text-xs uppercase">
                  <Database className="w-4 h-4" />
                  <span>١. ما نقوم بتخزينه ومكان الحفظ</span>
                </div>
                <p className="text-xs text-[#45474b]">
                  نقوم بحفظ تمارينك، سجلات التغذية، ساعات النوم، جلسات التركيز، تمارين الحساب الذهني، عادات الانضباط، والجدول الدراسي.{" "}
                  {AUTH_MODE === "email"
                    ? "يتم تسجيل الدخول إلى حسابك باستخدام البريد الإلكتروني وكلمة المرور عبر نظام Supabase Auth (تُحفظ كلمات المرور مشفرة بالكامل ولا تُخزن كنص عادي أبداً)."
                    : AUTH_MODE === "google"
                    ? "يتم تسجيل الدخول إلى حسابك باستخدام حساب Google الموثق عبر نظام Supabase Auth."
                    : "يتم تسجيل الدخول إلى حسابك باستخدام البريد الإلكتروني وكلمة المرور أو حساب Google الموثق عبر نظام Supabase Auth."}{" "}
                  يتم حفظ كافة البيانات بأمان على خوادم <strong>Supabase</strong> مع تفعيل نظام الحماية الصارم على مستوى الصفوف (RLS). لا يمكن لأي حساب آخر الوصول لسجلاتك إطلاقاً.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#f8faff] border border-[#e2e8f9] space-y-2">
                <div className="flex items-center gap-2 text-[#0051d5] font-semibold text-xs uppercase">
                  <Brain className="w-4 h-4" />
                  <span>٢. معالجة الذكاء الاصطناعي (Google AI)</span>
                </div>
                <p className="text-xs text-[#45474b]">
                  عند استخدام ميزة التحليل الذكي للوجبات، <strong>يتم إرسال النص المكتوب لوصفتك أو وجبتك إلى خوارزميات Google Generative AI (Gemini)</strong> حصرياً لتقدير المكونات والسعرات والماكروز. لا يتم إرسال أي بيانات شخصية أو كلمات مرور أو سجلات أخرى لخدمات الذكاء الاصطناعي.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#f8faff] border border-[#e2e8f9] space-y-2">
                <div className="flex items-center gap-2 text-[#0051d5] font-semibold text-xs uppercase">
                  <Trash2 className="w-4 h-4" />
                  <span>٣. تصدير البيانات وحذف الحساب</span>
                </div>
                <p className="text-xs text-[#45474b]">
                  أنت صاحب القرار بنسبة 100%. من خلال تبويب <strong>الإعدادات &larr; البيانات</strong>، يمكنك تنزيل نسخة كاملة (JSON/CSV) لكافة جداولك في أي لحظة. كما يمكنك محو سجلاتك عبر خيار <strong>&ldquo;حذف بياناتي&rdquo;</strong> (مع الحفاظ على الوحدات المفعلة) أو حذف حسابك وسجلاتك نهائياً عبر <strong>&ldquo;حذف حسابي&rdquo;</strong>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#f8faff] border border-[#e2e8f9] space-y-2">
                <div className="flex items-center gap-2 text-[#ba1a1a] font-semibold text-xs uppercase">
                  <HeartHandshake className="w-4 h-4" />
                  <span>٤. التطبيق ليس استشارة طبية</span>
                </div>
                <p className="text-xs text-[#45474b]">
                  صُمم تطبيق لايف لمساعدتك على تنظيم عاداتك اليومية وزيادة إنتاجيتك. <strong>الأرقام والمقاييس والتقديرات الذكية المعروضة ليست نصائح طبية أو تشخيصات سريرية أو حميات موصوفة علاجياً.</strong> استشر دائماً الأطباء والمختصين في الشؤون الصحية.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#f0f3ff] border border-[#dce2f3] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-[#151c28]">
                <Mail className="w-4 h-4 text-[#0051d5]" />
                <span className="font-semibold">البريد المعتمد للاستفسارات والخصوصية:</span>
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
