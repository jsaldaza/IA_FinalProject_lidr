import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

  it('renders correctly when open', async () => {
    render(
      <TestWrapper>
        <CreateProjectModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onCreated={mockOnCreated} 
        />
      </TestWrapper>
    )

    expect(await screen.findByText('Crear Nuevo Proyecto')).toBeInTheDocument()
    expect(await screen.findByPlaceholderText('Ej: Sistema de Gestión de Inventario')).toBeInTheDocument()
    expect(screen.getByText('Cancelar')).toBeInTheDocument()
    expect(screen.getByText('Crear y Comenzar Análisis')).toBeInTheDocument()
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

  it('disables submit until required fields are filled', async () => {
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

    const saveButton = screen.getByText('Crear y Comenzar Análisis')
    expect(saveButton).toBeDisabled()

    await user.click(saveButton)
    expect(saveButton).toBeDisabled()
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

    const titleInput = await screen.findByPlaceholderText('Ej: Sistema de Gestión de Inventario')
    const descriptionInput = screen.getByPlaceholderText('Ej: Necesito crear un sistema de gestión de inventario para una tienda que permita controlar stock, generar reportes y manejar proveedores. El sistema debe tener diferentes roles de usuario...')
    const saveButton = screen.getByText('Crear y Comenzar Análisis')

    expect(saveButton).toBeDisabled()

    await user.type(titleInput, 'Test Project')
    await user.type(descriptionInput, 'Descripcion de prueba con mas de veinte caracteres')
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
    const { server } = await import('../../test/mocks/server')
    const { http, HttpResponse } = await import('msw')

    server.use(
      http.post('http://localhost:3000/api/projects/create-and-start', () => {
        return HttpResponse.json({
          data: {
            project: {
              id: '123',
              title: 'Test Project',
              description: 'Descripcion de prueba con mas de veinte caracteres',
              status: 'IN_PROGRESS',
              createdAt: '2025-01-01T00:00:00Z'
            }
          }
        })
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

    const titleInput = await screen.findByPlaceholderText('Ej: Sistema de Gestión de Inventario')
    const descriptionInput = screen.getByPlaceholderText('Ej: Necesito crear un sistema de gestión de inventario para una tienda que permita controlar stock, generar reportes y manejar proveedores. El sistema debe tener diferentes roles de usuario...')
    const saveButton = screen.getByText('Crear y Comenzar Análisis')

    await user.type(titleInput, 'Test Project')
    await user.type(descriptionInput, 'Descripcion de prueba con mas de veinte caracteres')
    await user.click(saveButton)

    // Should call the API and handle success
    await waitFor(() => {
      expect(screen.getByText('Proyecto creado')).toBeInTheDocument()
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
      http.post('http://localhost:3000/api/projects/create-and-start', () => {
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

    const titleInput = await screen.findByPlaceholderText('Ej: Sistema de Gestión de Inventario')
    const descriptionInput = screen.getByPlaceholderText('Ej: Necesito crear un sistema de gestión de inventario para una tienda que permita controlar stock, generar reportes y manejar proveedores. El sistema debe tener diferentes roles de usuario...')
    const saveButton = screen.getByText('Crear y Comenzar Análisis')

    await user.type(titleInput, 'Test Project')
    await user.type(descriptionInput, 'Descripcion de prueba con mas de veinte caracteres')
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Error creando proyecto')).toBeInTheDocument()
    })

    expect(mockOnCreated).not.toHaveBeenCalled()
    expect(mockOnClose).not.toHaveBeenCalled()
  })
})