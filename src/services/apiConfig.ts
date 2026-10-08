/**
 * Dynamic API configuration helper.
 * 
 * Automatically resolves the backend host based on the current window location:
 * - When opened on the server (localhost:3000) -> calls http://localhost:8010
 * - When opened from any machine on the network (192.168.x.x:3000) -> calls http://192.168.x.x:8010
 * - Also supports explicit override via NEXT_PUBLIC_API_URL or NEXT_PUBLIC_API_PORT
 */
export const getApiBaseUrl = (path: string = "/api"): string => {
    if (process.env.NEXT_PUBLIC_API_URL) {
        const base = process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
        const cleanPath = path.startsWith("/") ? path : `/${path}`;
        return `${base}${cleanPath}`;
    }

    const port = process.env.NEXT_PUBLIC_API_PORT || "8010";
    const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const cleanPath = path.startsWith("/") ? path : `/${path}`;

    return `http://${host}:${port}${cleanPath}`;
};
