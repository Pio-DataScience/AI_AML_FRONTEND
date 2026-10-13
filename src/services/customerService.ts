import axios from "axios";
import { getApiBaseUrl } from "./apiConfig";
import { CustomerMiniProfileResponse } from "@/types/customer";
import { CustomerProfile } from "@/types/alert";

const api = axios.create();

api.interceptors.request.use((config) => {
    config.baseURL = getApiBaseUrl("/api");
    return config;
});

/**
 * Fetch the lightweight customer mini-profile (identity + recent activity).
 *
 * The endpoint is backed by the full customer universe, so it works for
 * customers WITHOUT an AML alert. It is used by the cockpit to distinguish:
 *   - 404 → the customer itself does not exist (`null`)
 *   - 5xx / network / timeout → a real backend failure (throws)
 */
export const getCustomerMiniProfile = async (
    cus_num: string
): Promise<CustomerMiniProfileResponse | null> => {
    try {
        const response = await api.get<CustomerMiniProfileResponse>(
            `/customers/${cus_num}/mini-profile`
        );
        return response.data || null;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
            // Only the endpoint's own business 404 means "customer does not
            // exist". A generic 404 (e.g. the route is not deployed) must keep
            // surfacing as a real error.
            const detail = (error.response.data as { detail?: unknown } | undefined)?.detail;
            if (typeof detail === "string" && detail.toLowerCase().includes("customer profile not found")) {
                console.info(`[customerService] No customer profile found for CUS_NUM=${cus_num}`);
                return null;
            }
        }
        console.error(`Failed to fetch mini-profile for ${cus_num}:`, error);
        throw error;
    }
};

/**
 * Fetch the canonical Customer 360 profile independently of alert payloads.
 * Historical macro payloads may predate the embedded 360 snapshot.
 */
export const getCustomer360 = async (
    cus_num: string
): Promise<CustomerProfile | null> => {
    try {
        const response = await api.get<CustomerProfile>(
            `/customers/${cus_num}/customer-360`
        );
        return response.data || null;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
            const detail = (error.response.data as { detail?: unknown } | undefined)?.detail;
            if (typeof detail === "string" && detail.toLowerCase().includes("customer 360 profile not found")) {
                return null;
            }
        }
        console.error(`Failed to fetch Customer 360 for ${cus_num}:`, error);
        throw error;
    }
};
