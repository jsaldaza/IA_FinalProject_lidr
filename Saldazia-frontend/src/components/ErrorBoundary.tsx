import { Component, type ReactNode } from 'react';
import { Box, Heading, Text, Button, Center, VStack, Icon } from '@chakra-ui/react';
import { FiAlertTriangle, FiRefreshCw, FiHome } from 'react-icons/fi';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({ error, errorInfo });
    
    // In production, send to error monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: errorInfo });
    }
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Store error info for better debugging
    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI with enhanced features
      return (
        <Center h="100vh" p={6}>
          <Box
            textAlign="center"
            bg="white"
            p={8}
            borderRadius="xl"
            borderWidth="1px"
            borderColor="gray.200"
            shadow="lg"
            maxW="md"
          >
            <VStack spacing={6}>
              <Icon as={FiAlertTriangle} boxSize={16} color="red.500" />
              
              <VStack spacing={2}>
                <Heading size="lg" color="red.600">
                  ¡Oops! Algo salió mal
                </Heading>
                <Text color="gray.600" textAlign="center">
                  Se ha producido un error inesperado en la aplicación.
                </Text>
              </VStack>

              {this.state.error && (
                <Box
                  bg="red.50"
                  p={4}
                  borderRadius="md"
                  borderLeft="4px solid"
                  borderLeftColor="red.400"
                  w="full"
                >
                  <Text fontSize="sm" color="red.700" fontFamily="mono">
                    {this.state.error.message || 'Error desconocido'}
                  </Text>
                </Box>
              )}

              <VStack spacing={3} w="full">
                <Button
                  colorScheme="blue"
                  size="lg"
                  leftIcon={<Icon as={FiRefreshCw} />}
                  onClick={this.handleRetry}
                  w="full"
                  _hover={{ transform: 'translateY(-1px)' }}
                  transition="all 0.2s ease-in-out"
                >
                  Reintentar
                </Button>
                
                <Button
                  variant="outline"
                  size="md"
                  leftIcon={<Icon as={FiHome} />}
                  onClick={this.handleGoHome}
                  w="full"
                  _hover={{ transform: 'translateY(-1px)' }}
                  transition="all 0.2s ease-in-out"
                >
                  Ir al inicio
                </Button>
              </VStack>
            </VStack>
          </Box>
        </Center>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
