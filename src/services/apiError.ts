import axios from "axios";

/**
 * Translate low-level axios / unknown errors into concise, human-readable
 * messages for the compliance UI.
 *
 * This helper is deliberately status-aware: a 5xx, a timeout or a dead
 * backend must read as a real infrastructure failure, never as "not
 * suspicious". The "no alert" (404) cases are handled by the service layer
 * before errors ever reach this function.
 */
export function getFriendlyApiErrorMessage(
    error: unknown,
    context: string = "the AML backend"
): string {
    if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
            return `The request to ${context} timed out. Please try again.`;
        }
        if (!error.response) {
            return `Unable to reach ${context}. Please verify the server is running and that you are connected to the network.`;
        }

        const { status } = error.response;
        if (status >= 500) {
            return `The server encountered an internal error (HTTP ${status}). Please try again later.`;
        }
        if (status === 401 || status === 403) {
            return `Access to this resource was denied (HTTP ${status}).`;
        }
        if (status === 404) {
            return `The requested resource was not found (HTTP 404).`;
        }
        return `The request failed (HTTP ${status}). Please try again.`;
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }
    return `An unexpected error occurred while contacting ${context}.`;
}
