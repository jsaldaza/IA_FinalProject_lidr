import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ChakraProvider } from '@chakra-ui/react'
import theme from '../../theme'
import Layout from '../Layout'

// Mock de useAuthStore
vi.mock('../../stores/authStore', () => ({
  useAuthStore: () => ({
    isAuthenticated: true,
    user: { name: 'Test User', email: 'test@example.com' },
    logout: vi.fn()
  })
}))

// Mock de useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn()
  }
})

// Wrapper component para tests
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ChakraProvider theme={theme}>
    <BrowserRouter>
      {children}
    </BrowserRouter>
  </ChakraProvider>
)

describe('Layout Component', () => {
  it('renders layout with navigation', () => {
    render(
      <TestWrapper>
        <Layout />
      </TestWrapper>
    )

    // Verificar que el layout se renderiza
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('displays navigation items', () => {
    render(
      <TestWrapper>
        <Layout />
      </TestWrapper>
    )

    // Verificar elementos de navegación comunes
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Projects')).toBeInTheDocument()
  })

  it('shows user menu when authenticated', () => {
    render(
      <TestWrapper>
        <Layout />
      </TestWrapper>
    )

    // Verificar que se muestra información del usuario
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })
})