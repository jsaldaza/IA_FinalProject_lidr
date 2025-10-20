import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChakraProvider } from '@chakra-ui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CreateProjectModal from '../CreateProjectModal'

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
        {children}
      </QueryClientProvider>
    </ChakraProvider>
  )
}

const mockOnClose = vi.fn()
const mockOnCreated = vi.fn()

describe('CreateProjectModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly when open', () => {
    render(
      <TestWrapper>
        <CreateProjectModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onCreated={mockOnCreated} 
        />
      </TestWrapper>
    )

    expect(screen.getByText('Crear Nuevo Proyecto')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre del proyecto')).toBeInTheDocument()
    expect(screen.getByText('Cancelar')).toBeInTheDocument()
    expect(screen.getByText('Guardar')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <TestWrapper>
        <CreateProjectModal 
          isOpen={false} 
          onClose={mockOnClose} 
          onCreated={mockOnCreated} 
        />
      </TestWrapper>
    )

    expect(screen.queryByText('Crear Nuevo Proyecto')).not.toBeInTheDocument()
  })

  it('validates required field', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <CreateProjectModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onCreated={mockOnCreated} 
        />
      </TestWrapper>
    )

    const saveButton = screen.getByText('Guardar')
    expect(saveButton).toBeDisabled()

    // Try to submit without filling the field
    await user.click(saveButton)
    
    // Should show validation message
    await waitFor(() => {
      expect(screen.getByText('Nombre requerido')).toBeInTheDocument()
    })
  })

  it('enables save button when title is provided', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <CreateProjectModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onCreated={mockOnCreated} 
        />
      </TestWrapper>
    )

    const titleInput = screen.getByLabelText('Nombre del proyecto')
    const saveButton = screen.getByText('Guardar')

    expect(saveButton).toBeDisabled()

    await user.type(titleInput, 'Test Project')
    expect(saveButton).toBeEnabled()
  })

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <CreateProjectModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onCreated={mockOnCreated} 
        />
      </TestWrapper>
    )

    await user.click(screen.getByText('Cancelar'))
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('handles successful project creation', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <CreateProjectModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onCreated={mockOnCreated} 
        />
      </TestWrapper>
    )

    const titleInput = screen.getByLabelText('Nombre del proyecto')
    const saveButton = screen.getByText('Guardar')

    await user.type(titleInput, 'Test Project')
    await user.click(saveButton)

    // Should call the API and handle success
    await waitFor(() => {
      expect(screen.getByText('Borrador creado')).toBeInTheDocument()
    })

    expect(mockOnCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Test Project'
      })
    )
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup()

    // Mock server error
    const { server } = await import('../../test/mocks/server')
    const { http, HttpResponse } = await import('msw')
    
    server.use(
      http.post('/api/projects/draft', () => {
        return new HttpResponse(
          JSON.stringify({ error: 'Server error' }),
          { status: 500 }
        )
      })
    )

    render(
      <TestWrapper>
        <CreateProjectModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onCreated={mockOnCreated} 
        />
      </TestWrapper>
    )

    const titleInput = screen.getByLabelText('Nombre del proyecto')
    const saveButton = screen.getByText('Guardar')

    await user.type(titleInput, 'Test Project')
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Error creando borrador')).toBeInTheDocument()
    })

    expect(mockOnCreated).not.toHaveBeenCalled()
    expect(mockOnClose).not.toHaveBeenCalled()
  })
})