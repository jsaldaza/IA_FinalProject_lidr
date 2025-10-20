import { Box, Heading, Text, Button, VStack } from '@chakra-ui/react';
import { FiAlertTriangle } from 'react-icons/fi';

interface ErrorProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
}

export default function Error({
    title = 'Error',
    message = 'Something went wrong',
    onRetry
}: ErrorProps) {
    return (
        <Box textAlign="center" py={10} px={6}>
            <VStack spacing={4}>
                <FiAlertTriangle size={48} color="red" />
                <Heading size="lg">{title}</Heading>
                <Text color="gray.500">{message}</Text>
                {onRetry && (
                    <Button colorScheme="blue" onClick={onRetry}>
                        Try Again
                    </Button>
                )}
            </VStack>
        </Box>
    );
} 