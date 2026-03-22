"use client";

import type { ReactNode } from "react";
import { TRPCProvider } from "@/lib/trpc";

export function AppWrapper({ children }: { children: ReactNode }) {
  return (
    <TRPCProvider>
      {children}
    </TRPCProvider>
  );
}
