import { memo } from 'react';
import { Box, Flex, useColorModeValue } from '@chakra-ui/react';
import { Outlet } from 'react-router-dom';
import NavigationBar from './NavigationBar';

const Layout = memo(() => {
    const bgColor = useColorModeValue('gray.50', 'gray.900');

    return (
        <Box minH="100vh" bg={bgColor}>
            <NavigationBar />
            <Flex
                as="main"
                pt="64px" // Espacio para el header fijo
                minH="100vh"
                direction="column"
            >
                <Box w="100%" flex={1}>
                    <Outlet />
                </Box>
            </Flex>
        </Box>
    );
});

Layout.displayName = 'Layout';

export default Layout; 