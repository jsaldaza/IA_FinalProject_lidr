import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ChakraProvider } from '@chakra-ui/react'
import theme from '../theme'
import Layout from './Layout'

// Mock del componente NavigationBar
vi.mock('./NavigationBar', () => ({
  default: () => <div data-testid="navigation-bar">Navigation Bar</div>
}))

// Mock del componente Outlet
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">Outlet Content</div>
  }
})

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ChakraProvider theme={theme}>
        {component}
      </ChakraProvider>
    </BrowserRouter>
  )
}

describe('Layout', () => {
  it('renders navigation bar and outlet', () => {
    renderWithProviders(<Layout />)

    expect(screen.getByTestId('navigation-bar')).toBeInTheDocument()
    expect(screen.getByTestId('outlet')).toBeInTheDocument()
  })

  it('has correct layout structure', () => {
    const { container } = renderWithProviders(<Layout />)

    // Verificar que el layout principal existe
    const mainBox = container.firstChild
    expect(mainBox).toBeInTheDocument()

    // Verificar que tiene la estructura correcta
    expect(mainBox).toHaveStyle({ minHeight: '100vh' })
  })

  it('renders with memo optimization', () => {
    const { rerender } = renderWithProviders(<Layout />)

    // Re-renderizar con las mismas props
    rerender(
      <BrowserRouter>
        <ChakraProvider theme={theme}>
          <Layout />
        </ChakraProvider>
      </BrowserRouter>
    )

    // Si el componente está memoizado correctamente, no debería causar problemas
    expect(screen.getByTestId('navigation-bar')).toBeInTheDocument()
  })
})