import React, { memo, useMemo } from 'react';
import {
    Card,
    CardBody,
    Heading,
    SimpleGrid,
    Button,
    VStack,
    Icon,
    Text,
    useColorModeValue,
    useTheme,
    Box,
} from '@chakra-ui/react';
import { FiUpload, FiFileText, FiSettings } from 'react-icons/fi';
import type { IconType } from 'react-icons';

// Types
interface QuickAction {
    id: string;
    label: string;
    description: string;
    icon: IconType;
    colorScheme: string;
    onClick: () => void;
    isDisabled?: boolean;
}

interface QuickActionsProps {
    onNewProject: () => void;
    onImportData: () => void;
    onViewReports: () => void;
    title?: string;
    columns?: number;
    isLoading?: boolean;
}

const QuickActions: React.FC<QuickActionsProps> = memo(({
    onNewProject,
    onImportData,
    onViewReports,
    title = "Acciones Rápidas",
    columns = 2,
    isLoading = false,
}) => {
    const theme = useTheme();
    const cardBg = useColorModeValue('white', 'gray.800');
    const textColor = useColorModeValue('gray.700', 'gray.200');
    const labelColor = useColorModeValue('gray.800', 'gray.100');
    const descriptionColor = useColorModeValue('gray.600', 'gray.400');
    const borderColor = useColorModeValue('gray.100', 'gray.600');

    // Memoize actions to prevent unnecessary re-renders
    const actions: QuickAction[] = useMemo(() => [
        {
            id: 'new-project',
            label: 'Nuevo Proyecto',
            description: 'Organizar análisis',
            icon: FiFileText,
            colorScheme: 'purple',
            onClick: onNewProject,
            isDisabled: isLoading,
        },
        {
            id: 'import-data',
            label: 'Importar Datos',
            description: 'Cargar archivo',
            icon: FiUpload,
            colorScheme: 'green',
            onClick: onImportData,
            isDisabled: isLoading,
        },
        {
            id: 'view-reports',
            label: 'Ver Reportes',
            description: 'Métricas y KPIs',
            icon: FiSettings,
            colorScheme: 'orange',
            onClick: onViewReports,
            isDisabled: isLoading,
        },
    ], [onNewProject, onImportData, onViewReports, isLoading]);

    // Memoize color functions for performance
    const getActionColors = useMemo(() => (colorScheme: string) => ({
        icon: theme.colors[colorScheme]?.[500] || theme.colors.blue[500],
        hover: {
            borderColor: theme.colors[colorScheme]?.[200] || theme.colors.blue[200],
            bg: theme.colors[colorScheme]?.[50] || theme.colors.blue[50],
        }
    }), [theme]);

    return (
        <Card bg={cardBg} shadow="sm" borderRadius="xl">
            <CardBody>
                <Heading size="md" mb={6} color={textColor}>
                    {title}
                </Heading>
                <SimpleGrid columns={{ base: 1, md: columns }} spacing={4}>
                    {actions.map((action) => {
                        const colors = getActionColors(action.colorScheme);
                        
                        return (
                            <Button
                                key={action.id}
                                onClick={action.onClick}
                                variant="ghost"
                                h="auto"
                                p={4}
                                borderRadius="xl"
                                border="1px solid"
                                borderColor={borderColor}
                                isDisabled={action.isDisabled}
                                transition="all 0.2s ease"
                                _hover={!action.isDisabled ? {
                                    borderColor: colors.hover.borderColor,
                                    bg: colors.hover.bg,
                                    transform: 'translateY(-2px)',
                                    boxShadow: 'md',
                                } : {}}
                                _active={!action.isDisabled ? {
                                    transform: 'translateY(-1px)',
                                } : {}}
                                _disabled={{
                                    opacity: 0.5,
                                    cursor: 'not-allowed',
                                }}
                                position="relative"
                                overflow="hidden"
                            >
                                <VStack spacing={3}>
                                    <Box position="relative">
                                        <Icon
                                            as={action.icon}
                                            boxSize={6}
                                            color={colors.icon}
                                            transition="transform 0.2s ease"
                                        />
                                        {action.isDisabled && (
                                            <Box
                                                position="absolute"
                                                top="50%"
                                                left="50%"
                                                transform="translate(-50%, -50%)"
                                                w={3}
                                                h={3}
                                                border="2px solid"
                                                borderColor="gray.400"
                                                borderTopColor="transparent"
                                                borderRadius="50%"
                                                animation="spin 1s linear infinite"
                                            />
                                        )}
                                    </Box>
                                    <VStack spacing={1}>
                                        <Text 
                                            fontSize="sm" 
                                            fontWeight="semibold"
                                            color={labelColor}
                                            textAlign="center"
                                            noOfLines={1}
                                        >
                                            {action.label}
                                        </Text>
                                        <Text 
                                            fontSize="xs" 
                                            color={descriptionColor}
                                            textAlign="center"
                                            noOfLines={2}
                                            lineHeight="short"
                                        >
                                            {action.description}
                                        </Text>
                                    </VStack>
                                </VStack>
                            </Button>
                        );
                    })}
                </SimpleGrid>
            </CardBody>
        </Card>
    );
});

QuickActions.displayName = 'QuickActions';

export default QuickActions;
