import { int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /** Surrogate primary key managed by MySQL. */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * One encrypted Meta/Instagram long-lived token per FocusPath user. Tokens are
 * encrypted before persistence and never returned to the client.
 */
export const instagramConnections = mysqlTable(
  "instagram_connections",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    instagramUserId: varchar("instagramUserId", { length: 80 }).notNull().unique(),
    username: varchar("username", { length: 255 }),
    profilePictureUrl: text("profilePictureUrl"),
    tokenCiphertext: text("tokenCiphertext").notNull(),
    tokenExpiresAt: timestamp("tokenExpiresAt").notNull(),
    lastRefreshedAt: timestamp("lastRefreshedAt"),
    refreshFailure: text("refreshFailure"),
    connectedAt: timestamp("connectedAt").defaultNow().notNull(),
    disconnectedAt: timestamp("disconnectedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("instagram_connections_user_id_unique").on(table.userId)],
);

export type InstagramConnection = typeof instagramConnections.$inferSelect;
export type InsertInstagramConnection = typeof instagramConnections.$inferInsert;

export const instagramContentType = mysqlEnum("instagramContentType", ["IMAGE", "REEL", "STORY", "CAROUSEL"]);
export const instagramDraftStatus = mysqlEnum("instagramDraftStatus", [
  "DRAFT",
  "CREATING_CONTAINER",
  "AWAITING_MEDIA",
  "READY_TO_PUBLISH",
  "PUBLISHING",
  "PUBLISHED",
  "FAILED",
  "CANCELLED",
]);

/**
 * Phase 1 manual publishing records. The structure intentionally leaves room
 * for generation, approval, scheduling, and analytics in later phases.
 */
export const instagramDrafts = mysqlTable("instagram_drafts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  connectionId: int("connectionId")
    .notNull()
    .references(() => instagramConnections.id, { onDelete: "cascade" }),
  contentType: instagramContentType.notNull(),
  status: instagramDraftStatus.default("DRAFT").notNull(),
  caption: text("caption"),
  mediaUrl: text("mediaUrl"),
  carouselMediaUrls: text("carouselMediaUrls"),
  altText: text("altText"),
  isAiGenerated: int("isAiGenerated").default(0).notNull(),
  scheduledAt: timestamp("scheduledAt"),
  containerId: varchar("containerId", { length: 120 }),
  instagramMediaId: varchar("instagramMediaId", { length: 120 }),
  lastError: text("lastError"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  publishedAt: timestamp("publishedAt"),
});

export type InstagramDraft = typeof instagramDrafts.$inferSelect;
export type InsertInstagramDraft = typeof instagramDrafts.$inferInsert;

/** An immutable audit trail for publishing and connection recovery. */
export const instagramPublishEvents = mysqlTable("instagram_publish_events", {
  id: int("id").autoincrement().primaryKey(),
  draftId: int("draftId")
    .notNull()
    .references(() => instagramDrafts.id, { onDelete: "cascade" }),
  eventType: varchar("eventType", { length: 64 }).notNull(),
  detail: text("detail"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InstagramPublishEvent = typeof instagramPublishEvents.$inferSelect;
export type InsertInstagramPublishEvent = typeof instagramPublishEvents.$inferInsert;
