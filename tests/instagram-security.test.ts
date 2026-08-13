import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const encryptionKey = Buffer.alloc(32, 7).toString("base64");

beforeEach(() => {
  vi.resetModules();
  process.env.INSTAGRAM_APP_ID = "test-app";
  process.env.INSTAGRAM_APP_SECRET = "test-app-secret";
  process.env.INSTAGRAM_REDIRECT_URI = "https://focuspath.example/auth/instagram/callback";
  process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY = encryptionKey;
});

describe("Instagram security helpers", () => {
  it("encrypts an access token at rest and restores it only with the configured key", async () => {
    const { decryptInstagramToken, encryptInstagramToken } = await import("../server/_core/instagramSecurity");
    const token = "IGQVJ-sample-server-only-token";

    const ciphertext = encryptInstagramToken(token);

    expect(ciphertext).not.toContain(token);
    expect(decryptInstagramToken(ciphertext)).toBe(token);
  });

  it("accepts a signed OAuth state and rejects a tampered one", async () => {
    const { createInstagramOAuthState, verifyInstagramOAuthState } = await import("../server/_core/instagramSecurity");
    const state = createInstagramOAuthState(42);

    expect(verifyInstagramOAuthState(state).userId).toBe(42);
    expect(() => verifyInstagramOAuthState(`${state}x`)).toThrow(/could not be verified/i);
  });

  it("accepts a valid Meta signed request and rejects a forged one", async () => {
    const { verifyMetaSignedRequest } = await import("../server/_core/instagramSecurity");
    const payload = Buffer.from(JSON.stringify({ algorithm: "HMAC-SHA256", user_id: "17841441956570761" })).toString("base64url");
    const signature = createHmac("sha256", "test-app-secret").update(payload).digest("base64url");
    const signedRequest = `${signature}.${payload}`;

    expect(verifyMetaSignedRequest(signedRequest).user_id).toBe("17841441956570761");
    expect(() => verifyMetaSignedRequest(`x${signedRequest}`)).toThrow(/signature/i);
  });
});
