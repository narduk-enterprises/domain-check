import { requireAuth } from '#layer/server/utils/auth'
import { listSavedSearches } from '#server/utils/savedSearches'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const user = await requireAuth(event)

  return {
    savedSearches: await listSavedSearches(event, user.id),
  }
})
