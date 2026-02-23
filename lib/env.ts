export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.VITE_JWT_SECRET ?? "dev-secret",
  databaseUrl: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || "",
  oAuthServerUrl: process.env.VITE_OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.VITE_OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.VITE_FORGE_API_URL ?? "",
  forgeApiKey: process.env.VITE_FORGE_API_KEY ?? "",
};
