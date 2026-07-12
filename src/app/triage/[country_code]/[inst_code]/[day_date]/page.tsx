"use client";

import React, { useState, Suspense, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useTriageQueue } from "@/hooks/useTriageQueue";
import { TriagePayload } from "@/types/triage";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import Customer360Glance from "@/components/Customer360Glance";

// ── Theme Token Helper ────────────────────────────────────────────────────────

// ── Google Fonts (Inter + IBM Plex Mono for compliance) ──────────────────────
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');`;

function useTriageTheme() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? (resolvedTheme === "dark") : true;

  return {
    isDark,
    bg: isDark ? "#060B13" : "#EEF2F7",
    // Panels
    panelBg: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.92)",
    panelBorder: isDark ? "rgba(255,255,255,0.09)" : "rgba(15,23,42,0.12)",
    // Text — WCAG AA/AAA compliant
    textPrimary:   isDark ? "#FFFFFF"  : "#0A0F1E",       // pure white / near-black
    textSecondary: isDark ? "#C8D3E8"  : "#1E2A3A",       // light-blue-grey / dark navy
    textMuted:     isDark ? "#7A8FAD"  : "#4A5568",       // muted blue / medium slate
    textTiny:      isDark ? "#4F617A"  : "#718096",       // ultra-muted / light-grey
    // Row
    rowHover:      isDark ? "rgba(255,255,255,0.04)" : "rgba(10,15,30,0.03)",
    rowSelected:   isDark ? "rgba(255,255,255,0.07)" : "rgba(99,102,241,0.07)",
    rowBorderBase: isDark ? "rgba(255,255,255,0.06)" : "rgba(10,15,30,0.08)",
    // Header / Footer
    headerBg:   isDark ? "#0A0F1A"  : "#FFFFFF",
    headerBorder: isDark ? "rgba(255,255,255,0.08)" : "rgba(10,15,30,0.10)",
    footerBg:   isDark ? "#0A0F1A"  : "#FFFFFF",
    // Cards
    cardFill:   isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.95)",
    cardBorder: isDark ? "rgba(255,255,255,0.09)" : "rgba(10,15,30,0.10)",
    // Ambient glows
    ambientA: isDark ? "rgba(99,102,241,0.08)"  : "rgba(99,102,241,0.10)",
    ambientB: isDark ? "rgba(139,92,246,0.05)"  : "rgba(139,92,246,0.07)",
    ambientC: isDark ? "rgba(56,189,248,0.05)"  : "rgba(56,189,248,0.07)",
    // Scrollbar
    scrollbarThumb: isDark ? "rgba(255,255,255,0.14)" : "rgba(10,15,30,0.15)",
    scrollbarHover: isDark ? "rgba(255,255,255,0.22)" : "rgba(10,15,30,0.25)",
    // Font stacks
    fontSans: "'Inter', 'Segoe UI', system-ui, sans-serif",
    fontMono: "'IBM Plex Mono', 'Courier New', monospace",
  };
}


// ── Decision Meta ─────────────────────────────────────────────────────────────

function getRiskMeta(decision: string) {
  const d = decision.toLowerCase();
  if (d.includes("false positive"))
    return { label: "FALSE POSITIVE", color: "#10B981", glow: "rgba(16,185,129,0.2)", badge: "#10B98115", badgeText: "#10B981", ring: "#10B98130" };
  if (d.includes("violation"))
    return { label: "VIOLATION", color: "#F43F5E", glow: "rgba(244,63,94,0.2)", badge: "#F43F5E15", badgeText: "#F43F5E", ring: "#F43F5E30" };
  return { label: "REVIEW", color: "#F59E0B", glow: "rgba(245,158,11,0.2)", badge: "#F59E0B15", badgeText: "#F59E0B", ring: "#F59E0B30" };
}

// ── Confidence Arc ────────────────────────────────────────────────────────────

function ConfidenceArc({ value, color }: { value: number; color: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="relative w-[76px] h-[76px] shrink-0">
      <svg width="76" height="76" viewBox="0 0 76 76" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="38" cy="38" r={r} fill="none" stroke={`${color}18`} strokeWidth="5" />
        <circle cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.9s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[12px] font-black" style={{ color }}>{value.toFixed(0)}%</span>
        <span className="text-[8px] font-bold uppercase tracking-wider mt-0.5" style={{ color: `${color}60` }}>Risk</span>
      </div>
    </div>
  );
}

// ── Alert Row ─────────────────────────────────────────────────────────────────

function AlertRow({ item, isSelected, onClick, index, t }: {
  item: TriagePayload;
  isSelected: boolean;
  onClick: () => void;
  index: number;
  t: ReturnType<typeof useTriageTheme>;
}) {
  const decision = item.ai_verdict?.decision || "Unknown";
  const confidence = parseFloat(item.ai_verdict?.confidence_score || "0");
  const { label, color, badge, badgeText, ring } = getRiskMeta(decision);
  const hasConflict = item.legacy_context?.ai_agreement === false;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="group relative flex items-center gap-4 px-5 py-4 cursor-pointer transition-all duration-150"
      style={{
        borderBottom: `1px solid ${t.rowBorderBase}`,
        borderLeft: `2px solid ${isSelected ? color : "transparent"}`,
        background: isSelected
          ? `linear-gradient(90deg, ${getRiskMeta(decision).glow} 0%, ${t.rowSelected} 60%)`
          : undefined,
        paddingLeft: isSelected ? "calc(1.25rem - 0px)" : "1.25rem",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = t.rowHover;
      }}
      onMouseLeave={(e) => {
        if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "";
      }}
    >
      {/* Index */}
      <span className="text-[10px] font-mono w-5 shrink-0 select-none" style={{ color: t.textMuted, fontFamily: t.fontMono }}>
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* Customer */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-sm font-bold tracking-tight truncate" style={{ color: isSelected ? t.textPrimary : t.textSecondary }}>
          {item.customer_number}
        </span>
        <span className="text-[10px] font-mono mt-0.5" style={{ color: t.textMuted, fontFamily: t.fontMono }}>
          {item.tra_seq1} · {item.tra_seq2}
        </span>
      </div>

      {/* Rule */}
      <div className="hidden md:flex flex-col flex-1 min-w-0">
        <span className="text-[10px] font-mono truncate" style={{ color: t.textMuted, fontFamily: t.fontMono }}>
          {item.legacy_context?.rule_triggered || "—"}
        </span>
      </div>

      {/* AI Conflict Dot */}
      {hasConflict && (
        <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" title="AI disagrees with rule" />
      )}

      {/* Confidence */}
      <span className="shrink-0 text-[11px] font-mono font-bold" style={{ color }}>
        {item.ai_verdict?.confidence_score || "—"}
      </span>

      {/* Decision Badge */}
      <span
        className="shrink-0 text-[9px] font-black tracking-[0.12em] px-2 py-1 rounded-full"
        style={{ background: badge, color: badgeText, boxShadow: `0 0 0 1px ${ring}` }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Alert Queue Panel ─────────────────────────────────────────────────────────

function AlertQueuePanel({ queueData, selectedId, onSelect, t }: {
  queueData: TriagePayload[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  t: ReturnType<typeof useTriageTheme>;
}) {
  const fp = queueData.filter(q => q.ai_verdict?.decision?.toLowerCase().includes("false positive")).length;
  const viol = queueData.filter(q => q.ai_verdict?.decision?.toLowerCase().includes("violation")).length;

  return (
    <div className="flex flex-col h-full">
      {/* Stats Bar */}
      <div className="flex items-center gap-6 px-5 py-4 shrink-0" style={{ borderBottom: `1px solid ${t.panelBorder}` }}>
        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-widest" style={{ color: t.textMuted, fontFamily: t.fontMono }}>Total</span>
          <span className="text-2xl font-black" style={{ color: t.textPrimary }}>{queueData.length}</span>
        </div>
        <div className="h-8 w-px" style={{ background: t.panelBorder }} />
        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-widest text-emerald-500">FP Detected</span>
          <span className="text-lg font-black text-emerald-500">{fp}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-widest text-rose-500">Violations</span>
          <span className="text-lg font-black text-rose-500">{viol}</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[10px] font-mono text-amber-400/70">LIVE</span>
        </div>
      </div>

      {/* Column Headers */}
      <div className="flex items-center gap-4 px-5 py-2 shrink-0" style={{ background: t.headerBg, borderBottom: `1px solid ${t.panelBorder}` }}>
        <span className="text-[9px] font-black uppercase tracking-[0.15em] w-5" style={{ color: t.textMuted, fontFamily: t.fontMono }}>#</span>
        <span className="text-[9px] font-black uppercase tracking-[0.15em] flex-1" style={{ color: t.textMuted, fontFamily: t.fontMono }}>Customer</span>
        <span className="text-[9px] font-black uppercase tracking-[0.15em] flex-1 hidden md:flex" style={{ color: t.textMuted, fontFamily: t.fontMono }}>Rule</span>
        <span className="text-[9px] font-black uppercase tracking-[0.15em] w-12 text-right" style={{ color: t.textMuted, fontFamily: t.fontMono }}>Score</span>
        <span className="text-[9px] font-black uppercase tracking-[0.15em] w-24 text-right" style={{ color: t.textMuted, fontFamily: t.fontMono }}>Decision</span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: `${t.scrollbarThumb} transparent` }}>
        {queueData.map((item, idx) => (
          <AlertRow key={item.id} item={item} isSelected={selectedId === item.id}
            onClick={() => onSelect(item.id)} index={idx} t={t} />
        ))}
      </div>
    </div>
  );
}

// ── XAI Focus Panel ───────────────────────────────────────────────────────────

function XAIPanel({ selectedAlert, isGeneratingNarrative, triggerNarrative, country_code, inst_code, day_date, t }: {
  selectedAlert: TriagePayload | undefined;
  isGeneratingNarrative: boolean;
  triggerNarrative: (item: TriagePayload) => void;
  country_code: string;
  inst_code: string;
  day_date: string;
  t: ReturnType<typeof useTriageTheme>;
}) {
  if (!selectedAlert) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-10 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: t.cardFill, border: `1px solid ${t.cardBorder}` }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={t.textMuted} strokeWidth="1.5">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: t.textSecondary }}>No Alert Selected</p>
          <p className="text-xs mt-1" style={{ color: t.textMuted, fontFamily: t.fontMono }}>Select a row from the queue to begin investigation</p>
        </div>
      </div>
    );
  }

  const { ai_verdict, legacy_context, explanation } = selectedAlert;
  const confidence = parseFloat(ai_verdict?.confidence_score || "0");
  const { label, color, glow, badge, badgeText, ring } = getRiskMeta(ai_verdict?.decision || "");
  const drivers = explanation?.top_drivers || [];
  const hasConflict = legacy_context?.ai_agreement === false;

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: `${t.scrollbarThumb} transparent` }}>

      {/* Verdict Hero */}
      <div className="relative p-6" style={{ borderBottom: `1px solid ${t.panelBorder}`, background: `radial-gradient(ellipse at top right, ${glow} 0%, transparent 70%)` }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-[9px] font-black tracking-[0.15em] px-2.5 py-1 rounded-full"
                style={{ background: badge, color: badgeText, boxShadow: `0 0 0 1px ${ring}` }}>
                {label}
              </span>
              {hasConflict && (
                <span className="text-[9px] font-black tracking-[0.1em] px-2.5 py-1 rounded-full"
                  style={{ background: "#F59E0B15", color: "#F59E0B", boxShadow: "0 0 0 1px #F59E0B30" }}>
                  RULE CONFLICT
                </span>
              )}
            </div>
            <h3 className="text-xl font-black leading-tight" style={{ color: t.textPrimary }}>
              Customer <span style={{ color }}>{selectedAlert.customer_number}</span>
            </h3>
            <p className="text-[10px] font-mono mt-1" style={{ color: t.textMuted, fontFamily: t.fontMono }}>
              seq {selectedAlert.tra_seq1} · {selectedAlert.tra_seq2}
            </p>
          </div>
          <ConfidenceArc value={confidence} color={color} />
        </div>

        {/* Rule vs AI Grid */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="rounded-xl p-3" style={{ background: t.cardFill, border: `1px solid ${t.cardBorder}` }}>
            <span className="text-[9px] uppercase tracking-widest" style={{ color: t.textMuted, fontFamily: t.fontMono }}>Rule Engine</span>
            <p className="text-xs font-bold mt-1 leading-tight" style={{ color: t.textSecondary }}>
              {legacy_context?.rule_triggered || "—"}
            </p>
          </div>
          <div className="rounded-xl p-3" style={{ background: t.cardFill, border: `1px solid ${color}30` }}>
            <span className="text-[9px] uppercase tracking-widest" style={{ color: t.textMuted, fontFamily: t.fontMono }}>AI Model</span>
            <p className="text-xs font-bold mt-1 leading-tight" style={{ color }}>
              {ai_verdict?.decision || "—"}
            </p>
            <p className="text-[9px] font-mono mt-1" style={{ color: t.textMuted, fontFamily: t.fontMono }}>
              Threshold: {ai_verdict?.threshold_used}
            </p>
          </div>
        </div>
      </div>

      {/* Customer 360 */}
      <div className="px-5 pt-5">
        <Customer360Glance rawJson={selectedAlert.customer_360_snapshot} />
      </div>

      {/* SHAP Drivers */}
      <div className="px-5 pt-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[9px] font-black uppercase tracking-[0.15em]" style={{ color: t.textMuted, fontFamily: t.fontMono }}>Feature Drivers</span>
          <div className="flex-1 h-px" style={{ background: t.panelBorder }} />
          <span className="text-[9px]" style={{ color: t.textMuted, fontFamily: t.fontMono }}>SHAP</span>
        </div>
        {drivers.length > 0 ? (
          <div className="flex flex-col gap-5">
            {drivers.map((driver, idx) => {
              const isIncreasing = driver.impact_direction === "increasing_risk";
              const weight = parseFloat(driver.impact_weight.replace('%', '')) || 0;
              const dc = isIncreasing ? "#F43F5E" : "#10B981";
              return (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-3 rounded-full" style={{ background: dc }} />
                      <span className="text-xs font-bold" style={{ color: t.textSecondary }}>{driver.feature}</span>
                    </div>
                    <span className="text-[11px] font-black" style={{ color: dc }}>{driver.impact_weight}</span>
                  </div>
                  <div className="relative h-1 rounded-full overflow-hidden" style={{ background: `${dc}15` }}>
                    <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                      style={{ width: `${weight}%`, background: `linear-gradient(90deg, ${dc}80, ${dc})` }} />
                  </div>
                  <p className="text-[10px] mt-1.5" style={{ color: t.textMuted, fontFamily: t.fontMono }}>{driver.description}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs italic" style={{ color: t.textMuted, fontFamily: t.fontMono }}>No SHAP data available.</p>
        )}
      </div>

      {/* Narrative */}
      <div className="px-5 pt-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[9px] font-black uppercase tracking-[0.15em]" style={{ color: t.textMuted, fontFamily: t.fontMono }}>AI Narrative</span>
          <div className="flex-1 h-px" style={{ background: t.panelBorder }} />
        </div>
        {explanation?.narrative ? (
          <div className="rounded-xl p-4 pb-6" style={{ background: t.cardFill, border: `1px solid ${t.cardBorder}` }}>
            <MarkdownRenderer content={explanation.narrative} />
          </div>
        ) : (
          <button
            onClick={() => triggerNarrative(selectedAlert)}
            disabled={isGeneratingNarrative}
            className="w-full py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all duration-300"
            style={{
              background: isGeneratingNarrative ? t.cardFill : `linear-gradient(135deg, #6366F120, #8B5CF620)`,
              color: isGeneratingNarrative ? t.textMuted : "#818CF8",
              border: `1px solid ${isGeneratingNarrative ? t.cardBorder : "#6366F130"}`,
              cursor: isGeneratingNarrative ? "not-allowed" : "pointer",
            }}
          >
            {isGeneratingNarrative ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin inline-block" />
                Generating Narrative...
              </span>
            ) : "Generate AI Narrative"}
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-auto px-5 pt-5 pb-6">
        <div className="flex gap-3">
          <button
            className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-150"
            style={{ border: `1px solid ${t.panelBorder}`, color: t.textSecondary }}
          >
            Dismiss
          </button>
          <Link
            href={`/alerts/${country_code}/${inst_code}/${selectedAlert.customer_number}/${day_date}?tra_seq1=${selectedAlert.tra_seq1}&tra_seq2=${selectedAlert.tra_seq2}`}
            className="flex-[2] py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-center transition-all duration-150"
            style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
          >
            Escalate to Cockpit →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function TriageContent() {
  const params = useParams();
  const t = useTriageTheme();

  const country_code = (params.country_code === "undefined" ? null : params.country_code as string) || "400";
  const inst_code = (params.inst_code === "undefined" ? null : params.inst_code as string) || "1";
  const day_date = (params.day_date === "undefined" ? null : params.day_date as string) || "16-MAY-2025";

  const { queueData, isLoading, error, isGeneratingNarrative, triggerNarrative } = useTriageQueue(country_code, inst_code, day_date);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const selectedAlertId = Array.from(selectedKeys)[0];
  const selectedAlert = queueData.find(m => m.id === selectedAlertId);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: t.bg }}>
        <div className="p-8 rounded-2xl text-center max-w-md" style={{ border: "1px solid #F43F5E30", background: "#F43F5E08" }}>
          <span className="text-2xl">⚠</span>
          <h2 className="text-lg font-black text-rose-500 mt-2">Connection Error</h2>
          <p className="text-sm mt-1" style={{ color: t.textSecondary }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden transition-colors duration-500"
      style={{ background: t.bg, fontFamily: t.fontSans, color: t.textPrimary }}>
      <style>{FONT_IMPORT}</style>

      {/* Ambient Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full blur-[140px]"
          style={{ background: t.ambientA }} />
        <div className="absolute top-[30%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[140px]"
          style={{ background: t.ambientB }} />
        <div className="absolute bottom-[-10%] left-[30%] w-[400px] h-[400px] rounded-full blur-[120px]"
          style={{ background: t.ambientC }} />
      </div>

      {/* Top Nav */}
      <header className="relative shrink-0 h-14 flex items-center px-6 z-10 backdrop-blur-xl"
        style={{ borderBottom: `1px solid ${t.headerBorder}`, background: t.headerBg }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-sm font-black tracking-tight" style={{ color: t.textPrimary }}>SENTINEL</span>
          <span className="text-[10px] mx-1" style={{ color: t.textMuted, fontFamily: t.fontMono }}>·</span>
          <span className="text-[11px] font-mono uppercase tracking-widest" style={{ color: t.textMuted, fontFamily: t.fontMono }}>Supervised Triage</span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: t.cardFill, border: `1px solid ${t.cardBorder}` }}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono" style={{ color: t.textMuted, fontFamily: t.fontMono }}>{day_date}</span>
          </div>
          <span className="text-[10px] px-3 py-1.5 rounded-full font-black"
            style={{ background: "#6366F115", color: "#818CF8", boxShadow: "0 0 0 1px #6366F120" }}>
            {queueData.length} ALERTS
          </span>
        </div>
      </header>

      {/* Split View */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* LEFT: Queue */}
        <div className="w-full xl:w-[55%] flex flex-col" style={{ borderRight: `1px solid ${t.panelBorder}` }}>
          <div className="shrink-0 h-11 flex items-center px-5"
            style={{ borderBottom: `1px solid ${t.panelBorder}`, background: t.headerBg }}>
            <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: t.textMuted, fontFamily: t.fontMono }}>Alert Queue</span>
            <span className="ml-auto text-[9px]" style={{ color: t.textMuted, fontFamily: t.fontMono }}>
              {queueData.filter(q => q.ai_verdict?.decision?.toLowerCase().includes("false positive")).length} FP detected
            </span>
          </div>

          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="flex flex-col">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: `1px solid ${t.rowBorderBase}` }}>
                    <div className="w-5 h-2 rounded animate-pulse" style={{ background: t.cardFill }} />
                    <div className="flex-1 h-3 rounded animate-pulse" style={{ background: t.cardFill }} />
                    <div className="w-16 h-3 rounded animate-pulse" style={{ background: t.cardFill }} />
                    <div className="w-20 h-5 rounded-full animate-pulse" style={{ background: t.cardFill }} />
                  </div>
                ))}
              </div>
            ) : (
              <AlertQueuePanel queueData={queueData} selectedId={selectedAlertId}
                onSelect={(id) => setSelectedKeys(new Set([id]))} t={t} />
            )}
          </div>
        </div>

        {/* RIGHT: XAI Panel */}
        <div className="hidden xl:flex flex-col w-[45%]">
          <div className="shrink-0 h-11 flex items-center px-5"
            style={{ borderBottom: `1px solid ${t.panelBorder}`, background: t.headerBg }}>
            <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: t.textMuted }}>Investigation Panel</span>
            {selectedAlert && (
              <div className="ml-auto flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-[9px] font-mono text-indigo-400/70">Active</span>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <XAIPanel
              selectedAlert={selectedAlert}
              isGeneratingNarrative={isGeneratingNarrative}
              triggerNarrative={triggerNarrative}
              country_code={country_code}
              inst_code={inst_code}
              day_date={day_date}
              t={t}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative shrink-0 h-8 flex items-center px-6 z-10"
        style={{ borderTop: `1px solid ${t.headerBorder}`, background: t.footerBg }}>
        <div className="flex items-center gap-3 text-[9px] font-mono uppercase tracking-widest" style={{ color: t.textMuted }}>
          <span>AML Platform v3.0</span>
          <span>·</span>
          <span>False Positive Reduction Engine</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9px] font-mono" style={{ color: t.textMuted }}>System Nominal</span>
        </div>
      </footer>
    </div>
  );
}

export default function TriagePage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center" style={{ background: "#060B13" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Initializing Triage Engine...</span>
        </div>
      </div>
    }>
      <TriageContent />
    </Suspense>
  );
}
