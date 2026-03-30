import type { H3Event } from 'h3'
import { and, desc, eq } from 'drizzle-orm'
import { normalizeDomainQuery } from '#shared/domainSearch'
import type { SavedSearchRecord } from '#shared/savedSearches'
import { savedSearches } from '#server/database/app-schema'
import { useAppDatabase } from '#server/utils/database'

function toInvalidQueryError() {
  return createError({
    statusCode: 400,
    statusMessage: 'A saved search requires a usable domain query.',
  })
}

export async function listSavedSearches(event: H3Event, userId: string) {
  const db = useAppDatabase(event)

  return await db
    .select({
      id: savedSearches.id,
      query: savedSearches.query,
      normalizedQuery: savedSearches.normalizedQuery,
      createdAt: savedSearches.createdAt,
      updatedAt: savedSearches.updatedAt,
    })
    .from(savedSearches)
    .where(eq(savedSearches.userId, userId))
    .orderBy(desc(savedSearches.updatedAt))
    .all()
}

export async function saveSearch(
  event: H3Event,
  userId: string,
  query: string,
): Promise<SavedSearchRecord> {
  const db = useAppDatabase(event)
  const normalizedQuery = normalizeDomainQuery(query)
  if (!normalizedQuery) {
    throw toInvalidQueryError()
  }

  const now = new Date().toISOString()
  const existing = await db
    .select({
      id: savedSearches.id,
      query: savedSearches.query,
      normalizedQuery: savedSearches.normalizedQuery,
      createdAt: savedSearches.createdAt,
      updatedAt: savedSearches.updatedAt,
    })
    .from(savedSearches)
    .where(
      and(eq(savedSearches.userId, userId), eq(savedSearches.normalizedQuery, normalizedQuery)),
    )
    .get()

  if (existing) {
    await db
      .update(savedSearches)
      .set({
        query: normalizedQuery,
        updatedAt: now,
      })
      .where(eq(savedSearches.id, existing.id))
      .run()

    return {
      ...existing,
      query: normalizedQuery,
      updatedAt: now,
    }
  }

  const id = crypto.randomUUID()
  await db.insert(savedSearches).values({
    id,
    userId,
    query: normalizedQuery,
    normalizedQuery,
    createdAt: now,
    updatedAt: now,
  })

  return {
    id,
    query: normalizedQuery,
    normalizedQuery,
    createdAt: now,
    updatedAt: now,
  }
}

export async function deleteSavedSearch(event: H3Event, userId: string, id: string) {
  const db = useAppDatabase(event)
  const existing = await db
    .select({ id: savedSearches.id })
    .from(savedSearches)
    .where(and(eq(savedSearches.id, id), eq(savedSearches.userId, userId)))
    .get()

  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Saved search not found.',
    })
  }

  await db.delete(savedSearches).where(eq(savedSearches.id, id)).run()
}
