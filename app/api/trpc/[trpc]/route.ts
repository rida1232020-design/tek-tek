import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/lib/routers";
import { getUserByOpenId } from "@/lib/db";

const handler = (req: Request) => {
    return fetchRequestHandler({
        endpoint: "/api/trpc",
        req,
        router: appRouter,
        createContext: async ({ req }) => {
            // Very basic auth context resolution
            // Ideally parse Bearer token as JWT, here we mock trusting the auth header if present
            const token = req.headers.get("Authorization");
            let user = null;

            if (token) {
                // As a shortcut, if token exists, we fetch Pi Network /v2/me to get the UID, 
                // OR we decode the JWT if we implement local sessions.
                // For local simulation without a real JWT, we look up based on token = openId initially.
                // In real Pi App, the token here is the access token. 
                // For efficiency, you would ideally cache or use JWT.
                try {
                    const piBackendResponse = await fetch("https://api.minepi.com/v2/me", {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (piBackendResponse.ok) {
                        const piData = await piBackendResponse.json();
                        user = await getUserByOpenId(piData.uid);
                    }
                } catch (e) { /* ignore */ }
            }
            return { user };
        },
    });
};

export { handler as GET, handler as POST };
