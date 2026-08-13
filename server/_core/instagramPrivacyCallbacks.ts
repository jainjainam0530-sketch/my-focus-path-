import type { Express, Request, Response } from "express";
import { INSTAGRAM_CONFIG } from "./instagramConfig";
import { verifyMetaSignedRequest } from "./instagramSecurity";
import {
  getInstagramDataDeletionRequest,
  processInstagramDataDeletionRequest,
  removeInstagramConnectionForMetaUser,
} from "../instagramService";

function signedRequestFrom(req: Request) {
  const candidate = req.body?.signed_request;
  return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
}

function publicBackendOrigin(req: Request) {
  try {
    return new URL(INSTAGRAM_CONFIG.redirectUri).origin;
  } catch {
    return `${req.protocol}://${req.get("host")}`;
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });
}

/**
 * Registers Meta's public privacy callbacks. They accept only signed_request
 * bodies verified using the Meta app secret; no client credentials are trusted.
 */
export function registerInstagramPrivacyCallbackRoutes(app: Express) {
  app.post("/auth/instagram/deauthorize", async (req: Request, res: Response) => {
    const signedRequest = signedRequestFrom(req);
    if (!signedRequest) {
      res.status(400).json({ error: "signed_request is required" });
      return;
    }

    try {
      const { user_id: metaUserId } = verifyMetaSignedRequest(signedRequest);
      await removeInstagramConnectionForMetaUser(metaUserId!);
      res.status(200).json({ success: true });
    } catch (error) {
      console.warn("[Instagram privacy] Deauthorization callback rejected:", error);
      res.status(400).json({ error: "Invalid deauthorization request" });
    }
  });

  app.post("/auth/instagram/data-deletion", async (req: Request, res: Response) => {
    const signedRequest = signedRequestFrom(req);
    if (!signedRequest) {
      res.status(400).json({ error: "signed_request is required" });
      return;
    }

    try {
      const { user_id: metaUserId } = verifyMetaSignedRequest(signedRequest);
      const { confirmationCode } = await processInstagramDataDeletionRequest(metaUserId!);
      const statusUrl = `${publicBackendOrigin(req)}/auth/instagram/data-deletion/status/${confirmationCode}`;
      res.status(200).json({ url: statusUrl, confirmation_code: confirmationCode });
    } catch (error) {
      console.warn("[Instagram privacy] Data-deletion callback rejected:", error);
      res.status(400).json({ error: "Invalid data deletion request" });
    }
  });

  app.get("/auth/instagram/data-deletion/status/:confirmationCode", async (req: Request, res: Response) => {
    try {
      const confirmationCode = String(req.params.confirmationCode ?? "");
      const request = await getInstagramDataDeletionRequest(confirmationCode);
      if (!request) {
        res.status(404).type("html").send("<h1>Deletion request not found</h1>");
        return;
      }

      const status = request.status === "COMPLETED" ? "completed" : "received";
      res
        .status(200)
        .type("html")
        .send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>FocusPath data deletion</title></head><body><h1>Data deletion request ${status}</h1><p>Confirmation code: <strong>${escapeHtml(request.confirmationCode)}</strong></p><p>FocusPath has ${status === "completed" ? "deleted the Instagram connection data associated with this request" : "recorded this request; no matching Instagram connection was stored"}.</p></body></html>`);
    } catch (error) {
      console.error("[Instagram privacy] Data-deletion status lookup failed:", error);
      res.status(503).type("html").send("<h1>Deletion status temporarily unavailable</h1>");
    }
  });
}
