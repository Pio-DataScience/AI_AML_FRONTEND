/**
 * Types for the customer identity layer.
 *
 * These describe the lightweight `GET /api/customers/{cus_num}/mini-profile`
 * endpoint, which is backed by the full customer universe table
 * (PIO_AML_CUSTOMERS_AI_MOCK) and therefore works for customers that do NOT
 * have an AML alert. It is the source of truth used by the cockpit when the
 * macro alert endpoint returns 404 (customer exists, but is not suspicious).
 */

export interface CustomerMiniProfile {
    cus_num: string;
    name: string;
    sector: string;
    risk_rating: string;
    /** CUS_CLASS — e.g. RETAIL / CORPORATE */
    customer_class?: string;
    /** MONTHLY_EXP_INCOME — declared monthly income */
    monthly_expected_income?: number;
    /** RISK_COUNTRY — high-risk jurisdiction flag/code if any */
    risk_country?: string;
    country_code?: string;
    account_age_days: number;
    assigned_cluster: string;
    anomaly_probability: number;
}

export interface MiniProfileTransaction {
    date: string;
    amount: number;
    type?: string;
    direction: "DEBIT" | "CREDIT" | "UNKNOWN" | string;
    counterparty?: string;
}

export interface CustomerMiniProfileResponse {
    customer_profile: CustomerMiniProfile;
    xai_context?: {
        primary_anomaly_drivers?: string | { feature: string; impact_score: number }[];
        peer_cluster_profile?: Record<string, number>;
    };
    recent_transactions?: MiniProfileTransaction[];
}
