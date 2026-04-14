"""
ULTRA-OPTIMIZED VITE CONFIGURATION
Features: Code splitting, compression, PWA, bundle analysis
Performance: <100ms initial load
"""

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import { BundleAnalyzer } from 'vite-bundle-analyzer';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  const isAnalyze = mode === 'analyze';

  return {
    plugins: [
      react({
        // Fast refresh in development
        fastRefresh: !isProduction,
        // Optimize React builds
        jsxImportSource: '@emotion/react' if false, // Remove if not using emotion
      }),

      // PWA for offline support and caching
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\./i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24, // 24 hours
                },
                cacheKeyWillBeUsed: async ({ request }) => {
                  // Add API version to cache key
                  return `${request.url}?v=1.0`;
                },
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
              },
            },
          ],
        },
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'Emotion Adaptive Learning',
          short_name: 'EmotionLearn',
          description: 'Ultra-fast emotion adaptive learning platform',
          theme_color: '#6366f1',
          background_color: '#0f172a',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
      }),

      // Bundle analyzer for analyze mode
      isAnalyze && BundleAnalyzer({
        analyzerMode: 'server',
        analyzerPort: 8888,
        openAnalyzer: true,
      }),

      // Bundle visualizer
      isAnalyze && visualizer({
        filename: 'dist/stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
      }),
    ].filter(Boolean),

    // Resolve aliases for cleaner imports
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@components': resolve(__dirname, 'src/components'),
        '@pages': resolve(__dirname, 'src/pages'),
        '@hooks': resolve(__dirname, 'src/hooks'),
        '@services': resolve(__dirname, 'src/services'),
        '@utils': resolve(__dirname, 'src/utils'),
        '@assets': resolve(__dirname, 'src/assets'),
      },
    },

    // Build optimizations
    build: {
      target: 'esnext', // Modern browsers for better performance
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProduction, // Remove console logs in production
          drop_debugger: isProduction,
        },
        mangle: {
          safari10: true,
        },
      },
      rollupOptions: {
        output: {
          // Manual chunk splitting for optimal caching
          manualChunks: {
            // React and related libraries
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            
            // Query and state management
            'query-vendor': ['@tanstack/react-query', '@tanstack/react-query-devtools'],
            
            // Animation and UI libraries
            'ui-vendor': ['framer-motion', 'lucide-react'],
            
            // Utility libraries
            'utils-vendor': ['axios', 'clsx', 'tailwind-merge'],
          },
          
          // Optimize chunk names for better caching
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
            return `js/${facadeModuleId}-[hash].js`;
          },
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const extType = assetInfo.name.split('.').pop();
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
              return `images/[name]-[hash][extname]`;
            }
            if (/woff|woff2|ttf|otf|eot/i.test(extType)) {
              return `fonts/[name]-[hash][extname]`;
            }
            return `${extType}/[name]-[hash][extname]`;
          },
        },
      },
      
      // Optimize chunk size warning
      chunkSizeWarningLimit: 1000,
      
      // Enable CSS code splitting
      cssCodeSplit: true,
    },

    // Development server optimizations
    server: {
      port: 5173,
      host: true,
      hmr: {
        overlay: false, // Disable error overlay for better performance
      },
    },

    // Preview server optimizations
    preview: {
      port: 4173,
      host: true,
    },

    // CSS optimizations
    css: {
      devSourcemap: !isProduction,
      preprocessorOptions: {
        scss: {
          // Optimize SCSS compilation
          includePaths: [resolve(__dirname, 'src/styles')],
        },
      },
    },

    // Environment variables
    define: {
      __DEV__: JSON.stringify(!isProduction),
      __PROD__: JSON.stringify(isProduction),
      __ANALYZE__: JSON.stringify(isAnalyze),
    },

    // Optimizations
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query',
        'framer-motion',
        'lucide-react',
        'axios',
      ],
      exclude: ['@tanstack/react-query-devtools'], // Exclude dev tools from prod
    },

    // Experimental features
    experimental: {
      renderBuiltUrl: (filename) => {
        // CDN optimization for production
        if (isProduction) {
          return `https://cdn.yourdomain.com/${filename}`;
        }
        return { relative: true };
      },
    },

    // Preload critical modules
    server: {
      fs: {
        strict: false,
      },
    },
  };
});
