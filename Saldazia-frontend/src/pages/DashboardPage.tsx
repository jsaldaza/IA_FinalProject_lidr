import React from 'react';
import {
    Box,
    SimpleGrid,
    Container,
    Heading,
    Text,
    VStack,
    useDisclosure,
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { 
    FiFileText, 
    FiFolder, 
    FiClock
} from 'react-icons/fi';
import { dashboard } from '../lib/api';
import EnhancedStatCard from '../components/stats/EnhancedStatCard';
import StatusChart from '../components/charts/StatusChart';
import RecentActivity from '../components/activity/RecentActivity';
import QuickActions from '../components/dashboard/QuickActions';
import CreateProjectModal from '../components/CreateProjectModal';

const DashboardPage: React.FC = () => {
    const { 
        isOpen: isProjectModalOpen, 
        onOpen: onProjectModalOpen, 
        onClose: onProjectModalClose 
    } = useDisclosure();

    // Dashboard stats from dedicated endpoint
    const { data: dashboardStats, error: statsError } = useQuery({
        queryKey: ['dashboard', 'stats'],
        queryFn: async () => {
            console.log('🔄 Fetching dashboard stats...');
            const response = await dashboard.getStats();
            console.log('✅ Dashboard stats received:', response);
            return response;
        },
        retry: 3,
        retryDelay: 1000,
    });

    // Dashboard activity from dedicated endpoint
    const { data: dashboardActivity, error: activityError } = useQuery({
        queryKey: ['dashboard', 'activity'],
        queryFn: async () => {
            console.log('🔄 Fetching dashboard activity...');
            const response = await dashboard.getActivity();
            console.log('✅ Dashboard activity received:', response);
            return response;
        },
        retry: 3,
        retryDelay: 1000,
    });

    // Debug logging
    if (statsError) {
        console.error('❌ Stats error:', statsError);
    }
    if (activityError) {
        console.error('❌ Activity error:', activityError);
    }

    // Normalize backend response shape: backend returns { status: 'success', data: {...} }
    type DashboardStats = {
        totalProjects: number;
        totalTestCases: number;
        completedAnalyses: number;
        inProgressAnalyses: number;
        activeProjects: number;
        passRate: number;
    };

    const stats = (dashboardStats && (dashboardStats as unknown as { data?: DashboardStats }).data) || {
        totalProjects: 0,
        totalTestCases: 0,
        completedAnalyses: 0,
        inProgressAnalyses: 0,
        activeProjects: 0,
        passRate: 0
    };

    type DashboardActivityItem = {
        id: string;
        type: string;
        title: string;
        description: string;
        timestamp: string;
        status?: string;
    };

    const activity = (dashboardActivity && (dashboardActivity as unknown as { data?: DashboardActivityItem[] }).data) || [];

    const statusData = [
        { name: 'Activos', value: stats.activeProjects || 0, color: '#10B981' },
        { name: 'En Desarrollo', value: stats.inProgressAnalyses || 0, color: '#F97316' },
        { name: 'Completados', value: stats.completedAnalyses || 0, color: '#16A34A' },
    ];

    // Actividad reciente (mock data)
    const recentActivity = [
        {
            id: '1',
            type: 'project' as const,
            title: 'Proyecto E-commerce creado',
            description: 'Nuevo proyecto para desarrollo de funcionalidades',
            timestamp: 'hace 2 horas',
            status: 'completed',
        },
        {
            id: '2',
            type: 'project' as const,
            title: 'Requerimientos actualizados',
            description: 'Nuevas especificaciones añadidas',
            timestamp: 'hace 4 horas',
        },
        {
            id: '3',
            type: 'project' as const,
            title: 'Configuración de CI/CD',
            description: 'Pipeline de testing automatizado',
            timestamp: 'hace 6 horas',
            status: 'in_progress',
        },
        {
            id: '4',
            type: 'project' as const,
            title: 'Casos de prueba completados',
            description: 'Validación de funcionalidades críticas',
            timestamp: 'ayer',
            status: 'completed',
        },
    ];

    return (
        <Container maxW="7xl" py={8}>
            <VStack spacing={8} align="stretch">
                {/* Header */}
                <Box>
                    <Heading size="lg" mb={2}>
                        Dashboard
                    </Heading>
                    <Text color="gray.600">
                        Resumen de tu actividad en TestForge AI
                    </Text>
                </Box>

                {/* Stats Cards */}
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                    <EnhancedStatCard
                        label="Proyectos Totales"
                        value={stats.totalProjects || 0}
                        helpText="en desarrollo"
                        trend={8}
                        icon={FiFolder}
                        colorScheme="purple"
                    />
                    <EnhancedStatCard
                        label="Test Cases"
                        value={stats.totalTestCases || 0}
                        helpText={`${stats.passRate || 85}% pass rate`}
                        trend={stats.passRate || 85}
                        icon={FiClock}
                        colorScheme="orange"
                    />
                    <EnhancedStatCard
                        label="Tasa de Éxito"
                        value={`${stats.passRate || 85}%`}
                        helpText="pruebas exitosas"
                        trend={stats.passRate || 85}
                        icon={FiFileText}
                        colorScheme="blue"
                    />
                </SimpleGrid>

                {/* Charts Row */}
                <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                    <StatusChart data={statusData} />
                </SimpleGrid>

                {/* Bottom Row */}
                <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                    <RecentActivity activities={activity.length > 0 ? activity : recentActivity} />
                    <QuickActions 
                        onNewProject={onProjectModalOpen}
                        onImportData={() => console.log('Import data')}
                        onViewReports={() => console.log('View reports')}
                    />
                </SimpleGrid>
            </VStack>

            {/* Modals */}
            <CreateProjectModal 
                isOpen={isProjectModalOpen} 
                onClose={onProjectModalClose} 
            />
        </Container>
    );
};

export default DashboardPage; 