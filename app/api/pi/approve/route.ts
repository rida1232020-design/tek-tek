import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import * as schema from "@/lib/schema";

// POST /api/pi/approve
// Called by frontend when Pi SDK fires onReadyForServerApproval
// We record the payment as pending and return { success: true } to authorize Pi SDK
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { paymentId, tripId, amount, currency } = body;

        if (!paymentId) {
            return NextResponse.json({ error: "paymentId is required" }, { status: 400 });
        }

        const db = await getDb();

        if (db) {
            // Try to record the pending Pi payment
            // We may not have customerId/driverId at approval time, so we use 0 as placeholder
            try {
                await db.insert(schema.payments).values({
                    tripId: tripId || 0,
                    customerId: 0, // Will be updated on completion
                    driverId: 0,   // Will be updated on completion
                    amount: String(amount || "0"),
                    currency: currency || "PI",
                    paymentMethod: "pi",
                    piPaymentId: paymentId,
                    status: "pending",
                });
            } catch (dbError) {
                // DB might not be set up - log but still approve (sandbox mode)
                console.warn("DB insert failed (sandbox mode?):", dbError);
            }
        }

        console.log(`✅ Pi Payment approved: ${paymentId}`);

        // Must return { success: true } to tell Pi SDK it can proceed
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Pi approve error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
