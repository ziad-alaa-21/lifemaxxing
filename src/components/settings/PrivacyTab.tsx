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

export function PrivacyTab() {
  return (
    <div className="space-y-6">
      {/* Privacy Policy Card */}
      <div className="p-5 bg-surface-container rounded-2xl border border-border-subtle space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border-subtle">
          <ShieldCheck className="w-4 h-4 text-emerald-success" />
          <h3 className="text-sm font-bold font-mono text-on-surface">Privacy Policy & Disclosures</h3>
        </div>

        <div className="space-y-4 text-xs text-on-surface-variant leading-relaxed">
          {/* Section 1 */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold font-mono text-on-surface flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-primary-lime" />
              <span>1. What Data We Store</span>
            </h4>
            <p>
              LifeMaxxing collects and stores only the data you explicitly input:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-text-muted">
              <li><strong>Biometrics:</strong> Birth year, biological sex, height, and target body weight.</li>
              <li><strong>Physical Telemetry:</strong> Bodyweight logs, strength exercises, workout sets, and 1RM history.</li>
              <li><strong>Circadian Telemetry:</strong> Bedtime, wake time, duration, and subjective quality ratings.</li>
              <li><strong>Nutrition Telemetry:</strong> Food meal logs, macro estimates, and water intake.</li>
              <li><strong>Cognitive Telemetry:</strong> Ultradian focus session timers, mental math training drills, reading logs, and manual screen time categorizations.</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="space-y-1.5 pt-2 border-t border-border-subtle">
            <h4 className="text-xs font-bold font-mono text-on-surface flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-tertiary-purple" />
              <span>2. Cloud Hosting & Database Security</span>
            </h4>
            <p>
              Your data is stored and secured using <strong>Supabase</strong> (PostgreSQL enterprise infrastructure). All user-owned database tables are guarded by strict <strong>Row Level Security (RLS)</strong> policies (<code className="text-on-surface">auth.uid() = user_id</code>), ensuring your records are mathematically inaccessible to any other user.
            </p>
          </div>

          {/* Section 3 */}
          <div className="space-y-1.5 pt-2 border-t border-border-subtle">
            <h4 className="text-xs font-bold font-mono text-on-surface flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-core" />
              <span>3. Artificial Intelligence (AI) Parsing Disclosure</span>
            </h4>
            <p>
              When you use the AI nutrition parser, only the <strong>natural language text description of the food item</strong> (e.g. &ldquo;2 eggs and sourdough toast&rdquo;) is transmitted to Google Generative AI (Gemini) solely to extract estimated macronutrients. <strong>No personal health history, biometric records, user IDs, or email addresses are ever sent to the AI model.</strong>
            </p>
          </div>

          {/* Section 4 */}
          <div className="space-y-1.5 pt-2 border-t border-border-subtle">
            <h4 className="text-xs font-bold font-mono text-on-surface flex items-center gap-1.5">
              <BellOff className="w-3.5 h-3.5 text-text-muted" />
              <span>4. Push Notifications</span>
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-container-high border border-border-subtle text-text-muted">
                Coming soon
              </span>
              <p className="text-text-muted">
                Push notifications and automated device alarms are not active in this release. No background notification daemons run on your device.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Terms of Service Card */}
      <div className="p-5 bg-surface-container rounded-2xl border border-border-subtle space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border-subtle">
          <FileText className="w-4 h-4 text-tertiary-purple" />
          <h3 className="text-sm font-bold font-mono text-on-surface">Terms of Service & Health Disclaimer</h3>
        </div>

        <div className="space-y-3 text-xs text-on-surface-variant leading-relaxed">
          <p>
            <strong>Non-Clinical, Non-Diagnostic Notice:</strong> LifeMaxxing is an engineering and lifestyle optimization tool designed for personal habit and protocol tracking. It does not provide medical diagnoses, clinical treatment, or tailored healthcare advice.
          </p>
          <p className="text-text-muted">
            Always consult a licensed physician or healthcare professional before undertaking extreme caloric deficits, rigorous resistance training protocols, or significant changes to your circadian sleep cycle.
          </p>
        </div>
      </div>
    </div>
  );
}
