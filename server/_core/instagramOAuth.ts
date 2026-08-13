import type { Express, Request, Response } from "express";
import {
  exchangeForLongLivedInstagramToken,
  exchangeInstagramAuthorizationCode,
  getInstagramProfile,
} from "./instagramClient";
import { INSTAGRAM_CONFIG } from "./instagramConfig";
import { verifyInstagramOAuthState } from "./instagramSecurity";
import { saveInstagramConnection } from "../instagramService";

function callbackUrl(status: "success" | "error", message: string) {
  const configuredAppUrl = INSTAGRAM_CONFIG.appUrl.trim();
  if (!configuredAppUrl) return null;

  try {
    const base = configuredAppUrl.endsWith("/") ? configuredAppUrl : `${configuredAppUrl}/`;
    const url = new URL("oauth/instagram", base);
    url.searchParams.set("instagram", status);
    url.searchParams.set("message", message);
    return url.toString();
  } catch {
    return null;
  }
}

function returnToApp(res: Response, status: "success" | "error", message: string) {
  const url = callbackUrl(status, message);
  if (url) {
    res.redirect(302, url);
    return;
  }

  const headline = status === "success" ? "Instagram connected" : "Instagram connection could not be completed";
  res.status(status === "success" ? 200 : 400).type("html").send(`<!doctype html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${headline}</title></head>
<body style="margin:0;background:#0B1220;color:#F8FAFC;font-family:Arial,sans-serif;display:grid;min-height:100vh;place-items:center;padding:24px">
<main style="max-width:440px;text-align:center"><p style="color:#A79CFF;font-size:12px;letter-spacing:1.2px;font-weight:bold">FOCUSPATH / INSTAGRAM</p><h1>${headline}</h1><p style="color:#B4C1D3;line-height:1.5">${message}</p><p style="color:#8293AB">You can close this window and return to FocusPath.</p></main></body></html>`);
}

function safeConnectionFailure(error: unknown) {
  if (error instanceof Error && error.message.includes("denied")) return "Instagram authorization was cancelled.";
  if (error instanceof Error && error.message.includes("expired")) return "The connection link expired. Start the connection again from FocusPath.";
  return "We could not connect Instagram. Confirm your Meta app settings and try again.";
}

export function registerInstagramOAuthRoutes(app: Express) {
  app.get("/auth/instagram/callback", async (req: Request, res: Response) => {
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const authorizationError = typeof req.query.error === "string" ? req.query.error : "";

    try {
      if (authorizationError) throw new Error("Instagram authorization was denied.");
      if (!state || !code) throw new Error("The Instagram authorization response was incomplete.");

      const { userId } = verifyInstagramOAuthState(state);
      const shortLived = await exchangeInstagramAuthorizationCode(code);
      const longLived = await exchangeForLongLivedInstagramToken(shortLived.accessToken);
      const profile = await getInstagramProfile(shortLived.instagramUserId, longLived.accessToken);

      await saveInstagramConnection({
        userId,
        instagramUserId: profile.id || shortLived.instagramUserId,
        username: profile.username,
        profilePictureUrl: profile.profile_picture_url,
        accessToken: longLived.accessToken,
        expiresInSeconds: longLived.expiresInSeconds,
      });

      returnToApp(res, "success", "Your professional Instagram account is ready for manual publishing.");
    } catch (error) {
      // Never include access codes, access tokens, or provider response bodies in the browser or server logs.
      console.warn("[Instagram OAuth] Connection was not completed.");
      returnToApp(res, "error", safeConnectionFailure(error));
    }
  });
}
