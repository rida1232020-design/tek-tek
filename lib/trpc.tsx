"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import React, { useState } from "react";
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "./routers";
import { usePiAuth } from "@/contexts/pi-auth-context";

export const trpc = createTRPCReact<AppRouter>();

export function TRPCProvider({ children }: { children: React.ReactNode }) {
    // It's safe to usePiAuth here because TRPCProvider is rendered inside PiAuthProvider
    const { piAccessToken } = usePiAuth();

    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: { queries: { staleTime: 5000 } }
    }));

    const [trpcClient] = useState(() =>
        trpc.createClient({
            links: [
                httpBatchLink({
                    url: "/api/trpc",
                    headers() {
                        return piAccessToken ? { Authorization: piAccessToken } : {};
                    },
                }),
            ],
        })
    );

    return (
        <trpc.Provider client= { trpcClient } queryClient = { queryClient } >
            <QueryClientProvider client={ queryClient }> { children } </QueryClientProvider>
                </trpc.Provider>
  );
}
