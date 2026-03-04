import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import * as schema from "@/lib/schema";
import { eq } from "drizzle-orm";

// POST /api/pi/complete
// Called by frontend when Pi SDK fires onReadyForServerCompletion
// We record the txid and mark payment as completed
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { paymentId, txid, tripId } = body;

        if (!paymentId || !txid) {
            return NextResponse.json(
                { error: "paymentId and txid are required" },
                { status: 400 }
            );
        }

        const db = await getDb();

        if (db) {
            try {
                // Update the payment record with txid and mark as completed
                await db
                    .update(schema.payments)
                    .set({
                        piTxId: txid,
                        status: "completed",
                        paidAt: new Date(),
                    })
                    .where(eq(schema.payments.piPaymentId, paymentId));

                // Mark the associated trip as paid
                if (tripId) {
                    await db
                        .update(schema.trips)
                        .set({ isPaid: true, paymentMethod: "pi" })
                        .where(eq(schema.trips.id, tripId));
                }
            } catch (dbError) {
                console.warn("DB update failed (sandbox mode?):", dbError);
            }
        }

        console.log(`✅ Pi Payment completed: ${paymentId}, txid: ${txid}`);

        // Must return { success: true } to confirm completion to Pi SDK
        return NextResponse.json({ success: true, txid });
    } catch (error) {
        console.error("Pi complete error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
