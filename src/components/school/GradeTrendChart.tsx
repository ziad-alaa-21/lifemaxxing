import React, { useState } from "react";
import { GradeItem, calculateGradePercentage, round1 } from "@/lib/school";
import { useI18n } from "@/lib/i18n/I18nContext";

interface GradeTrendChartProps {
  grades: GradeItem[];
  targetGrade?: number | null;
  subjectColor?: string;
}

type RangeOption = "30D" | "90D" | "ALL";

export function GradeTrendChart({
  grades,
  targetGrade,
  subjectColor = "#F59E0B",
}: GradeTrendChartProps) {
  const { locale } = useI18n();
  const [range, setRange] = useState<RangeOption>("ALL");
  const [hoveredGrade, setHoveredGrade] = useState<{
    grade: GradeItem;
    x: number;
    y: number;
    pct: number;
  } | null>(null);

  const filteredGrades = React.useMemo(() => {
    const active = [...grades]
      .filter((g) => !g.deleted_at && g.mark_total > 0 && g.mark_achieved >= 0)
      .sort(
        (a, b) =>
          new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
      );

    if (range === "ALL") return active;

    const days = range === "30D" ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split("T")[0];

    return active.filter((g) => g.entry_date >= cutoffStr);
  }, [grades, range]);

  const activeGrades = filteredGrades;

  if (activeGrades.length === 0) {
    return (
      <div className="h-44 flex flex-col items-center justify-center bg-surface-container/50 rounded-xl border border-border-subtle p-4 text-center">
        <p className="text-xs font-mono text-on-surface-variant">
          {locale === "ar" ? "لا توجد درجات مسجلة بعد" : "No grade entries yet"}
        </p>
        <p className="text-[11px] text-text-muted mt-0.5">
          {locale === "ar"
            ? "سجل الكويزات والامتحانات لمتابعة تطور درجاتك"
            : "Log quizzes and big exams to visualize score progression"}
        </p>
      </div>
    );
  }

  // SVG dimensions
  const width = 500;
  const height = 180;
  const padLeft = 35;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;

  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;

  // Y-axis bounds: min 0, max 100
  const minY = 0;
  const maxY = 100;

  function getY(pct: number) {
    const clamped = Math.max(minY, Math.min(maxY, pct));
    return padTop + chartHeight - ((clamped - minY) / (maxY - minY)) * chartHeight;
  }

  function getX(index: number, total: number) {
    if (total <= 1) return padLeft + chartWidth / 2;
    return padLeft + (index / (total - 1)) * chartWidth;
  }

  // Calculate points
  const points = activeGrades.map((g, idx) => {
    const pct = calculateGradePercentage(g.mark_achieved, g.mark_total);
    const x = getX(idx, activeGrades.length);
    const y = getY(pct);
    return { grade: g, pct, x, y };
  });

  // Polyline path
  const linePath =
    points.length > 1
      ? points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
      : "";

  const targetY =
    targetGrade !== null && targetGrade !== undefined
      ? getY(targetGrade)
      : null;

  return (
    <div className="space-y-2">
      {/* Legend & Target Note */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-on-surface-variant px-1 gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            <span>{locale === "ar" ? "كويز (دائرة)" : "Quiz (Circle)"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rotate-45 bg-indigo-400 inline-block" />
            <span>{locale === "ar" ? "امتحان رئيسي (معين)" : "Big Exam (Diamond)"}</span>
          </div>
          {targetY !== null && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 border-b-2 border-dashed border-emerald-400 inline-block" />
              <span>{locale === "ar" ? `المستهدف (${targetGrade}%)` : `Target (${targetGrade}%)`}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-surface-container-highest p-0.5 rounded-lg border border-border-subtle font-mono text-[10px]">
            {(["30D", "90D", "ALL"] as RangeOption[]).map((r) => {
              const rangeLabels: Record<RangeOption, string> = {
                "30D": locale === "ar" ? "30 يوم" : "30D",
                "90D": locale === "ar" ? "90 يوم" : "90D",
                ALL: locale === "ar" ? "الكل" : "ALL",
              };
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                    range === r
                      ? "bg-amber-400 text-on-primary shadow-sm"
                      : "text-text-muted hover:text-on-surface"
                  }`}
                >
                  {rangeLabels[r]}
                </button>
              );
            })}
          </div>
          <span className="text-[10px] text-text-muted">
            {locale === "ar"
              ? `${activeGrades.length} تقييم`
              : `${activeGrades.length} ${activeGrades.length === 1 ? "entry" : "entries"}`}
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden rounded-xl bg-surface-container/60 border border-border-subtle p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto max-h-48 overflow-visible select-none"
        >
          {/* Grid lines (0%, 25%, 50%, 75%, 100%) */}
          {[0, 25, 50, 75, 100].map((val) => {
            const y = getY(val);
            return (
              <g key={val}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#E3E5F0"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-text-muted text-[9px] font-mono"
                >
                  {val}%
                </text>
              </g>
            );
          })}

          {/* Target Grade Reference Line */}
          {targetY !== null && (
            <line
              x1={padLeft}
              y1={targetY}
              x2={width - padRight}
              y2={targetY}
              stroke="#10B981"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.8"
            />
          )}

          {/* Connection Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={subjectColor || "#F59E0B"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.85"
            />
          )}

          {/* Points (Circles for Quizzes, Diamonds for Big Exams) */}
          {points.map((pt, idx) => {
            const isQuiz = pt.grade.type === "quiz";
            const isHovered = hoveredGrade?.grade.id === pt.grade.id;

            return (
              <g
                key={pt.grade.id || idx}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredGrade(pt)}
                onMouseLeave={() => setHoveredGrade(null)}
                onClick={() => setHoveredGrade(pt)}
              >
                {/* Hit area */}
                <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />

                {isQuiz ? (
                  // Quiz = Circle
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 6 : 4.5}
                    fill="#F59E0B"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    className="transition-all duration-150"
                  />
                ) : (
                  // Big Exam = Diamond (Polygon)
                  <polygon
                    points={`
                      ${pt.x},${pt.y - (isHovered ? 7 : 5.5)} 
                      ${pt.x + (isHovered ? 7 : 5.5)},${pt.y} 
                      ${pt.x},${pt.y + (isHovered ? 7 : 5.5)} 
                      ${pt.x - (isHovered ? 7 : 5.5)},${pt.y}
                    `}
                    fill="#818CF8"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    className="transition-all duration-150"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover / Tap Tooltip */}
        {hoveredGrade && (
          <div
            className="absolute z-20 pointer-events-none bg-surface-container-high border border-border-medium rounded-lg p-2 shadow-xl text-left font-mono"
            style={{
              left: `${Math.min(75, Math.max(10, (hoveredGrade.x / width) * 100))}%`,
              top: `${Math.max(10, (hoveredGrade.y / height) * 70)}%`,
            }}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                  hoveredGrade.grade.type === "quiz"
                    ? "bg-amber-400/20 text-amber-700"
                    : "bg-indigo-400/20 text-indigo-700"
                }`}
              >
                {hoveredGrade.grade.type === "quiz"
                  ? locale === "ar"
                    ? "كويز"
                    : "Quiz"
                  : locale === "ar"
                  ? "امتحان رئيسي"
                  : "Big Exam"}
              </span>
              <span className="text-[10px] text-text-muted">
                {hoveredGrade.grade.entry_date}
              </span>
            </div>
            <div className="text-xs font-bold text-on-surface mt-1 truncate max-w-[180px]">
              {hoveredGrade.grade.title}
            </div>
            <div className="text-xs text-amber-600 font-semibold mt-0.5">
              {hoveredGrade.pct}%{" "}
              <span className="text-[10px] text-on-surface-variant font-normal">
                ({hoveredGrade.grade.mark_achieved} / {hoveredGrade.grade.mark_total})
              </span>
            </div>
            {hoveredGrade.grade.weight_pct !== null &&
              hoveredGrade.grade.weight_pct !== undefined && (
                <div className="text-[10px] text-text-muted mt-0.5">
                  {locale === "ar" ? "الوزن:" : "Weight:"} {hoveredGrade.grade.weight_pct}%
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
