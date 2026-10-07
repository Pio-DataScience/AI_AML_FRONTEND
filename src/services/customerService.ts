import axios from "axios";
import { getApiBaseUrl } from "./apiConfig";
import { CustomerMiniProfileResponse } from "@/types/customer";

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
