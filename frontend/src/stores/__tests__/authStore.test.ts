import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuthStore } from '../authStore'

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

// Mock de fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.setItem.mockImplementation(() => {})
    localStorageMock.removeItem.mockImplementation(() => {})
  })

  it('initializes with default state', () => {
    const { result } = renderHook(() => useAuthStore())

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.loading).toBe(false)
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

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    } as Response)

    const { result } = renderHook(() => useAuthStore())

    await act(async () => {
      await result.current.login('test@example.com', 'password123')
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toEqual(mockUser)
    expect(localStorageMock.setItem).toHaveBeenCalledWith('auth-token', 'mock-jwt-token')
  })

  it('handles login failure', async () => {
    const errorMessage = 'Invalid credentials'

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: errorMessage })
    } as Response)

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

  it('logs out correctly', () => {
    const { result } = renderHook(() => useAuthStore())

    // Set initial authenticated state
    act(() => {
      result.current.isAuthenticated = true
      result.current.user = {
        id: '1',
        email: 'test@example.com',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      }
    })

    act(() => {
      result.current.logout()
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth-token')
  })

  it('loads user from token on initialization', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    }

    localStorageMock.getItem.mockReturnValue('mock-jwt-token')

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ user: mockUser })
    } as Response)

    renderHook(() => useAuthStore())

    expect(localStorageMock.getItem).toHaveBeenCalledWith('auth-token')
  })
})