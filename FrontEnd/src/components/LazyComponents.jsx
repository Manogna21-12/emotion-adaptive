/*
 * Lazy-loaded route chunks — code splitting and loading states.
 */
import React, { Suspense, lazy } from 'react';
import { motion } from 'framer-motion';

// Loading component for lazy loaded components
const LazyLoader = ({ message = "Loading..." }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="min-h-[400px] flex items-center justify-center"
  >
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-glass-border border-t-brand-500 rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-text-muted">{message}</p>
    </div>
  </motion.div>
);

// Lazy loaded components with loading states
export const LazyStudentDashboard = lazy(() => 
  import('../pages/StudentDashboard').then(module => ({
    default: module.default
  }))
);

export const LazyAdminDashboard = lazy(() => 
  import('../pages/AdminDashboard').then(module => ({
    default: module.default
  }))
);

export const LazyReports = lazy(() => 
  import('../pages/Reports').then(module => ({
    default: module.default
  }))
);

export const LazyProgress = lazy(() => 
  import('../pages/Progress').then(module => ({
    default: module.default
  }))
);

export const LazyProfile = lazy(() => 
  import('../pages/Profile').then(module => ({
    default: module.default
  }))
);

export const LazyCoursesPage = lazy(() => 
  import('../pages/CoursesPage').then(module => ({
    default: module.default
  }))
);

export const LazyModulesPage = lazy(() => 
  import('../pages/ModulesPage').then(module => ({
    default: module.default
  }))
);

export const LazyLessonsPage = lazy(() => 
  import('../pages/LessonsPage').then(module => ({
    default: module.default
  }))
);

export const LazyLessonView = lazy(() => 
  import('../pages/LessonView').then(module => ({
    default: module.default
  }))
);

export const LazyVideoPlayerPage = lazy(() => 
  import('../pages/VideoPlayerPage').then(module => ({
    default: module.default
  }))
);

// Wrapper component for lazy loading with suspense
export const LazyWrapper = ({ children, fallback }) => (
  <Suspense fallback={fallback || <LazyLoader />}>
    {children}
  </Suspense>
);

// Preload function for critical components
export const preloadCriticalComponents = () => {
  // Preload dashboard components
  import('../pages/StudentDashboard');
  import('../pages/Reports');
  import('../pages/Progress');
};

// Intersection Observer for lazy loading
export const useIntersectionObserver = (ref, options = {}) => {
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  React.useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [ref, options]);

  return isIntersecting;
};

// Lazy image component
export const LazyImage = ({ src, alt, className, ...props }) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const imgRef = React.useRef();

  const isInView = useIntersectionObserver(imgRef, {
    threshold: 0.1,
    triggerOnce: true
  });

  React.useEffect(() => {
    if (isInView && !isLoaded) {
      const img = new Image();
      img.onload = () => setIsLoaded(true);
      img.src = src;
    }
  }, [isInView, isLoaded, src]);

  return (
    <div ref={imgRef} className={`relative ${className}`} {...props}>
      {isInView && (
        <motion.img
          src={src}
          alt={alt}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          className={`w-full h-full object-cover ${className}`}
        />
      )}
      {!isLoaded && (
        <div className="absolute inset-0 bg-glass-hover animate-pulse" />
      )}
    </div>
  );
};

// Lazy chart component
export const LazyChart = ({ type, data, options, ...props }) => {
  const chartRef = React.useRef();

  const isInView = useIntersectionObserver(chartRef, {
    threshold: 0.1,
    triggerOnce: true
  });

  React.useEffect(() => {
    if (isInView) {
      // Dynamically import chart library and render chart
      import('../components/Charts').then(({ renderChart }) => {
        renderChart(chartRef.current, type, data, options);
      });
    }
  }, [isInView, type, data, options]);

  return (
    <div ref={chartRef} className="w-full h-full" {...props}>
      {!isInView && (
        <div className="w-full h-full bg-glass-hover animate-pulse rounded-lg" />
      )}
    </div>
  );
};

// Lazy table component for large datasets
export const LazyTable = ({ data, columns, pageSize = 50, ...props }) => {
  const [visibleData, setVisibleData] = React.useState([]);
  const [currentPage, setCurrentPage] = React.useState(0);
  const tableRef = React.useRef();

  const isInView = useIntersectionObserver(tableRef, {
    threshold: 0.1,
    triggerOnce: true
  });

  React.useEffect(() => {
    if (isInView) {
      // Load first page of data
      const startIndex = currentPage * pageSize;
      const endIndex = startIndex + pageSize;
      setVisibleData(data.slice(startIndex, endIndex));
    }
  }, [isInView, currentPage, pageSize, data]);

  const loadMore = React.useCallback(() => {
    const nextPage = currentPage + 1;
    const startIndex = nextPage * pageSize;
    const endIndex = startIndex + pageSize;
    const nextData = data.slice(startIndex, endIndex);
    
    if (nextData.length > 0) {
      setVisibleData(prev => [...prev, ...nextData]);
      setCurrentPage(nextPage);
    }
  }, [currentPage, pageSize, data]);

  return (
    <div ref={tableRef} className="w-full" {...props}>
      {isInView && (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-glass-border">
                  {columns.map((column, index) => (
                    <th key={index} className="text-left p-4 text-text-muted">
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleData.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-glass-border/50">
                    {columns.map((column, colIndex) => (
                      <td key={colIndex} className="p-4 text-root-fg">
                        {column.accessor(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {visibleData.length < data.length && (
            <button
              onClick={loadMore}
              className="w-full py-2 bg-glass-base border border-glass-border rounded-lg hover:bg-glass-hover transition-colors"
            >
              Load More ({data.length - visibleData.length} remaining)
            </button>
          )}
        </div>
      )}
      
      {!isInView && (
        <div className="w-full h-64 bg-glass-hover animate-pulse rounded-lg" />
      )}
    </div>
  );
};

export default LazyLoader;
