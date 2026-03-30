import { beforeEach, describe, expect, it, vi } from 'vitest'

const listSavedSearchesMock = vi.fn()
const saveSearchMock = vi.fn()
const deleteSavedSearchMock = vi.fn()

type UserMutationHandler = (context: {
  event: { body?: unknown; user?: { id: string } }
  user: { id: string }
  body: unknown
}) => unknown

vi.stubGlobal('getRouterParam', (event: { params?: Record<string, string> }, name: string) => {
  return event.params?.[name]
})
vi.stubGlobal('createError', (opts: { statusCode: number; statusMessage: string }) => {
  const error = new Error(opts.statusMessage) as Error & { statusCode: number }
  error.statusCode = opts.statusCode
  return error
})
vi.stubGlobal('setHeader', vi.fn())
vi.stubGlobal('readBody', async (event: { body?: unknown }) => event.body)
vi.stubGlobal('defineEventHandler', (handler: (event: unknown) => unknown) => handler)

vi.mock('#layer/server/utils/auth', () => ({
  requireAuth: vi.fn(async (event: { user?: { id: string } }) => {
    if (!event.user) {
      throw new Error('Unauthorized')
    }
    return event.user
  }),
}))

vi.mock('#layer/server/utils/rateLimit', () => ({
  RATE_LIMIT_POLICIES: {
    authProfile: { namespace: 'auth-profile', maxRequests: 30, windowMs: 60_000 },
  },
}))

vi.mock('#layer/server/utils/mutation', () => ({
  defineUserMutation:
    (
      options: { parseBody?: (event: { body?: unknown }) => Promise<unknown> },
      handler: UserMutationHandler,
    ) =>
    async (event: { body?: unknown; user?: { id: string } }) => {
      if (!event.user) {
        throw new Error('Unauthorized')
      }

      return handler({
        event,
        user: event.user,
        body: options.parseBody ? await options.parseBody(event) : undefined,
      })
    },
  withValidatedBody: (validate: (body: unknown) => unknown) => async (event: { body?: unknown }) =>
    validate(await readBody(event)),
}))

vi.mock('#server/utils/savedSearches', () => ({
  listSavedSearches: listSavedSearchesMock,
  saveSearch: saveSearchMock,
  deleteSavedSearch: deleteSavedSearchMock,
}))

const { default: getHandler } = await import('../../server/api/saved-searches.get')
const { default: postHandler } = await import('../../server/api/saved-searches.post')
const { default: deleteHandler } = await import('../../server/api/saved-searches/[id].delete')

describe('saved search API routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the authenticated user’s saved searches', async () => {
    listSavedSearchesMock.mockResolvedValue([{ id: 'saved-1', normalizedQuery: 'atlas' }])

    const result = await getHandler({ user: { id: 'user-1' } } as never)

    expect(result).toEqual({
      savedSearches: [{ id: 'saved-1', normalizedQuery: 'atlas' }],
    })
    expect(listSavedSearchesMock).toHaveBeenCalledWith(expect.anything(), 'user-1')
  })

  it('rejects anonymous reads', async () => {
    await expect(getHandler({} as never)).rejects.toThrow('Unauthorized')
  })

  it('rejects anonymous saves', async () => {
    await expect(postHandler({ body: { query: 'atlas' } } as never)).rejects.toThrow('Unauthorized')
  })

  it('validates POST bodies before saving a search', async () => {
    await expect(
      postHandler({ user: { id: 'user-1' }, body: { query: '   ' } } as never),
    ).rejects.toThrow()
  })

  it('upserts a saved search for the authenticated user', async () => {
    saveSearchMock.mockResolvedValue({ id: 'saved-1', normalizedQuery: 'atlas' })

    const result = await postHandler({
      user: { id: 'user-1' },
      body: { query: 'Atlas' },
    } as never)

    expect(result).toEqual({
      savedSearch: { id: 'saved-1', normalizedQuery: 'atlas' },
    })
    expect(saveSearchMock).toHaveBeenCalledWith(expect.anything(), 'user-1', 'Atlas')
  })

  it('requires an id when deleting a saved search', async () => {
    await expect(deleteHandler({ user: { id: 'user-1' }, params: {} } as never)).rejects.toThrow(
      'A saved search id is required.',
    )
  })

  it('deletes the authenticated user’s saved search', async () => {
    const result = await deleteHandler({
      user: { id: 'user-1' },
      params: { id: 'saved-1' },
    } as never)

    expect(result).toEqual({ success: true })
    expect(deleteSavedSearchMock).toHaveBeenCalledWith(expect.anything(), 'user-1', 'saved-1')
  })
})
