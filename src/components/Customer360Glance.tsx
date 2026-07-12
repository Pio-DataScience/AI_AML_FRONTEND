"use client";

import React, { useMemo } from "react";
import { Card, CardBody, Chip, Divider, Tooltip } from "@heroui/react";
import { CustomerProfile } from "@/types/alert";

interface Customer360GlanceProps {
    rawJson?: string | CustomerProfile;
}

// Standard AML High-Risk Jurisdictions (ISO Codes)
const HIGH_RISK_ISOS = ["SYR", "IRN", "PRK", "AFG", "SOM", "SDN", "YEM", "MMR", "LBY", "CUB", "VEN"];

/**
 * Customer 360 Glance Panel (Baseball Card UI)
 * High-density summary of customer profile, risk level, and financial standing.
 */
export default function Customer360Glance({ rawJson }: Customer360GlanceProps) {
    // Parse and Validate JSON / Object
    const profile = useMemo<CustomerProfile | null>(() => {
        if (!rawJson) return null;
        try {
            // Logic for handling both parsed objects and double-stringified JSON
            const parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
            
            // Basic validation of schema (check if kyc_profile exists)
            if (parsed && (parsed.kyc_profile || parsed.risk_profile)) {
                return parsed as CustomerProfile;
            }
            return null;
        } catch (e) {
            console.error("Critical: Failed to parse [CUSTOMER_PROFILE_JSON]", e);
            return null;
        }
    }, [rawJson]);

    if (!profile) {
        return (
            <div className="mb-6 p-4 border-2 border-dashed border-red-500 bg-red-50 text-red-700 rounded-lg animate-pulse">
                <p className="font-black text-center text-xs uppercase tracking-widest">
                    🚨 DEBUG: [Customer360Glance] MOUNTED BUT DATA IS MISSING 🚨
                </p>
                <div className="text-[10px] mt-2 font-mono break-all opacity-70">
                    Prop `rawJson`: {rawJson ? "EXISTS BUT PARSE FAILED / SCHEMA MISMATCH" : "UNDEFINED/NULL"}
                </div>
            </div>
        );
    }

    // Monetary Formatter
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(val || 0);
    };

    // Risk Logic Checks
    const risk = profile.risk_profile || {};
    const kyc = profile.kyc_profile || {};
    const finance = profile.financial_baseline_30d || {};

    const isHighRiskRating = risk.overall_risk?.toUpperCase() === "HIGH";
    const isHighRiskJurisdiction = HIGH_RISK_ISOS.includes(risk.jurisdiction?.toUpperCase());

    return (
        <Card 
            className="mb-6 bg-white/40 backdrop-blur-md border border-white/50 shadow-sm" 
            shadow="none"
        >
            <CardBody className="p-4 flex flex-col md:flex-row items-center gap-6 overflow-hidden">
                
                {/* 1. Overall Risk Badge (The Anchor) */}
                <div className="flex flex-col items-center justify-center border-r border-slate-200/50 pr-6 min-w-[140px]">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Risk Profile</span>
                    <Chip
                        variant="shadow"
                        color={isHighRiskRating ? "danger" : risk.overall_risk?.toUpperCase() === "MEDIUM" ? "warning" : "success"}
                        className={`font-black text-sm px-4 py-1 h-8 ${isHighRiskRating ? 'animate-pulse-subtle' : ''}`}
                    >
                        {risk.overall_risk || "N/A"}
                    </Chip>
                </div>

                {/* Profile Grid (Identity, Jurisdiction, Behavioral, Financial) */}
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6 w-full">
                    {/* 2. Demographics & Risk Class */}
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Customer Identity</span>
                        <span className="font-black text-slate-800 text-lg leading-tight truncate">{kyc.name || "Unknown Entity"}</span>
                        <span className="text-xs font-bold text-slate-500 truncate">{kyc.sector || "Unknown Sector"}</span>
                        <div className="flex items-center gap-2 mt-1">
                            <Chip size="sm" variant="flat" className="font-mono font-bold text-[9px] h-5 bg-slate-100 text-slate-500">
                                CLASS: {risk.customer_class || "N/A"}
                            </Chip>
                            <span className="text-[10px] text-slate-400 italic">Age: {kyc.account_age_years || "0"}y</span>
                        </div>
                    </div>

                    {/* 3. Jurisdiction Badge */}
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Jurisdiction</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <Chip
                                size="sm"
                                variant="flat"
                                color={isHighRiskJurisdiction ? "danger" : "default"}
                                className={`font-mono font-bold ${isHighRiskJurisdiction ? "text-danger animate-bounce-subtle" : "text-slate-600"}`}
                                startContent={isHighRiskJurisdiction && <span className="mr-1">⚠️</span>}
                            >
                                {risk.jurisdiction || "Global"}
                            </Chip>
                        </div>
                    </div>

                    {/* 4. Behavioral Baseline (The Missing Signal) */}
                    <div className="flex flex-col border-l border-slate-200/50 pl-6">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Behavioral (30d)</span>
                        <div className="flex flex-col gap-1 mt-1">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-500">Typical Txns</span>
                                <span className="text-xs font-mono font-bold text-slate-700">{finance.typical_transaction_count || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-500">Counterparties</span>
                                <span className="text-xs font-mono font-bold text-slate-700">{finance.unique_counterparties || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* 5. Financial Summary */}
                    <div className="col-span-2 md:col-span-1 border-l border-slate-200/50 pl-6 flex flex-col justify-center">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Income (Stated)</span>
                            <span className="font-mono font-bold text-slate-700">{formatCurrency(finance.stated_monthly_income)}</span>
                        </div>
                        <Divider className="my-1 opacity-50" />
                        <div className="grid grid-cols-2 gap-4 mt-1">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Debit Vol.</span>
                                <span className="font-mono text-xs font-bold text-red-500">{formatCurrency(finance.actual_debit_volume)}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Credit Vol.</span>
                                <span className="font-mono text-xs font-bold text-green-600">{formatCurrency(finance.actual_credit_volume)}</span>
                            </div>
                        </div>
                    </div>

                </div>

            </CardBody>
        </Card>
    );
}
