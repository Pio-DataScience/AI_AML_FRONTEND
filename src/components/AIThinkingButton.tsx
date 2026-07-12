"use client";

import React, { useEffect, useState } from "react";

// Rotating messages that cycle while AI is thinking
const AI_MESSAGES = [
    "Traversing behavioral vectors...",
    "Cross-referencing risk ontology...",
    "Mapping anomaly dimensions...",
    "Querying forensic knowledge base...",
    "Synthesizing contextual signals...",
    "Calibrating threat confidence...",
    "Correlating transaction patterns...",
    "Generating narrative payload...",
];

interface AIThinkingButtonProps {
    isLoading: boolean;
    onClick: () => void;
    label: string;
    disabled?: boolean;
    accentColor?: string;
    style?: React.CSSProperties;
    className?: string;
}

export default function AIThinkingButton({
    isLoading,
    onClick,
    label,
    disabled = false,
    accentColor = "#38BDF8",
    style,
    className,
}: AIThinkingButtonProps) {
    const [msgIndex, setMsgIndex] = useState(0);

    // Cycle status messages every 1.4s
    useEffect(() => {
        if (!isLoading) return;
        const interval = setInterval(() => {
            setMsgIndex(i => (i + 1) % AI_MESSAGES.length);
        }, 1400);
        return () => clearInterval(interval);
    }, [isLoading]);

    if (!isLoading) {
        return (
            <button
                onClick={onClick}
                disabled={disabled}
                className={className}
                style={{
                    width: "100%",
                    padding: "12px 24px",
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    cursor: disabled ? "not-allowed" : "pointer",
                    transition: "all 0.3s",
                    background: `linear-gradient(135deg, ${accentColor}20, ${accentColor}10)`,
                    color: accentColor,
                    border: `1px solid ${accentColor}30`,
                    fontFamily: "'Inter', sans-serif",
                    ...style,
                }}
                onMouseEnter={e => {
                    if (!disabled) {
                        (e.currentTarget as HTMLButtonElement).style.background = `linear-gradient(135deg, ${accentColor}30, ${accentColor}18)`;
                        (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 20px ${accentColor}20`;
                    }
                }}
                onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = `linear-gradient(135deg, ${accentColor}20, ${accentColor}10)`;
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                }}
            >
                {label}
            </button>
        );
    }

    // ── LOADING STATE: Minimalist, Borderless, "Orbital Core" design ────────────────
    return (
        <div className={className} style={{ 
            position: "relative", 
            width: "100%", 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            justifyContent: "center",
            padding: "24px 0",
            minHeight: "100px",
            ...style 
        }}>
            {/* Orbital Rings (SVG for sub-pixel sharpness) */}
            <div style={{ position: "relative", width: 60, height: 60, marginBottom: 16 }}>
                {/* Background Glow */}
                <div style={{
                    position: "absolute", inset: 0, 
                    background: `radial-gradient(circle, ${accentColor}25 0%, transparent 70%)`,
                    animation: "pulseGlow 2.5s ease-in-out infinite",
                }} />
                
                {/* Outer Ring */}
                <svg width="60" height="60" viewBox="0 0 60 60" style={{ position: "absolute", animation: "rotateCW 4s linear infinite" }}>
                    <circle cx="30" cy="30" r="28" fill="none" stroke={accentColor} strokeWidth="0.5" strokeDasharray="1 10" opacity="0.4" />
                    <circle cx="30" cy="2" r="1.5" fill={accentColor} />
                </svg>

                {/* Inner Ring */}
                <svg width="60" height="60" viewBox="0 0 60 60" style={{ position: "absolute", animation: "rotateCCW 3s linear infinite" }}>
                    <circle cx="30" cy="30" r="20" fill="none" stroke={accentColor} strokeWidth="0.5" strokeDasharray="1 8" opacity="0.3" />
                    <circle cx="30" cy="10" r="1" fill={accentColor} opacity="0.8" />
                </svg>

                {/* Core Sparkle */}
                <div style={{ 
                    position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    animation: "coreBreath 2s ease-in-out infinite"
                }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={accentColor}>
                        <path d="M12 3l1.912 5.813L21 12l-7.088 3.187L12 21l-1.912-5.813L3 12l7.088-3.187L12 3z" />
                    </svg>
                </div>
            </div>

            {/* Typography */}
            <div style={{ textAlign: "center", zIndex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ 
                        color: accentColor, fontSize: 10, fontWeight: 900, letterSpacing: "0.2em", textTransform: "uppercase", 
                        fontFamily: "'IBM Plex Mono', monospace", opacity: 0.9
                    }}>
                        AI THINKING
                    </span>
                    <span style={{ display: "inline-flex", gap: 3 }}>
                        {[0, 1, 2].map(i => (
                            <span key={i} style={{
                                width: 3, height: 3, borderRadius: "50%", background: accentColor,
                                animation: `dotsPulse 1s ease-in-out ${i * 0.15}s infinite`,
                            }} />
                        ))}
                    </span>
                </div>
                <p 
                    key={msgIndex}
                    style={{
                        color: `${accentColor}90`, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                        letterSpacing: "0.05em", margin: 0,
                        animation: "textEnter 0.6s ease-out",
                    }}
                >
                    {AI_MESSAGES[msgIndex]}
                </p>
            </div>

            {/* Global Keyframes */}
            <style>{`
                @keyframes pulseGlow {
                    0%, 100% { opacity: 0.4; transform: scale(0.8); }
                    50% { opacity: 0.7; transform: scale(1.1); }
                }
                @keyframes rotateCW {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes rotateCCW {
                    from { transform: rotate(360deg); }
                    to { transform: rotate(0deg); }
                }
                @keyframes coreBreath {
                    0%, 100% { transform: scale(1); opacity: 1; filter: drop-shadow(0 0 5px ${accentColor}40); }
                    50% { transform: scale(1.15); opacity: 0.8; filter: drop-shadow(0 0 12px ${accentColor}80); }
                }
                @keyframes dotsPulse {
                    0%, 100% { transform: scale(1); opacity: 0.3; }
                    50% { transform: scale(1.3); opacity: 1; }
                }
                @keyframes textEnter {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
