CREATE TABLE `saved_searches` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `query` text NOT NULL,
  `normalized_query` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `saved_searches_user_query_key`
  ON `saved_searches` (`user_id`, `normalized_query`);
