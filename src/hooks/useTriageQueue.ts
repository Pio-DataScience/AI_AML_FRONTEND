import { useState, useEffect } from "react";
import { getTriageQueue, generateTriageNarrative } from "@/services/triageService";
import { TriagePayload } from "@/types/triage";

export function useTriageQueue(country_code: string, inst_code: string, day_date: string) {
    const [queueData, setQueueData] = useState<TriagePayload[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Track narrative generation specifically for a single active transaction
    const [isGeneratingNarrative, setIsGeneratingNarrative] = useState<boolean>(false);

    useEffect(() => {
        let isMounted = true;

        const loadData = async () => {
            setIsLoading(true);
            setError(null);

            if (!country_code || !inst_code || !day_date) {
                if (isMounted) {
                    setIsLoading(false);
                    setError("Missing required route parameters for Triage Queue.");
                }
                return;
            }

            try {
                const data = await getTriageQueue(country_code, inst_code, day_date);
                if (isMounted) {
                    setQueueData(data);
                }
            } catch (err: any) {
                if (isMounted) {
                    setError(err.message || "Failed to load triage queue data.");
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadData();

        return () => {
            isMounted = false;
        };
    }, [country_code, inst_code, day_date]);

    const triggerNarrative = async (selectedAlert: TriagePayload) => {
        if (!selectedAlert) return;
        setIsGeneratingNarrative(true);
        try {
            const res = await generateTriageNarrative(
                country_code,
                inst_code,
                selectedAlert.customer_number,
                day_date,
                selectedAlert.tra_seq1,
                selectedAlert.tra_seq2
            );

            // Dynamically inject the newly generated narrative direct to the row payload
            setQueueData(prev => prev.map(item => 
                item.id === selectedAlert.id 
                    ? { ...item, explanation: { ...item.explanation, narrative: res.narrative } } 
                    : item
            ));
        } catch (err: any) {
            console.error("Narrative Generation Failed: ", err);
        } finally {
            setIsGeneratingNarrative(false);
        }
    };

    return {
        queueData,
        isLoading,
        error,
        isGeneratingNarrative,
        triggerNarrative
    };
}
