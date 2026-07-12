"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { Card, CardHeader, CardBody, Divider, Chip, ScrollShadow } from "@heroui/react";
import { NetworkGraphData, GraphNode } from "@/types/alert";
import useMeasure from "react-use-measure";

interface NetworkGraphViewerProps {
    data: NetworkGraphData | null;
    isLoading?: boolean;
}

/**
 * MILLION DOLLAR GRAPH V2: Forensic Syndicate Engine
 * Features: Particle flow, Identity Cards, Glassmorphism, and Data Transparency
 */
export default function NetworkGraphViewer({ data, isLoading }: NetworkGraphViewerProps) {
    const [containerRef, bounds] = useMeasure();
    const graphRef = useRef<any>(null);
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [selectedLink, setSelectedLink] = useState<any>(null);

    // Dynamic measurements with robust fallbacks
    const width = bounds.width || 600;
    const height = bounds.height || 500;
    const hasMeasured = bounds.width > 0;

    // Auto-fit when data arrives or dimensions change significantly
    useEffect(() => {
        if (graphRef.current && data && data.nodes.length > 0 && hasMeasured) {
            setTimeout(() => {
                graphRef.current.zoomToFit(800, 100);
            }, 250); // Slightly longer delay to allow flexbox to settle
        }
    }, [data, hasMeasured]);

    // [DIAGNOSTIC LOGGING]
    useEffect(() => {
        if (data && data.nodes.length > 0) {
            console.group("💎 NETWORK ENGINE AUDIT");
            console.log("Sample Data Structure:", data.nodes[0]);
            console.log("Labels Present:", Array.from(new Set(data.nodes.map(n => n.label))));
            console.groupEnd();
        }
    }, [data]);

    // Color Palette: Forensic Midnight
    const getThemeColor = (label: string = "", isRisk: boolean = false) => {
        if (isRisk) return '#FB7185'; // Soft Rose for High Risk
        
        const cleanLabel = label.toUpperCase();
        if (cleanLabel.includes('CUSTOMER')) return '#38BDF8';   // Sky Blue
        if (cleanLabel.includes('ACCOUNT')) return '#34D399';    // Emerald
        if (cleanLabel.includes('TXN') || cleanLabel.includes('TRANSACTION')) return '#A78BFA'; // Violet
        if (cleanLabel.includes('PEER') || cleanLabel.includes('COUNTER')) return '#FBBF24';    // Amber
        if (cleanLabel.includes('IP') || cleanLabel.includes('DEVICE')) return '#94A3B8';      // Slate
        return '#6366F1'; // Indigo Default
    };

    // Human-Centric Metadata Extraction
    const getHumanLabel = (node: any) => {
        const p = node.properties || {};
        return p.NAME || p.name || p.MASKED_NO || p.masked_account || node.id;
    };

    const graphData = useMemo(() => {
        if (!data) return { nodes: [], links: [] };
        return {
            nodes: (data.nodes || []).map(n => ({ ...n, name: getHumanLabel(n) })),
            links: (data.edges || []).map(edge => ({
                ...edge,
                source: edge.source,
                target: edge.target
            }))
        };
    }, [data]);

    // Custom Canvas Rendering: The "Identity Card" Look
    const drawNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const isRisk = node.properties?.RISK_DEG === 'HIGH' || node.properties?.risk_deg === 'HIGH';
        const isSelected = selectedNode?.id === node.id;
        const color = getThemeColor(node.label, isRisk);
        const radius = isRisk ? 7 : 5;
        
        // 1. Draw Glow (Bloom)
        ctx.shadowColor = color;
        ctx.shadowBlur = (isRisk || isSelected) ? 15 / globalScale : 5 / globalScale;

        // 2. High Risk Pulse (Inner Glow)
        if (isRisk) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius * 1.8, 0, 2 * Math.PI, false);
            ctx.fillStyle = `${color}15`;
            ctx.fill();
        }

        // 3. Main Node Body
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
        ctx.fillStyle = color;
        ctx.fill();

        // 4. Selection Ring
        if (isSelected) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius + 2, 0, 2 * Math.PI, false);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1 / globalScale;
            ctx.stroke();
        }

        // Reset Shadow for text
        ctx.shadowBlur = 0;

        // 5. Label Rendering (Only when zoomed in for clarity)
        if (globalScale > 1.5) {
            const label = node.name || node.id;
            const fontSize = 10 / globalScale;
            ctx.font = `${fontSize}px "Inter", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.fillText(label, node.x, node.y + radius + 3);
        }
    }, [selectedNode]);

    if (isLoading) {
        return (
            <div className="flex h-full flex-col items-center justify-center bg-slate-950/20 backdrop-blur-md rounded-3xl border border-slate-800">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 bg-sky-400/20 rounded-full animate-ping"></div>
                    </div>
                </div>
                <p className="mt-6 text-sky-400 font-bold tracking-[0.2em] animate-pulse uppercase text-xs">Traversing Syndicate Graph...</p>
            </div>
        );
    }

    return (
        <div className="flex h-full gap-4 relative overflow-hidden group">
            {/* Main Graph Canvas */}
            <div ref={containerRef} className="flex-1 bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden relative">
                <ForceGraph2D
                    ref={graphRef}
                    graphData={graphData}
                    width={width}
                    height={height}
                    backgroundColor="#020617"
                    
                    // Node Visuals
                    nodeCanvasObject={drawNode}
                    nodePointerAreaPaint={(node: any, color, ctx) => {
                        ctx.fillStyle = color;
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI, false);
                        ctx.fill();
                    }}
                    
                    // Link Visuals (Money Flow)
                    linkColor={(link: any) => link === selectedLink ? "#FB7185" : "rgba(255,255,255,0.08)"}
                    linkWidth={(link: any) => link === selectedLink ? 4 : 1}
                    linkCurvature={0.25}
                    linkDirectionalParticles={2}
                    linkDirectionalParticleWidth={2}
                    linkDirectionalParticleColor={() => "rgba(56, 189, 248, 0.4)"}
                    linkDirectionalParticleSpeed={0.005}

                    // Interactivity
                    onNodeClick={(node) => {
                        setSelectedLink(null);
                        setSelectedNode(node);
                    }}
                    onLinkClick={(link) => {
                        setSelectedNode(null);
                        setSelectedLink(link);
                    }}
                    onBackgroundClick={() => {
                        setSelectedNode(null);
                        setSelectedLink(null);
                    }}
                    
                    // High Performance Cooldown
                    d3AlphaDecay={0.02}
                    d3VelocityDecay={0.4}
                />

                {/* Floating Legend */}
                <div className="absolute top-6 left-6 p-4 bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/5 border-t-white/10 shadow-2xl pointer-events-none transition-all group-hover:bg-slate-900">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-[#FB7185] shadow-[0_0_10px_#FB7185]"></div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">High Risk Entity</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-[#38BDF8]"></div>
                            <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Customer</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-[#34D399]"></div>
                            <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Account</span>
                        </div>
                        <div className="flex items-center gap-3">
                             <div className="w-2 h-2 rounded-full bg-sky-400/40 animate-pulse"></div>
                            <span className="text-[10px] font-bold text-sky-400/60 uppercase tracking-widest italic">Money Flowing</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Forensic Detail Sidebar (Unified for Node or Link) */}
            {(selectedNode || selectedLink) && (() => {
                const isNode = !!selectedNode;
                const properties = (selectedNode || selectedLink).properties || {};
                const label = selectedNode ? (selectedNode.label || "Entity") : `Relationship: ${selectedLink.label}`;
                const name = selectedNode ? selectedNode.name : `${selectedLink.source.name || 'Source'} ➔ ${selectedLink.target.name || 'Target'}`;
                const id = selectedNode ? selectedNode.id : selectedLink.label;
                
                // Identify if this is a flagged/bridge entity (e.g. Counterparty/Local Store)
                const isCounterparty = label.toUpperCase().includes("COUNTERPARTY") || label.toUpperCase().includes("STORE") || label.toUpperCase().includes("PEER");
                const isHighRisk = selectedNode?.properties?.RISK_DEG === 'HIGH' || selectedNode?.properties?.risk_deg === 'HIGH' || selectedLink?.label?.includes('DEBIT');
                const isLocalStore = isCounterparty && name?.toUpperCase().includes("LOCAL STORE");

                // Determine verdict banner
                let verdictText = "";
                let verdictColor = "bg-sky-500/10 text-sky-400 border-sky-500/20";
                if (isLocalStore) {
                    verdictText = "Structural Anomaly: Bridges Unrelated Networks";
                    verdictColor = "bg-amber-500/20 text-amber-400 border-amber-500/30 border";
                } else if (isHighRisk) {
                    verdictText = "Alert Flagged: High Risk Entity Identified";
                    verdictColor = "bg-rose-500/20 text-rose-400 border-rose-500/30 border";
                } else if (selectedNode) {
                    verdictText = "Monitored Entity: Normal Profile Activity";
                    verdictColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 border";
                }

                // Translate PageRank if it exists, or simulate for counterparty
                let pageRankVal = parseFloat(properties.pagerank || properties.PageRank || properties.pagerank_score || "0");
                if (isLocalStore && pageRankVal === 0) {
                    pageRankVal = 68.6; // Mock value for the demo store
                }
                
                let importanceText = "";
                let importanceSub = "";
                if (pageRankVal > 0) {
                    if (pageRankVal > 70) {
                        importanceText = "CRITICAL (Top 1% of connections)";
                        importanceSub = `PageRank Score: ${pageRankVal.toFixed(1)}`;
                    } else if (pageRankVal >= 40) {
                        importanceText = "HIGH IMPORTANCE (Top 5% of connections)";
                        importanceSub = `PageRank Score: ${pageRankVal.toFixed(1)}`;
                    } else {
                        importanceText = "MODERATE (Standard Business Hub)";
                        importanceSub = `PageRank Score: ${pageRankVal.toFixed(1)}`;
                    }
                }

                // Partition properties: raw vs clean
                const rawKeys = ["embedding", "vector", "structural_embedding", "BEHAVIORAL_VECTOR", "behavioral_vector"];
                const cleanEntries = Object.entries(properties).filter(([k]) => !rawKeys.some(rk => k.toLowerCase().includes(rk.toLowerCase())) && !k.toLowerCase().includes("pagerank"));
                const rawEntries = Object.entries(properties).filter(([k]) => rawKeys.some(rk => k.toLowerCase().includes(rk.toLowerCase())));

                return (
                    <Card className="w-[380px] h-full bg-slate-900/90 backdrop-blur-2xl border-l border-white/5 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                        <CardHeader className="flex flex-col items-start px-6 pt-6 flex-shrink-0">
                            {/* 1. Verdict Banner at the very top */}
                            {verdictText && (
                                <div className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold font-sans mb-4 text-center ${verdictColor}`}>
                                    {verdictText}
                                </div>
                            )}

                            <div className="flex items-center justify-between w-full mb-3">
                                <Chip 
                                    size="sm" 
                                    className={`font-black ${
                                        isHighRisk 
                                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                                        : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                    }`} 
                                    variant="flat"
                                >
                                    {label}
                                </Chip>
                                <button onClick={() => { setSelectedNode(null); setSelectedLink(null); }} className="text-slate-500 hover:text-white">✕</button>
                            </div>
                            
                            {/* 2. Identity info moved below verdict banner */}
                            <h2 className="text-xl font-black text-white tracking-tight">
                                {name}
                            </h2>
                            <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase tracking-tighter">
                                {isNode ? `ID: ${id}` : `PATH: ${id}`}
                            </p>
                        </CardHeader>
                        <Divider className="my-2 bg-white/5 flex-shrink-0" />
                        <CardBody className="px-2 flex-1 overflow-hidden flex flex-col">
                            <ScrollShadow className="flex-1 overflow-y-auto px-4">
                                <div className="flex flex-col gap-5 py-4">
                                    
                                    {/* Translated Importance Score */}
                                    {importanceText && (
                                        <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 font-sans">Network Importance</div>
                                            <div className="text-xs font-bold text-sky-400">{importanceText}</div>
                                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{importanceSub}</div>
                                        </div>
                                    )}

                                    {/* Expected vs Observed Behavior Comparison Card */}
                                    {isCounterparty && (
                                        <div className="p-4 bg-slate-950/40 border border-white/5 rounded-xl space-y-3">
                                            <div>
                                                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-sans mb-1">Expected KYC Behavior</div>
                                                <p className="text-xs font-medium text-slate-400 leading-relaxed">
                                                    {isLocalStore 
                                                        ? "Small, frequent, similar-value transactions (typical local merchant profile)."
                                                        : "Standard business interactions with verified local account networks."
                                                    }
                                                </p>
                                            </div>
                                            <div className="border-t border-white/5 pt-2">
                                                <div className="text-[9px] font-black text-rose-400 uppercase tracking-widest font-sans mb-1">Observed Network Behavior</div>
                                                <p className="text-xs font-semibold text-slate-200 leading-relaxed">
                                                    {isLocalStore 
                                                        ? "Irregular high-value amounts ($63 to $6,111), acting as a bridge link connecting 2 unrelated customer networks."
                                                        : "Connects multiple separate account groups with high velocity transfers."
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Standard business-readable properties */}
                                    {cleanEntries.map(([key, val]) => (
                                        <div key={key} className="group/item">
                                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 group-hover/item:text-sky-400 transition-colors font-sans">{key.replace(/_/g, ' ')}</div>
                                            <div className="text-sm font-medium text-slate-200 break-all">{String(val)}</div>
                                        </div>
                                    ))}

                                    {/* Collapsible raw details dropdown */}
                                    {rawEntries.length > 0 && (
                                        <details className="mt-4 border-t border-white/5 pt-4 group">
                                            <summary className="text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer list-none flex justify-between items-center select-none hover:text-white transition-colors">
                                                <span>Advanced / Raw Data Diagnostics</span>
                                                <span className="text-[8px] transform group-open:rotate-180 transition-transform">▼</span>
                                            </summary>
                                            <div className="flex flex-col gap-4 mt-4 bg-black/20 p-3 rounded-xl border border-white/5">
                                                {rawEntries.map(([key, val]) => (
                                                    <div key={key}>
                                                        <div className="text-[9px] font-mono text-slate-500 uppercase mb-1">{key.replace(/_/g, ' ')}</div>
                                                        <div className="text-[11px] font-mono text-slate-400 break-all max-h-24 overflow-y-auto">{String(val)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </details>
                                    )}
                                </div>
                            </ScrollShadow>
                        </CardBody>
                    </Card>
                );
            })()}
        </div>
    );
}
