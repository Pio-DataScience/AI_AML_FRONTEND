export interface CustomerProfile {
    kyc_profile: {
        name: string;
        type: string;
        sector: string;
        account_age_years: number;
    };
    risk_profile: {
        overall_risk: "HIGH" | "MEDIUM" | "LOW" | string;
        jurisdiction: string;
        customer_class: string;
    };
    financial_baseline_30d: {
        stated_monthly_income: number;
        actual_debit_volume: number;
        actual_credit_volume: number;
        typical_transaction_count: number;
        unique_counterparties: number;
    };
}

export interface MacroPayload {
    customer_number: string;
    customer_360_snapshot?: string | CustomerProfile; // Allow both raw string and parsed object
    alert_metadata: {
        risk_rating: "High" | "Medium" | "Low";
        snapshot_date: string;
        ai_generated_narrative: string | null;
    };
    primary_anomaly_drivers: string[];
    behavioral_context: {
        customer_metrics: Record<string, number>;
        peer_cluster_profile: Record<string, number>;
    };
}

export interface MicroPayload {
    id: string;
    transaction_metadata: {
        date: string;
        amount: number;
        type: string;
        severity_score: string | number;
        ai_micro_narrative: string | null;
    };
    local_anomaly_drivers: string[];
    transaction_context: Record<string, any>; // Represents the 58-column dictionary
}

export interface GraphNode {
    id: string;
    label: string; // e.g., "Customer", "Account"
    color?: string;
    val?: number; // Size
    properties: Record<string, any>;
}

export interface GraphEdge {
    source: string;
    target: string;
    label?: string;
    properties?: Record<string, any>;
}

export interface NetworkGraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
}
