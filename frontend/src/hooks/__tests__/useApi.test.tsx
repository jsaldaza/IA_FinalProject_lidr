import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useApiQuery, useApiMutation } from '../useApi'
import type { ReactNode } from 'react'

const BASE_URL = 'http://localhost:3000/api'

// Test wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient()
  
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useApiQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('successfully fetches data', async () => {
    const { result } = renderHook(
      () => useApiQuery(['test-data'], '/projects/in-progress'),
      { wrapper: createWrapper() }
    )

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isSuccess).toBe(true)
    expect(result.current.data).toBeDefined()
    expect(result.current.data?.status).toBe('success')
  })

  it('handles API errors correctly', async () => {
    // Mock server error
    const { server } = await import('../../test/mocks/server')
    const { http, HttpResponse } = await import('msw')
    
    server.use(
      http.get(`${BASE_URL}/test-error`, () => {
        return new HttpResponse(
          JSON.stringify({ message: 'Server error' }),
          { status: 500 }
        )
      })
    )

    const { result } = renderHook(
      () => useApiQuery(['test-error'], '/test-error'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    }, { timeout: 5000 })

    expect(result.current.error).toBeDefined()
    expect(result.current.error?.message).toContain('Server error')
  })

  it('does not retry on 4xx errors', async () => {
    // Mock 404 error
    const { server } = await import('../../test/mocks/server')
    const { http, HttpResponse } = await import('msw')
    
    const mockHandler = vi.fn(() => {
      return new HttpResponse(
        JSON.stringify({ message: 'Not found' }),
        { status: 404 }
      )
    })
    
    server.use(http.get(`${BASE_URL}/test-404`, mockHandler))

    const { result } = renderHook(
      () => useApiQuery(['test-404'], '/test-404'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    // Should not retry 4xx errors
    expect(mockHandler).toHaveBeenCalledTimes(1)
  })

  it('retries on 5xx errors', async () => {
    // Mock 500 error that eventually succeeds
    const { server } = await import('../../test/mocks/server')
    const { http, HttpResponse } = await import('msw')
    
    let callCount = 0
    const mockHandler = vi.fn(() => {
      callCount++
      if (callCount <= 1) {
        return new HttpResponse(
          JSON.stringify({ message: 'Server error' }),
          { status: 500 }
        )
      }
      return HttpResponse.json({ status: 'success', data: 'recovered' })
    })
    
    server.use(http.get(`${BASE_URL}/test-retry`, mockHandler))

    const { result } = renderHook(
      () => useApiQuery(['test-retry'], '/test-retry'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    }, { timeout: 5000 })

    // Should have retried
    expect(mockHandler).toHaveBeenCalledTimes(2)
    expect(result.current.data?.data).toBe('recovered')
  })
})

describe('useApiMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('successfully performs POST mutation', async () => {
    const { result } = renderHook(
      () => useApiMutation('/projects', 'POST'),
      { wrapper: createWrapper() }
    )

    expect(result.current.isIdle).toBe(true)

    result.current.mutate({ title: 'Test Project' })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toBeDefined()
    expect(result.current.data?.data?.project?.title).toBe('Test Project')
  })

  it('handles mutation errors correctly', async () => {
    // Mock server error for POST
    const { server } = await import('../../test/mocks/server')
    const { http, HttpResponse } = await import('msw')
    
    server.use(
      http.post(`${BASE_URL}/test-mutation-error`, () => {
        return new HttpResponse(
          JSON.stringify({ error: 'Validation error' }),
          { status: 400 }
        )
      })
    )

    const { result } = renderHook(
      () => useApiMutation('/test-mutation-error', 'POST'),
      { wrapper: createWrapper() }
    )

    result.current.mutate({ data: 'test' })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeDefined()
  })

  it('supports DELETE mutations', async () => {
    const { result } = renderHook(
      () => useApiMutation('/projects/1', 'DELETE'),
      { wrapper: createWrapper() }
    )

    result.current.mutate(undefined)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.status).toBe('success')
  })

  it('invalidates queries on successful mutation', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )

    const { result } = renderHook(
      () => useApiMutation('/projects', 'POST', {
        invalidateQueries: ['projects']
      }),
      { wrapper }
    )

    result.current.mutate({ title: 'Test Project' })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['projects'] })
  })
})