import type { Config } from "tailwindcss";
import { heroui } from "@heroui/react";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
        "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                base: "#121212",
                "surface-1": "#1e1e1e",
                "surface-2": "#2d2d2d",
                "semantic-risk": "#FF4F64",
                "semantic-warning": "#FF9933",
                "semantic-safe": "#0CD96F",
                "semantic-info": "#217eaa",
            },
            fontFamily: {
                sans: ["var(--font-geist-sans)", "Inter", "ui-sans-serif", "system-ui"],
            },
        },
    },
    darkMode: "class",
    plugins: [heroui()],
};

export default config;
