/*
ULTRA-OPTIMIZED REACT QUERY HOOKS
Features: Stale-while-revalidate, optimistic updates, background fetching
Performance: <100ms perceived latency
*/

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { optimizedApi, apiKeys, localStorageCache, optimisticUpdates } from "../services/optimizedApi";

// React Query configuration
export const queryConfig = {
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      cacheTime: 5 * 60 * 1000, // 5 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      keepPreviousData: true,
    },
    mutations: {
      retry: 1,
    },
  },
};

// Optimized hooks for dashboard data
export const useDashboardSummary = (userId) => {
  const queryKey = apiKeys.dashboardSummary(userId);
  
  return useQuery({
    queryKey,
    queryFn: () => optimizedApi.getDashboardSummary(userId),
    staleTime: 60 * 1000, // 1 minute
    cacheTime: 5 * 60 * 1000, // 5 minutes
    initialData: () => {
      // Return cached data for instant load
      return localStorageCache.get(`cache_dashboard_summary_${userId}`);
    },
    onSuccess: (data) => {
      // Cache successful response
      localStorageCache.set(`cache_dashboard_summary_${userId}`, data);
    },
    onError: (error) => {
      console.error("Dashboard summary error:", error);
    },
  });
};

export const useDashboardEmotions = (userId) => {
  const queryKey = apiKeys.dashboardEmotions(userId);
  
  return useQuery({
    queryKey,
    queryFn: () => optimizedApi.getDashboardEmotions(userId),
    staleTime: 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    initialData: () => {
      return localStorageCache.get(`cache_dashboard_emotions_${userId}`);
    },
    onSuccess: (data) => {
      localStorageCache.set(`cache_dashboard_emotions_${userId}`, data);
    },
  });
};

export const useDashboardTimeline = (userId) => {
  const queryKey = apiKeys.dashboardTimeline(userId);
  
  return useQuery({
    queryKey,
    queryFn: () => optimizedApi.getDashboardTimeline(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    initialData: () => {
      return localStorageCache.get(`cache_dashboard_timeline_${userId}`);
    },
    onSuccess: (data) => {
      localStorageCache.set(`cache_dashboard_timeline_${userId}`, data);
    },
  });
};

// Optimized progress hook
export const useProgress = (userId) => {
  const queryKey = apiKeys.progress(userId);
  
  return useQuery({
    queryKey,
    queryFn: () => optimizedApi.getProgress(userId),
    staleTime: 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    initialData: () => {
      return localStorageCache.get(`cache_progress_${userId}`);
    },
    onSuccess: (data) => {
      localStorageCache.set(`cache_progress_${userId}`, data);
    },
  });
};

// Optimized Smart Reader hooks will be added here if needed


// Batch data hook for instant dashboard loading
export const useBatchDashboardData = (userId) => {
  const queryKey = ["batch", "dashboard", userId];
  
  return useQuery({
    queryKey,
    queryFn: () => optimizedApi.getBatchDashboardData(userId),
    staleTime: 30 * 1000,
    cacheTime: 5 * 60 * 1000,
    initialData: () => {
      // Return cached batch data or construct from individual caches
      const summary = localStorageCache.get(`cache_dashboard_summary_${userId}`);
      const emotions = localStorageCache.get(`cache_dashboard_emotions_${userId}`);
      const progress = localStorageCache.get(`cache_progress_${userId}`);
      const reports = localStorageCache.get(`cache_reports_summary_${userId}`);
      
      if (summary || emotions || progress || reports) {
        return [summary, emotions, progress, reports];
      }
      return null;
    },
    onSuccess: (data) => {
      // Cache individual components
      if (data[0]) localStorageCache.set(`cache_dashboard_summary_${userId}`, data[0]);
      if (data[1]) localStorageCache.set(`cache_dashboard_emotions_${userId}`, data[1]);
      if (data[2]) localStorageCache.set(`cache_progress_${userId}`, data[2]);
    },
  });
};

// Optimistic update mutations
export const useUpdateDashboardData = (userId) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (newData) => {
      // Optimistic update - update cache instantly
      const updatedData = optimisticUpdates.updateDashboardData(userId, newData);
      
      // Update React Query cache
      queryClient.setQueryData(apiKeys.dashboardSummary(userId), updatedData);
      
      return Promise.resolve(updatedData);
    },
    onSuccess: (data) => {
      // Invalidate related queries to refetch fresh data
      queryClient.invalidateQueries(apiKeys.dashboard(userId));
    },
  });
};

export const useUpdateProgressData = (userId) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (newProgress) => {
      // Optimistic update
      const updatedData = optimisticUpdates.updateProgressData(userId, newProgress);
      
      // Update React Query cache
      queryClient.setQueryData(apiKeys.progress(userId), updatedData);
      
      return Promise.resolve(updatedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(apiKeys.progress(userId));
    },
  });
};

// Prefetch hook for background data loading
export const usePrefetchData = () => {
  const queryClient = useQueryClient();
  
  const prefetchDashboardData = useCallback((userId) => {
    // Prefetch all dashboard data in background
    queryClient.prefetchQuery({
      queryKey: apiKeys.dashboardSummary(userId),
      queryFn: () => optimizedApi.getDashboardSummary(userId),
      staleTime: 60 * 1000,
    });
    
    queryClient.prefetchQuery({
      queryKey: apiKeys.dashboardEmotions(userId),
      queryFn: () => optimizedApi.getDashboardEmotions(userId),
      staleTime: 60 * 1000,
    });
    
    queryClient.prefetchQuery({
      queryKey: apiKeys.progress(userId),
      queryFn: () => optimizedApi.getProgress(userId),
      staleTime: 60 * 1000,
    });
  }, [queryClient]);
  
  const prefetchReportsData = useCallback((userId) => {
    // Reports prefetch removed - using Smart Reader instead
  }, []);
  
  return {
    prefetchDashboardData,
    prefetchReportsData,
  };
};

// Combined hook for all dashboard data
export const useAllDashboardData = (userId) => {
  const summary = useDashboardSummary(userId);
  const emotions = useDashboardEmotions(userId);
  const timeline = useDashboardTimeline(userId);
  const progress = useProgress(userId);
  
  const isLoading = summary.isLoading || emotions.isLoading || progress.isLoading;
  const isError = summary.isError || emotions.isError || progress.isError;
  const error = summary.error || emotions.error || progress.error;
  
  const data = useMemo(() => ({
    summary: summary.data,
    emotions: emotions.data,
    timeline: timeline.data,
    progress: progress.data,
  }), [summary.data, emotions.data, timeline.data, progress.data]);
  
  return {
    data,
    isLoading,
    isError,
    error,
    refetch: () => {
      summary.refetch();
      emotions.refetch();
      timeline.refetch();
      progress.refetch();
    },
  };
};

// Performance monitoring hook
export const usePerformanceMonitor = () => {
  const measureQueryPerformance = useCallback((queryName, queryFn) => {
    return async (...args) => {
      const start = performance.now();
      try {
        const result = await queryFn(...args);
        const end = performance.now();
        const duration = end - start;
        
        if (duration > 100) {
          console.warn(`⚠️ Slow Query: ${queryName} took ${duration.toFixed(2)}ms`);
        } else {
          console.log(`✅ Fast Query: ${queryName} took ${duration.toFixed(2)}ms`);
        }
        
        return result;
      } catch (error) {
        const end = performance.now();
        const duration = end - start;
        console.error(`❌ Query Error: ${queryName} failed after ${duration.toFixed(2)}ms`, error);
        throw error;
      }
    };
  }, []);
  
  return { measureQueryPerformance };
};
