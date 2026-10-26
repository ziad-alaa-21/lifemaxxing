"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Button, Badge, Tab, Card, Input, ProgressBar } from "@/components/ui";
import {
  getReduceBlurPreference,
  setReduceBlurPreference,
} from "@/lib/design/tokens";
import { useI18n } from "@/lib/i18n/I18nContext";

export default function DesignSystemPreviewPage() {
  const [activeTab, setActiveTab] = useState<"body" | "mind" | "school">("body");
  const [reduceBlur, setReduceBlur] = useState<boolean>(() =>
    getReduceBlurPreference()
  );
  const { locale, setLocale } = useI18n();

  const handleToggleBlur = () => {
    const next = !reduceBlur;
    setReduceBlur(next);
    setReduceBlurPreference(next);
  };

  return (
    <div className="min-h-screen stitch-canvas text-[#14161A]">
      <header className="sticky top-0 z-30 h-[72px] bg-white/90 backdrop-blur-xl border-b border-[#E3E5F0] shadow-[0_8px_24px_rgba(40,50,120,0.06)]">
        <div className="max-w-[1280px] mx-auto h-full px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-[20px] leading-[28px] font-medium text-[#14161A]">
              Life design system
            </span>
            <Badge variant="body">Stitch light theme</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleToggleBlur}
            >
              {reduceBlur ? "Backdrop blur: Off" : "Backdrop blur: On"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setLocale(locale === "en" ? "ar" : "en")}
            >
              {locale === "en" ? "Preview Arabic (عربي)" : "Preview English"}
            </Button>
            <Button variant="primary" size="md">
              <Plus className="w-4 h-4" />
              <span>Quick add</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Hero Domain Cards */}
        <section className="space-y-4">
          <h1 className="text-[28px] leading-[36px] font-medium text-[#14161A]">
            Domain gradients and hero cards
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="hero" domain="body" className="flex flex-col justify-between min-h-[180px]">
              <div className="flex items-center justify-between">
                <span className="text-[14px] leading-[20px] font-medium text-white/90">Body domain</span>
                <span className="px-3 py-0.5 rounded-full text-[12px] font-medium bg-white/20 text-white">
                  Body
                </span>
              </div>
              <div className="space-y-1 my-3">
                <h2 className="text-[20px] leading-[28px] font-medium text-white">Push day</h2>
                <p className="text-[14px] leading-[20px] text-white/85">
                  Bench press, overhead press, dips
                </p>
              </div>
              <span className="text-[12px] leading-[16px] font-medium text-white/90">
                Linear gradient #2563EB to #4338CA
              </span>
            </Card>

            <Card variant="hero" domain="mind" className="flex flex-col justify-between min-h-[180px]">
              <div className="flex items-center justify-between">
                <span className="text-[14px] leading-[20px] font-medium text-white/90">Mind domain</span>
                <span className="px-3 py-0.5 rounded-full text-[12px] font-medium bg-white/20 text-white">
                  Mind
                </span>
              </div>
              <div className="space-y-1 my-3">
                <h2 className="text-[20px] leading-[28px] font-medium text-white">Deep focus</h2>
                <p className="text-[14px] leading-[20px] text-white/85">
                  90 minute ultradian focus block
                </p>
              </div>
              <span className="text-[12px] leading-[16px] font-medium text-white/90">
                Linear gradient #7C3AED to #A21CAF
              </span>
            </Card>

            <Card variant="hero" domain="school" className="flex flex-col justify-between min-h-[180px]">
              <div className="flex items-center justify-between">
                <span className="text-[14px] leading-[20px] font-medium text-white/90">School domain</span>
                <span className="px-3 py-0.5 rounded-full text-[12px] font-medium bg-white/20 text-white">
                  School
                </span>
              </div>
              <div className="space-y-1 my-3">
                <h2 className="text-[20px] leading-[28px] font-medium text-white">Physics chapter 4</h2>
                <p className="text-[14px] leading-[20px] text-white/85">
                  Mechanics problem set and review
                </p>
              </div>
              <span className="text-[12px] leading-[16px] font-medium text-white/90">
                Linear gradient #DB2777 to #C2410C
              </span>
            </Card>
          </div>
        </section>

        {/* Typography & Primitives Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-6 space-y-4">
            <h2 className="text-[20px] leading-[28px] font-medium text-[#14161A]">
              IBM Plex Sans typography scale
            </h2>
            <div className="space-y-3 divide-y divide-[#ECEEFA]">
              <div className="pt-2 first:pt-0">
                <div className="text-[12px] text-[#5B6270]">Headline XL (40px / 48px Medium)</div>
                <div className="text-[40px] leading-[48px] font-medium text-[#14161A]">14 h 20 m</div>
              </div>
              <div className="pt-3">
                <div className="text-[12px] text-[#5B6270]">Headline LG (28px / 36px Medium)</div>
                <div className="text-[28px] leading-[36px] font-medium text-[#14161A]">
                  Good morning, Ziad
                </div>
              </div>
              <div className="pt-3">
                <div className="text-[12px] text-[#5B6270]">Headline MD (20px / 28px Medium)</div>
                <div className="text-[20px] leading-[28px] font-medium text-[#14161A]">
                  Today&apos;s progress
                </div>
              </div>
              <div className="pt-3">
                <div className="text-[12px] text-[#5B6270]">Body MD (14px / 20px Regular) & Secondary Slate</div>
                <p className="text-[14px] leading-[20px] text-[#5B6270]">
                  Structured cards float over subtle chromatic backdrops with measured ambient depth.
                </p>
              </div>
            </div>
          </Card>

          <Card className="lg:col-span-6 space-y-6">
            <div className="space-y-3">
              <h2 className="text-[20px] leading-[28px] font-medium text-[#14161A]">
                Buttons, chips, and segmented filters
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Quick add</Button>
                <Button variant="secondary">Secondary action</Button>
                <Button variant="cyan">Body action</Button>
                <Button variant="indigo">Mind action</Button>
                <Button variant="amber">School action</Button>
                <Button variant="danger">Delete entry</Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-[14px] font-medium text-[#14161A]">Domain chips and rank accents</div>
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge variant="body">Body</Badge>
                <Badge variant="mind">Mind</Badge>
                <Badge variant="school">School</Badge>
                <Badge variant="record">Gold record</Badge>
                <Badge variant="neutral">Active term</Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-[14px] font-medium text-[#14161A]">Segmented control tabs</div>
              <div className="flex items-center gap-2">
                <Tab active={activeTab === "body"} onClick={() => setActiveTab("body")}>
                  Workouts
                </Tab>
                <Tab active={activeTab === "mind"} onClick={() => setActiveTab("mind")}>
                  Focus
                </Tab>
                <Tab active={activeTab === "school"} onClick={() => setActiveTab("school")}>
                  Subjects
                </Tab>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-[14px] font-medium text-[#14161A]">Input field & progress tracks</div>
              <Input placeholder="Search workouts, subjects, or meals..." />
              <div className="space-y-2 pt-1">
                <ProgressBar value={68} domain="body" />
                <ProgressBar value={82} domain="mind" />
                <ProgressBar value={45} domain="school" />
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
