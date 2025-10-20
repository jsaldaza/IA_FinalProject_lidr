import { Skeleton, SkeletonText, Box, VStack, HStack } from '@chakra-ui/react';

interface ProjectsSkeletonProps {
    count?: number;
}

export const ProjectsSkeleton = ({ count = 4 }: ProjectsSkeletonProps) => {
    return (
        <Box maxWidth="1200px" mx="auto" px={6} py={8}>
            {/* Header skeleton */}
            <HStack justify="space-between" align="center" mb={8}>
                <Skeleton height="32px" width="120px" />
                <Skeleton height="40px" width="140px" />
            </HStack>

            {/* Projects grid skeleton */}
            <Box 
                display="grid" 
                gridTemplateColumns="repeat(auto-fit, minmax(400px, 1fr))" 
                gap={6}
            >
                {Array.from({ length: count }, (_, index) => (
                    <Box
                        key={index}
                        borderWidth="1px"
                        borderRadius="xl"
                        borderTop="4px solid"
                        borderTopColor="gray.300"
                        p={6}
                        height="200px"
                        bg="white"
                    >
                        <HStack spacing={6} align="center" height="full">
                            <VStack align="start" spacing={3} flex="1">
                                {/* Title and badges */}
                                <HStack spacing={3} w="full">
                                    <Skeleton height="20px" width="16px" />
                                    <Skeleton height="24px" width="150px" />
                                    <Skeleton height="24px" width="80px" />
                                </HStack>
                                
                                {/* Meta info */}
                                <HStack spacing={4}>
                                    <Skeleton height="16px" width="80px" />
                                    <HStack spacing={2}>
                                        <Skeleton height="16px" width="16px" />
                                        <Skeleton height="16px" width="100px" />
                                    </HStack>
                                </HStack>
                            </VStack>

                            <VStack spacing={3} minW="250px" align="end">
                                {/* Progress bar */}
                                <HStack spacing={2} w="full">
                                    <Skeleton height="8px" flex="1" />
                                    <Skeleton height="16px" width="35px" />
                                </HStack>
                                
                                {/* Action buttons */}
                                <HStack spacing={2}>
                                    <Skeleton height="32px" width="80px" />
                                    <Skeleton height="32px" width="32px" />
                                    <Skeleton height="12px" width="60px" />
                                </HStack>
                            </VStack>
                        </HStack>
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

export const ProjectCardSkeleton = () => {
    return (
        <Box
            borderWidth="1px"
            borderRadius="xl"
            borderTop="4px solid"
            borderTopColor="gray.300"
            p={6}
            height="200px"
            bg="white"
        >
            <HStack spacing={6} align="center" height="full">
                <VStack align="start" spacing={3} flex="1">
                    <HStack spacing={3} w="full">
                        <Skeleton height="20px" width="16px" />
                        <Skeleton height="24px" width="150px" />
                        <Skeleton height="24px" width="80px" />
                    </HStack>
                    <HStack spacing={4}>
                        <Skeleton height="16px" width="80px" />
                        <HStack spacing={2}>
                            <Skeleton height="16px" width="16px" />
                            <Skeleton height="16px" width="100px" />
                        </HStack>
                    </HStack>
                </VStack>
                <VStack spacing={3} minW="250px" align="end">
                    <HStack spacing={2} w="full">
                        <Skeleton height="8px" flex="1" />
                        <Skeleton height="16px" width="35px" />
                    </HStack>
                    <HStack spacing={2}>
                        <Skeleton height="32px" width="80px" />
                        <Skeleton height="32px" width="32px" />
                        <Skeleton height="12px" width="60px" />
                    </HStack>
                </VStack>
            </HStack>
        </Box>
    );
};

export const DashboardSkeleton = () => {
    return (
        <Box maxWidth="1200px" mx="auto" px={6} py={8}>
            {/* Header */}
            <VStack spacing={6} align="start" mb={8}>
                <Skeleton height="32px" width="200px" />
                <SkeletonText mt="4" noOfLines={2} spacing="4" width="400px" />
            </VStack>

            {/* Stats cards */}
            <Box 
                display="grid" 
                gridTemplateColumns="repeat(auto-fit, minmax(250px, 1fr))" 
                gap={6} 
                mb={8}
            >
                {Array.from({ length: 3 }, (_, index) => (
                    <Box 
                        key={index}
                        p={6} 
                        borderWidth="1px" 
                        borderRadius="lg" 
                        bg="white"
                    >
                        <VStack align="start" spacing={3}>
                            <Skeleton height="20px" width="100px" />
                            <Skeleton height="32px" width="60px" />
                            <Skeleton height="16px" width="80px" />
                        </VStack>
                    </Box>
                ))}
            </Box>

            {/* Charts section */}
            <Box 
                display="grid" 
                gridTemplateColumns="repeat(auto-fit, minmax(400px, 1fr))" 
                gap={6}
            >
                {Array.from({ length: 2 }, (_, index) => (
                    <Box 
                        key={index}
                        p={6} 
                        borderWidth="1px" 
                        borderRadius="lg" 
                        bg="white"
                    >
                        <VStack align="start" spacing={4}>
                            <Skeleton height="24px" width="150px" />
                            <Skeleton height="200px" width="full" />
                        </VStack>
                    </Box>
                ))}
            </Box>
        </Box>
    );
};