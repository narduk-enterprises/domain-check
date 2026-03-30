import { z } from 'zod'
import { defineUserMutation } from '#layer/server/utils/mutation'
import { RATE_LIMIT_POLICIES } from '#layer/server/utils/rateLimit'
import { deleteSavedSearch } from '#server/utils/savedSearches'

const paramsSchema = z.object({
  id: z.string().trim().min(1),
})

export default defineUserMutation(
  {
    rateLimit: RATE_LIMIT_POLICIES.authProfile,
  },
  async ({ event, user }) => {
    const params = paramsSchema.safeParse({
      id: getRouterParam(event, 'id'),
    })
    if (!params.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'A saved search id is required.',
      })
    }

    await deleteSavedSearch(event, user.id, params.data.id)

    return {
      success: true,
    }
  },
)
