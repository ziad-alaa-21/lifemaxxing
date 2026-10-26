"use client";

import React from "react";
import {
  ShieldCheck,
  Server,
  Sparkles,
  BellOff,
  FileText,
  Lock,
  Eye,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";

export function PrivacyTab() {
  const { locale } = useI18n();

  return (
    <div className="space-y-6">
      {/* Privacy Policy Card */}
      <div className="stitch-card p-5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border-subtle">
          <ShieldCheck className="w-4 h-4 text-emerald-success" />
          <h3 className="text-sm font-bold font-mono text-on-surface">
            {locale === "ar" ? "سياسة الخصوصية والإفصاحات" : "Privacy Policy & Disclosures"}
          </h3>
        </div>

        <div className="space-y-4 text-xs text-on-surface-variant leading-relaxed">
          {/* Section 1 */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold font-mono text-on-surface flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-primary-lime" />
              <span>{locale === "ar" ? "1. البيانات التي نقوم بتخزينها" : "1. What Data We Store"}</span>
            </h4>
            <p>
              {locale === "ar"
                ? "يجمع تطبيق لايف ماكسينج ويخزن فقط البيانات والمعلومات التي تدخلها أنت صراحةً:"
                : "LifeMaxxing collects and stores only the data you explicitly input:"}
            </p>
            <ul className="list-disc pl-5 rtl:pr-5 rtl:pl-0 space-y-1 text-text-muted">
              <li>
                <strong>{locale === "ar" ? "القياسات الحيوية: " : "Biometrics: "}</strong>
                {locale === "ar"
                  ? "سنة الميلاد، الجنس البيولوجي، الطول، والوزن المستهدف."
                  : "Birth year, biological sex, height, and target body weight."}
              </li>
              <li>
                <strong>{locale === "ar" ? "قياسات اللياقة والبدن: " : "Physical Telemetry: "}</strong>
                {locale === "ar"
                  ? "سجلات الوزن، تمارين القوة، الجولات، وسجل الأوزان القصوى (1RM)."
                  : "Bodyweight logs, strength exercises, workout sets, and 1RM history."}
              </li>
              <li>
                <strong>{locale === "ar" ? "قياسات النوم والساعة البيولوجية: " : "Circadian Telemetry: "}</strong>
                {locale === "ar"
                  ? "مواعيد النوم والاستيقاظ، المدة، والتقييم الشخصي لجودة النوم."
                  : "Bedtime, wake time, duration, and subjective quality ratings."}
              </li>
              <li>
                <strong>{locale === "ar" ? "قياسات التغذية: " : "Nutrition Telemetry: "}</strong>
                {locale === "ar"
                  ? "سجلات الوجبات الغذائية، تقديرات الماكروز والسعرات، واستهلاك الماء."
                  : "Food meal logs, macro estimates, and water intake."}
              </li>
              <li>
                <strong>{locale === "ar" ? "القياسات الذهنية: " : "Cognitive Telemetry: "}</strong>
                {locale === "ar"
                  ? "مؤقتات جلسات التركيز، تدريبات الحساب الذهني، سجلات القراءة، وتصنيف وقت الشاشة يدوياً."
                  : "Ultradian focus session timers, mental math training drills, reading logs, and manual screen time categorizations."}
              </li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="space-y-1.5 pt-2 border-t border-border-subtle">
            <h4 className="text-xs font-bold font-mono text-on-surface flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-tertiary-purple" />
              <span>
                {locale === "ar" ? "2. الاستضافة السحابية وأمان قاعدة البيانات" : "2. Cloud Hosting & Database Security"}
              </span>
            </h4>
            <p>
              {locale === "ar" ? (
                <>
                  يتم حفظ بياناتك وتأمينها باستخدام منصة <strong>Supabase</strong> (بنية تحتية لمؤسسات مبنية على PostgreSQL). كافة الجداول المملوكة للمستخدم محمية بسياسات أمان صارمة على مستوى السطر (Row Level Security - RLS) بقاعدة (<code className="text-on-surface" dir="ltr">auth.uid() = user_id</code>)، تضمن حسابياً وتقنياً استحالة وصول أي مستخدم آخر لبياناتك.
                </>
              ) : (
                <>
                  Your data is stored and secured using <strong>Supabase</strong> (PostgreSQL enterprise infrastructure). All user-owned database tables are guarded by strict <strong>Row Level Security (RLS)</strong> policies (<code className="text-on-surface">auth.uid() = user_id</code>), ensuring your records are mathematically inaccessible to any other user.
                </>
              )}
            </p>
          </div>

          {/* Section 3 */}
          <div className="space-y-1.5 pt-2 border-t border-border-subtle">
            <h4 className="text-xs font-bold font-mono text-on-surface flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-core" />
              <span>
                {locale === "ar"
                  ? "3. إفصاح الذكاء الاصطناعي (AI) لتحليل التغذية"
                  : "3. Artificial Intelligence (AI) Parsing Disclosure"}
              </span>
            </h4>
            <p>
              {locale === "ar" ? (
                <>
                  عند استخدام أداة الذكاء الاصطناعي لتحليل الوجبات، يتم إرسال <strong>الوصف النصي الطبيعي فقط للوجبة</strong> (مثل &ldquo;بيضتين وتوست حبوب كاملة&rdquo;) إلى نموذج Google Generative AI (Gemini) حصرياً لاستخراج قيم العناصر الغذائية التقديرية. <strong>لا يتم إرسال أي تاريخ صحي، أو قياسات حيوية، أو معرفات مستخدم، أو بريد إلكتروني إطلاقاً إلى نموذج الذكاء الاصطناعي.</strong>
                </>
              ) : (
                <>
                  When you use the AI nutrition parser, only the <strong>natural language text description of the food item</strong> (e.g. &ldquo;2 eggs and sourdough toast&rdquo;) is transmitted to Google Generative AI (Gemini) solely to extract estimated macronutrients. <strong>No personal health history, biometric records, user IDs, or email addresses are ever sent to the AI model.</strong>
                </>
              )}
            </p>
          </div>

          {/* Section 4 */}
          <div className="space-y-1.5 pt-2 border-t border-border-subtle">
            <h4 className="text-xs font-bold font-mono text-on-surface flex items-center gap-1.5">
              <BellOff className="w-3.5 h-3.5 text-text-muted" />
              <span>{locale === "ar" ? "4. الإشعارات والتنبيهات" : "4. Push Notifications"}</span>
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-container-high border border-border-subtle text-text-muted">
                {locale === "ar" ? "قريباً" : "Coming soon"}
              </span>
              <p className="text-text-muted">
                {locale === "ar"
                  ? "الإشعارات الفورية وتنبيهات الأجهزة التلقائية غير مفعلة في هذا الإصدار. لا تعمل أي برامج خلفية للتنبيه على جهازك."
                  : "Push notifications and automated device alarms are not active in this release. No background notification daemons run on your device."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Terms of Service Card */}
      <div className="stitch-card p-5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border-subtle">
          <FileText className="w-4 h-4 text-tertiary-purple" />
          <h3 className="text-sm font-bold font-mono text-on-surface">
            {locale === "ar" ? "شروط الاستخدام وإخلاء المسؤولية الصحية" : "Terms of Service & Health Disclaimer"}
          </h3>
        </div>

        <div className="space-y-3 text-xs text-on-surface-variant leading-relaxed">
          <p>
            <strong>
              {locale === "ar"
                ? "تنبيه غير علاجي وغير تشخيصي: "
                : "Non-Clinical, Non-Diagnostic Notice: "}
            </strong>
            {locale === "ar"
              ? "تطبيق لايف ماكسينج هو أداة هندسية لتحسين نمط الحياة مخصصة لتتبع العادات والبروتوكولات الشخصية. التطبيق لا يقدم تشخيصات طبية، ولا علاجاً سريرياً، ولا نصائح رعاية صحية مخصصة."
              : "LifeMaxxing is an engineering and lifestyle optimization tool designed for personal habit and protocol tracking. It does not provide medical diagnoses, clinical treatment, or tailored healthcare advice."}
          </p>
          <p className="text-text-muted">
            {locale === "ar"
              ? "استشر دائماً طبيباً مرخصاً أو مختص رعاية صحية مؤهل قبل الشروع في تقليل سعرات قاسي، أو بروتوكولات تمارين مقاومة شديدة، أو إحداث تغييرات جذرية في دورة نومك البيولوجية."
              : "Always consult a licensed physician or healthcare professional before undertaking extreme caloric deficits, rigorous resistance training protocols, or significant changes to your circadian sleep cycle."}
          </p>
        </div>
      </div>
    </div>
  );
}
