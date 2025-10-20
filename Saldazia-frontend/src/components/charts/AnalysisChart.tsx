import React, { memo, useMemo } from 'react';
import {
    Box,
    Card,
    CardBody,
    Heading,
    useColorModeValue,
    useTheme,
} from '@chakra-ui/react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    type TooltipProps,
} from 'recharts';

// Types
interface ChartDataPoint {
    date: string;
    analyses: number;
    projects: number;
}

interface AnalysisChartProps {
    data: ChartDataPoint[];
    title?: string;
    height?: number;
}

interface TooltipPayload {
    name: string;
    value: number;
    color: string;
}

// Custom tooltip component for better styling
const CustomTooltip: React.FC<TooltipProps<number, string> & {
    payload?: TooltipPayload[];
    label?: string;
}> = ({ 
    active, 
    payload, 
    label 
}) => {
    if (!active || !payload || !payload.length) return null;

    return (
        <Box
            bg="white"
            p={3}
            borderRadius="lg"
            shadow="lg"
            border="1px"
            borderColor="gray.200"
        >
            <Box fontWeight="semibold" mb={1}>
                {label}
            </Box>
            {payload.map((entry: TooltipPayload, index: number) => (
                <Box key={index} color={entry.color} fontSize="sm">
                    {entry.name}: {entry.value}
                </Box>
            ))}
        </Box>
    );
};

const AnalysisChart: React.FC<AnalysisChartProps> = memo(({ 
    data, 
    title = "Actividad Reciente",
    height = 300 
}) => {
    const theme = useTheme();
    const cardBg = useColorModeValue('white', 'gray.800');
    const gridColor = useColorModeValue('#f0f0f0', '#374151');
    const textColor = useColorModeValue('gray.700', 'gray.200');
    
    // Memoize chart configuration for performance
    const chartConfig = useMemo(() => ({
        analyses: {
            color: theme.colors.blue[500],
            name: "Levantamientos"
        },
        projects: {
            color: theme.colors.purple[500],
            name: "Proyectos"
        }
    }), [theme]);

    // Early return if no data
    if (!data || data.length === 0) {
        return (
            <Card bg={cardBg} shadow="sm" borderRadius="xl">
                <CardBody>
                    <Heading size="md" mb={6} color={textColor}>
                        {title}
                    </Heading>
                    <Box h={`${height}px`} display="flex" alignItems="center" justifyContent="center">
                        <Box color="gray.500" fontSize="sm">
                            No hay datos disponibles
                        </Box>
                    </Box>
                </CardBody>
            </Card>
        );
    }

    return (
        <Card bg={cardBg} shadow="sm" borderRadius="xl">
            <CardBody>
                <Heading size="md" mb={6} color={textColor}>
                    {title}
                </Heading>
                <Box h={`${height}px`}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid 
                                strokeDasharray="3 3" 
                                stroke={gridColor}
                                opacity={0.3}
                            />
                            <XAxis 
                                dataKey="date" 
                                axisLine={false}
                                tickLine={false}
                                fontSize={12}
                                tick={{ fill: textColor }}
                            />
                            <YAxis 
                                axisLine={false}
                                tickLine={false}
                                fontSize={12}
                                tick={{ fill: textColor }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Line
                                type="monotone"
                                dataKey="analyses"
                                stroke={chartConfig.analyses.color}
                                strokeWidth={3}
                                dot={{ fill: chartConfig.analyses.color, strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6, stroke: chartConfig.analyses.color, strokeWidth: 2 }}
                                name={chartConfig.analyses.name}
                            />
                            <Line
                                type="monotone"
                                dataKey="projects"
                                stroke={chartConfig.projects.color}
                                strokeWidth={3}
                                dot={{ fill: chartConfig.projects.color, strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6, stroke: chartConfig.projects.color, strokeWidth: 2 }}
                                name={chartConfig.projects.name}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </Box>
            </CardBody>
        </Card>
    );
});

AnalysisChart.displayName = 'AnalysisChart';

export default AnalysisChart;
