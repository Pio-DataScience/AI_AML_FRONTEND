import { useState, useEffect, useRef } from "react";
import { getMacroAlert, getMicroLedger, getNetworkGraph, generateMacroNarrative, generateMicroNarrative } from "@/services/alertService";
import { getCustomerMiniProfile } from "@/services/customerService";
import { getFriendlyApiErrorMessage } from "@/services/apiError";
import { MacroPayload, MicroPayload, NetworkGraphData } from "@/types/alert";
import { CustomerMiniProfileResponse } from "@/types/customer";

/**
 * Result wrapper that converts a promise into a never-rejecting value.
 * This prevents one failing request (e.g. the macro 404 for a non-suspicious
 * customer) from aborting the others via Promise.all rejection coupling.
 */
type Settled<T> = { ok: true; value: T } | { ok: false; error: unknown };

async function settle<T>(promise: Promise<T>): Promise<Settled<T>> {
    try {
        return { ok: true, value: await promise };
    } catch (error) {
        return { ok: false, error };
    }
}

export function useAlert(country_code: string, inst_code: string, cus_num: string, day_date: string, tra_seq1?: string | null, tra_seq2?: string | null) {
    const [macroData, setMacroData] = useState<MacroPayload | null>(null);
    const [microLedger, setMicroLedger] = useState<MicroPayload[]>([]);
    const [networkData, setNetworkData] = useState<NetworkGraphData | null>(null);
    const [customerProfile, setCustomerProfile] = useState<CustomerMiniProfileResponse | null>(null);

    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isNetworkLoading, setIsNetworkLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [microError, setMicroError] = useState<string | null>(null);

    // ── Customer lookup lifecycle ─────────────────────────────────────────
    // noAlert        : the customer exists but has no AML alert record (valid state)
    // customerNotFound: neither an alert nor a customer profile exists (bad customer ID)
    // error          : a real backend / network failure (5xx, timeout, unreachable)
    const [noAlert, setNoAlert] = useState<boolean>(false);
    const [customerNotFound, setCustomerNotFound] = useState<boolean>(false);

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
            setMicroError(null);
            setNoAlert(false);
            setCustomerNotFound(false);
            setMacroData(null);
            setMicroLedger([]);
            setNetworkData(null);
            setCustomerProfile(null);

            // Validate all keys exist before making backend calls
            if (!country_code || !inst_code || !cus_num || !day_date) {
                if (isMounted) {
                    setIsLoading(false);
                    setIsNetworkLoading(false);
                    setError("Missing required route parameters (country, inst, customer, date).");
                }
                return;
            }

            // Launch every request in parallel, but wrap each one so a single
            // failure (most importantly the macro 404 for a non-suspicious
            // customer) can never cancel or fail the others.
            const macroRequest = settle(getMacroAlert(country_code, inst_code, cus_num, day_date));
            const microRequest = settle(getMicroLedger(country_code, inst_code, cus_num, day_date, tra_seq1, tra_seq2));
            const profileRequest = settle(getCustomerMiniProfile(cus_num));
            const networkRequest = getNetworkGraph(country_code, inst_code, cus_num, day_date)
                .catch((): NetworkGraphData => ({ nodes: [], edges: [] }));

            const [macroResult, microResult, profileResult] = await Promise.all([
                macroRequest,
                microRequest,
                profileRequest,
            ]);

            if (!isMounted) return;

            // ── Customer identity (mini-profile) ──────────────────────────
            // Backed by the full customer universe, so it resolves even when
            // there is no AML alert.
            if (profileResult.ok && profileResult.value) {
                setCustomerProfile(profileResult.value);
            }

            // ── Macro alert ───────────────────────────────────────────────
            const hasAlert = macroResult.ok && macroResult.value !== null;

            if (hasAlert) {
                setMacroData(macroResult.value as MacroPayload);
            } else if (macroResult.ok) {
                // HTTP 404 → the customer simply has no AML alert.
                // THIS IS A VALID STATE: "Not Suspicious / No Alert".
                setNoAlert(true);

                if (profileResult.ok && profileResult.value === null) {
                    // The mini-profile 404'd too → the customer itself does not exist.
                    setCustomerNotFound(true);
                } else if (!profileResult.ok) {
                    // We cannot prove the customer exists because the profile
                    // source is genuinely broken — surface the real failure
                    // instead of pretending the customer is clean.
                    setError(getFriendlyApiErrorMessage(profileResult.error, "the customer profile API"));
                }
            } else {
                // 5xx / network / timeout → real failure. NEVER map this to
                // "not suspicious".
                setError(getFriendlyApiErrorMessage(macroResult.error));
            }

            // ── Micro ledger (non-blocking) ───────────────────────────────
            if (microResult.ok) {
                setMicroLedger(microResult.value);
            } else {
                setMicroLedger([]);
                setMicroError(getFriendlyApiErrorMessage(microResult.error, "the transaction API"));
            }

            setIsLoading(false);

            // ── Network graph (fully decoupled, never blocks the cockpit) ─
            const network = await networkRequest;
            if (isMounted) {
                setNetworkData(network);
                setIsNetworkLoading(false);
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
        customerProfile,
        isLoading,
        isNetworkLoading,
        error,
        microError,
        noAlert,
        customerNotFound,
        isGeneratingMacro,
        isGeneratingMicro,
        triggerAiNarrative,
        triggerMicroNarrative
    };
}
