import { beforeEach, describe, expect, it, vi } from 'vitest'

function createQueryChain<T = undefined>(result?: T) {
  const chain = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    all: vi.fn().mockResolvedValue(result),
    get: vi.fn().mockResolvedValue(result),
  }

  return chain
}

function createMutationChain() {
  const chain = {
    values: vi.fn().mockResolvedValue(),
    where: vi.fn(() => ({
      run: vi.fn().mockResolvedValue(),
    })),
    set: vi.fn(() => chain),
    run: vi.fn().mockResolvedValue(),
  }

  return chain
}

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

vi.stubGlobal('crypto', {
  randomUUID: () => 'saved-search-uuid',
})
vi.stubGlobal('createError', (opts: { statusCode: number; statusMessage: string }) => {
  const error = new Error(opts.statusMessage) as Error & { statusCode: number }
  error.statusCode = opts.statusCode
  return error
})

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...conditions) => ({ type: 'and', conditions })),
  desc: vi.fn((value) => ({ type: 'desc', value })),
  eq: vi.fn((column, value) => ({ column, value })),
}))

vi.mock('#server/utils/database', () => ({
  useAppDatabase: () => mockDb,
}))

vi.mock('#server/database/app-schema', () => ({
  savedSearches: {
    id: 'id',
    userId: 'user_id',
    query: 'query',
    normalizedQuery: 'normalized_query',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
}))

const { deleteSavedSearch, listSavedSearches, saveSearch } =
  await import('../../server/utils/savedSearches')

describe('saved search utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists saved searches ordered by the latest update', async () => {
    const queryChain = createQueryChain([
      {
        id: 'saved-1',
        query: 'atlas',
        normalizedQuery: 'atlas',
        createdAt: '2026-03-30T00:00:00.000Z',
        updatedAt: '2026-03-30T00:00:00.000Z',
      },
    ])
    mockDb.select.mockReturnValue(queryChain)

    const result = await listSavedSearches({} as never, 'user-1')

    expect(result).toHaveLength(1)
    expect(queryChain.orderBy).toHaveBeenCalled()
  })

  it('inserts a new saved search when one does not exist', async () => {
    const existingQuery = createQueryChain()
    const insertChain = createMutationChain()

    mockDb.select.mockReturnValue(existingQuery)
    mockDb.insert.mockReturnValue(insertChain)

    const result = await saveSearch({} as never, 'user-1', '  Atlas  ')

    expect(result).toMatchObject({
      id: 'saved-search-uuid',
      query: 'atlas',
      normalizedQuery: 'atlas',
    })
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        query: 'atlas',
        normalizedQuery: 'atlas',
      }),
    )
  })

  it('updates the timestamp instead of inserting a duplicate saved search', async () => {
    const existingQuery = createQueryChain({
      id: 'saved-1',
      query: 'atlas',
      normalizedQuery: 'atlas',
      createdAt: '2026-03-30T00:00:00.000Z',
      updatedAt: '2026-03-30T00:00:00.000Z',
    })
    const updateChain = createMutationChain()

    mockDb.select.mockReturnValue(existingQuery)
    mockDb.update.mockReturnValue(updateChain)

    const result = await saveSearch({} as never, 'user-1', 'Atlas')

    expect(result.id).toBe('saved-1')
    expect(mockDb.insert).not.toHaveBeenCalled()
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'atlas',
      }),
    )
  })

  it('rejects blank saved-search queries', async () => {
    await expect(saveSearch({} as never, 'user-1', '   ')).rejects.toThrow(
      'A saved search requires a usable domain query.',
    )
  })

  it('throws when deleting another user’s saved search', async () => {
    const existingQuery = createQueryChain()
    mockDb.select.mockReturnValue(existingQuery)

    await expect(deleteSavedSearch({} as never, 'user-1', 'saved-1')).rejects.toThrow(
      'Saved search not found.',
    )
  })
})
