import { useState, useEffect, useRef } from "react";
import { getMacroAlert, getMicroLedger, getNetworkGraph, generateMacroNarrative, generateMicroNarrative } from "@/services/alertService";
import { MacroPayload, MicroPayload, NetworkGraphData } from "@/types/alert";

export function useAlert(country_code: string, inst_code: string, cus_num: string, day_date: string, tra_seq1?: string | null, tra_seq2?: string | null) {
    const [macroData, setMacroData] = useState<MacroPayload | null>(null);
    const [microLedger, setMicroLedger] = useState<MicroPayload[]>([]);
    const [networkData, setNetworkData] = useState<NetworkGraphData | null>(null);
    
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isNetworkLoading, setIsNetworkLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [networkError, setNetworkError] = useState<string | null>(null);

    // Track loading state for Macro level AI generation
    const [isGeneratingMacro, setIsGeneratingMacro] = useState<boolean>(false);

    // Map of transaction ID -> loading state for Micro level AI generation
    const [isGeneratingMicro, setIsGeneratingMicro] = useState<Record<string, boolean>>({});

    // STABILITY: Track last fetched keys to prevent redundant calls during Next.js hydration
    const lastFetchKey = useRef<string>("");

    useEffect(() => {
        let isMounted = true;

        const currentKey = `${country_code}|${inst_code}|${cus_num}|${day_date}|${tra_seq1}|${tra_seq2}`;
        if (currentKey === lastFetchKey.current) return;
        
        lastFetchKey.current = currentKey;

        const loadData = async () => {
            setIsLoading(true);
            setIsNetworkLoading(true);
            setError(null);
            setNetworkError(null);

            // Validate all keys exist before making backend calls
            if (!country_code || !inst_code || !cus_num || !day_date) {
                if (isMounted) {
                    setIsLoading(false);
                    setIsNetworkLoading(false);
                    setError("Missing required route parameters (country, inst, customer, date).");
                }
                return;
            }

            try {
                // 1. Fetch fast-path data first (Macro & Micro) to get the investigator working immediately
                const [macro, micro] = await Promise.all([
                    getMacroAlert(country_code, inst_code, cus_num, day_date),
                    getMicroLedger(country_code, inst_code, cus_num, day_date, tra_seq1, tra_seq2)
                ]);

                if (isMounted) {
                    setMacroData(macro);
                    setMicroLedger(micro);
                    setIsLoading(false); // Enable the main cockpit view
                }

                // 2. Fetch Graph data in a secondary path (decoupled)
                const network = await getNetworkGraph(country_code, inst_code, cus_num, day_date);
                
                if (isMounted) {
                    setNetworkData(network);
                    setIsNetworkLoading(false); // Enable only the graph zone
                }
            } catch (err: any) {
                if (isMounted) {
                    setError(err.message || "Failed to load alert payload data from backend.");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                    setIsNetworkLoading(false);
                }
            }
        };

        loadData();

        return () => {
            isMounted = false;
            lastFetchKey.current = ""; // Reset to allow refetching if StrictMode unmounts/remounts the component
        };
    }, [country_code, inst_code, cus_num, day_date, tra_seq1, tra_seq2]);

    // Triggers FastAPI to generate macro narrative via physical local LLM
    const triggerAiNarrative = async () => {
        setIsGeneratingMacro(true);
        try {
            const res = await generateMacroNarrative(country_code, inst_code, cus_num, day_date);

            // Safely push new AI narrative strings to live DOM without needing manual page refresh
            setMacroData(prev => prev ? {
                ...prev,
                alert_metadata: {
                    ...prev.alert_metadata,
                    ai_generated_narrative: res.narrative
                }
            } : prev);
        } catch (err: any) {
            console.error("Narrative Generation Failed: ", err);
        } finally {
            setIsGeneratingMacro(false);
        }
    };

    // Triggers FastAPI to generate micro narrative for highly specific transaction arrays
    const triggerMicroNarrative = async (transactionId: string) => {
        // Oracle's TRANSACTION_KEY comes through as "100376_68_1" instead of "68-1". 
        // We split by '_' and grab the last two segments as sequence 1 and 2.
        const idParts = transactionId.split('_');
        let tra_seq1 = transactionId;
        let tra_seq2 = "0";

        if (idParts.length >= 3) {
            // E.g., [cus_num, tra_seq1, tra_seq2]
            tra_seq1 = idParts[idParts.length - 2];
            tra_seq2 = idParts[idParts.length - 1];
        } else if (transactionId.includes('-')) {
            const dashParts = transactionId.split('-');
            tra_seq1 = dashParts[0];
            tra_seq2 = dashParts[1] || "0";
        }

        setIsGeneratingMicro(prev => ({ ...prev, [transactionId]: true }));
        try {
            const res = await generateMicroNarrative(
                country_code,
                inst_code,
                cus_num,
                day_date,
                tra_seq1,
                tra_seq2
            );

            // Safely inject new result over nested sub-transaction
            setMicroLedger(prev => prev.map(m => m.id === transactionId ? {
                ...m,
                transaction_metadata: {
                    ...m.transaction_metadata,
                    ai_micro_narrative: res.narrative
                }
            } : m));

        } catch (err: any) {
            console.error("Micro Narrative Generation Failed: ", err);
        } finally {
            setIsGeneratingMicro(prev => ({ ...prev, [transactionId]: false }));
        }
    };

    return {
        macroData,
        microLedger,
        networkData,
        isLoading,
        isNetworkLoading,
        error,
        networkError,
        isGeneratingMacro,
        isGeneratingMicro,
        triggerAiNarrative,
        triggerMicroNarrative
    };
}
