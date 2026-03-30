import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetCurrentSessionUser = vi.fn()
const mockGetCurrentSupabaseContext = vi.fn()

vi.mock('#server/utils/app-auth', () => ({
  getCurrentSessionUser: mockGetCurrentSessionUser,
  getCurrentSupabaseContext: mockGetCurrentSupabaseContext,
}))

const { useRefreshedSessionUser, useRefreshedSessionUserResponse } = await import(
  '../../server/utils/session-user'
)

describe('session-user utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the sealed session user when no shared auth session exists', async () => {
    const sessionUser = {
      id: 'local-user',
      email: 'local@example.com',
      name: 'Local User',
      isAdmin: false,
      authSessionId: null,
    }
    mockGetCurrentSessionUser.mockResolvedValue(sessionUser)

    await expect(useRefreshedSessionUser({} as never)).resolves.toEqual(sessionUser)
    expect(mockGetCurrentSupabaseContext).not.toHaveBeenCalled()
  })

  it('refreshes shared-auth-backed users before returning them', async () => {
    mockGetCurrentSessionUser.mockResolvedValue({
      id: 'local-user',
      email: 'local@example.com',
      name: 'Local User',
      isAdmin: false,
      authSessionId: 'auth_session_123',
    })
    mockGetCurrentSupabaseContext.mockResolvedValue({
      sessionUser: {
        id: 'local-user',
        email: 'local@example.com',
        name: 'Local User',
        isAdmin: true,
        authSessionId: 'auth_session_123',
      },
    })

    await expect(useRefreshedSessionUser({} as never)).resolves.toMatchObject({
      id: 'local-user',
      isAdmin: true,
    })
  })

  it('returns null when the upstream refresh expires the shared auth session', async () => {
    mockGetCurrentSessionUser.mockResolvedValue({
      id: 'local-user',
      email: 'local@example.com',
      name: 'Local User',
      isAdmin: false,
      authSessionId: 'auth_session_123',
    })
    mockGetCurrentSupabaseContext.mockRejectedValue(
      Object.assign(new Error('expired'), { statusCode: 401 }),
    )

    await expect(useRefreshedSessionUser({} as never)).resolves.toBeNull()
  })

  it('returns the refreshed user payload for auth/me responses', async () => {
    mockGetCurrentSessionUser.mockResolvedValue({
      id: 'local-user',
      email: 'local@example.com',
      name: 'Local User',
      isAdmin: false,
      authSessionId: 'auth_session_123',
    })
    mockGetCurrentSupabaseContext.mockResolvedValue({
      sessionUser: {
        id: 'local-user',
        email: 'local@example.com',
        name: 'Local User',
        isAdmin: true,
        authSessionId: 'auth_session_123',
      },
    })

    await expect(useRefreshedSessionUserResponse({} as never)).resolves.toEqual({
      user: expect.objectContaining({ isAdmin: true }),
    })
  })
})
