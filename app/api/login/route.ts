import { NextResponse } from "next/server";
import { upsertUser } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const { pi_auth_token } = await req.json();

        if (!pi_auth_token) {
            return NextResponse.json({ error: "Missing pi_auth_token" }, { status: 400 });
        }

        // Call Pi Network Backend to verify the access token
        const piBackendResponse = await fetch("https://api.minepi.com/v2/me", {
            headers: {
                Authorization: `Bearer ${pi_auth_token}`,
            },
        });

        if (!piBackendResponse.ok) {
            return NextResponse.json({ error: "Invalid Pi Network Token" }, { status: 401 });
        }

        const piUserData = await piBackendResponse.json();

        // piUserData contains username, uid, etc.
        // Insert or update the user in our local database
        await upsertUser({
            openId: piUserData.uid,
            name: piUserData.username,
            loginMethod: "pi_network",
            role: "customer", // Default to customer
        });

        // In a real production app, we should issue a session JWT here.
        // For simplicity with Pi, the frontend SDK retains the token.
        return NextResponse.json({
            id: piUserData.uid,
            username: piUserData.username,
            credits_balance: 0,
            terms_accepted: true,
        });
    } catch (error) {
        console.error("Login Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
