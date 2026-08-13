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
