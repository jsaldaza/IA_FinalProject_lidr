import { memo, createElement } from 'react';
import {
    Box,
    Card,
    CardBody,
    Heading,
    VStack,
    HStack,
    Text,
    Avatar,
    Badge,
    useColorModeValue,
    Divider,
    Skeleton,
    Center,
    Icon,
    Button
} from '@chakra-ui/react';
import { FiFileText, FiFolder, FiUser, FiClock, FiRefreshCw, FiActivity } from 'react-icons/fi';

interface ActivityItem {
    id: string;
    type: 'analysis' | 'project' | 'user';
    title: string;
    description: string;
    timestamp: string;
    status?: string;
}

interface RecentActivityProps {
    activities: ActivityItem[];
    isLoading?: boolean;
    onRefresh?: () => void;
}

// Loading skeleton component
const ActivityItemSkeleton = memo(() => (
    <HStack spacing={3} align="start">
        <Skeleton borderRadius="full" boxSize="32px" />
        <Box flex={1}>
            <HStack justify="space-between" mb={1}>
                <Skeleton height="16px" width="60%" />
                <Skeleton height="20px" width="60px" borderRadius="full" />
            </HStack>
            <Skeleton height="12px" width="80%" mb={1} />
            <Skeleton height="10px" width="40%" />
        </Box>
    </HStack>
));

ActivityItemSkeleton.displayName = 'ActivityItemSkeleton';

// Empty state component
const EmptyState = memo(() => (
    <Center py={12}>
        <VStack spacing={4} color="gray.500">
            <Icon as={FiActivity} boxSize={12} />
            <Text fontSize="lg" fontWeight="medium">
                No hay actividad reciente
            </Text>
            <Text fontSize="sm" textAlign="center" maxW="md">
                La actividad aparecerá aquí conforme uses la aplicación.
            </Text>
        </VStack>
    </Center>
));

EmptyState.displayName = 'EmptyState';

const RecentActivity = memo<RecentActivityProps>(({ 
    activities, 
    isLoading = false, 
    onRefresh 
}) => {
    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.100', 'gray.600');
    
    const getIcon = (type: string) => {
        switch (type) {
            case 'analysis': return FiFileText;
            case 'project': return FiFolder;
            case 'user': return FiUser;
            default: return FiClock;
        }
    };

    const getStatusColor = (status?: string) => {
        switch (status?.toLowerCase()) {
            case 'completed': return 'green';
            case 'in_progress': return 'blue';
            case 'failed': return 'red';
            default: return 'gray';
        }
    };

    return (
        <Card bg={cardBg} shadow="sm" borderRadius="xl" h="400px">
            <CardBody>
                <HStack justify="space-between" align="center" mb={6}>
                    <Heading size="md" color="gray.700">
                        Actividad Reciente
                    </Heading>
                    {onRefresh && (
                        <Button
                            size="xs"
                            variant="ghost"
                            leftIcon={<Icon as={FiRefreshCw} />}
                            onClick={onRefresh}
                            isLoading={isLoading}
                        >
                            Actualizar
                        </Button>
                    )}
                </HStack>

                <VStack spacing={4} align="stretch" overflowY="auto" maxH="300px">
                    {/* Loading state */}
                    {isLoading && (
                        <>
                            {Array.from({ length: 3 }, (_, i) => (
                                <Box key={i}>
                                    <ActivityItemSkeleton />
                                    {i < 2 && <Divider mt={4} borderColor={borderColor} />}
                                </Box>
                            ))}
                        </>
                    )}

                    {/* Empty state */}
                    {!isLoading && activities.length === 0 && <EmptyState />}

                    {/* Activity items */}
                    {!isLoading && activities.length > 0 && (
                        <>
                            {activities.map((activity, index) => (
                                <Box key={activity.id}>
                                    <HStack spacing={3} align="start">
                                        <Avatar
                                            size="sm"
                                            icon={createElement(getIcon(activity.type))}
                                            bg="brand.100"
                                            color="brand.500"
                                        />
                                        <Box flex={1} minW={0}>
                                            <HStack justify="space-between" align="start" mb={1}>
                                                <Text 
                                                    fontWeight="medium" 
                                                    fontSize="sm" 
                                                    noOfLines={1}
                                                    color="gray.800"
                                                >
                                                    {activity.title}
                                                </Text>
                                                {activity.status && (
                                                    <Badge 
                                                        size="sm" 
                                                        colorScheme={getStatusColor(activity.status)}
                                                        borderRadius="full"
                                                        minW="fit-content"
                                                    >
                                                        {activity.status}
                                                    </Badge>
                                                )}
                                            </HStack>
                                            <Text 
                                                fontSize="xs" 
                                                color="gray.600" 
                                                noOfLines={2} 
                                                mb={1}
                                            >
                                                {activity.description}
                                            </Text>
                                            <Text fontSize="xs" color="gray.400">
                                                {activity.timestamp}
                                            </Text>
                                        </Box>
                                    </HStack>
                                    {index < activities.length - 1 && (
                                        <Divider mt={4} borderColor={borderColor} />
                                    )}
                                </Box>
                            ))}
                        </>
                    )}
                </VStack>
            </CardBody>
        </Card>
    );
});

RecentActivity.displayName = 'RecentActivity';

export default RecentActivity;
