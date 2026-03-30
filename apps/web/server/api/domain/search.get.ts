import { z } from 'zod'
import { searchDomains } from '#server/utils/domainSearch'

const querySchema = z.object({
  q: z.string().trim().min(1).max(80),
})

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'public, max-age=30, s-maxage=30, stale-while-revalidate=300')

  const query = await getValidatedQuery(event, (value) => querySchema.safeParse(value))
  if (!query.success) {
    throw createError({ statusCode: 400, message: 'A domain query is required.' })
  }

  return await searchDomains(event, query.data.q)
})
