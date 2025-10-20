import React, { memo, useMemo } from 'react';
import {
    Box,
    Stat,
    StatLabel,
    StatNumber,
    StatHelpText,
    StatArrow,
    Icon,
    HStack,
    useColorModeValue,
    useTheme,
} from '@chakra-ui/react';
import { type IconType } from 'react-icons';

// Types
type ColorScheme = 'blue' | 'green' | 'purple' | 'orange' | 'cyan' | 'red';

interface EnhancedStatCardProps {
    label: string;
    value: number | string;
    helpText?: string;
    trend?: number;
    icon: IconType;
    colorScheme?: ColorScheme;
    isLoading?: boolean;
    onClick?: () => void;
}

const EnhancedStatCard: React.FC<EnhancedStatCardProps> = memo(({
    label,
    value,
    helpText,
    trend,
    icon,
    colorScheme = 'blue',
    isLoading = false,
    onClick,
}) => {
    const theme = useTheme();
    const bg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const labelColor = useColorModeValue('gray.600', 'gray.400');
    const valueColor = useColorModeValue('gray.800', 'gray.100');
    
    // Memoize color mapping for performance
    const iconColor = useMemo(() => {
        const colorMap: Record<ColorScheme, string> = {
            green: theme.colors.green[500],
            purple: theme.colors.purple[500],
            orange: theme.colors.orange[500],
            cyan: theme.colors.cyan[500],
            red: theme.colors.red[500],
            blue: theme.colors.blue[500],
        };
        return colorMap[colorScheme] || theme.colors.blue[500];
    }, [colorScheme, theme]);

    // Memoize trend color and type
    const trendConfig = useMemo(() => {
        if (trend === undefined) return null;
        
        return {
            type: trend >= 0 ? 'increase' : 'decrease',
            color: trend >= 0 ? theme.colors.green[500] : theme.colors.red[500],
            value: Math.abs(trend)
        };
    }, [trend, theme]);

    return (
        <Box
            bg={bg}
            p={6}
            borderRadius="xl"
            border="1px solid"
            borderColor={borderColor}
            boxShadow="sm"
            transition="all 0.2s ease"
            cursor={onClick ? 'pointer' : 'default'}
            _hover={onClick ? {
                boxShadow: 'lg',
                transform: 'translateY(-2px)',
                borderColor: iconColor,
            } : {
                boxShadow: 'md',
            }}
            onClick={onClick}
            opacity={isLoading ? 0.6 : 1}
            position="relative"
        >
            <Stat>
                <HStack justify="space-between" align="start" mb={2}>
                    <StatLabel 
                        fontSize="sm" 
                        fontWeight="medium" 
                        color={labelColor}
                        noOfLines={1}
                    >
                        {label}
                    </StatLabel>
                    <Icon 
                        as={icon} 
                        boxSize={5} 
                        color={iconColor}
                        flexShrink={0}
                    />
                </HStack>
                
                <StatNumber 
                    fontSize="2xl" 
                    fontWeight="bold" 
                    color={valueColor}
                    mb={1}
                    transition="color 0.2s ease"
                >
                    {isLoading ? '...' : value}
                </StatNumber>
                
                {(helpText || trendConfig) && (
                    <StatHelpText fontSize="sm" m={0} color={labelColor}>
                        {trendConfig && (
                            <>
                                <StatArrow 
                                    type={trendConfig.type as 'increase' | 'decrease'} 
                                    color={trendConfig.color}
                                />
                                {trendConfig.value}% 
                            </>
                        )}
                        {helpText}
                    </StatHelpText>
                )}
            </Stat>
            
            {/* Loading indicator */}
            {isLoading && (
                <Box
                    position="absolute"
                    top={0}
                    left={0}
                    right={0}
                    bottom={0}
                    borderRadius="xl"
                    bg="whiteAlpha.300"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                >
                    <Box
                        w={4}
                        h={4}
                        border="2px solid"
                        borderColor="gray.300"
                        borderTopColor={iconColor}
                        borderRadius="50%"
                        animation="spin 1s linear infinite"
                    />
                </Box>
            )}
        </Box>
    );
});

EnhancedStatCard.displayName = 'EnhancedStatCard';

export default EnhancedStatCard;
