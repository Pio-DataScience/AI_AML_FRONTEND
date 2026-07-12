import { CustomerProfile } from "./alert";

export interface TopDriver {
    feature: string;
    description: string;
    impact_direction: "increasing_risk" | "decreasing_risk";
    impact_weight: string; // e.g., "45.0%"
}

export interface Explanation {
    narrative: string;
    top_drivers: TopDriver[];
}

export interface LegacyContext {
    rule_triggered: string;
    ai_agreement: boolean;
}

export interface AIVerdict {
    decision: string; // e.g., "Violation" or "False Positive"
    confidence_score: string; // e.g., "85.2%"
    threshold_used?: string; // e.g., "75.0%"
}

export interface TriagePayload {
    id: string; // Unique UI tracking ID
    customer_number: string;
    tra_seq1: string;
    tra_seq2: string;
    date: string;
    
    // Extracted exactly from AI_SUPERVISED_PAYLOAD
    ai_verdict: AIVerdict;
    legacy_context: LegacyContext;
    explanation: Explanation;
    customer_360_snapshot?: string | CustomerProfile;
}
