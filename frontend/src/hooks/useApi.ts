import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import api from '../lib/api';
import type { ApiResponse } from '../types/api';

// Enhanced error handling interface
interface ApiError extends Error {
    status?: number;
    data?: unknown;
}

// Type guard for Axios errors
function isAxiosError(error: unknown): error is AxiosError {
    return typeof error === 'object' && error !== null && 'response' in error;
}

// Generic API query hook with improved error handling
export function useApiQuery<T>(
    queryKey: string[],
    url: string,
    options?: Omit<UseQueryOptions<ApiResponse<T>, ApiError>, 'queryKey' | 'queryFn'>
) {
    return useQuery<ApiResponse<T>, ApiError>({
        queryKey,
        queryFn: async () => {
            try {
                const response = await api.get<ApiResponse<T>>(url);
                return response.data;
            } catch (error: unknown) {
                let errorMessage = 'API request failed';
                let status: number | undefined;
                let data: unknown;
                
                if (isAxiosError(error)) {
                    errorMessage = error.message;
                    status = error.response?.status;
                    data = error.response?.data;
                    
                    // Try to extract message from response data
                    if (data && typeof data === 'object' && 'message' in data) {
                        errorMessage = (data as { message: string }).message;
                    }
                } else if (error instanceof Error) {
                    errorMessage = error.message;
                }
                
                const apiError: ApiError = new Error(errorMessage);
                apiError.status = status;
                apiError.data = data;
                throw apiError;
            }
        },
        retry: (failureCount, error) => {
            // Don't retry on 4xx errors, only on network/5xx errors
            if (error.status && error.status >= 400 && error.status < 500) {
                return false;
            }
            return failureCount < 2;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        ...options
    });
}

// Generic API mutation hook with cache invalidation
export function useApiMutation<T, V>(
    url: string,
    method: 'POST' | 'PUT' | 'DELETE' = 'POST',
    options?: Omit<UseMutationOptions<ApiResponse<T>, ApiError, V>, 'mutationFn'> & {
        invalidateQueries?: string[];
    }
) {
    const queryClient = useQueryClient();
    const { invalidateQueries, ...mutationOptions } = options || {};

    return useMutation<ApiResponse<T>, ApiError, V>({
        mutationFn: async (variables) => {
            try {
                const response = await api.request<ApiResponse<T>>({
                    method,
                    url,
                    data: variables,
                });
                return response.data;
            } catch (error: unknown) {
                let errorMessage = 'API mutation failed';
                let status: number | undefined;
                let data: unknown;
                
                if (isAxiosError(error)) {
                    errorMessage = error.message;
                    status = error.response?.status;
                    data = error.response?.data;
                    
                    // Try to extract message from response data
                    if (data && typeof data === 'object' && 'message' in data) {
                        errorMessage = (data as { message: string }).message;
                    }
                } else if (error instanceof Error) {
                    errorMessage = error.message;
                }
                
                const apiError: ApiError = new Error(errorMessage);
                apiError.status = status;
                apiError.data = data;
                throw apiError;
            }
        },
        onSuccess: (data, variables, context) => {
            // Invalidate specified queries on success
            if (invalidateQueries?.length) {
                invalidateQueries.forEach(queryKey => {
                    queryClient.invalidateQueries({ queryKey: [queryKey] });
                });
            }
            mutationOptions.onSuccess?.(data, variables, context);
        },
        ...mutationOptions
    });
}

// Specialized update mutation hook
export function useApiUpdate<T, V>(
    url: string,
    options?: Omit<UseMutationOptions<ApiResponse<T>, ApiError, V>, 'mutationFn'> & {
        invalidateQueries?: string[];
    }
) {
    return useApiMutation<T, V>(url, 'PUT', options);
}

// Specialized delete mutation hook
export function useApiDelete<T>(
    url: string,
    options?: Omit<UseMutationOptions<ApiResponse<T>, ApiError, void>, 'mutationFn'> & {
        invalidateQueries?: string[];
    }
) {
    return useApiMutation<T, void>(url, 'DELETE', options);
} 