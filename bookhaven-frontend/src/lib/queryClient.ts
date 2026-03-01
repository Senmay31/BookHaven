import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,       // 5 minutes — data is "fresh" for 5 min
      gcTime: 1000 * 60 * 10,          // 10 minutes — keep unused data in memory
      refetchOnWindowFocus: false,     // Don't refetch when user tabs back
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors — those are user/auth errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
