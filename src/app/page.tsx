"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, Input, Button, Chip, Autocomplete, AutocompleteItem, Kbd, DatePicker } from "@heroui/react";
import { useTheme } from "next-themes";
import { parseDate, getLocalTimeZone } from "@internationalized/date";

export default function RootCommandCenter() {
    const router = useRouter();
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Global Context State defaults
    const [countryCode, setCountryCode] = useState("400");
    const [instCode, setInstCode] = useState("1");
    // Use CalendarDate for HeroUI DatePicker
    const [batchDateObj, setBatchDateObj] = useState(parseDate("2025-05-16"));

    // Omni-Search State
    const [searchCusNum, setSearchCusNum] = useState("");
    const searchRef = useRef<HTMLInputElement>(null);

    // Mock Triage Stats
    const [triageStats, setTriageStats] = useState({
        pending: 0,
        aiDismissals: 0
    });

    // Prevent hydration mismatch & Load Mock Stats & Shortcut Listener
    useEffect(() => {
        setMounted(true);
        // Simulate fetch
        setTriageStats({
            pending: 124,
            aiDismissals: 85
        });

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Helper to format DateValue to 16-MAY-2025
    const formatBatchDate = (date: any) => {
        if (!date) return "";
        const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        const day = String(date.day).padStart(2, '0');
        const month = months[date.month - 1];
        const year = date.year;
        return `${day}-${month}-${year}`;
    };

    const handleOmniSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && searchCusNum.trim() !== "") {
            const formattedDate = formatBatchDate(batchDateObj);
            router.push(`/alerts/${countryCode}/${instCode}/${searchCusNum.trim()}/${formattedDate}`);
        }
    };

    const handleTriageLaunch = () => {
        const formattedDate = formatBatchDate(batchDateObj);
        router.push(`/triage/${countryCode}/${instCode}/${formattedDate}`);
    };

    if (!mounted) return null;

    const isDark = theme === "dark";

    return (
        <div className={`min-h-screen transition-all duration-500 font-sans selection:bg-cyan-200 selection:text-cyan-900 flex flex-col items-center justify-center relative overflow-hidden ${isDark
            ? "bg-base text-slate-200"
            : "bg-slate-50 text-slate-900"
            }`}>

            {/* Background Ambient Glows */}
            <div className={`absolute top-[-20%] left-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full pointer-events-none transition-opacity duration-1000 ${isDark ? "bg-cyan-900/20 opacity-100" : "bg-cyan-400/10 opacity-60"
                }`} />
            <div className={`absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full pointer-events-none transition-opacity duration-1000 ${isDark ? "bg-blue-900/20 opacity-100" : "bg-blue-400/10 opacity-60"
                }`} />

            {/* Top Bar: Global Context Controls */}
            <div className={`absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20 border-b backdrop-blur-md transition-all ${isDark ? "border-white/5 bg-base/40" : "border-slate-200 bg-white/60"
                }`}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                        <span className="font-black text-white tracking-tighter text-lg">AI</span>
                    </div>
                    <span className={`font-bold tracking-widest text-sm uppercase letter-spacing-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        AML Gateway
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-4 border-r border-slate-200 dark:border-white/10 pr-6 mr-2">
                        {/* Country Select (Autocomplete allowing Typing) */}
                        <Autocomplete
                            size="sm"
                            label="Country"
                            labelPlacement="outside-left"
                            onInputChange={(val) => {
                                // Manual typing + Selection both trigger this when allowed custom value is true
                                if (val !== undefined && val !== "undefined") setCountryCode(val);
                            }}
                            inputValue={countryCode}
                            variant="flat"
                            allowsCustomValue
                            isClearable={false}
                            classNames={{
                                base: "w-32",
                                endContentWrapper: "hidden"
                            }}
                            inputProps={{
                                classNames: {
                                    input: "font-mono font-bold text-xs",
                                    inputWrapper: `h-10 border border-transparent transition-all shadow-none px-2 ${isDark ? "bg-transparent hover:bg-slate-900/50 hover:border-white/10" : "bg-transparent hover:bg-slate-100 hover:border-slate-300"}`
                                }
                            }}
                        >
                            <AutocompleteItem key="400" textValue="400">400 (JO)</AutocompleteItem>
                            <AutocompleteItem key="500" textValue="500">500 (IQ)</AutocompleteItem>
                            <AutocompleteItem key="600" textValue="600">600 (EG)</AutocompleteItem>
                        </Autocomplete>

                        {/* Inst Select (Autocomplete allowing Typing) */}
                        <Autocomplete
                            size="sm"
                            label="Inst"
                            labelPlacement="outside-left"
                            onInputChange={(val) => {
                                // Manual typing + Selection both trigger this when allowed custom value is true
                                if (val !== undefined && val !== "undefined") setInstCode(val);
                            }}
                            inputValue={instCode}
                            variant="flat"
                            allowsCustomValue
                            isClearable={false}
                            classNames={{
                                base: "w-24",
                                endContentWrapper: "hidden" 
                            }}
                            inputProps={{
                                classNames: {
                                    input: "font-mono font-bold text-xs",
                                    inputWrapper: `h-10 border border-transparent transition-all shadow-none px-2 ${isDark ? "bg-transparent hover:bg-slate-900/50 hover:border-white/10" : "bg-transparent hover:bg-slate-100 hover:border-slate-300"}`
                                }
                            }}
                        >
                            <AutocompleteItem key="1" textValue="1">1</AutocompleteItem>
                            <AutocompleteItem key="2" textValue="2">2</AutocompleteItem>
                            <AutocompleteItem key="3" textValue="3">3</AutocompleteItem>
                        </Autocomplete>
                    </div>

                    <div className="flex items-center">
                        <span className={`text-[10px] font-bold uppercase tracking-widest mr-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Batch
                        </span>
                        <DatePicker
                            size="sm"
                            variant="flat"
                            value={batchDateObj}
                            onChange={(val) => val && setBatchDateObj(val)}
                            calendarProps={{
                                showMonthAndYearPickers: true,
                                className: "w-[280px] border-none shadow-2xl",
                                classNames: {
                                    base: isDark ? "bg-slate-900" : "bg-white",
                                    header: isDark ? "text-white" : "text-slate-900 font-bold",
                                    gridHeader: isDark ? "text-slate-400" : "text-slate-600 font-semibold",
                                    cellButton: isDark 
                                        ? "text-slate-200 hover:bg-white/10 data-[today=true]:bg-cyan-500/20 data-[selected=true]:bg-cyan-500 data-[selected=true]:text-white" 
                                        : "text-slate-700 hover:bg-slate-100 data-[today=true]:bg-cyan-100 data-[selected=true]:bg-cyan-600 data-[selected=true]:text-white",
                                }
                            }}
                            classNames={{
                                base: "w-[128px]",
                                segment: isDark ? "text-slate-200" : "text-slate-950 font-semibold",
                                input: isDark ? "text-slate-200" : "text-slate-950",
                                inputWrapper: `h-10 border border-transparent transition-all shadow-none px-2 pr-1 ${isDark ? "bg-transparent hover:bg-slate-900/50 hover:border-white/10" : "bg-transparent hover:bg-slate-100 hover:border-slate-300"}`,
                                selectorButton: isDark ? "text-cyan-400" : "text-cyan-600",
                                popoverContent: isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"
                            }}
                        />
                    </div>

                    <div className="h-5 w-[1.5px] bg-slate-400/50 mx-2" />
                </div>
            </div>

            <div className="max-w-4xl w-full z-10 mt-16 flex flex-col items-center px-4">

                {/* Hero Headers */}

                <h1 className={`text-5xl md:text-7xl font-black tracking-tighter text-center mb-4 transition-all ${isDark
                    ? "text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-cyan-100 to-slate-400"
                    : "text-slate-900"
                    }`}>
                    Command Center
                </h1>

                <p className={`text-lg md:text-xl text-center max-w-2xl mb-12 font-medium leading-relaxed transition-colors ${isDark ? "text-slate-400" : "text-slate-500"
                    }`}>
                    AI-Driven Forensic Discovery and Rapid False Positive Resolution Engine.
                </p>

                {/* Omni-Search */}
                <div className="w-full max-w-3xl mb-16 relative group">
                    <div className={`absolute -inset-1 rounded-3xl blur transition duration-1000 group-hover:duration-200 ${isDark
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 opacity-25 group-hover:opacity-50"
                        : "bg-cyan-200 opacity-0 group-hover:opacity-40"
                        }`} />
                    <Input
                        ref={searchRef}
                        size="lg"
                        placeholder="Search Customer ID (e.g., 100376) to launch Forensic Cockpit..."
                        value={searchCusNum}
                        onChange={(e) => setSearchCusNum(e.target.value)}
                        onKeyDown={handleOmniSearch}
                        classNames={{
                            input: `text-lg transition-colors ${isDark ? "text-slate-200 placeholder:text-slate-500" : "text-slate-900 placeholder:text-slate-400 font-medium"}`,
                            inputWrapper: `h-20 border transition-all backdrop-blur-xl shadow-2xl rounded-2xl px-6 !cursor-text ${isDark ? "bg-surface-1/90 border-white/10" : "bg-white border-slate-200"
                                }`
                        }}
                        startContent={
                            <svg className={`w-6 h-6 mr-3 transition-colors ${isDark ? "text-cyan-400" : "text-cyan-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        }
                        endContent={
                            <div className="flex items-center gap-2">
                                <Kbd keys={["command"]}>K</Kbd>
                                <Chip size="sm" variant="flat" className={isDark ? "bg-slate-800 text-slate-400 border-white/5 font-mono text-xs" : "bg-slate-100 text-slate-500 font-mono text-xs uppercase"}>
                                    Enter ↵
                                </Chip>
                            </div>
                        }
                    />
                </div>

                {/* Action Launchpad Cards */}
                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card
                        isPressable
                        onPress={handleTriageLaunch}
                        className={`border backdrop-blur-md transition-all duration-300 group overflow-hidden hover:scale-[1.02] ${isDark
                            ? "bg-surface-1/40 border-white/5 hover:border-cyan-500/50 hover:bg-surface-2/60"
                            : "bg-white border-slate-200 hover:border-cyan-400 hover:shadow-xl hover:shadow-cyan-500/10"
                            }`}
                    >
                        {/* Hover accent line */}
                        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-cyan-400 to-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />

                        <CardBody className="p-8 flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div className={`w-12 h-12 rounded-full border flex items-center justify-center mb-2 transition-colors ${isDark ? "bg-cyan-950/50 border-cyan-500/30 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600"
                                    }`}>
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                    </svg>
                                </div>
                                <div className="flex gap-2">
                                    <Chip size="sm" color="primary" variant="flat" className="font-bold border-cyan-500/20">
                                        {triageStats.pending} Alerts Pending
                                    </Chip>
                                    <Chip size="sm" color="success" variant="flat" className="font-bold border-emerald-500/20">
                                        {triageStats.aiDismissals} AI-Recommended Dismissals
                                    </Chip>
                                </div>
                            </div>
                            <h3 className={`text-xl font-bold tracking-wide transition-colors ${isDark ? "text-slate-200 group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-600"
                                }`}>
                                Supervised Alert Triage Queue
                            </h3>
                            <p className={`font-medium leading-relaxed transition-colors ${isDark ? "text-slate-500" : "text-slate-600"}`}>
                                Review today's legacy alerts and AI False Positive recommendations in a high-speed reduction interface.
                            </p>
                            <div className={`mt-auto pt-4 flex items-center text-sm font-bold transition-colors ${isDark ? "text-cyan-500/80 group-hover:text-cyan-400" : "text-cyan-600 group-hover:text-cyan-700"
                                }`}>
                                Launch Engine
                                <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </div>
                        </CardBody>
                    </Card>

                    <Card
                        className={`border backdrop-blur-md opacity-60 cursor-not-allowed group transition-all ${isDark ? "bg-slate-900/20 border-white/5" : "bg-slate-100 border-slate-200"
                            }`}
                    >
                        <CardBody className="p-8 flex flex-col gap-4">
                            <div className={`w-12 h-12 rounded-full border flex items-center justify-center mb-2 ${isDark ? "bg-slate-800/50 border-slate-700/50 text-slate-500" : "bg-slate-200 border-slate-300 text-slate-400"
                                }`}>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                            </div>
                            <h3 className={`text-xl font-bold tracking-wide ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                Global Risk Heatmap
                            </h3>
                            <p className={`font-medium leading-relaxed ${isDark ? "text-slate-600" : "text-slate-500"}`}>
                                Macro-level topological view of emerging threat clusters across all global institutional branches.
                            </p>
                            <div className={`mt-auto pt-4 flex items-center text-sm font-bold ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                                Coming Soon / Offline
                            </div>
                        </CardBody>
                    </Card>
                </div>

            </div>
        </div>
    );
}
