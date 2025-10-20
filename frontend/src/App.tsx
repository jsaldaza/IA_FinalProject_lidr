import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { ChakraProvider, ColorModeScript, Center, Spinner } from '@chakra-ui/react';
import theme from './theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useHydration } from './hooks/useHydration';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@chakra-ui/react';
import ErrorBoundary from './components/ErrorBoundary';

// Layout
import Layout from './components/Layout';

// Lazy loaded pages
const Login = lazy(() => import('./pages/auth/LoginPage'));
const Register = lazy(() => import('./pages/auth/RegisterPage'));
const Dashboard = lazy(() => import('./pages/DashboardPage'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const TestCases = lazy(() => import('./pages/TestCases'));
const ConversationalChat = lazy(() => import('./pages/ConversationalAnalysis/ConversationalChatPage'));
const AnalysisProjectChat = lazy(() => import('./components/AnalysisProjectChat'));
const AnalysisDetail = lazy(() => import('./pages/AnalysisDetail'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuthStore();

  console.log('🛡️ PrivateRoute:', { isAuthenticated, loading });

  if (loading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppEventHandlers() {
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const onUnauthorized = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail || {};
      console.log('🔒 App caught unauthorized event', detail);
      navigate('/login', { replace: true });
    };

    const onRateLimited = (ev: Event) => {
      const d = (ev as CustomEvent)?.detail || { message: 'Rate limit exceeded', retryAfter: 900 };
      const minutes = Math.ceil((d.retryAfter || 900) / 60);
      toast({ title: 'Demasiadas solicitudes', description: `${d.message} - Intenta nuevamente en aprox. ${minutes} minuto${minutes > 1 ? 's' : ''}`, status: 'warning', duration: 8000, isClosable: true });
    };

    window.addEventListener('testforge:auth:unauthorized', onUnauthorized as EventListener);
    window.addEventListener('testforge:api:rate_limited', onRateLimited as EventListener);

    return () => {
      window.removeEventListener('testforge:auth:unauthorized', onUnauthorized as EventListener);
      window.removeEventListener('testforge:api:rate_limited', onRateLimited as EventListener);
    };
  }, [navigate, toast]);

  return null;
}

function App() {
  useHydration();

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ChakraProvider theme={theme}>
          <ColorModeScript initialColorMode={theme.config.initialColorMode} />
          <Router>
            <AppEventHandlers />
            <Suspense fallback={<Center h="100vh"><Spinner size="xl" /></Center>}>
              <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Routes with Layout */}
              <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="projects" element={<Projects />} />
                <Route path="projects/:id" element={<ProjectDetail />} />
                {/* Nueva ruta para chat de proyectos unificada */}
                <Route path="projects/:projectId/chat" element={<AnalysisProjectChat />} />
                {/* Ruta para ver detalles del análisis completado */}
                <Route path="analysis/:id" element={<AnalysisDetail />} />
                {/* Rutas de análisis conversacional */}
                <Route path="conversational-analysis/:id/chat" element={<ConversationalChat />} />
                <Route path="test-cases" element={<TestCases />} />
              </Route>

              {/* 404 Route */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </Router>
      </ChakraProvider>
      <ReactQueryDevtools />
    </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
