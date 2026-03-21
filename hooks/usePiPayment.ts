"use client";

import { useState, useCallback } from "react";
import type { PiPaymentData, PiPaymentCallbacks } from "@/contexts/pi-auth-context";

type PaymentStatus =
    | "idle"
    | "waiting_approval"
    | "waiting_user"
    | "waiting_completion"
    | "completed"
    | "cancelled"
    | "error";

interface UsePiPaymentResult {
    payWithPi: (
        amount: number,
        memo: string,
        metadata?: Record<string, unknown>
    ) => Promise<{ success: boolean; txid?: string; error?: string }>;
    status: PaymentStatus;
    isLoading: boolean;
    reset: () => void;
}

/** Generate a mock payment/tx id for sandbox simulation */
const mockId = () => Math.random().toString(36).slice(2, 18).toUpperCase();

/** Simulate the Pi payment flow when outside Pi Browser (sandbox demo mode) */
async function simulatePiPayment(
    amount: number,
    memo: string,
    metadata: Record<string, unknown>,
    setStatus: (s: PaymentStatus) => void
): Promise<{ success: boolean; txid?: string; error?: string }> {
    const paymentId = mockId();
    const txid = "SANDBOX_TX_" + mockId();

    try {
        // Step 1: Approve (server-side)
        setStatus("waiting_approval");
        await fetch("/api/pi/approve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId, amount, currency: "PI", ...metadata }),
        }).catch(() => { /* non-critical in sandbox */ });

        // Step 2: Simulate user confirming in wallet (1.8s delay)
        setStatus("waiting_user");
        await new Promise((r) => setTimeout(r, 1800));

        // Step 3: Complete (server-side)
        setStatus("waiting_completion");
        await fetch("/api/pi/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                paymentId,
                txid,
                ...(metadata.tripId ? { tripId: metadata.tripId } : {}),
            }),
        }).catch(() => { /* non-critical in sandbox */ });

        await new Promise((r) => setTimeout(r, 400));
        setStatus("completed");
        return { success: true, txid };
    } catch (err) {
        setStatus("error");
        return { success: false, error: String(err) };
    }
}

export function usePiPayment(): UsePiPaymentResult {
    const [status, setStatus] = useState<PaymentStatus>("idle");

    const isLoading =
        status === "waiting_approval" ||
        status === "waiting_user" ||
        status === "waiting_completion";

    const reset = useCallback(() => setStatus("idle"), []);

    const payWithPi = useCallback(
        (
            amount: number,
            memo: string,
            metadata: Record<string, unknown> = {}
        ): Promise<{ success: boolean; txid?: string; error?: string }> => {
            return new Promise((resolve) => {
                // If Pi SDK not available → use sandbox simulation mode
                if (typeof window === "undefined" || !window.Pi) {
                    console.log("🧪 Pi SDK not found — running in sandbox simulation mode");
                    simulatePiPayment(amount, memo, metadata, setStatus).then(resolve);
                    return;
                }

                const paymentData: PiPaymentData = { amount, memo, metadata };

                const callbacks: PiPaymentCallbacks = {
                    // Step 1: SDK gives us paymentId, we must approve it on our server
                    onReadyForServerApproval: async (paymentId: string) => {
                        setStatus("waiting_approval");
                        console.log("Pi: onReadyForServerApproval", paymentId);

                        try {
                            await fetch("/api/pi/approve", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    paymentId,
                                    amount,
                                    currency: "PI",
                                    ...metadata,
                                }),
                            });
                            // After this, Pi SDK shows wallet to user
                            setStatus("waiting_user");
                        } catch (err) {
                            console.error("Pi approve error:", err);
                            setStatus("error");
                            resolve({ success: false, error: "Approval failed" });
                        }
                    },

                    // Step 2: User confirmed in wallet, Pi SDK gives us txid
                    onReadyForServerCompletion: async (paymentId: string, txid: string) => {
                        setStatus("waiting_completion");
                        console.log("Pi: onReadyForServerCompletion", paymentId, txid);

                        try {
                            await fetch("/api/pi/complete", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    paymentId,
                                    txid,
                                    ...(metadata.tripId ? { tripId: metadata.tripId } : {}),
                                }),
                            });
                            setStatus("completed");
                            resolve({ success: true, txid });
                        } catch (err) {
                            console.error("Pi complete error:", err);
                            setStatus("error");
                            resolve({ success: false, error: "Completion failed" });
                        }
                    },

                    // User cancelled in wallet
                    onCancel: async (paymentId: string) => {
                        console.log("Pi: onCancel", paymentId);
                        setStatus("cancelled");

                        try {
                            await fetch("/api/pi/cancel", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ paymentId }),
                            });
                        } catch (_) {
                            // Non-critical
                        }

                        resolve({ success: false, error: "Payment cancelled by user" });
                    },

                    // Error from Pi SDK
                    onError: (error: Error) => {
                        console.error("Pi: onError", error);
                        setStatus("error");
                        resolve({ success: false, error: error.message });
                    },
                };

                try {
                    window.Pi.createPayment(paymentData, callbacks);
                } catch (err) {
                    console.error("Pi createPayment error:", err);
                    setStatus("error");
                    resolve({ success: false, error: String(err) });
                }
            });
        },
        []
    );

    return { payWithPi, status, isLoading, reset };
}
