import { beforeEach, describe, expect, it, vi } from 'vitest'

interface MockEvent {
  path: string
}

const mockUseRefreshedSessionUser = vi.fn().mockResolvedValue(null)

vi.mock('#server/utils/session-user', () => ({
  useRefreshedSessionUser: mockUseRefreshedSessionUser,
}))
vi.stubGlobal('defineEventHandler', (fn: (event: MockEvent) => Promise<void> | void) => fn)

const { default: handler } = await import('../../server/middleware/auth-session-refresh')

describe('auth-session-refresh middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('refreshes shared auth state before admin API reads', async () => {
    await handler({ path: '/api/admin/users' } as never)

    expect(mockUseRefreshedSessionUser).toHaveBeenCalledTimes(1)
  })

  it('refreshes shared auth state before auth/me reads', async () => {
    await handler({ path: '/api/auth/me' } as never)

    expect(mockUseRefreshedSessionUser).toHaveBeenCalledTimes(1)
  })

  it('skips unrelated routes', async () => {
    await handler({ path: '/api/auth/login' } as never)

    expect(mockUseRefreshedSessionUser).not.toHaveBeenCalled()
  })
})
