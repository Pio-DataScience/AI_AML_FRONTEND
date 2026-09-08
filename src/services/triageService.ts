import axios from "axios";
import { TriagePayload } from "@/types/triage";
import { getApiBaseUrl } from "./apiConfig";

const api = axios.create();

api.interceptors.request.use((config) => {
    config.baseURL = getApiBaseUrl("/api/alerts");
    return config;
});

export const getTriageQueue = async (
    country_code: string,
    inst_code: string,
    day_date: string
): Promise<TriagePayload[]> => {
    try {
        const response = await api.get<any[]>(
            `/${country_code}/${inst_code}/${day_date}/triage`
        );
        
        // Map the backend Oracle row objects safely to the standard frontend TriagePayload format
        return response.data.map((row: any) => {
            let rawPayload = row.AI_SUPERVISED_PAYLOAD || row.ai_supervised_payload || row;
            
            // [ORACLE FIX]: Safely parse JSON string if payload is returned as a CLOB
            if (typeof rawPayload === 'string' && (rawPayload.trim().startsWith('{') || rawPayload.trim().startsWith('['))) {
                try { rawPayload = JSON.parse(rawPayload); } catch (e) { console.error("Failed to parse AI_SUPERVISED_PAYLOAD string", e); rawPayload = {}; }
            }
            
            // [360 EXTRACTION]: Absolute Search
            const snapshot = row.customer_360_snapshot || row.CUSTOMER_360_SNAPSHOT || 
                             row.CUSTOMER_PROFILE_JSON || row.customer_profile_json ||
                             rawPayload.customer_360_snapshot || rawPayload.CUSTOMER_360_SNAPSHOT ||
                             rawPayload.behavioral_context?.customer_360_snapshot ||
                             rawPayload.behavioral_context?.customer_metrics?.CUSTOMER_PROFILE_JSON;

            // CRITICAL DEBUG: Log the identity of the data found
            if (row.CUS_NUM === '1001555' || row.customer_number === '1001555') {
                console.log("🛠️ [Triage Debug] Found Target Customer 1001555");
                console.log("Raw Row Keys:", Object.keys(row));
                console.log("Snapshot Detected:", !!snapshot);
                if (snapshot) console.log("Snapshot Type:", typeof snapshot);
            }

            return {
                id: String(row.TRANSACTION_KEY || rawPayload.id || `${row.CUS_NUM || rawPayload.customer_number}-${row.TRA_SEQ1 || rawPayload.tra_seq1}-${row.TRA_SEQ2 || rawPayload.tra_seq2}`),
                customer_number: row.CUS_NUM || rawPayload.customer_number || "Unknown",
                tra_seq1: row.TRA_SEQ1 || rawPayload.tra_seq1 || "0",
                tra_seq2: row.TRA_SEQ2 || rawPayload.tra_seq2 || "0",
                date: row.TRA_DATE || rawPayload.date || day_date,
                ai_verdict: rawPayload.ai_verdict || { decision: "Unknown", confidence_score: "0%", threshold_used: "—" },
                legacy_context: rawPayload.legacy_context || { rule_triggered: "Unknown", ai_agreement: false },
                explanation: rawPayload.explanation || { narrative: "", top_drivers: [] },
                customer_360_snapshot: snapshot || null
            } as TriagePayload;
        });
    } catch (error) {
        console.error("Failed to fetch triage queue:", error);
        throw error;
    }
};

export const generateTriageNarrative = async (
    country_code: string,
    inst_code: string,
    cus_num: string,
    day_date: string,
    tra_seq1: string,
    tra_seq2: string
): Promise<{ narrative: string }> => {
    try {
        const response = await api.post<{ narrative: string }>(
            `/${country_code}/${inst_code}/${cus_num}/${day_date}/transactions/${tra_seq1}/${tra_seq2}/generate-supervised-narrative`
        );
        return response.data;
    } catch (error) {
        console.error(`Failed to generate triage narrative for ${tra_seq1}-${tra_seq2}:`, error);
        throw error;
    }
};
