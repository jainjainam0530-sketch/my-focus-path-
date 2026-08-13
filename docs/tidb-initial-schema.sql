-- FocusPath initial schema for TiDB Cloud Starter
-- Run this once in the TiDB SQL Editor while the selected database is `test`.

CREATE TABLE `users` (
  `id` int AUTO_INCREMENT NOT NULL,
  `openId` varchar(64) NOT NULL,
  `name` text,
  `email` varchar(320),
  `loginMethod` varchar(64),
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `users_id` PRIMARY KEY(`id`),
  CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);

CREATE TABLE `instagram_connections` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `instagramUserId` varchar(80) NOT NULL,
  `username` varchar(255),
  `profilePictureUrl` text,
  `tokenCiphertext` text NOT NULL,
  `tokenExpiresAt` timestamp NOT NULL,
  `lastRefreshedAt` timestamp,
  `refreshFailure` text,
  `connectedAt` timestamp NOT NULL DEFAULT (now()),
  `disconnectedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `instagram_connections_id` PRIMARY KEY(`id`),
  CONSTRAINT `instagram_connections_instagramUserId_unique` UNIQUE(`instagramUserId`),
  CONSTRAINT `instagram_connections_user_id_unique` UNIQUE(`userId`),
  CONSTRAINT `instagram_connections_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

CREATE TABLE `instagram_drafts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `connectionId` int NOT NULL,
  `contentType` enum('IMAGE','REEL','STORY','CAROUSEL') NOT NULL,
  `status` enum('DRAFT','CREATING_CONTAINER','AWAITING_MEDIA','READY_TO_PUBLISH','PUBLISHING','PUBLISHED','FAILED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `caption` text,
  `mediaUrl` text,
  `carouselMediaUrls` text,
  `altText` text,
  `isAiGenerated` int NOT NULL DEFAULT 0,
  `scheduledAt` timestamp,
  `containerId` varchar(120),
  `instagramMediaId` varchar(120),
  `lastError` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `publishedAt` timestamp,
  CONSTRAINT `instagram_drafts_id` PRIMARY KEY(`id`),
  CONSTRAINT `instagram_drafts_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `instagram_drafts_connection_id_fk` FOREIGN KEY (`connectionId`) REFERENCES `instagram_connections`(`id`) ON DELETE CASCADE
);

CREATE TABLE `instagram_publish_events` (
  `id` int AUTO_INCREMENT NOT NULL,
  `draftId` int NOT NULL,
  `eventType` varchar(64) NOT NULL,
  `detail` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `instagram_publish_events_id` PRIMARY KEY(`id`),
  CONSTRAINT `instagram_publish_events_draft_id_fk` FOREIGN KEY (`draftId`) REFERENCES `instagram_drafts`(`id`) ON DELETE CASCADE
);

CREATE TABLE `instagram_data_deletion_requests` (
  `id` int AUTO_INCREMENT NOT NULL,
  `metaUserId` varchar(120) NOT NULL,
  `confirmationCode` varchar(80) NOT NULL,
  `status` enum('COMPLETED','NOT_FOUND') NOT NULL,
  `requestedAt` timestamp NOT NULL DEFAULT (now()),
  `completedAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `instagram_data_deletion_requests_id` PRIMARY KEY(`id`),
  CONSTRAINT `instagram_data_deletion_requests_confirmationCode_unique` UNIQUE(`confirmationCode`)
);
