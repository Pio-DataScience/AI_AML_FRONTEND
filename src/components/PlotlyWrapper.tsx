"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@heroui/react";

// Plotly requires the window object to be defined, so we dynamically import it
// and disable server-side rendering.
const Plot = dynamic(() => import("react-plotly.js"), {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full rounded-lg" />,
});

export default Plot;
