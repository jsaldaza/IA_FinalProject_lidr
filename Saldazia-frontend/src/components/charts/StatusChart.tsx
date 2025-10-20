import React, { memo, useMemo } from 'react';
import {
    Box,
    Card,
    CardBody,
    Heading,
    useColorModeValue,
    useTheme,
    VStack,
    HStack,
    Circle,
    Text,
} from '@chakra-ui/react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    type TooltipProps,
} from 'recharts';

// Types
interface StatusDataPoint {
    name: string;
    value: number;
    color: string;
}

interface StatusChartProps {
    data: StatusDataPoint[];
    title?: string;
    height?: number;
    showLegend?: boolean;
}

interface StatusTooltipPayload {
    name: string;
    value: number;
    payload: StatusDataPoint;
}

// Custom tooltip component
const CustomTooltip: React.FC<TooltipProps<number, string> & {
    payload?: StatusTooltipPayload[];
}> = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0];
    const percentage = data.payload ? 
        ((data.value / payload.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1) : 0;

    return (
        <Box
            bg="white"
            p={3}
            borderRadius="lg"
            shadow="lg"
            border="1px"
            borderColor="gray.200"
        >
            <HStack spacing={2} align="center">
                <Circle size="12px" bg={data.payload?.color} />
                <VStack spacing={0} align="start">
                    <Text fontWeight="semibold" fontSize="sm">
                        {data.name}
                    </Text>
                    <Text fontSize="xs" color="gray.600">
                        {data.value} ({percentage}%)
                    </Text>
                </VStack>
            </HStack>
        </Box>
    );
};

// Custom legend component
const CustomLegend: React.FC<{ data: StatusDataPoint[] }> = ({ data }) => {
    const total = useMemo(() => 
        data.reduce((sum, item) => sum + item.value, 0), [data]
    );

    return (
        <VStack spacing={2} align="stretch" mt={4}>
            {data.map((entry, index) => {
                const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : 0;
                return (
                    <HStack key={index} justify="space-between" align="center">
                        <HStack spacing={2}>
                            <Circle size="8px" bg={entry.color} />
                            <Text fontSize="sm" color="gray.600">
                                {entry.name}
                            </Text>
                        </HStack>
                        <Text fontSize="sm" fontWeight="medium">
                            {entry.value} ({percentage}%)
                        </Text>
                    </HStack>
                );
            })}
        </VStack>
    );
};

const StatusChart: React.FC<StatusChartProps> = memo(({
    data,
    title = "Estado de Requerimientos",
    height = 300,
    showLegend = true
}) => {
    const theme = useTheme();
    const cardBg = useColorModeValue('white', 'gray.800');
    const textColor = useColorModeValue('gray.700', 'gray.200');

    // Default colors if not provided
    const chartData = useMemo(() => 
        data.map((item, index) => ({
            ...item,
            color: item.color || theme.colors.blue[500 + (index * 100)]
        })), [data, theme]
    );

    // Early return if no data
    if (!data || data.length === 0) {
        return (
            <Card bg={cardBg} shadow="sm" borderRadius="xl">
                <CardBody>
                    <Heading size="md" mb={6} color={textColor}>
                        {title}
                    </Heading>
                    <Box h={`${height}px`} display="flex" alignItems="center" justifyContent="center">
                        <Text color="gray.500" fontSize="sm">
                            No hay datos disponibles
                        </Text>
                    </Box>
                </CardBody>
            </Card>
        );
    }

    const chartHeight = showLegend ? height - 100 : height;

    return (
        <Card bg={cardBg} shadow="sm" borderRadius="xl">
            <CardBody>
                <Heading size="md" mb={6} color={textColor}>
                    {title}
                </Heading>
                <Box h={`${chartHeight}px`}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                outerRadius={Math.min(chartHeight * 0.3, 80)}
                                fill="#8884d8"
                                dataKey="value"
                                stroke="none"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={entry.color}
                                        stroke={entry.color}
                                        strokeWidth={2}
                                    />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </Box>
                {showLegend && <CustomLegend data={chartData} />}
            </CardBody>
        </Card>
    );
});

StatusChart.displayName = 'StatusChart';

export default StatusChart;
