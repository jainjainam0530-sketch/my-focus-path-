const DEFAULT_GRAPH_VERSION = "v26.0";

export const INSTAGRAM_CONFIG = {
  appId: process.env.INSTAGRAM_APP_ID ?? "",
  appSecret: process.env.INSTAGRAM_APP_SECRET ?? "",
  redirectUri: process.env.INSTAGRAM_REDIRECT_URI ?? "",
  tokenEncryptionKey: process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY ?? "",
  appUrl: process.env.EXPO_PUBLIC_APP_URL ?? "manusfocuspath://",
  graphVersion: process.env.INSTAGRAM_GRAPH_VERSION ?? DEFAULT_GRAPH_VERSION,
};

export function assertInstagramConfig() {
  const missing = [
    ["INSTAGRAM_APP_ID", INSTAGRAM_CONFIG.appId],
    ["INSTAGRAM_APP_SECRET", INSTAGRAM_CONFIG.appSecret],
    ["INSTAGRAM_REDIRECT_URI", INSTAGRAM_CONFIG.redirectUri],
    ["INSTAGRAM_TOKEN_ENCRYPTION_KEY", INSTAGRAM_CONFIG.tokenEncryptionKey],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length) {
    throw new Error(`Instagram integration is not configured. Missing: ${missing.join(", ")}.`);
  }
}

export function instagramIsConfigured() {
  return Boolean(
    INSTAGRAM_CONFIG.appId &&
      INSTAGRAM_CONFIG.appSecret &&
      INSTAGRAM_CONFIG.redirectUri &&
      INSTAGRAM_CONFIG.tokenEncryptionKey,
  );
}
