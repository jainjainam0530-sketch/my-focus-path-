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
