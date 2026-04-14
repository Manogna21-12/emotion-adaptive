/*
 * React Query provider — optimized configuration, error boundaries, performance.
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryConfig } from '../hooks/useOptimizedQueries';

// Create optimized query client
const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        ...queryConfig.defaultOptions.queries,
        // Performance optimizations
        refetchOnWindowFocus: false, // Reduce unnecessary refetches
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors
          if (error?.response?.status >= 400 && error?.response?.status < 500) {
            return false;
          }
          return failureCount < 3;
        },
        // Network mode for better performance
        networkMode: 'online',
      },
      mutations: {
        ...queryConfig.defaultOptions.mutations,
        networkMode: 'online',
      },
    },
  });
};

let queryClientSingleton = null;

const getQueryClient = () => {
  if (!queryClientSingleton) {
    queryClientSingleton = createQueryClient();
  }
  return queryClientSingleton;
};

// Error boundary component
class QueryErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Query Error Boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-root-bg">
          <div className="text-center p-8 bg-glass-base border border-glass-border rounded-2xl">
            <h2 className="text-2xl font-bold text-red-500 mb-4">Something went wrong</h2>
            <p className="text-text-muted mb-6">
              There was an error loading the application data.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main Query Provider Component
export const QueryProvider = ({ children }) => {
  const queryClient = getQueryClient();

  // Performance monitoring
  React.useEffect(() => {
    // Monitor query performance
    const originalLog = console.log;
    console.log = (...args) => {
      if (args[0] === '✅ Fast Query:' || args[0] === '⚠️ Slow Query:') {
        // Track performance metrics
        const message = args.join(' ');
        const duration = parseFloat(message.match(/took ([\d.]+)ms/)?.[1]);
        
        if (duration) {
          // Send to analytics or monitoring service
          if (window.gtag) {
            window.gtag('event', 'query_performance', {
              custom_parameter: {
                duration: duration,
                query: message.match(/Query: ([\w_]+)/)?.[1],
                is_slow: duration > 100
              }
            });
          }
        }
      }
      originalLog(...args);
    };

    return () => {
      console.log = originalLog;
    };
  }, []);

  return (
    <QueryErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {children}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools
            initialIsOpen={false}
            position="bottom-right"
            buttonPosition="bottom-right"
          />
        )}
      </QueryClientProvider>
    </QueryErrorBoundary>
  );
};

// Hook to get query client
export const useQueryClientInstance = () => {
  return getQueryClient();
};

// Utility to clear all caches
export const clearAllCaches = () => {
  const client = getQueryClient();
  client.clear();
  // Also clear localStorage cache
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('cache_')) {
      localStorage.removeItem(key);
    }
  });
};

// Utility to prefetch critical data
export const prefetchCriticalData = (userId) => {
  const client = getQueryClient();
  
  // Prefetch dashboard data
  client.prefetchQuery({
    queryKey: ['dashboard', 'summary', userId],
    queryFn: () => import('../services/optimizedApi').then(api => api.optimizedApi.getDashboardSummary(userId)),
    staleTime: 60 * 1000,
  });
  
  client.prefetchQuery({
    queryKey: ['progress', userId],
    queryFn: () => import('../services/optimizedApi').then(api => api.optimizedApi.getProgress(userId)),
    staleTime: 60 * 1000,
  });
};

export default QueryProvider;
