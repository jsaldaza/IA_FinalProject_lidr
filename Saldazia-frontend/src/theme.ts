import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
    config: {
        initialColorMode: 'light',
        useSystemColorMode: true,
    },
    colors: {
        brand: {
            50: '#E6F6FF',
            100: '#BAE3FF',
            200: '#7CC4FA',
            300: '#47A3F3',
            400: '#2186EB',
            500: '#0967D2',
            600: '#0552B5',
            700: '#03449E',
            800: '#01337D',
            900: '#002159',
        },
        accent: {
            50: '#F0F9FF',
            100: '#E0F2FE',
            200: '#BAE6FD',
            300: '#7DD3FC',
            400: '#38BDF8',
            500: '#06B6D4',
            600: '#0891B2',
            700: '#0E7490',
            800: '#155E75',
            900: '#164E63',
        },
        success: {
            50: '#ECFDF5',
            100: '#D1FAE5',
            200: '#A7F3D0',
            300: '#6EE7B7',
            400: '#34D399',
            500: '#10B981',
            600: '#059669',
            700: '#047857',
            800: '#065F46',
            900: '#064E3B',
        },
        warning: {
            50: '#FFFBEB',
            100: '#FEF3C7',
            200: '#FDE68A',
            300: '#FCD34D',
            400: '#FBBF24',
            500: '#F59E0B',
            600: '#D97706',
            700: '#B45309',
            800: '#92400E',
            900: '#78350F',
        },
        purple: {
            50: '#FAF5FF',
            100: '#F3E8FF',
            200: '#E9D5FF',
            300: '#D8B4FE',
            400: '#C084FC',
            500: '#A855F7',
            600: '#9333EA',
            700: '#7C3AED',
            800: '#6B21A8',
            900: '#581C87',
        },
    },
    fonts: {
        heading: 'Inter, system-ui, sans-serif',
        body: 'Inter, system-ui, sans-serif',
    },
    components: {
        Button: {
            baseStyle: {
                fontWeight: 'semibold',
                borderRadius: 'xl',
                _focus: {
                    boxShadow: '0 0 0 3px rgba(66, 153, 225, 0.6)',
                },
            },
            variants: {
                solid: {
                    bg: 'brand.500',
                    color: 'white',
                    _hover: {
                        bg: 'brand.600',
                        transform: 'translateY(-1px)',
                        boxShadow: 'lg',
                    },
                    _active: {
                        transform: 'translateY(0)',
                    },
                },
                gradient: {
                    bgGradient: 'linear(to-r, brand.500, purple.500)',
                    color: 'white',
                    _hover: {
                        bgGradient: 'linear(to-r, brand.600, purple.600)',
                        transform: 'translateY(-1px)',
                        boxShadow: 'xl',
                    },
                },
            },
        },
        Card: {
            baseStyle: {
                container: {
                    borderRadius: 'xl',
                    boxShadow: 'sm',
                    transition: 'all 0.2s',
                    _hover: {
                        boxShadow: 'xl',
                        transform: 'translateY(-2px)',
                    },
                },
            },
        },
        Stat: {
            baseStyle: {
                container: {
                    bg: 'white',
                    p: 6,
                    borderRadius: 'xl',
                    boxShadow: 'sm',
                    border: '1px solid',
                    borderColor: 'gray.100',
                    transition: 'all 0.2s',
                    _hover: {
                        boxShadow: 'lg',
                        transform: 'translateY(-1px)',
                    },
                },
                label: {
                    fontWeight: 'medium',
                    fontSize: 'sm',
                    color: 'gray.600',
                },
                number: {
                    fontSize: '2xl',
                    fontWeight: 'bold',
                    color: 'gray.800',
                },
            },
        },
    },
    styles: {
        global: {
            body: {
                bg: 'gray.50',
                color: 'gray.800',
            },
            '::-webkit-scrollbar': {
                width: '8px',
            },
            '::-webkit-scrollbar-track': {
                bg: 'gray.100',
            },
            '::-webkit-scrollbar-thumb': {
                bg: 'gray.300',
                borderRadius: 'full',
                _hover: {
                    bg: 'gray.400',
                },
            },
            '@keyframes spin': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' },
            },
        },
    },
});

export default theme; 