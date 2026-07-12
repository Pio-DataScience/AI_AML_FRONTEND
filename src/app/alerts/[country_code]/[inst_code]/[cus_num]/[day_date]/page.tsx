"use client";

import React, { useState, Suspense, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import Plot from "@/components/PlotlyWrapper";
import { useAlert } from "@/hooks/useAlert";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { MacroPayload, MicroPayload, NetworkGraphData } from "@/types/alert";
import { getTransactionHistory } from "@/services/alertService";
import Customer360Glance from "@/components/Customer360Glance";
import dynamic from "next/dynamic";
import AIThinkingButton from "@/components/AIThinkingButton";

const ClusterScatterPlot = dynamic(() => import("@/components/investigation/ClusterScatterPlot"), {
    ssr: false,
    loading: () => <div className="h-[450px] w-full animate-pulse bg-slate-900/40 rounded-2xl" />,
});

const NetworkGraphViewer = dynamic(() => import("@/components/NetworkGraphViewer"), {
    ssr: false,
    loading: () => <div style={{ height: 500, borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} className="animate-pulse" />,
});

// ── Google Fonts ──────────────────────────────────────────────────────────────
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');`;

// ── Theme Token System ────────────────────────────────────────────────────────
function useCockpitTheme() {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted ? resolvedTheme === "dark" : true;

    return {
        isDark,
        bg:            isDark ? "#060B13" : "#EEF2F7",
        panelBorder:   isDark ? "rgba(255,255,255,0.09)" : "rgba(10,15,30,0.10)",
        textPrimary:   isDark ? "#FFFFFF"  : "#0A0F1E",
        textSecondary: isDark ? "#C8D3E8"  : "#1E2A3A",
        textMuted:     isDark ? "#7A8FAD"  : "#4A5568",
        textTiny:      isDark ? "#4F617A"  : "#718096",
        rowBorderBase: isDark ? "rgba(255,255,255,0.06)" : "rgba(10,15,30,0.08)",
        rowHover:      isDark ? "rgba(255,255,255,0.04)" : "rgba(10,15,30,0.03)",
        headerBg:      isDark ? "#0A0F1A"  : "#FFFFFF",
        headerBorder:  isDark ? "rgba(255,255,255,0.08)" : "rgba(10,15,30,0.10)",
        cardFill:      isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.95)",
        cardBorder:    isDark ? "rgba(255,255,255,0.09)" : "rgba(10,15,30,0.10)",
        footerBg:      isDark ? "#0A0F1A"  : "#FFFFFF",
        ambientA:      isDark ? "rgba(56,189,248,0.06)"  : "rgba(56,189,248,0.10)",
        ambientB:      isDark ? "rgba(99,102,241,0.05)"  : "rgba(99,102,241,0.08)",
        ambientC:      isDark ? "rgba(139,92,246,0.04)"  : "rgba(139,92,246,0.06)",
        fontSans:      "'Inter', 'Segoe UI', system-ui, sans-serif",
        fontMono:      "'IBM Plex Mono', 'Courier New', monospace",
        // Chart colors (theme-aware)
        chartBg:       isDark ? "rgba(15,20,40,0.5)" : "rgba(248,250,252,0.8)",
        chartFont:     isDark ? "#7A8FAD" : "#4A5568",
        chartGrid:     isDark ? "rgba(255,255,255,0.06)" : "rgba(10,15,30,0.08)",
    };
}

// ── Severity helpers ──────────────────────────────────────────────────────────
function getSeverityMeta(score: string | number | null) {
    const s = String(score || "").toUpperCase();
    if (s === "H" || Number(score) > 80) return { label: s === "H" ? "HIGH" : `${score}`, color: "#F43F5E", badge: "#F43F5E15", ring: "#F43F5E40" };
    if (s === "M" || (Number(score) > 40)) return { label: s === "M" ? "MEDIUM" : `${score}`, color: "#F59E0B", badge: "#F59E0B15", ring: "#F59E0B40" };
    if (s === "L") return { label: "LOW", color: "#10B981", badge: "#10B98115", ring: "#10B98140" };
    return { label: String(score || "N/A"), color: "#7A8FAD", badge: "rgba(122,143,173,0.1)", ring: "rgba(122,143,173,0.3)" };
}

function getDirectionMeta(ind: string | undefined) {
    if (ind === "1" || ind === "D") return { label: "DEBIT", color: "#F43F5E", badge: "#F43F5E15", ring: "#F43F5E40" };
    if (ind === "2" || ind === "C") return { label: "CREDIT", color: "#10B981", badge: "#10B98115", ring: "#10B98140" };
    return { label: "—", color: "#7A8FAD", badge: "rgba(122,143,173,0.1)", ring: "rgba(122,143,173,0.3)" };
}

// ── Feature map ───────────────────────────────────────────────────────────────
const FEATURE_NAME_EXPANSION: Record<string, string> = {
    AMT_STDDEV: "Amount variation", AVG_TRA_AMT: "Average amount", MAX_TRA_AMT: "Max amount",
    MIN_TRA_AMT: "Min amount", UNIQUE_AMT_RATIO: "Unique amount ratio", AMT_CV: "Amount CV",
    FRACTIONAL_AMT_RATIO: "Fractional ratio", TRA_FREQ: "Txn frequency", HIGH_VAL_TRA: "High value count",
    EXT_FREQ: "External frequency", RISK_COUNTRY_FREQ: "Risk country freq", DEB_FREQ: "Debit freq",
    CRE_FREQ: "Credit freq", ROUND_TRA_FREQ: "Round amount freq", RISK_COUNTRY_SUM: "Risk country sum",
    DEB_SUM: "Total debit sum", CRE_SUM: "Total credit sum", SUM_SENDING: "Total sent",
    SUM_RECIEVING: "Total received", SENDING_RELATION: "Unique sending rels", RECIEVING_RELATION: "Unique recv rels",
    NUM_SENDING: "Outgoing transfers", NUM_RECIEVING: "Incoming transfers", AMT: "Alert Amount",
    STD_AMT: "Amount Variation", MONTHLY_DEBIT: "Monthly Debit", MONTHLY_CREDIT: "Monthly Credit",
    ROLLING_MAX_AMT_24H: "24h Max Amount", ROLLING_MIN_AMT_24H: "24h Min Amount",
    AMOUNT_Z_SCORE: "Amount Z-Score", BALANCE_Z_SCORE: "Balance Z-Score",
    AVG_CUSTOMER_AMOUNT_30D: "30D Avg Spend", AVG_BALANCE_30D: "30D Avg Balance",
    TIME_SINCE_LAST_TXN_DAYS: "Txn Gap (Days)", ROLLING_3_DEBIT_SUM: "Recent Velocity",
    PREV_TRANSACTION_AMOUNT: "Prev Amount",
};

// ── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ label, badge, t }: { label: string; badge?: string; t: ReturnType<typeof useCockpitTheme> }) {
    return (
        <div className="flex items-center gap-3 mb-5">
            <h2 className="text-lg font-black tracking-tight" style={{ color: t.textPrimary }}>{label}</h2>
            {badge && (
                <span className="text-[9px] font-black tracking-[0.15em] uppercase px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(99,102,241,0.12)", color: "#818CF8", boxShadow: "0 0 0 1px rgba(99,102,241,0.25)" }}>
                    {badge}
                </span>
            )}
            <div className="flex-1 h-px" style={{ background: t.headerBorder }} />
        </div>
    );
}

// ── Panel Wrapper ─────────────────────────────────────────────────────────────
function Panel({ children, t, style, className }: { children: React.ReactNode; t: ReturnType<typeof useCockpitTheme>; style?: React.CSSProperties; className?: string }) {
    return (
        <div className={className} style={{
            background: t.cardFill,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 16,
            backdropFilter: "blur(20px)",
            ...style,
        }}>
            {children}
        </div>
    );
}

// ── Macro Zone ────────────────────────────────────────────────────────────────
function MacroContextZone({ macroData, cus_num, day_date, isLoading, isGeneratingMacro, triggerAiNarrative, t }: {
    macroData: MacroPayload | null;
    cus_num: string; day_date: string; isLoading: boolean;
    isGeneratingMacro: boolean; triggerAiNarrative: () => void;
    t: ReturnType<typeof useCockpitTheme>;
}) {
    if (isLoading || !macroData) {
        return (
            <div className="flex flex-col gap-4 mb-8">
                {[300, 150].map((h, i) => (
                    <div key={i} className="animate-pulse rounded-2xl" style={{ height: h, background: t.cardFill, border: `1px solid ${t.cardBorder}` }} />
                ))}
            </div>
        );
    }

    const alert_metadata = macroData?.alert_metadata || {};
    const ai_generated_narrative = alert_metadata?.ai_generated_narrative;
    const hasNarrative = !!ai_generated_narrative && ai_generated_narrative !== "PENDING";

    return (
        <section className="mb-8 flex flex-col gap-5">
            {/* Customer 360 Glance */}
            <Customer360Glance rawJson={macroData.customer_360_snapshot} />

            {/* Forensic AI Narrative */}
            <Panel t={t} style={{ padding: "1.5rem" }}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(135deg, #38BDF8, #6366F1)" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 3l1.912 5.813L21 12l-7.088 3.187L12 21l-1.912-5.813L3 12l7.088-3.187L12 3z" />
                            </svg>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: t.textMuted, fontFamily: t.fontMono }}>Forensic AI Translation</span>
                        {hasNarrative && <span className="text-[9px] font-black tracking-[0.12em] px-2 py-0.5 rounded-full" style={{ background: "#38BDF815", color: "#38BDF8", boxShadow: "0 0 0 1px #38BDF830" }}>AI GENERATED</span>}
                    </div>
                </div>

                {!hasNarrative ? (
                <AIThinkingButton
                        isLoading={isGeneratingMacro}
                        onClick={triggerAiNarrative}
                        label="Run AI Forensic Translation"
                        accentColor="#38BDF8"
                        disabled={isGeneratingMacro}
                    />
                ) : (
                    <div className="border-l-2 border-sky-400 pl-4 pb-2 rounded-r-lg" style={{ background: "linear-gradient(90deg, rgba(56,189,248,0.06), transparent)" }}>
                        <MarkdownRenderer content={ai_generated_narrative} />
                    </div>
                )}
            </Panel>
        </section>
    );
}

// ── Money Flow Sankey ─────────────────────────────────────────────────────────
function MoneyFlowSankey({ microLedger, t }: { microLedger: MicroPayload[]; t: ReturnType<typeof useCockpitTheme> }) {
    if (!microLedger || microLedger.length === 0) return null;

    const nodes: string[] = ["Customer Account"];
    const linksMap: Record<string, number> = {};

    microLedger.forEach(m => {
        const context = m.transaction_context || {};
        const debitCredit = context.DEB_CRE_IND || "0";
        const amount = m.transaction_metadata?.amount || 0;
        const counterparty = context.COUNTERPARTY_NAME || context.ORIGINAL_ACCOUNT_NO || "External Entity";
        if (!amount) return;
        if (!nodes.includes(counterparty)) nodes.push(counterparty);
        let linkKey = "";
        if (debitCredit === "1" || debitCredit === "D") linkKey = `Customer Account|${counterparty}`;
        else if (debitCredit === "2" || debitCredit === "C") linkKey = `${counterparty}|Customer Account`;
        else return;
        linksMap[linkKey] = (linksMap[linkKey] || 0) + Number(amount);
    });

    const source: number[] = [], target: number[] = [], value: number[] = [];
    Object.entries(linksMap).forEach(([key, val]) => {
        const [srcName, tgtName] = key.split("|");
        source.push(nodes.indexOf(srcName));
        target.push(nodes.indexOf(tgtName));
        value.push(val);
    });

    if (source.length === 0) return (
        <Panel t={t} style={{ padding: "2rem", textAlign: "center" }}>
            <p style={{ color: t.textMuted, fontFamily: t.fontMono, fontSize: 12 }}>No directional flow data — DEB_CRE_IND missing</p>
        </Panel>
    );

    const nodeColors = nodes.map(n => n === "Customer Account" ? "#38BDF8" : "#7A8FAD");

    return (
        <Panel t={t} style={{ padding: "1.25rem" }} className="col-span-2 mt-6">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: t.textMuted, fontFamily: t.fontMono }}>Money Flow — Aggregated Sankey</span>
            </div>
            <div style={{ width: "100%", height: 380 }}>
                <Plot
                    data={[{
                        type: "sankey", orientation: "h",
                        node: { pad: 30, thickness: 15, line: { color: "rgba(0,0,0,0)", width: 0 }, label: nodes, color: nodeColors },
                        link: { source, target, value, color: "rgba(56,189,248,0.2)" }
                    }]}
                    layout={{
                        autosize: true, margin: { t: 20, r: 30, l: 30, b: 20 },
                        paper_bgcolor: "transparent", plot_bgcolor: "transparent",
                        font: { color: t.chartFont, family: t.fontMono, size: 10 }
                    }}
                    useResizeHandler style={{ width: "100%", height: "100%" }}
                />
            </div>
        </Panel>
    );
}

// ── Visual Evidence Zone ──────────────────────────────────────────────────────
function VisualEvidenceZone({ macroData, microLedger, history, selectedMicroData, onTransactionClick, cus_num, t }: {
    macroData: MacroPayload | null; microLedger: MicroPayload[];
    history: { tra_date: string; amount: number }[];
    selectedMicroData?: MicroPayload | null;
    onTransactionClick?: (id: string) => void;
    cus_num: string;
    t: ReturnType<typeof useCockpitTheme>;
}) {
    if (!macroData) return null;

    const behavioral_context = macroData.behavioral_context || {};
    let customer_metrics = behavioral_context.customer_metrics || {};
    let peer_cluster_profile = behavioral_context.peer_cluster_profile || {};
    if (Object.keys(customer_metrics).length === 0 && selectedMicroData?.transaction_context) {
        customer_metrics = selectedMicroData.transaction_context;
    }

    const radarMetricKeys = ["AMT","ROLLING_MAX_AMT_24H","ROLLING_3_DEBIT_SUM","AMOUNT_Z_SCORE","BALANCE_Z_SCORE","AVG_CUSTOMER_AMOUNT_30D","AVG_BALANCE_30D","LAG_BALANCE","TIME_SINCE_LAST_TXN_DAYS","PREV_TRANSACTION_AMOUNT","MONTHLY_DEBIT","STD_DEV"];
    const radarCategories = radarMetricKeys.map(k => FEATURE_NAME_EXPANSION[k] || k);

    const getMetricValue = (targetKey: string) => {
        const microCtx = selectedMicroData?.transaction_context || {};
        if (targetKey === "AMT") return selectedMicroData?.transaction_metadata?.amount || 0;
        const foundKey = Object.keys(microCtx).find(k => k.toUpperCase() === targetKey.toUpperCase()) || Object.keys(customer_metrics).find(k => k.toUpperCase() === targetKey.toUpperCase());
        const val = foundKey ? (microCtx[foundKey] ?? customer_metrics[foundKey]) : 0;
        return typeof val === "number" ? val : parseFloat(val) || 0;
    };

    const getPeerMetricValue = (key: string) => {
        const microCtx = selectedMicroData?.transaction_context || {};
        if (key === "AMT") return microCtx.PEER_MEDIAN_AMT || 0;
        if (key === "STD_DEV") return microCtx.PEER_STD_AMT || 0;
        if (key === "MONTHLY_DEBIT") return microCtx.PEER_MEDIAN_MONTHLY_DEBIT || 0;
        const pk = `PEER_MEDIAN_${key}`.toUpperCase(), sk = `PEER_STD_${key}`.toUpperCase();
        const fk = Object.keys(microCtx).find(k => k.toUpperCase() === pk || k.toUpperCase() === sk);
        if (fk) return parseFloat(microCtx[fk]) || 0;
        const mk = Object.keys(peer_cluster_profile).find(k => k.toUpperCase() === key.toUpperCase());
        const mv = mk ? peer_cluster_profile[mk] : 0;
        return typeof mv === "number" ? mv : parseFloat(mv) || 0;
    };

    const rawCustomer = radarMetricKeys.map(k => getMetricValue(k));
    const rawPeer = radarMetricKeys.map(k => getPeerMetricValue(k));
    const customerValues = rawCustomer.map((v, i) => (v / Math.max(v, rawPeer[i], 1)) * 100);
    const peerValues = rawPeer.map((v, i) => (v / Math.max(v, rawCustomer[i], 1)) * 100);
    const customerHoverText = rawCustomer.map((v, i) => `${radarCategories[i]}: ${v.toLocaleString()}`);
    const peerHoverText = rawPeer.map((v, i) => `${radarCategories[i]}: ${v.toLocaleString()}`);

    const validMicro = microLedger.filter(m => m.transaction_metadata);
    const sortedHistory = [...history].sort((a, b) => new Date(a.tra_date).getTime() - new Date(b.tra_date).getTime());

    return (
        <section className="mb-8">
            <SectionHeader label="Visual Evidence Suite" badge="PLOTLY" t={t} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Timeline */}
                <Panel t={t} className="col-span-1 lg:col-span-2" style={{ 
                    padding: "1.5rem", 
                    background: "linear-gradient(180deg, #131826 0%, #0B0F19 100%)", 
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    boxShadow: "0 10px 40px -10px rgba(0,0,0,0.5)"
                }}>
                    <style>{`
                        @keyframes pulse-alert-marker {
                            0% { filter: drop-shadow(0 0 2px rgba(255, 59, 92, 0.6)); }
                            50% { filter: drop-shadow(0 0 12px rgba(255, 107, 129, 1)); }
                            100% { filter: drop-shadow(0 0 2px rgba(255, 59, 92, 0.6)); }
                        }
                        /* Target the second trace (Suspect Alerts) points in Plotly */
                        .js-plotly-plot .scatterlayer .trace:nth-of-type(2) .point {
                            animation: pulse-alert-marker 2s infinite ease-in-out;
                            transform-origin: center;
                            transform-box: fill-box;
                        }
                    `}</style>
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: "#94A3B8", fontFamily: t.fontSans }}>Transaction Amount Timeline</span>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md" style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#3B82F6", boxShadow: "0 0 6px #3B82F6" }} />
                                <span className="text-[10px] font-medium" style={{ color: "#60A5FA", fontFamily: t.fontSans }}>Baseline</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md" style={{ background: "rgba(255, 59, 92, 0.1)", border: "1px solid rgba(255, 59, 92, 0.2)" }}>
                                <div className="w-1.5 h-1.5 rounded-full relative">
                                    <div className="absolute inset-0 rounded-full animate-ping opacity-75" style={{ background: "#FF3B5C" }} />
                                    <div className="relative w-full h-full rounded-full" style={{ background: "#FF3B5C", boxShadow: "0 0 8px #FF3B5C" }} />
                                </div>
                                <span className="text-[10px] font-medium" style={{ color: "#FF6B81", fontFamily: t.fontSans }}>Alert</span>
                            </div>
                        </div>
                    </div>
                    <div style={{ width: "100%", height: 320 }}>
                        <Plot
                            data={[
                                {
                                    x: sortedHistory.map(h => h.tra_date),
                                    y: sortedHistory.map(h => h.amount),
                                    type: "scatter",
                                    mode: "lines+markers",
                                    name: "Baseline History",
                                    line: {
                                        color: "#3B82F6",
                                        width: 3,
                                        shape: "spline",
                                        smoothing: 1.3
                                    },
                                    marker: {
                                        color: "#3B82F6",
                                        size: 8,
                                        opacity: 0.8
                                    },
                                    fill: "tozeroy",
                                    fillcolor: "rgba(59, 130, 246, 0.1)",
                                    hovertemplate: "<br><span style='font-size:11px; color:#94A3B8'>%{x}</span><br><span style='font-size:16px; font-weight:bold; color:#60A5FA'>$%{y:,.2f}</span><extra></extra>"
                                },
                                {
                                    x: validMicro.map(m => m.transaction_metadata?.date || ""),
                                    y: validMicro.map(m => m.transaction_metadata?.amount || 0),
                                    type: "scatter",
                                    mode: "markers",
                                    name: "Suspect Alert",
                                    marker: {
                                        color: "#FF3B5C",
                                        size: 10,
                                        line: {
                                            color: "rgba(255, 59, 92, 0.4)",
                                            width: 6
                                        }
                                    },
                                    customdata: validMicro.map(m => m.id),
                                    hovertemplate: "<br><span style='font-size:11px; font-weight:bold; color:#FF3B5C; letter-spacing:1px'>⚠️ SUSPECT ACTIVITY</span><br><span style='font-size:11px; color:#94A3B8'>%{x}</span><br><span style='font-size:18px; font-weight:900; color:#FF6B81'>$%{y:,.2f}</span><extra></extra>"
                                },
                                selectedMicroData && {
                                    x: [selectedMicroData.transaction_metadata?.date],
                                    y: [selectedMicroData.transaction_metadata?.amount],
                                    type: "scatter",
                                    mode: "markers",
                                    name: "Selected Alert",
                                    marker: {
                                        size: 24,
                                        color: "transparent",
                                        symbol: "circle",
                                        line: {
                                            width: 2,
                                            color: "#FF6B81"
                                        }
                                    },
                                    showlegend: false,
                                    hoverinfo: "none"
                                }
                            ].filter(Boolean) as any}
                            onClick={(data) => { const p = data.points[0]; if (p?.customdata) onTransactionClick?.(p.customdata as string); }}
                            layout={{
                                autosize: true,
                                showlegend: false, // Managed by custom HTML legend
                                margin: { t: 10, r: 10, l: 50, b: 40 },
                                paper_bgcolor: "transparent",
                                plot_bgcolor: "transparent",
                                xaxis: {
                                    type: "date",
                                    tickfont: { size: 10, color: "#64748B", family: "Inter" },
                                    showgrid: true,
                                    gridcolor: "rgba(255, 255, 255, 0.03)",
                                    tickangle: -30,
                                    linecolor: "transparent",
                                    showspikes: true,
                                    spikecolor: "#60A5FA",
                                    spikethickness: 1,
                                    spikedash: "dash",
                                    spikemode: "across"
                                },
                                yaxis: {
                                    tickfont: { size: 10, color: "#64748B", family: "Inter" },
                                    gridcolor: "rgba(255, 255, 255, 0.03)",
                                    linecolor: "transparent",
                                    zerolinecolor: "rgba(255, 255, 255, 0.05)",
                                    showspikes: true,
                                    spikecolor: "#FF3B5C",
                                    spikethickness: 1,
                                    spikedash: "dash",
                                    spikemode: "across"
                                },
                                hoverlabel: {
                                    bgcolor: "#1E293B",
                                    bordercolor: "rgba(255, 255, 255, 0.1)",
                                    font: { family: "Inter", size: 12, color: "#F8FAFC" },
                                    align: "left"
                                },
                                font: { color: t.chartFont, family: "Inter" }
                            }}
                            useResizeHandler style={{ width: "100%", height: "100%" }}
                        />
                    </div>
                </Panel>

                {/* Radar 
                <Panel t={t} style={{ padding: "1.25rem" }}>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] mb-3 block" style={{ color: t.textMuted, fontFamily: t.fontMono }}>Customer vs. Peer Cluster</span>
                    <div style={{ width: "100%", height: 300 }}>
                        <Plot
                            data={[
                                { type: "scatterpolar", r: customerValues, theta: radarCategories, text: customerHoverText, hoverinfo: "text", fill: "toself", name: "Customer", line: { color: "#38BDF8", width: 2 }, fillcolor: "rgba(56,189,248,0.15)", marker: { size: 5 } },
                                { type: "scatterpolar", r: peerValues, theta: radarCategories, text: peerHoverText, hoverinfo: "text", fill: "toself", name: "Peer Group", line: { color: "#7A8FAD", width: 1.5, dash: "dash" }, fillcolor: "rgba(122,143,173,0.08)", marker: { size: 3 } }
                            ]}
                            layout={{
                                autosize: true,
                                polar: { radialaxis: { visible: true, range: [0, 105], showticklabels: false, gridcolor: t.chartGrid }, angularaxis: { tickfont: { size: 9, color: t.chartFont }, gridcolor: t.chartGrid }, bgcolor: "transparent" },
                                paper_bgcolor: "transparent", margin: { t: 30, r: 50, l: 50, b: 30 },
                                legend: { font: { size: 9, color: t.chartFont } },
                                font: { color: t.chartFont, family: t.fontMono },
                            }}
                            useResizeHandler style={{ width: "100%", height: "100%" }}
                        />
                    </div>
                </Panel>
                */}

                {/* Cluster Scatter Plot */}
                <Panel t={t} style={{ padding: "1.25rem" }} className="col-span-1 lg:col-span-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] mb-3 block" style={{ color: t.textMuted, fontFamily: t.fontMono }}>Semantic Cluster Projection (UMAP)</span>
                    <ClusterScatterPlot targetCusNum={cus_num} />
                </Panel>
            </div>

            {/* <MoneyFlowSankey microLedger={microLedger} t={t} /> */}
        </section>
    );
}

// ── Network Zone ──────────────────────────────────────────────────────────────
function NetworkSyndicateZone({ data, isLoading, t }: { data: NetworkGraphData | null; isLoading: boolean; t: ReturnType<typeof useCockpitTheme> }) {
    return (
        <section className="mb-8">
            <SectionHeader label="Network Syndicate Graph" badge="NEO4J SUBGRAPH" t={t} />
            <div style={{ height: 600, width: "100%" }}>
                <NetworkGraphViewer data={data} isLoading={isLoading} />
            </div>
            <p className="mt-2 px-2 text-[10px] italic" style={{ color: t.textTiny, fontFamily: t.fontMono }}>
                4-hop traversal identifies Shared Devices, Proximate Accounts, and Indirect Money Trails.
            </p>
        </section>
    );
}

// ── Micro Ledger Zone ─────────────────────────────────────────────────────────
function MicroLedgerZone({ microLedger, validMicroLedger, selectedMicroData, isGeneratingMicro, triggerMicroNarrative, selectedKeys, setSelectedKeys, tableRef, t }: {
    microLedger: MicroPayload[]; validMicroLedger: MicroPayload[];
    selectedMicroData?: MicroPayload | null;
    isGeneratingMicro: Record<string, boolean>;
    triggerMicroNarrative: (id: string) => void;
    selectedKeys: Set<string>;
    setSelectedKeys: (keys: Set<string>) => void;
    tableRef: React.RefObject<HTMLDivElement | null>;
    t: ReturnType<typeof useCockpitTheme>;
}) {
    return (
        <section className="mb-8" ref={tableRef}>
            <SectionHeader label="Transaction Ledger" badge="MICRO CONTEXT" t={t} />

            <div className="flex flex-col lg:flex-row gap-5">
                {/* Left: Table */}
                <div className="flex-1 overflow-hidden" style={{ borderRadius: 16 }}>
                    {/* Column headers */}
                    <div className="flex items-center gap-4 px-5 py-2.5" style={{ background: t.headerBg, borderBottom: `1px solid ${t.rowBorderBase}`, borderRadius: "16px 16px 0 0", border: `1px solid ${t.panelBorder}`, borderBottomWidth: 0 }}>
                        <span className="text-[9px] font-black uppercase tracking-[0.15em] flex-1" style={{ color: t.textMuted, fontFamily: t.fontMono }}>Date</span>
                        <span className="text-[9px] font-black uppercase tracking-[0.15em] w-20" style={{ color: t.textMuted, fontFamily: t.fontMono }}>Type</span>
                        <span className="text-[9px] font-black uppercase tracking-[0.15em] w-32 text-right" style={{ color: t.textMuted, fontFamily: t.fontMono }}>Amount</span>
                        <span className="text-[9px] font-black uppercase tracking-[0.15em] w-24 text-right" style={{ color: t.textMuted, fontFamily: t.fontMono }}>Severity</span>
                    </div>

                    {/* Rows */}
                    <div style={{ border: `1px solid ${t.panelBorder}`, borderTop: "none", borderRadius: "0 0 16px 16px", overflow: "hidden" }}>
                        {validMicroLedger.length === 0 ? (
                            <div className="flex items-center justify-center py-16" style={{ background: t.cardFill }}>
                                <p style={{ color: t.textMuted, fontFamily: t.fontMono, fontSize: 12 }}>No transactions found.</p>
                            </div>
                        ) : validMicroLedger.map((item, idx) => {
                            const isSelected = selectedKeys.has(item.id);
                            const dir = getDirectionMeta(item.transaction_context?.DEB_CRE_IND);
                            const sev = getSeverityMeta(item.transaction_metadata?.severity_score);
                            const amount = item.transaction_metadata?.amount;

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedKeys(new Set([item.id]))}
                                    role="button" tabIndex={0}
                                    onKeyDown={(e) => e.key === "Enter" && setSelectedKeys(new Set([item.id]))}
                                    className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-all duration-200 relative"
                                    style={{
                                        borderBottom: idx < validMicroLedger.length - 1 ? `1px solid ${t.rowBorderBase}` : "none",
                                        borderLeft: `2px solid ${isSelected ? sev.color : "transparent"}`,
                                        // AGGRESSIVE GRADIENT on selection
                                        background: isSelected
                                            ? `linear-gradient(90deg, ${sev.color}20 0%, ${sev.color}10 35%, ${dir.color}08 70%, transparent 100%)`
                                            : idx % 2 === 0 ? t.cardFill : "transparent",
                                        paddingLeft: isSelected ? "calc(1.25rem - 0px)" : "1.25rem",
                                    }}
                                    onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = t.rowHover; }}
                                    onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = idx % 2 === 0 ? t.cardFill : "transparent"; }}
                                >
                                    {/* Selection full-width glow */}
                                    {isSelected && (
                                        <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: `inset 3px 0 0 ${sev.color}` }} />
                                    )}

                                    {/* Date */}
                                    <span className="flex-1 text-sm font-semibold" style={{ color: isSelected ? t.textPrimary : t.textSecondary, fontFamily: t.fontMono }}>
                                        {item.transaction_metadata?.date || "—"}
                                    </span>

                                    {/* Type */}
                                    <span className="w-20">
                                        <span className="text-[9px] font-black tracking-[0.12em] px-2 py-0.5 rounded-full"
                                            style={{ background: dir.badge, color: dir.color, boxShadow: `0 0 0 1px ${dir.ring}` }}>
                                            {dir.label}
                                        </span>
                                    </span>

                                    {/* Amount */}
                                    <span className="w-32 text-right text-sm font-bold" style={{ color: isSelected ? sev.color : t.textSecondary, fontFamily: t.fontMono }}>
                                        {amount !== null && amount !== undefined ? `$${Number(amount).toLocaleString()}` : "—"}
                                    </span>

                                    {/* Severity */}
                                    <span className="w-24 text-right">
                                        <span className="text-[9px] font-black tracking-[0.12em] px-2 py-0.5 rounded-full"
                                            style={{ background: sev.badge, color: sev.color, boxShadow: `0 0 0 1px ${sev.ring}` }}>
                                            {sev.label}
                                        </span>
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Transaction Detail Panel */}
                {selectedMicroData && (() => {
                    const dir = getDirectionMeta(selectedMicroData.transaction_context?.DEB_CRE_IND);
                    const sev = getSeverityMeta(selectedMicroData.transaction_metadata?.severity_score);
                    return (
                        <div className="w-full lg:w-[420px] shrink-0 flex flex-col" style={{
                            background: t.isDark
                                ? `linear-gradient(160deg, ${sev.color}0A 0%, ${dir.color}08 40%, rgba(10,15,26,0.97) 80%)`
                                : `linear-gradient(160deg, ${sev.color}08 0%, ${dir.color}06 40%, rgba(255,255,255,0.98) 80%)`,
                            border: `1px solid ${sev.color}30`,
                            borderLeft: `3px solid ${sev.color}`,
                            borderRadius: 16,
                            overflow: "hidden",
                            backdropFilter: "blur(24px)",
                            boxShadow: `0 0 40px ${sev.color}15, 0 8px 30px rgba(0,0,0,0.2)`,
                        }}>
                            {/* Detail Header */}
                            <div className="px-5 py-4 flex items-start justify-between" style={{ borderBottom: `1px solid ${sev.color}20` }}>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-full"
                                            style={{ background: sev.badge, color: sev.color, boxShadow: `0 0 0 1px ${sev.ring}` }}>
                                            {sev.label}
                                        </span>
                                        <span className="text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-full"
                                            style={{ background: dir.badge, color: dir.color, boxShadow: `0 0 0 1px ${dir.ring}` }}>
                                            {dir.label}
                                        </span>
                                    </div>
                                    <span className="text-2xl font-black" style={{ color: sev.color, fontFamily: t.fontMono }}>
                                        ${Number(selectedMicroData.transaction_metadata?.amount || 0).toLocaleString()}
                                    </span>
                                    <p className="text-xs mt-0.5" style={{ color: t.textMuted, fontFamily: t.fontMono }}>{selectedMicroData.transaction_metadata?.date}</p>
                                </div>
                                <button onClick={() => setSelectedKeys(new Set())} style={{ color: t.textMuted, fontSize: 18, lineHeight: 1 }}>✕</button>
                            </div>

                            {/* Anomaly Drivers */}
                            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${sev.color}15` }}>
                                <span className="text-[9px] font-black uppercase tracking-[0.15em] mb-3 block" style={{ color: t.textMuted, fontFamily: t.fontMono }}>Local Anomaly Drivers</span>
                                {selectedMicroData.local_anomaly_drivers?.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {selectedMicroData.local_anomaly_drivers.map((d, i) => (
                                            <span key={i} className="text-[9px] font-bold px-2 py-1 rounded-full"
                                                style={{ background: "#F43F5E12", color: "#F43F5E", boxShadow: "0 0 0 1px #F43F5E30", fontFamily: t.fontMono }}>
                                                {d}
                                            </span>
                                        ))}
                                    </div>
                                ) : <span style={{ color: t.textTiny, fontFamily: t.fontMono, fontSize: 11 }}>None detected</span>}
                            </div>

                            {/* AI Micro Narrative */}
                            <div className="px-5 py-4 flex-1">
                                <span className="text-[9px] font-black uppercase tracking-[0.15em] mb-3 block" style={{ color: t.textMuted, fontFamily: t.fontMono }}>AI Micro Narrative</span>
                                {selectedMicroData.transaction_metadata?.ai_micro_narrative ? (
                                    <div className="p-3 rounded-xl" style={{ background: `${sev.color}08`, border: `1px solid ${sev.color}20` }}>
                                        <MarkdownRenderer content={selectedMicroData.transaction_metadata.ai_micro_narrative} />
                                    </div>
                                ) : (
                                    <AIThinkingButton
                                        isLoading={!!isGeneratingMicro[selectedMicroData.id]}
                                        onClick={() => triggerMicroNarrative(selectedMicroData.id)}
                                        label="Generate AI Micro Insight"
                                        accentColor={sev.color}
                                        disabled={!!isGeneratingMicro[selectedMicroData.id]}
                                    />
                                )}
                            </div>
                        </div>
                    );
                })()}
            </div>
        </section>
    );
}

// ── Root Page ─────────────────────────────────────────────────────────────────
export default function AlertCockpitPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: "100vh", background: "#060B13", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 32, height: 32, border: "2px solid #38BDF8", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "rgba(56,189,248,0.5)", textTransform: "uppercase", letterSpacing: "0.2em" }}>Initializing Cockpit...</span>
                </div>
            </div>
        }>
            <AlertCockpitContent />
        </Suspense>
    );
}

function AlertCockpitContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const t = useCockpitTheme();

    const country_code = (params.country_code === "undefined" ? null : params.country_code as string) || "400";
    const inst_code = (params.inst_code === "undefined" ? null : params.inst_code as string) || "1";
    const cus_num = (params.cus_num === "undefined" ? null : params.cus_num as string) || "DEFAULT";
    const day_date = (params.day_date === "undefined" ? null : params.day_date as string) || "16-MAY-2025";
    const tra_seq1 = searchParams.get("tra_seq1");
    const tra_seq2 = searchParams.get("tra_seq2");

    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const [history, setHistory] = useState<{ tra_date: string; amount: number }[]>([]);
    const tableRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        if (!cus_num || cus_num === "DEFAULT") return;
        getTransactionHistory(country_code, inst_code, cus_num).then(setHistory).catch(console.error);
    }, [country_code, inst_code, cus_num]);

    const { macroData, microLedger, networkData, isLoading, isNetworkLoading, error, isGeneratingMacro, isGeneratingMicro, triggerAiNarrative, triggerMicroNarrative } = useAlert(country_code, inst_code, cus_num, day_date, tra_seq1, tra_seq2);

    const handleTransactionClick = (id: string) => {
        setSelectedKeys(new Set([id]));
        tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const validMicroLedger = microLedger.filter(m => m.transaction_metadata);
    const selectedMicroData = validMicroLedger.find(m => selectedKeys.has(m.id));

    if (error) return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: t.bg }}>
            <div style={{ padding: 32, borderRadius: 16, border: "1px solid #F43F5E30", background: "#F43F5E08", textAlign: "center", maxWidth: 400 }}>
                <p style={{ color: "#F43F5E", fontWeight: 800, marginBottom: 8 }}>Connection Error</p>
                <p style={{ color: t.textMuted, fontSize: 13 }}>{error}</p>
            </div>
        </div>
    );

    return (
        <div style={{ minHeight: "100vh", background: t.bg, fontFamily: t.fontSans, color: t.textPrimary, transition: "background 0.4s, color 0.4s" }}>
            <style>{FONT_IMPORT}</style>

            {/* Ambient Blobs */}
            <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
                <div style={{ position: "absolute", top: "-20%", left: "5%", width: 600, height: 600, borderRadius: "50%", background: t.ambientA, filter: "blur(140px)" }} />
                <div style={{ position: "absolute", bottom: "-10%", right: "5%", width: 500, height: 500, borderRadius: "50%", background: t.ambientB, filter: "blur(130px)" }} />
                <div style={{ position: "absolute", top: "40%", left: "40%", width: 400, height: 400, borderRadius: "50%", background: t.ambientC, filter: "blur(120px)" }} />
            </div>

            {/* Top Nav */}
            <header style={{ position: "sticky", top: 0, zIndex: 20, height: 56, display: "flex", alignItems: "center", padding: "0 1.5rem", background: t.headerBg, borderBottom: `1px solid ${t.headerBorder}`, backdropFilter: "blur(20px)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #38BDF8, #6366F1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                            <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                        </svg>
                    </div>
                    <span style={{ fontWeight: 900, fontSize: 13, letterSpacing: "-0.03em", color: t.textPrimary }}>SENTINEL</span>
                    <span style={{ color: t.textTiny, margin: "0 4px" }}>·</span>
                    <span style={{ fontSize: 11, fontFamily: t.fontMono, textTransform: "uppercase", letterSpacing: "0.15em", color: t.textMuted }}>Investigator Cockpit</span>
                </div>

                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: t.cardFill, border: `1px solid ${t.cardBorder}` }}>
                        <code style={{ fontFamily: t.fontMono, fontSize: 10, color: "#38BDF8" }}>{cus_num}</code>
                        <span style={{ color: t.textTiny, fontFamily: t.fontMono, fontSize: 9 }}>|</span>
                        <span style={{ fontFamily: t.fontMono, fontSize: 10, color: t.textMuted }}>{day_date}</span>
                    </div>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 8px #10B981" }} className="animate-pulse" />
                </div>
            </header>

            {/* Main Content */}
            <main style={{ position: "relative", zIndex: 1, maxWidth: 1440, margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>
                <MacroContextZone macroData={macroData} cus_num={cus_num} day_date={day_date} isLoading={isLoading} isGeneratingMacro={isGeneratingMacro} triggerAiNarrative={triggerAiNarrative} t={t} />

                {!isLoading && <VisualEvidenceZone macroData={macroData} microLedger={microLedger} history={history} selectedMicroData={selectedMicroData} onTransactionClick={handleTransactionClick} cus_num={cus_num} t={t} />}

                {!isLoading && <NetworkSyndicateZone data={networkData} isLoading={isNetworkLoading} t={t} />}

                {!isLoading && (
                    <div ref={tableRef}>
                        <MicroLedgerZone microLedger={microLedger} validMicroLedger={validMicroLedger} selectedMicroData={selectedMicroData} isGeneratingMicro={isGeneratingMicro} triggerMicroNarrative={triggerMicroNarrative} selectedKeys={selectedKeys} setSelectedKeys={setSelectedKeys} tableRef={tableRef} t={t} />
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 32, display: "flex", alignItems: "center", padding: "0 1.5rem", background: t.footerBg, borderTop: `1px solid ${t.headerBorder}`, zIndex: 20 }}>
                <span style={{ fontFamily: t.fontMono, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: t.textTiny }}>AML Platform v3.0 · Investigator Cockpit</span>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} className="animate-pulse" />
                    <span style={{ fontFamily: t.fontMono, fontSize: 9, color: t.textTiny }}>System Nominal</span>
                </div>
            </footer>
        </div>
    );
}
