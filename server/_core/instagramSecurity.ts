import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { INSTAGRAM_CONFIG } from "./instagramConfig";

const ALGORITHM = "aes-256-gcm";
const STATE_TTL_MS = 10 * 60 * 1000;

type OAuthStatePayload = {
  userId: number;
  expiresAt: number;
  nonce: string;
};

function getEncryptionKey() {
  const configured = INSTAGRAM_CONFIG.tokenEncryptionKey.trim();
  const isHex = /^[0-9a-fA-F]{64}$/.test(configured);
  const key = Buffer.from(configured, isHex ? "hex" : "base64");

  if (key.length !== 32) {
    throw new Error("INSTAGRAM_TOKEN_ENCRYPTION_KEY must be exactly 32 bytes, encoded as base64 or 64-character hex.");
  }

  return key;
}

/** Encrypts a token at rest with AES-256-GCM and returns a self-contained payload. */
export function encryptInstagramToken(token: string) {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

/** Decrypts a server-only token payload. Never send the returned value to the client. */
export function decryptInstagramToken(payload: string) {
  const [ivString, tagString, encryptedString] = payload.split(".");
  if (!ivString || !tagString || !encryptedString) {
    throw new Error("Stored Instagram credential is malformed.");
  }

  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(ivString, "base64url"));
  decipher.setAuthTag(Buffer.from(tagString, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encryptedString, "base64url")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

function sign(encodedPayload: string) {
  return createHmac("sha256", INSTAGRAM_CONFIG.appSecret).update(encodedPayload).digest("base64url");
}

/** Creates a short-lived, tamper-evident state parameter for Meta OAuth. */
export function createInstagramOAuthState(userId: number) {
  const payload: OAuthStatePayload = {
    userId,
    expiresAt: Date.now() + STATE_TTL_MS,
    nonce: randomBytes(16).toString("base64url"),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

/** Validates OAuth state before any access-token exchange occurs. */
export function verifyInstagramOAuthState(state: string): OAuthStatePayload {
  const [encodedPayload, receivedSignature] = state.split(".");
  if (!encodedPayload || !receivedSignature) {
    throw new Error("The Instagram connection link is invalid. Please start again from FocusPath.");
  }

  const expectedSignature = sign(encodedPayload);
  const expected = Buffer.from(expectedSignature);
  const received = Buffer.from(receivedSignature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw new Error("The Instagram connection link could not be verified. Please start again from FocusPath.");
  }

  let payload: OAuthStatePayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    throw new Error("The Instagram connection link is invalid. Please start again from FocusPath.");
  }

  if (!Number.isInteger(payload.userId) || !Number.isFinite(payload.expiresAt) || !payload.nonce || payload.expiresAt < Date.now()) {
    throw new Error("The Instagram connection link has expired. Please start again from FocusPath.");
  }

  return payload;
}
