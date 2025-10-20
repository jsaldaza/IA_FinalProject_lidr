import React from 'react';
import {
    Box,
    Button,
    Container,
    FormControl,
    FormLabel,
    Input,
    Text,
    useToast,
    Link,
    VStack,
    HStack,
    Icon,
    useColorModeValue,
    Divider,
    Card,
    CardBody,
    Heading,
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiUser, FiArrowRight, FiStar } from 'react-icons/fi';
import { auth } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

export const RegisterPage: React.FC = () => {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [name, setName] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const navigate = useNavigate();
    const toast = useToast();
    const { login } = useAuthStore();

    const bgGradient = useColorModeValue(
        'linear(to-br, blue.50, purple.50, pink.50)',
        'linear(to-br, gray.900, blue.900, purple.900)'
    );
    const cardBg = useColorModeValue('white', 'gray.800');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast({
                title: 'Error',
                description: 'Las contraseñas no coinciden',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
            return;
        }

        console.log('🔄 REGISTER: Iniciando registro...', { email, name });
        setLoading(true);
        try {
            // Paso 1: Registrar usuario
            const response = await auth.register({
                email,
                password,
                name,
            });

            console.log('✅ REGISTER: Registro exitoso', response);
            
            // Paso 2: Hacer login automáticamente
            console.log('🔄 AUTO-LOGIN: Iniciando sesión automática...');
            await login(email, password);
            
            console.log('✅ AUTO-LOGIN: Login exitoso, redirigiendo al dashboard...');
            
            toast({
                title: 'Éxito',
                description: '¡Registro completado! Bienvenido al dashboard.',
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
            
            // Pequeña pausa para asegurar que el estado se actualice
            setTimeout(() => {
                navigate('/dashboard');
            }, 500);
            
        } catch (error) {
            console.error('❌ REGISTER/LOGIN ERROR:', error);
            toast({
                title: 'Error',
                description: (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error en el registro o login automático',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
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
                            Crea tu cuenta y comienza
                        </Text>
                    </VStack>

                    {/* Register Card */}
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
                                        Crear Cuenta
                                    </Heading>
                                    <Text color="gray.600">
                                        Ingresa tus datos para registrarte
                                    </Text>
                                </VStack>

                                <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                                    <VStack spacing={5}>
                                        <FormControl isRequired>
                                            <FormLabel 
                                                fontWeight="medium" 
                                                color="gray.700"
                                            >
                                                Nombre
                                            </FormLabel>
                                            <HStack>
                                                <Icon as={FiUser} color="gray.400" />
                                                <Input
                                                    type="text"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    placeholder="Tu nombre completo"
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
                                                Email
                                            </FormLabel>
                                            <HStack>
                                                <Icon as={FiMail} color="gray.400" />
                                                <Input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="tu@email.com"
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
                                                Confirmar Contraseña
                                            </FormLabel>
                                            <HStack>
                                                <Icon as={FiLock} color="gray.400" />
                                                <Input
                                                    type="password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    placeholder="••••••••"
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
                                            isLoading={loading}
                                            loadingText="Creando cuenta..."
                                            w="full"
                                            rightIcon={<FiArrowRight />}
                                            _hover={{
                                                transform: 'translateY(-1px)',
                                                boxShadow: 'xl',
                                            }}
                                        >
                                            Crear Cuenta
                                        </Button>
                                    </VStack>
                                </form>

                                <Divider />

                                <Text textAlign="center" fontSize="sm">
                                    ¿Ya tienes una cuenta?{' '}
                                    <Link 
                                        as={RouterLink} 
                                        to="/login" 
                                        color="brand.500"
                                        fontWeight="semibold"
                                        _hover={{
                                            color: 'brand.600',
                                            textDecoration: 'underline',
                                        }}
                                    >
                                        Inicia sesión aquí
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

export default RegisterPage; 