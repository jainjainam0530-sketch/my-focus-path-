CREATE TABLE `instagram_publish_events` (
  `id` int AUTO_INCREMENT NOT NULL,
  `draftId` int NOT NULL,
  `eventType` varchar(64) NOT NULL,
  `detail` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `instagram_publish_events_id` PRIMARY KEY(`id`),
  CONSTRAINT `instagram_publish_events_draft_id_fk` FOREIGN KEY (`draftId`) REFERENCES `instagram_drafts`(`id`) ON DELETE CASCADE
);
