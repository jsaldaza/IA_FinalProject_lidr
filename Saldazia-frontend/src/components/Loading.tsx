import { memo } from 'react';
import { Center, Spinner, Text, VStack, useColorModeValue } from '@chakra-ui/react';

interface LoadingProps {
    message?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    fullHeight?: boolean;
}

const Loading = memo<LoadingProps>(({ 
    message = 'Cargando...', 
    size = 'xl',
    fullHeight = true 
}) => {
    const textColor = useColorModeValue('gray.600', 'gray.400');
    const spinnerColor = useColorModeValue('blue.500', 'blue.300');
    const emptyColor = useColorModeValue('gray.200', 'gray.600');

    return (
        <Center h={fullHeight ? '100vh' : 'auto'} py={fullHeight ? 0 : 12}>
            <VStack spacing={4}>
                <Spinner
                    thickness="4px"
                    speed="0.65s"
                    emptyColor={emptyColor}
                    color={spinnerColor}
                    size={size}
                />
                <Text 
                    color={textColor}
                    fontSize="md"
                    fontWeight="medium"
                    sx={{
                        animation: 'pulse 2s infinite',
                        '@keyframes pulse': {
                            '0%': { opacity: 0.6 },
                            '50%': { opacity: 1 },
                            '100%': { opacity: 0.6 }
                        }
                    }}
                >
                    {message}
                </Text>
            </VStack>
        </Center>
    );
});

Loading.displayName = 'Loading';

export default Loading; 