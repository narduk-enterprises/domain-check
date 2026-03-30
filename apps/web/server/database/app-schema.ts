/**
 * The template app keeps the shared auth bridge schema visible here so local
 * migration generation can still see it. Downstream apps should keep
 * product-owned tables in this file and receive the bridge through sync.
 */
import { sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { users } from '#layer/server/database/schema'

export * from '#server/database/auth-bridge-schema'

export const savedSearches = sqliteTable(
  'saved_searches',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    query: text('query').notNull(),
    normalizedQuery: text('normalized_query').notNull(),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    savedSearchesUserQueryKey: uniqueIndex('saved_searches_user_query_key').on(
      table.userId,
      table.normalizedQuery,
    ),
  }),
)

export type SavedSearch = typeof savedSearches.$inferSelect
export type NewSavedSearch = typeof savedSearches.$inferInsert
