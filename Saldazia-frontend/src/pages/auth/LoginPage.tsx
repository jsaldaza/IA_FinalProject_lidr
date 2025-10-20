import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
    Box,
    Button,
    Container,
    FormControl,
    FormLabel,
    Heading,
    Input,
    Link,
    Text,
    useToast,
    VStack,
    HStack,
    Icon,
    useColorModeValue,
    Divider,
    Card,
    CardBody,
} from '@chakra-ui/react';
import { FiMail, FiLock, FiArrowRight, FiStar } from 'react-icons/fi';
import { useAuthStore } from '../../stores/authStore';

export const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();
    const { login } = useAuthStore();
    const toast = useToast();

    const bgGradient = useColorModeValue(
        'linear(to-br, blue.50, purple.50, pink.50)',
        'linear(to-br, gray.900, blue.900, purple.900)'
    );
    const cardBg = useColorModeValue('white', 'gray.800');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        try {
            await login(email, password);
            
            toast({
                title: 'Success',
                description: 'Login successful',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
            
            // Pequeña pausa para asegurar que el estado se actualice
            setTimeout(() => {
                navigate('/dashboard');
            }, 500);
        } catch (error: unknown) {
            console.error('Login error:', error);
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Login failed',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box
            minH="100vh"
            bgGradient={bgGradient}
            display="flex"
            alignItems="center"
            justifyContent="center"
            p={4}
        >
            <Container maxW="md">
                <VStack spacing={8}>
                    {/* Logo/Brand Section */}
                    <VStack spacing={4} textAlign="center">
                        <HStack spacing={2}>
                            <Icon as={FiStar} boxSize={8} color="brand.500" />
                            <Heading 
                                size="xl" 
                                bgGradient="linear(to-r, brand.500, purple.500)"
                                bgClip="text"
                                fontWeight="extrabold"
                            >
                                TestForge AI
                            </Heading>
                        </HStack>
                        <Text 
                            fontSize="lg" 
                            color="gray.600" 
                            fontWeight="medium"
                        >
                            Estrategias QA Inteligentes con IA
                        </Text>
                    </VStack>

                    {/* Login Card */}
                    <Card 
                        bg={cardBg} 
                        shadow="xl" 
                        borderRadius="2xl" 
                        w="full"
                        border="1px solid"
                        borderColor="gray.100"
                    >
                        <CardBody p={8}>
                            <VStack spacing={6}>
                                <VStack spacing={2} textAlign="center">
                                    <Heading size="lg" color="gray.800">
                                        Bienvenido de vuelta
                                    </Heading>
                                    <Text color="gray.600">
                                        Inicia sesión en tu cuenta
                                    </Text>
                                </VStack>

                                <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                                    <VStack spacing={5}>
                                        <FormControl isRequired>
                                            <FormLabel 
                                                fontWeight="medium" 
                                                color="gray.700"
                                            >
                                                Email
                                            </FormLabel>
                                            <HStack>
                                                <Icon as={FiMail} color="gray.400" />
                                                <Input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="tu@email.com"
                                                    autoComplete="email"
                                                    borderRadius="xl"
                                                    border="1px solid"
                                                    borderColor="gray.200"
                                                    _focus={{
                                                        borderColor: 'brand.500',
                                                        boxShadow: '0 0 0 1px #0967D2',
                                                    }}
                                                    _hover={{
                                                        borderColor: 'gray.300',
                                                    }}
                                                />
                                            </HStack>
                                        </FormControl>

                                        <FormControl isRequired>
                                            <FormLabel 
                                                fontWeight="medium" 
                                                color="gray.700"
                                            >
                                                Contraseña
                                            </FormLabel>
                                            <HStack>
                                                <Icon as={FiLock} color="gray.400" />
                                                <Input
                                                    type="password"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    placeholder="••••••••"
                                                    autoComplete="current-password"
                                                    borderRadius="xl"
                                                    border="1px solid"
                                                    borderColor="gray.200"
                                                    _focus={{
                                                        borderColor: 'brand.500',
                                                        boxShadow: '0 0 0 1px #0967D2',
                                                    }}
                                                    _hover={{
                                                        borderColor: 'gray.300',
                                                    }}
                                                />
                                            </HStack>
                                        </FormControl>

                                        <Button
                                            type="submit"
                                            variant="gradient"
                                            size="lg"
                                            fontSize="md"
                                            isLoading={isLoading}
                                            loadingText="Iniciando sesión..."
                                            w="full"
                                            rightIcon={<FiArrowRight />}
                                            _hover={{
                                                transform: 'translateY(-1px)',
                                                boxShadow: 'xl',
                                            }}
                                        >
                                            Iniciar Sesión
                                        </Button>
                                    </VStack>
                                </form>

                                <Divider />

                                <Text textAlign="center" fontSize="sm">
                                    ¿No tienes una cuenta?{' '}
                                    <Link 
                                        as={RouterLink} 
                                        to="/register" 
                                        color="brand.500"
                                        fontWeight="semibold"
                                        _hover={{
                                            color: 'brand.600',
                                            textDecoration: 'underline',
                                        }}
                                    >
                                        Regístrate aquí
                                    </Link>
                                </Text>
                            </VStack>
                        </CardBody>
                    </Card>

                    {/* Footer */}
                    <Text 
                        fontSize="xs" 
                        color="gray.500" 
                        textAlign="center"
                    >
                        © 2025 TestForge AI. Inteligencia artificial para QA.
                    </Text>
                </VStack>
            </Container>
        </Box>
    );
};

export default LoginPage; 