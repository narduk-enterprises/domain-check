import { z } from 'zod'
import { defineUserMutation, withValidatedBody } from '#layer/server/utils/mutation'
import { RATE_LIMIT_POLICIES } from '#layer/server/utils/rateLimit'
import { saveSearch } from '#server/utils/savedSearches'

const savedSearchSchema = z.object({
  query: z.string().trim().min(1).max(80),
})

export default defineUserMutation(
  {
    rateLimit: RATE_LIMIT_POLICIES.authProfile,
    parseBody: withValidatedBody(savedSearchSchema.parse),
  },
  async ({ event, user, body }) => {
    return {
      savedSearch: await saveSearch(event, user.id, body.query),
    }
  },
)
