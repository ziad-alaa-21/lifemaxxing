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
    <div className="min-h-screen bg-surface text-on-surface py-12 px-4 sm:px-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-xs font-mono text-on-surface-variant hover:text-primary-lime transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back / العودة</span>
        </Link>
      </div>

      <div className="stitch-card p-6 sm:p-10 space-y-10">
        {/* Header */}
        <div className="flex items-center gap-4 pb-6 border-b border-border-subtle">
          <div className="p-3.5 rounded-2xl bg-surface-container-high text-primary-lime border border-primary-lime/20 shadow-md">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Privacy Policy</h1>
            <p className="text-sm font-arabic text-on-surface-variant mt-1" dir="rtl">
              سياسة الخصوصية وسيادة البيانات
            </p>
          </div>
        </div>

        {/* English Section */}
        <section className="space-y-6 text-sm leading-relaxed" dir="ltr">
          <div className="flex items-center gap-2 text-primary-lime font-bold font-mono uppercase text-xs tracking-wider">
            <span>English (Official)</span>
          </div>

          <div className="space-y-4 text-on-surface">
            <p>
              At <strong>Life</strong>, we believe your personal telemetry, habits, and health metrics belong strictly to you. This Privacy Policy details exactly how your information is stored, processed, and protected.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-surface-container-low border border-border-subtle space-y-2">
                <div className="flex items-center gap-2 text-primary-lime font-semibold text-xs uppercase font-mono">
                  <Database className="w-4 h-4" />
                  <span>1. What We Store & Where</span>
                </div>
                <p className="text-xs text-on-surface-variant">
                  We store your workouts, nutrition logs, sleep records, focus timer sessions, mental math drills, discipline habits, reading progress, and academic schedule.{" "}
                  {AUTH_MODE === "email"
                    ? "Account sign-in uses your email address and password via Supabase Auth (passwords are securely hashed and never stored in plain text)."
                    : AUTH_MODE === "google"
                    ? "Account sign-in uses your authenticated Google account via Supabase Auth."
                    : "Account sign-in uses your email address and password or your authenticated Google account via Supabase Auth."}{" "}
                  All persistent application data is hosted securely in <strong>Supabase</strong> with database-enforced <strong>Row-Level Security (RLS)</strong>. Only your authenticated user ID can read or mutate your records.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container-low border border-border-subtle space-y-2">
                <div className="flex items-center gap-2 text-amber-core font-semibold text-xs uppercase font-mono">
                  <Brain className="w-4 h-4" />
                  <span>2. Third-Party AI Processing</span>
                </div>
                <p className="text-xs text-on-surface-variant">
                  When you use the AI Food Parser or Smart Nutrition Logger, <strong>your food text descriptions are transmitted to Google&apos;s Generative AI (Gemini API)</strong> solely to parse ingredient quantities, calories, and macronutrients. No personally identifiable telemetry or passwords are ever sent to the AI model.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container-low border border-border-subtle space-y-2">
                <div className="flex items-center gap-2 text-secondary-cyan font-semibold text-xs uppercase font-mono">
                  <Trash2 className="w-4 h-4" />
                  <span>3. Data Export & Deletion</span>
                </div>
                <p className="text-xs text-on-surface-variant">
                  You maintain 100% data sovereignty. From the <strong>Settings &rarr; Data</strong> tab, you can download a full archive (JSON/CSV) of all your tables at any time. You can also wipe all telemetry via <strong>&ldquo;Delete My Data&rdquo;</strong> (preserving your module selections) or permanently erase your profile and authentication records via <strong>&ldquo;Delete My Account&rdquo;</strong>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container-low border border-border-subtle space-y-2">
                <div className="flex items-center gap-2 text-crimson-alert font-semibold text-xs uppercase font-mono">
                  <HeartHandshake className="w-4 h-4" />
                  <span>4. Not Medical Advice</span>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Life is designed strictly for personal habit tracking, productivity optimization, and lifestyle calibration. <strong>The application, its scores, and its AI telemetry do NOT constitute medical advice, clinical diagnoses, or prescribed dietetics.</strong> Always consult certified healthcare professionals for medical guidance.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-high border border-border-subtle flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-on-surface">
                <Mail className="w-4 h-4 text-primary-lime" />
                <span>Privacy Inquiries & Compliance Contact:</span>
              </div>
              <a
                href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
                className="text-primary-lime underline hover:text-primary-lime-dim"
              >
                {PRIVACY_CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </section>

        {/* Arabic Section */}
        <section className="space-y-6 text-sm leading-relaxed pt-8 border-t border-border-subtle" dir="rtl">
          <div className="flex items-center gap-2 text-primary-lime font-bold font-mono uppercase text-xs tracking-wider">
            <span>العربية (النسخة المعتمدة)</span>
          </div>

          <div className="space-y-4 text-on-surface">
            <p>
              في تطبيق <strong>لايف</strong>، نؤمن بأن بياناتك الشخصية وعاداتك الصحية ملكك أنت وحدك. توضح هذه السياسة بدقة وشفافية كيفية تخزين ومعالجة وحماية بياناتك:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-right">
              <div className="p-4 rounded-2xl bg-surface-container-low border border-border-subtle space-y-2">
                <div className="flex items-center gap-2 text-primary-lime font-semibold text-xs uppercase font-mono">
                  <Database className="w-4 h-4" />
                  <span>١. ما نقوم بتخزينه ومكان الحفظ</span>
                </div>
                <p className="text-xs text-on-surface-variant">
                  نقوم بحفظ تمارينك، سجلات التغذية، ساعات النوم، جلسات التركيز، تمارين الحساب الذهني، عادات الانضباط، والجدول الدراسي.{" "}
                  {AUTH_MODE === "email"
                    ? "يتم تسجيل الدخول إلى حسابك باستخدام البريد الإلكتروني وكلمة المرور عبر نظام Supabase Auth (تُحفظ كلمات المرور مشفرة بالكامل ولا تُخزن كنص عادي أبداً)."
                    : AUTH_MODE === "google"
                    ? "يتم تسجيل الدخول إلى حسابك باستخدام حساب Google الموثق عبر نظام Supabase Auth."
                    : "يتم تسجيل الدخول إلى حسابك باستخدام البريد الإلكتروني وكلمة المرور أو حساب Google الموثق عبر نظام Supabase Auth."}{" "}
                  يتم حفظ كافة البيانات بأمان على خوادم <strong>Supabase</strong> مع تفعيل نظام الحماية الصارم على مستوى الصفوف (RLS). لا يمكن لأي حساب آخر الوصول لسجلاتك إطلاقاً.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container-low border border-border-subtle space-y-2">
                <div className="flex items-center gap-2 text-amber-core font-semibold text-xs uppercase font-mono">
                  <Brain className="w-4 h-4" />
                  <span>٢. معالجة الذكاء الاصطناعي (Google AI)</span>
                </div>
                <p className="text-xs text-on-surface-variant">
                  عند استخدام ميزة التحليل الذكي للوجبات، <strong>يتم إرسال النص المكتوب لوصفتك أو وجبتك إلى خوارزميات Google Generative AI (Gemini)</strong> حصرياً لتقدير المكونات والسعرات والماكروز. لا يتم إرسال أي بيانات شخصية أو كلمات مرور أو سجلات أخرى لخدمات الذكاء الاصطناعي.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container-low border border-border-subtle space-y-2">
                <div className="flex items-center gap-2 text-secondary-cyan font-semibold text-xs uppercase font-mono">
                  <Trash2 className="w-4 h-4" />
                  <span>٣. تصدير البيانات وحذف الحساب</span>
                </div>
                <p className="text-xs text-on-surface-variant">
                  أنت صاحب القرار بنسبة 100%. من خلال تبويب <strong>الإعدادات &larr; البيانات</strong>، يمكنك تنزيل نسخة كاملة (JSON/CSV) لكافة جداولك في أي لحظة. كما يمكنك محو سجلاتك عبر خيار <strong>&ldquo;حذف بياناتي&rdquo;</strong> (مع الحفاظ على الوحدات المفعلة) أو حذف حسابك وسجلاتك نهائياً عبر <strong>&ldquo;حذف حسابي&rdquo;</strong>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container-low border border-border-subtle space-y-2">
                <div className="flex items-center gap-2 text-crimson-alert font-semibold text-xs uppercase font-mono">
                  <HeartHandshake className="w-4 h-4" />
                  <span>٤. التطبيق ليس استشارة طبية</span>
                </div>
                <p className="text-xs text-on-surface-variant">
                  صُمم تطبيق لايف لمساعدتك على تنظيم عاداتك اليومية وزيادة إنتاجيتك. <strong>الأرقام والمقاييس والتقديرات الذكية المعروضة ليست نصائح طبية أو تشخيصات سريرية أو حميات موصوفة علاجياً.</strong> استشر دائماً الأطباء والمختصين في الشؤون الصحية.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-high border border-border-subtle flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-on-surface">
                <Mail className="w-4 h-4 text-primary-lime" />
                <span>البريد المعتمد للاستفسارات والخصوصية:</span>
              </div>
              <a
                href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
                className="text-primary-lime underline hover:text-primary-lime-dim"
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
