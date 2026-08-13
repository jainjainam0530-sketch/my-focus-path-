import { randomBytes } from "node:crypto";
import { and, desc, eq, isNull, lte } from "drizzle-orm";
import {
  instagramConnections,
  instagramDataDeletionRequests,
  instagramDrafts,
  instagramPublishEvents,
} from "../drizzle/schema";
import { getDb } from "./db";
import {
  InstagramApiError,
  createInstagramContainer,
  getContentPublishingLimit,
  getInstagramContainerStatus,
  publishInstagramContainer,
  refreshLongLivedInstagramToken,
} from "./_core/instagramClient";
import { decryptInstagramToken, encryptInstagramToken } from "./_core/instagramSecurity";

export type DraftContentType = "IMAGE" | "REEL" | "STORY" | "CAROUSEL";

type DraftInput = {
  contentType: DraftContentType;
  caption?: string;
  mediaUrl?: string;
  carouselMediaUrls?: string[];
  altText?: string;
  isAiGenerated?: boolean;
};

const TOKEN_REFRESH_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const MIN_REFRESH_AGE_MS = 24 * 60 * 60 * 1000;

function requireDatabase<T>(db: T | null): T {
  if (!db) throw new Error("The database is not available. Configure DATABASE_URL before connecting Instagram.");
  return db;
}

function serialiseCarouselUrls(urls: string[] | undefined) {
  return urls?.length ? JSON.stringify(urls) : null;
}

function parseCarouselUrls(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string") ? parsed : [];
  } catch {
    return [];
  }
}

function safeErrorMessage(error: unknown) {
  if (error instanceof InstagramApiError) return error.message.slice(0, 500);
  if (error instanceof Error) return error.message.slice(0, 500);
  return "An unexpected publishing error occurred.";
}

async function logPublishEvent(draftId: number, eventType: string, detail?: string) {
  const db = requireDatabase(await getDb());
  await db.insert(instagramPublishEvents).values({ draftId, eventType, detail: detail?.slice(0, 2000) ?? null });
}

async function getConnectionForUser(userId: number) {
  const db = requireDatabase(await getDb());
  const [connection] = await db
    .select()
    .from(instagramConnections)
    .where(and(eq(instagramConnections.userId, userId), isNull(instagramConnections.disconnectedAt)))
    .limit(1);
  return connection ?? null;
}

async function getDraftForUser(userId: number, draftId: number) {
  const db = requireDatabase(await getDb());
  const [draft] = await db
    .select()
    .from(instagramDrafts)
    .where(and(eq(instagramDrafts.id, draftId), eq(instagramDrafts.userId, userId)))
    .limit(1);
  return draft ?? null;
}

export async function saveInstagramConnection(input: {
  userId: number;
  instagramUserId: string;
  username?: string;
  profilePictureUrl?: string;
  accessToken: string;
  expiresInSeconds: number;
}) {
  const db = requireDatabase(await getDb());
  const expiresAt = new Date(Date.now() + input.expiresInSeconds * 1000);
  const encryptedToken = encryptInstagramToken(input.accessToken);

  const [accountAlreadyLinked] = await db
    .select()
    .from(instagramConnections)
    .where(eq(instagramConnections.instagramUserId, input.instagramUserId))
    .limit(1);

  if (accountAlreadyLinked && accountAlreadyLinked.userId !== input.userId) {
    throw new Error("This Instagram account is already connected to another FocusPath user.");
  }

  const [existingConnection] = await db
    .select()
    .from(instagramConnections)
    .where(eq(instagramConnections.userId, input.userId))
    .limit(1);

  if (existingConnection) {
    await db
      .update(instagramConnections)
      .set({
        instagramUserId: input.instagramUserId,
        username: input.username ?? null,
        profilePictureUrl: input.profilePictureUrl ?? null,
        tokenCiphertext: encryptedToken,
        tokenExpiresAt: expiresAt,
        lastRefreshedAt: new Date(),
        refreshFailure: null,
        disconnectedAt: null,
      })
      .where(eq(instagramConnections.id, existingConnection.id));
  } else {
    await db.insert(instagramConnections).values({
      userId: input.userId,
      instagramUserId: input.instagramUserId,
      username: input.username ?? null,
      profilePictureUrl: input.profilePictureUrl ?? null,
      tokenCiphertext: encryptedToken,
      tokenExpiresAt: expiresAt,
      lastRefreshedAt: new Date(),
    });
  }
}

export async function getInstagramConnectionSummary(userId: number) {
  const connection = await getConnectionForUser(userId);
  if (!connection) return null;

  return {
    id: connection.id,
    username: connection.username,
    profilePictureUrl: connection.profilePictureUrl,
    expiresAt: connection.tokenExpiresAt,
    lastRefreshedAt: connection.lastRefreshedAt,
    refreshFailure: connection.refreshFailure,
    isExpiringSoon: connection.tokenExpiresAt.getTime() - Date.now() < TOKEN_REFRESH_WINDOW_MS,
  };
}

export async function disconnectInstagram(userId: number) {
  const db = requireDatabase(await getDb());
  const connection = await getConnectionForUser(userId);
  if (!connection) return;

  // Delete the locally stored credential immediately. Draft and audit history remain intact.
  await db
    .update(instagramConnections)
    .set({
      tokenCiphertext: "REVOKED",
      tokenExpiresAt: new Date(),
      refreshFailure: null,
      disconnectedAt: new Date(),
    })
    .where(eq(instagramConnections.id, connection.id));
}

/**
 * Removes all FocusPath data scoped to an Instagram account. Deleting the
 * connection cascades to its associated manual drafts and publishing audit rows.
 */
export async function removeInstagramConnectionForMetaUser(metaUserId: string) {
  const db = requireDatabase(await getDb());
  const [connection] = await db
    .select()
    .from(instagramConnections)
    .where(eq(instagramConnections.instagramUserId, metaUserId))
    .limit(1);

  if (!connection) return "NOT_FOUND" as const;
  await db.delete(instagramConnections).where(eq(instagramConnections.id, connection.id));
  return "COMPLETED" as const;
}

/** Handles Meta's data-deletion request and creates a public confirmation code. */
export async function processInstagramDataDeletionRequest(metaUserId: string) {
  const status = await removeInstagramConnectionForMetaUser(metaUserId);
  const db = requireDatabase(await getDb());
  const confirmationCode = randomBytes(24).toString("hex");

  await db.insert(instagramDataDeletionRequests).values({
    metaUserId,
    confirmationCode,
    status,
  });

  return { confirmationCode, status };
}

export async function getInstagramDataDeletionRequest(confirmationCode: string) {
  const db = requireDatabase(await getDb());
  const [request] = await db
    .select()
    .from(instagramDataDeletionRequests)
    .where(eq(instagramDataDeletionRequests.confirmationCode, confirmationCode))
    .limit(1);
  return request ?? null;
}

export async function listInstagramDrafts(userId: number) {
  const db = requireDatabase(await getDb());
  return db
    .select()
    .from(instagramDrafts)
    .where(eq(instagramDrafts.userId, userId))
    .orderBy(desc(instagramDrafts.updatedAt))
    .limit(50);
}

export async function createInstagramDraft(userId: number, input: DraftInput) {
  const db = requireDatabase(await getDb());
  const connection = await getConnectionForUser(userId);
  if (!connection) throw new Error("Connect an Instagram professional account before creating a draft.");

  const [created] = await db
    .insert(instagramDrafts)
    .values({
      userId,
      connectionId: connection.id,
      contentType: input.contentType,
      caption: input.caption?.trim() || null,
      mediaUrl: input.mediaUrl?.trim() || null,
      carouselMediaUrls: serialiseCarouselUrls(input.carouselMediaUrls),
      altText: input.altText?.trim() || null,
      isAiGenerated: input.isAiGenerated ? 1 : 0,
    })
    .$returningId();

  await logPublishEvent(created.id, "DRAFT_CREATED", "Manual publishing draft created.");
  return created.id;
}

export async function updateInstagramDraft(userId: number, draftId: number, input: Partial<DraftInput>) {
  const db = requireDatabase(await getDb());
  const draft = await getDraftForUser(userId, draftId);
  if (!draft) throw new Error("Draft not found.");
  if (["PUBLISHED", "PUBLISHING", "CREATING_CONTAINER"].includes(draft.status)) {
    throw new Error("This draft cannot be edited while it is being published or after it has been published.");
  }

  await db
    .update(instagramDrafts)
    .set({
      ...(input.contentType ? { contentType: input.contentType } : {}),
      ...(input.caption !== undefined ? { caption: input.caption.trim() || null } : {}),
      ...(input.mediaUrl !== undefined ? { mediaUrl: input.mediaUrl.trim() || null } : {}),
      ...(input.carouselMediaUrls !== undefined ? { carouselMediaUrls: serialiseCarouselUrls(input.carouselMediaUrls) } : {}),
      ...(input.altText !== undefined ? { altText: input.altText.trim() || null } : {}),
      ...(input.isAiGenerated !== undefined ? { isAiGenerated: input.isAiGenerated ? 1 : 0 } : {}),
      status: "DRAFT",
      containerId: null,
      lastError: null,
    })
    .where(eq(instagramDrafts.id, draftId));

  await logPublishEvent(draftId, "DRAFT_UPDATED", "Manual draft updated; any prior media container was cleared.");
}

export async function deleteInstagramDraft(userId: number, draftId: number) {
  const db = requireDatabase(await getDb());
  const draft = await getDraftForUser(userId, draftId);
  if (!draft) throw new Error("Draft not found.");
  if (draft.status === "PUBLISHED") throw new Error("Published post records cannot be deleted from the publishing workspace.");
  await db.delete(instagramDrafts).where(eq(instagramDrafts.id, draftId));
}

function validatePublishableDraft(draft: Awaited<ReturnType<typeof getDraftForUser>>) {
  if (!draft) throw new Error("Draft not found.");
  if (draft.status === "PUBLISHED") throw new Error("This draft has already been published.");
  if (draft.contentType === "CAROUSEL") {
    const urls = parseCarouselUrls(draft.carouselMediaUrls);
    if (urls.length < 2 || urls.length > 10) throw new Error("A carousel requires between 2 and 10 public media URLs.");
  } else if (!draft.mediaUrl) {
    throw new Error("Add a publicly accessible media URL before publishing.");
  }
}

async function ensureQuotaAvailable(instagramUserId: string, accessToken: string) {
  const limit = await getContentPublishingLimit(instagramUserId, accessToken);
  const entry = limit.data?.[0];
  const used = entry?.quota_usage;
  const total = entry?.config?.quota_total;
  if (typeof used === "number" && typeof total === "number" && used >= total) {
    throw new Error("Instagram's current API publishing quota has been reached. Please try again after the rolling 24-hour window resets.");
  }
}

export async function publishInstagramDraft(userId: number, draftId: number) {
  const db = requireDatabase(await getDb());
  const draft = await getDraftForUser(userId, draftId);
  validatePublishableDraft(draft);
  const connection = await getConnectionForUser(userId);
  if (!connection || connection.id !== draft.connectionId) throw new Error("Instagram is no longer connected. Reconnect the account and try again.");
  if (connection.tokenExpiresAt.getTime() <= Date.now()) throw new Error("Instagram connection requires reauthorization.");

  let accessToken: string;
  try {
    accessToken = decryptInstagramToken(connection.tokenCiphertext);
  } catch {
    throw new Error("Instagram connection requires reauthorization.");
  }

  try {
    await ensureQuotaAvailable(connection.instagramUserId, accessToken);

    let containerId = draft.containerId;
    if (!containerId) {
      await db.update(instagramDrafts).set({ status: "CREATING_CONTAINER", lastError: null }).where(eq(instagramDrafts.id, draft.id));
      await logPublishEvent(draft.id, "CONTAINER_CREATE_REQUESTED");

      containerId = await createInstagramContainer({
        instagramUserId: connection.instagramUserId,
        accessToken,
        contentType: draft.contentType,
        caption: draft.caption,
        mediaUrl: draft.mediaUrl,
        carouselMediaUrls: parseCarouselUrls(draft.carouselMediaUrls),
        altText: draft.altText,
        isAiGenerated: draft.isAiGenerated === 1,
      });

      await db
        .update(instagramDrafts)
        .set({ containerId, status: "AWAITING_MEDIA", lastError: null })
        .where(eq(instagramDrafts.id, draft.id));
      await logPublishEvent(draft.id, "CONTAINER_CREATED", `Container ${containerId} created.`);
    }

    // One status check per user action. This avoids aggressive polling while letting video containers finish asynchronously.
    const status = await getInstagramContainerStatus(containerId, accessToken);
    if (status.status_code && status.status_code !== "FINISHED" && status.status_code !== "PUBLISHED") {
      const message = status.status_code === "IN_PROGRESS"
        ? "Instagram is still processing this media. Use Publish again in about a minute to check and finish publishing."
        : status.status_code === "EXPIRED"
          ? "The Instagram media container expired. Edit the draft or publish again to create a new container."
          : "Instagram could not prepare this media. Review the draft and try again.";
      await db
        .update(instagramDrafts)
        .set({ status: status.status_code === "EXPIRED" || status.status_code === "ERROR" ? "FAILED" : "AWAITING_MEDIA", lastError: message })
        .where(eq(instagramDrafts.id, draft.id));
      await logPublishEvent(draft.id, "CONTAINER_STATUS", status.status_code ?? "UNKNOWN");
      return { published: false, status: status.status_code ?? "UNKNOWN", message };
    }

    await db.update(instagramDrafts).set({ status: "PUBLISHING", lastError: null }).where(eq(instagramDrafts.id, draft.id));
    const instagramMediaId = await publishInstagramContainer(connection.instagramUserId, containerId, accessToken);
    await db
      .update(instagramDrafts)
      .set({ status: "PUBLISHED", instagramMediaId, publishedAt: new Date(), lastError: null })
      .where(eq(instagramDrafts.id, draft.id));
    await logPublishEvent(draft.id, "PUBLISHED", `Instagram media ${instagramMediaId} published.`);
    return { published: true, status: "PUBLISHED", message: "Published to Instagram." };
  } catch (error) {
    const message = safeErrorMessage(error);
    await db.update(instagramDrafts).set({ status: "FAILED", lastError: message }).where(eq(instagramDrafts.id, draft.id));
    await logPublishEvent(draft.id, "PUBLISH_FAILED", message);
    throw new Error(message);
  }
}

/** Refreshes tokens close to expiry. Call this once a day from the deployment scheduler. */
export async function refreshExpiringInstagramTokens() {
  const db = requireDatabase(await getDb());
  const refreshCutoff = new Date(Date.now() + TOKEN_REFRESH_WINDOW_MS);
  const candidates = await db
    .select()
    .from(instagramConnections)
    .where(and(isNull(instagramConnections.disconnectedAt), lte(instagramConnections.tokenExpiresAt, refreshCutoff)));

  const results = { refreshed: 0, skipped: 0, failed: 0 };
  for (const connection of candidates) {
    const lastCredentialChange = connection.lastRefreshedAt ?? connection.connectedAt;
    if (Date.now() - lastCredentialChange.getTime() < MIN_REFRESH_AGE_MS) {
      results.skipped += 1;
      continue;
    }

    try {
      const refreshed = await refreshLongLivedInstagramToken(decryptInstagramToken(connection.tokenCiphertext));
      await db
        .update(instagramConnections)
        .set({
          tokenCiphertext: encryptInstagramToken(refreshed.accessToken),
          tokenExpiresAt: new Date(Date.now() + refreshed.expiresInSeconds * 1000),
          lastRefreshedAt: new Date(),
          refreshFailure: null,
        })
        .where(eq(instagramConnections.id, connection.id));
      results.refreshed += 1;
    } catch (error) {
      await db
        .update(instagramConnections)
        .set({ refreshFailure: safeErrorMessage(error) })
        .where(eq(instagramConnections.id, connection.id));
      results.failed += 1;
    }
  }

  return results;
}
