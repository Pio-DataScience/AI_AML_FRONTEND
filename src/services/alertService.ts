import axios from "axios";
import { MacroPayload, MicroPayload, NetworkGraphData } from "@/types/alert";

const api = axios.create({
    baseURL: "http://localhost:8000/api",
});

export const getMacroAlert = async (
    country_code: string,
    inst_code: string,
    cus_num: string,
    day_date: string
): Promise<MacroPayload> => {
    try {
        const response = await api.get<any>(
            `/alerts/${country_code}/${inst_code}/${cus_num}/${day_date}`
        );
        // Safely unwrap the macro payload if it sits nested inside an Oracle DB column record
        //  DEBUG: Log raw keys to find where the 360 data is hiding
        console.group("🔎 DB DATA AUDIT - MACRO ALERT");
        console.log("Raw Response Keys:", Object.keys(response.data));
        console.groupEnd();

        const data = response.data;
        let rawPayload = data.AI_MACRO_PAYLOAD || data.ai_macro_payload || data;

        // Handle cases where Oracle returns JSON as a string
        if (typeof rawPayload === 'string' && (rawPayload.trim().startsWith('{') || rawPayload.trim().startsWith('['))) {
            try { rawPayload = JSON.parse(rawPayload); } catch (e) { console.error("Failed to parse Macro JSON string", e); }
        }

        // [360 FIX]: The snapshot might be a root column or nested inside behavioral_context
        const snapshot = data.customer_360_snapshot || data.CUSTOMER_360_SNAPSHOT || 
                         rawPayload?.customer_360_snapshot || 
                         rawPayload?.behavioral_context?.customer_360_snapshot ||
                         rawPayload?.behavioral_context?.customer_metrics?.CUSTOMER_PROFILE_JSON;
        
        if (snapshot && typeof rawPayload === 'object') {
            (rawPayload as any).customer_360_snapshot = snapshot;
        }

        // Final normalization: ensure top-level behavioral_context is found even if uppercase
        if (rawPayload && typeof rawPayload === 'object') {
            const keys = Object.keys(rawPayload);
            const bcKey = keys.find(k => k.toLowerCase() === 'behavioral_context');
            if (bcKey && bcKey !== 'behavioral_context') {
                (rawPayload as any).behavioral_context = (rawPayload as any)[bcKey];
            }
        }

        return rawPayload as MacroPayload;
    } catch (error) {
        console.error(`Failed to fetch macro alert for ${cus_num}:`, error);
        throw error;
    }
};

export const getNetworkGraph = async (
    country_code: string,
    inst_code: string,
    cus_num: string,
    day_date: string
): Promise<NetworkGraphData> => {
    try {
        const response = await api.get<NetworkGraphData>(
            `/alerts/${country_code}/${inst_code}/${cus_num}/${day_date}/network`
        );
        return response.data || { nodes: [], edges: [] };
    } catch (error) {
        console.warn(`Fallback: Network graph failed/missing for ${cus_num}:`, error);
        return { nodes: [], edges: [] }; // Graceful fallback
    }
};

export const getMicroLedger = async (
    country_code: string,
    inst_code: string,
    cus_num: string,
    day_date: string,
    tra_seq1?: string | null,
    tra_seq2?: string | null
): Promise<MicroPayload[]> => {
    try {
        const response = await api.get<any[]>(
            `/alerts/${country_code}/${inst_code}/${cus_num}/${day_date}/transactions`,
            {
                params: {
                    scenario_code: "0", // Strictly fetch AI Unsupervised anomalies
                    ...(tra_seq1 && { tra_seq1 }),
                    ...(tra_seq2 && { tra_seq2 })
                }
            }
        );

        // DEBUG: Verify raw API response for forensic partitioning
        console.log("Forensic API Response (Scenario 0):", response.data);

        // Map the backend Oracle row objects exactly to the standard frontend MicroPayload format
        return response.data.map((row: any) => {
            let payload = row.AI_MICRO_PAYLOAD || row.ai_micro_payload || {};

            // Handle cases where Oracle returns JSON as a string
            if (typeof payload === 'string' && (payload.trim().startsWith('{') || payload.trim().startsWith('['))) {
                try { payload = JSON.parse(payload); } catch (e) { console.error("Failed to parse Micro JSON string", e); }
            }

            // Case-insensitive sub-object detection
            const payloadKeys = Object.keys(payload);
            const metaKey = payloadKeys.find(k => k.toLowerCase() === 'transaction_metadata') || 'transaction_metadata';
            const contextKey = payloadKeys.find(k => k.toLowerCase() === 'transaction_context') || 'transaction_context';

            const meta = payload.transaction_metadata || {};
            const context = payload.transaction_context || {};

            // Format anomaly drivers if they exist in the micro payload
            let drivers = payload.local_anomaly_drivers || [];
            if (typeof drivers === 'string') {
                drivers = drivers.includes('\n') ? drivers.split('\n').map((d: string) => d.trim()).filter(Boolean) : [drivers];
            }

            // MAPPING: NO FALLBACKS allowed to identify data gaps
            const amountVal = row.EQU_TRA_AMT || meta.amount || null;
            const dateStr = row.TRA_DATE || meta.date || null;
            const typeStr = meta.type || meta.transaction_type || row.TRANSACTION_TYPE || null;

            // Severity: Use confidence_score if available in micro payload
            const rawConfidence = row.CONFIDENCE_SCORE || meta.confidence_score || meta.severity_score || null;
            let severity: string | number = "N/A";
            
            if (rawConfidence !== null) {
                if (["H", "M", "L"].includes(String(rawConfidence).toUpperCase())) {
                    severity = String(rawConfidence).toUpperCase();
                } else {
                    const num = Number(String(rawConfidence).replace(/[^\d.-]/g, ''));
                    severity = isNaN(num) ? rawConfidence : (num <= 1 ? Math.round(num * 100) : num);
                }
            }

            // Robust context for Sankey (No fallbacks for indicators/counterparties)
            const robustContext = {
                ...row,
                ...context,
                DEB_CRE_IND: context.DEB_CRE_IND || row.DEB_CRE_IND || null, 
                COUNTERPARTY_NAME: context.COUNTERPARTY_NAME || row.COUNTERPARTY_NAME || null
            };

            return {
                id: row.TRANSACTION_KEY || `${row.TRA_SEQ1}-${row.TRA_SEQ2}`,
                transaction_metadata: {
                    amount: typeof amountVal === 'string' ? parseFloat(amountVal.replace(/[^0-9.-]+/g, "")) : Number(amountVal),
                    severity_score: severity,
                    date: dateStr,
                    type: typeStr,
                    ai_micro_narrative: payload.AI_MICRO_NARRATIVE || meta.ai_micro_narrative || null
                },
                local_anomaly_drivers: drivers,
                transaction_context: robustContext
            } as MicroPayload;
        });
    } catch (error) {
        console.error(`Failed to fetch micro ledger for ${cus_num}:`, error);
        throw error;
    }
};

export const generateMacroNarrative = async (
    country_code: string,
    inst_code: string,
    cus_num: string,
    day_date: string
): Promise<{ narrative: string }> => {
    try {
        const response = await api.post<{ narrative: string }>(
            `/alerts/${country_code}/${inst_code}/${cus_num}/${day_date}/generate-narrative`
        );
        return response.data;
    } catch (error) {
        console.error(`Failed to generate macro narrative for ${cus_num}:`, error);
        throw error;
    }
};

export const generateMicroNarrative = async (
    country_code: string,
    inst_code: string,
    cus_num: string,
    day_date: string,
    tra_seq1: string,
    tra_seq2: string
): Promise<{ narrative: string }> => {
    try {
        const response = await api.post<{ narrative: string }>(
            `/alerts/${country_code}/${inst_code}/${cus_num}/${day_date}/transactions/${tra_seq1}/${tra_seq2}/generate-micro-narrative`
        );
        return response.data;
    } catch (error) {
        console.error(`Failed to generate micro narrative for transaction ${tra_seq1}-${tra_seq2}:`, error);
        throw error;
    }
};

/**
 * Fetch the last 90 days of transaction history (amount and date only) for a customer.
 * This provides the 'Normal' baseline for the Timeline chart.
 */
export const getTransactionHistory = async (
    country_code: string,
    inst_code: string,
    cus_num: string
): Promise<{ tra_date: string; amount: number }[]> => {
    try {
        const response = await api.get(`/history/${country_code}/${inst_code}/${cus_num}/all-transactions`);
        return response.data || [];
    } catch (error) {
        console.error("Error fetching transaction history:", error);
        return [];
    }
};
