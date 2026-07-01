/// <reference types="vitest/config" />

import path from 'path';
import checker from 'vite-plugin-checker';
import { loadEnv, defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import cspPlugin from './vite-plugin-csp';

// ----------------------------------------------------------------------

const PORT = 8081;

const isTest = process.env.VITEST === 'true';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  if (!isTest) {
    console.log(`🚀 Building for ${mode} environment`);
  }

  return {
    // base: env.VITE_BASE_PATH,
    plugins: [
      react(),
      ...(isTest
        ? []
        : [
          checker({
            typescript: true,
            eslint: {
              lintCommand: 'eslint "./src/**/*.{js,jsx,ts,tsx}"',
            },
            overlay: {
              position: 'tl',
              initialIsOpen: false,
            },
          }),
          cspPlugin(mode),
        ]),
    ],
    resolve: {
      dedupe: [
        'react',
        'react-dom',
        '@emotion/react',
        '@emotion/styled',
        'react-router',
        'react-router-dom',
      ],
      alias: [
        {
          find: /^~(.+)/,
          replacement: path.join(process.cwd(), 'node_modules/$1'),
        },
        {
          find: /^src(.+)/,
          replacement: path.join(process.cwd(), 'src/$1'),
        },
      ],
    },
    server: {
      port: PORT,
      host: true,
    },
    preview: {
      port: PORT,
      host: true,
    },
    // Build configuration
    build: {
      outDir: `dist`,
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            mui: ['@mui/material', '@mui/icons-material'],
            redux: ['@reduxjs/toolkit', 'react-redux'],
          },
        },
      },
    },
    // Define global constants
    define: {
      __APP_ENV__: JSON.stringify(env.VITE_APP_ENV),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    test: {
      name: 'puravankara-portal',
      globals: false,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      css: true,
      restoreMocks: true,
      clearMocks: true,
      coverage: {
        provider: 'v8',
        /** Only files touched by the test run; faster than reporting on the whole tree. */
        all: false,
        reporter: ['text', 'text-summary', 'lcov'],
        reportsDirectory: './coverage',
        exclude: [
          'node_modules/**',
          'src/test/**',
          '**/*.d.ts',
          '**/*.{test,spec}.{ts,tsx}',
          '**/types/**',
        ],
      },
    },
  };
});
