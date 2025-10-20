import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChakraProvider } from '@chakra-ui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import Projects from '../../pages/Projects'

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return (
    <ChakraProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    </ChakraProvider>
  )
}

describe('Projects Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders project page header correctly', () => {
    render(
      <TestWrapper>
        <Projects />
      </TestWrapper>
    )

    expect(screen.getByText('Proyectos')).toBeInTheDocument()
    expect(screen.getByText('Nuevo Proyecto')).toBeInTheDocument()
  })

  it('displays loading state initially', () => {
    render(
      <TestWrapper>
        <Projects />
      </TestWrapper>
    )

    expect(screen.getByText('Cargando proyectos...')).toBeInTheDocument()
  })

  it('displays projects after loading', async () => {
    render(
      <TestWrapper>
        <Projects />
      </TestWrapper>
    )

    // Wait for projects to load
    await waitFor(() => {
      expect(screen.queryByText('Cargando proyectos...')).not.toBeInTheDocument()
    })

    // Should show project sections
    expect(screen.getByText(/En Progreso/)).toBeInTheDocument()
    expect(screen.getByText(/Completados/)).toBeInTheDocument()
  })

  it('displays in-progress projects correctly', async () => {
    render(
      <TestWrapper>
        <Projects />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
      expect(screen.getByText('EN PROGRESO')).toBeInTheDocument()
      expect(screen.getByText('Continuar')).toBeInTheDocument()
    })
  })

  it('displays completed projects correctly', async () => {
    render(
      <TestWrapper>
        <Projects />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Test Project 2')).toBeInTheDocument()
      expect(screen.getByText('COMPLETADO')).toBeInTheDocument()
      expect(screen.getByText('Ver Análisis')).toBeInTheDocument()
    })
  })

  it('opens create project modal when new project button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <Projects />
      </TestWrapper>
    )

    await user.click(screen.getByText('Nuevo Proyecto'))
    
    await waitFor(() => {
      expect(screen.getByText('Crear Nuevo Proyecto')).toBeInTheDocument()
    })
  })

  it('displays empty state when no projects exist', async () => {
    // Mock empty response
    const { server } = await import('../../test/mocks/server')
    const { http, HttpResponse } = await import('msw')
    
    server.use(
      http.get('/api/projects/in-progress', () => {
        return HttpResponse.json({ status: 'success', data: [] })
      }),
      http.get('/api/projects/completed', () => {
        return HttpResponse.json({ status: 'success', data: { items: [] } })
      })
    )

    render(
      <TestWrapper>
        <Projects />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('No hay proyectos creados')).toBeInTheDocument()
      expect(screen.getByText('Crear Primer Proyecto')).toBeInTheDocument()
    })
  })

  it('handles project deletion', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <Projects />
      </TestWrapper>
    )

    // Wait for projects to load
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument()
    })

    // Click delete button (trash icon)
    const deleteButtons = screen.getAllByLabelText('Eliminar proyecto')
    await user.click(deleteButtons[0])

    // Confirm deletion in dialog
    await waitFor(() => {
      expect(screen.getByText('Eliminar Proyecto')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Eliminar'))

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText('Proyecto eliminado')).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    // Mock server error
    const { server } = await import('../../test/mocks/server')
    const { http, HttpResponse } = await import('msw')
    
    server.use(
      http.get('/api/projects/in-progress', () => {
        return new HttpResponse(
          JSON.stringify({ error: 'Server error' }),
          { status: 500 }
        )
      })
    )

    render(
      <TestWrapper>
        <Projects />
      </TestWrapper>
    )

    // Should handle error gracefully and not crash
    await waitFor(() => {
      // Component should still render, maybe with empty state or error message
      expect(screen.getByText('Proyectos')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})