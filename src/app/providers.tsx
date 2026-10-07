"use client";

import { HeroUIProvider } from "@heroui/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        // Dark mode disabled: app always runs in light theme regardless of OS setting.
        // storageKey changed so any previously stored "dark"/"system" preference is ignored.
        <NextThemesProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            storageKey="aml-cockpit-theme"
        >
            <HeroUIProvider>
                {children}
            </HeroUIProvider>
        </NextThemesProvider>
    );
}
