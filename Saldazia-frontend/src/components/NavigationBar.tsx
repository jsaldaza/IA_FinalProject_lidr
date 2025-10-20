import { memo, useCallback } from 'react';
import {
    Box,
    Flex,
    HStack,
    IconButton,
    Button,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    useColorModeValue,
    useColorMode,
    Text,
    Avatar,
    MenuDivider,
    Badge,
    Icon,
    Tooltip,
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { FiMenu, FiMoon, FiSun, FiUser, FiLogOut, FiStar, FiBell } from 'react-icons/fi';
import { useAuthStore } from '../stores/authStore';

const NavigationBar = memo(() => {
    const { colorMode, toggleColorMode } = useColorMode();
    const navigate = useNavigate();
    const location = useLocation();
    const { logout, user } = useAuthStore();

    const bgColor = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');
    const shadowColor = useColorModeValue('lg', 'dark-lg');

    const handleLogout = useCallback(() => {
        logout();
        navigate('/login');
    }, [logout, navigate]);

    return (
        <Box
            as="nav"
            position="fixed"
            w="100%"
            bg={bgColor}
            borderBottom="1px"
            borderColor={borderColor}
            boxShadow={shadowColor}
            zIndex={1000}
            backdropFilter="blur(10px)"
        >
            <Flex
                h={16}
                alignItems="center"
                justifyContent="space-between"
                maxW="7xl"
                mx="auto"
                px={6}
            >
                {/* Logo and Brand */}
                <HStack spacing={8} alignItems="center">
                    <HStack 
                        as={RouterLink}
                        to="/dashboard"
                        spacing={2}
                        _hover={{ textDecoration: 'none' }}
                        cursor="pointer"
                    >
                        <Icon as={FiStar} boxSize={6} color="brand.500" />
                        <Text
                            fontSize="xl"
                            fontWeight="bold"
                            bgGradient="linear(to-r, brand.500, purple.500)"
                            bgClip="text"
                        >
                            TestForge AI
                        </Text>
                    </HStack>
                    
                    {/* Navigation Links */}
                    <HStack as="nav" spacing={2} display={{ base: 'none', md: 'flex' }}>
                        <Button
                            as={RouterLink}
                            to="/dashboard"
                            variant={location.pathname === '/dashboard' ? 'solid' : 'ghost'}
                            colorScheme={location.pathname === '/dashboard' ? 'brand' : 'gray'}
                            size="sm"
                            borderRadius="xl"
                            fontWeight="medium"
                            _hover={{
                                transform: 'translateY(-1px)',
                                boxShadow: 'md',
                            }}
                            transition="all 0.2s ease-in-out"
                        >
                            Dashboard
                        </Button>
                        <Button
                            as={RouterLink}
                            to="/projects"
                            variant={location.pathname.startsWith('/projects') ? 'solid' : 'ghost'}
                            colorScheme={location.pathname.startsWith('/projects') ? 'brand' : 'gray'}
                            size="sm"
                            borderRadius="xl"
                            fontWeight="medium"
                            _hover={{
                                transform: 'translateY(-1px)',
                                boxShadow: 'md',
                            }}
                            transition="all 0.2s ease-in-out"
                        >
                            Proyectos
                        </Button>
                        <Button
                            as={RouterLink}
                            to="/test-cases"
                            variant={location.pathname === '/test-cases' ? 'solid' : 'ghost'}
                            colorScheme={location.pathname === '/test-cases' ? 'brand' : 'gray'}
                            size="sm"
                            borderRadius="xl"
                            fontWeight="medium"
                            _hover={{
                                transform: 'translateY(-1px)',
                                boxShadow: 'md',
                            }}
                            transition="all 0.2s ease-in-out"
                        >
                            Test Cases
                        </Button>
                    </HStack>
                </HStack>

                {/* Right side actions */}
                <Flex alignItems="center">
                    <HStack spacing={2}>
                        {/* Notifications */}
                        <Tooltip label="Notificaciones" hasArrow>
                            <IconButton
                                aria-label="Notifications"
                                icon={<FiBell />}
                                variant="ghost"
                                size="sm"
                                borderRadius="xl"
                                position="relative"
                                _hover={{
                                    bg: 'gray.100',
                                    transform: 'translateY(-1px)',
                                }}
                                transition="all 0.2s ease-in-out"
                            >
                                <Badge
                                    position="absolute"
                                    top="-1"
                                    right="-1"
                                    size="sm"
                                    borderRadius="full"
                                    bg="red.500"
                                    color="white"
                                    fontSize="xs"
                                    minW="18px"
                                    h="18px"
                                >
                                    3
                                </Badge>
                            </IconButton>
                        </Tooltip>

                        {/* Color mode toggle */}
                        <Tooltip label={`Cambiar a modo ${colorMode === 'light' ? 'oscuro' : 'claro'}`} hasArrow>
                            <IconButton
                                aria-label="Toggle color mode"
                                icon={colorMode === 'light' ? <FiMoon /> : <FiSun />}
                                onClick={toggleColorMode}
                                variant="ghost"
                                size="sm"
                                borderRadius="xl"
                                _hover={{
                                    bg: 'gray.100',
                                    transform: 'translateY(-1px)',
                                }}
                                transition="all 0.2s ease-in-out"
                            />
                        </Tooltip>

                        {/* User Menu */}
                        <Menu>
                            <MenuButton
                                as={Button}
                                variant="ghost"
                                size="sm"
                                borderRadius="xl"
                                leftIcon={
                                    <Avatar 
                                        size="xs" 
                                        name={user?.email || 'User'} 
                                        bg="brand.500"
                                    />
                                }
                                _hover={{
                                    bg: 'gray.100',
                                    transform: 'translateY(-1px)',
                                }}
                            >
                                <Text display={{ base: 'none', sm: 'block' }}>
                                    {user?.email?.split('@')[0] || 'Usuario'}
                                </Text>
                            </MenuButton>
                            <MenuList borderRadius="xl" border="1px solid" borderColor={borderColor}>
                                <MenuItem 
                                    icon={<FiUser />}
                                    borderRadius="lg"
                                    mx={2}
                                    my={1}
                                >
                                    Mi Perfil
                                </MenuItem>
                                <MenuDivider />
                                <MenuItem 
                                    icon={<FiLogOut />}
                                    onClick={handleLogout}
                                    borderRadius="lg"
                                    mx={2}
                                    my={1}
                                    color="red.500"
                                    _hover={{
                                        bg: 'red.50',
                                        color: 'red.600',
                                    }}
                                >
                                    Cerrar Sesión
                                </MenuItem>
                            </MenuList>
                        </Menu>

                        {/* Mobile menu */}
                        <Tooltip label="Menú" hasArrow>
                            <IconButton
                                aria-label="Open menu"
                                icon={<FiMenu />}
                                variant="ghost"
                                size="sm"
                                borderRadius="xl"
                                display={{ base: 'flex', md: 'none' }}
                                _hover={{
                                    bg: 'gray.100',
                                    transform: 'translateY(-1px)',
                                }}
                                transition="all 0.2s ease-in-out"
                            />
                        </Tooltip>
                    </HStack>
                </Flex>
            </Flex>
        </Box>
    );
});

NavigationBar.displayName = 'NavigationBar';

export default NavigationBar; 