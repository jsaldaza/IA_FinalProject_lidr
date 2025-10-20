interface PaginatedResponse<T> {
    items: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export function createPaginatedResponse<T>(
    items: T[],
    total: number,
    page: number,
    limit: number
): PaginatedResponse<T> {
    return {
        items,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
} 