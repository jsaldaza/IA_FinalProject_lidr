import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuthStore } from '../authStore'

const TOKEN_KEY = 'testforge_token'

vi.mock('../../lib/api', () => ({
  auth: {
    login: vi.fn(),
    logout: vi.fn(),
    getProfile: vi.fn()
  }
}))

import { auth } from '../../lib/api'

// Mock de localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock de sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
})


describe('useAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.setItem.mockImplementation(() => {})
    localStorageMock.removeItem.mockImplementation(() => {})
    sessionStorageMock.getItem.mockReturnValue(null)
    sessionStorageMock.setItem.mockImplementation(() => {})
    sessionStorageMock.removeItem.mockImplementation(() => {})
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: true,
      error: null
    })
  })

  it('initializes with default state', () => {
    const { result } = renderHook(() => useAuthStore())

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.loading).toBe(true)
  })

  it('logs in successfully', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    }

    const mockResponse = {
      user: mockUser,
      token: 'mock-jwt-token'
    }

    ;(auth.login as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse)

    const { result } = renderHook(() => useAuthStore())

    await act(async () => {
      await result.current.login('test@example.com', 'password123')
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toEqual(mockUser)
    expect(localStorageMock.setItem).toHaveBeenCalledWith(TOKEN_KEY, 'mock-jwt-token')
  })

  it('handles login failure', async () => {
    const errorMessage = 'Invalid credentials'

    ;(auth.login as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error(errorMessage))

    const { result } = renderHook(() => useAuthStore())

    await act(async () => {
      try {
        await result.current.login('wrong@example.com', 'wrongpassword')
        // If we reach here, the test should fail
        expect(true).toBe(false)
      } catch (error: unknown) {
        const err = error as Error
        expect(err.message).toContain(errorMessage)
      }
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('logs out correctly', async () => {
    const { result } = renderHook(() => useAuthStore())

    // Set initial authenticated state
    act(() => {
      useAuthStore.setState({
        isAuthenticated: true,
        user: {
          id: '1',
          email: 'test@example.com',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z'
        },
        token: 'mock-jwt-token',
        loading: false,
        error: null
      })
    })

    await act(async () => {
      await result.current.logout()
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(TOKEN_KEY)
  })

  it('loads user from token on initialization', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    }

    sessionStorageMock.getItem.mockReturnValue('mock-jwt-token')

    ;(auth.getProfile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockUser)

    const { result } = renderHook(() => useAuthStore())
    await act(async () => {
      await result.current.checkAuth()
    })

    expect(sessionStorageMock.getItem).toHaveBeenCalledWith(TOKEN_KEY)
  })
})