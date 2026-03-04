import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import * as schema from "@/lib/schema";
import { eq } from "drizzle-orm";

// POST /api/pi/cancel
// Called by frontend when Pi SDK fires onCancel
// We mark the payment as cancelled
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { paymentId } = body;

        if (!paymentId) {
            return NextResponse.json({ error: "paymentId is required" }, { status: 400 });
        }

        const db = await getDb();

        if (db) {
            try {
                await db
                    .update(schema.payments)
                    .set({ status: "cancelled" })
                    .where(eq(schema.payments.piPaymentId, paymentId));
            } catch (dbError) {
                console.warn("DB update failed (sandbox mode?):", dbError);
            }
        }

        console.log(`❌ Pi Payment cancelled: ${paymentId}`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Pi cancel error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
