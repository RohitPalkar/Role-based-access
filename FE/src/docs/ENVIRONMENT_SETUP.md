# Environment Configuration Guide

This project supports multiple environment configurations for development, staging, and production deployments.

## Environment Files

### Available Environment Files

- `.env.development` - Development environment configuration
- `.env.staging` - Staging environment configuration  
- `.env.production` - Production environment configuration
- `.env.local` - Local development overrides (not committed to git)
- `.env` - Default fallback environment file

### Environment Variables

All environment variables must be prefixed with `VITE_` to be available in the client-side code (Vite requirement).

#### Core Application Variables

- `VITE_APP_ENV` - Current environment (development/staging/production/local)
- `VITE_SERVER_URL` - Backend API base URL
- `VITE_ASSET_URL` - Assets base URL
- `VITE_S3_BASE_URL` - S3/CloudFront base URL for static assets

#### Authentication & External Services

- `VITE_LOGIN_URL` - SSO login endpoint
- `REACT_APP_GOOGLE_MAPS_API_KEY` - Google Maps API key
- `VITE_WEB_SOCKET_URL` - WebSocket connection URL

#### Form URLs

- `VITE_BOOKING_FORM_URL` - Default booking form URL
- `VITE_PURVALAND_BOOKING_FORM_URL` - Purvaland specific booking form
- `VITE_PROVIDENT_BOOKING_FORM_URL` - Provident Housing booking form
- `VITE_REFERRAL_FORM_URL` - Referral form URL

## Development Commands

### Development Server

```bash
# Start development server with development environment
npm run dev

# Start development server with staging environment  
npm run dev:stage

# Start development server with host access
npm run dev:host
```

### Building for Different Environments

```bash
# Build for production (default)
npm run build

# Build for development
npm run build:dev

# Build for staging
npm run build:stage

# Build for production (explicit)
npm run build:prod
```

### Preview Built Applications

```bash
# Preview development build
npm run preview:dev

# Preview staging build
npm run preview:stage

# Preview production build
npm run preview:prod
```

## Build Output

Each environment builds to its own directory:

- `dist/development/` - Development build
- `dist/staging/` - Staging build  
- `dist/production/` - Production build

## Environment-Specific Features

### Development & Local
- Source maps enabled
- Debug logging enabled
- Environment validation with warnings
- Hot module replacement

### Staging
- Source maps enabled
- Limited logging
- Environment validation with warnings
- Staging-specific API endpoints

### Production
- Source maps disabled
- Minimal logging (errors only)
- Strict environment validation
- Optimized builds with code splitting
- Production API endpoints

## Setting Up New Environment

1. Create a new `.env.[environment]` file
2. Copy variables from existing environment file
3. Update URLs and configuration for the new environment
4. Add build script in `package.json`:
   ```json
   "build:[env]": "tsc && vite build --mode [environment]"
   ```

## Local Development Setup

1. Copy `.env.local.example` to `.env.local` (if exists)
2. Or create `.env.local` with local overrides:
   ```bash
   VITE_APP_ENV=local
   VITE_SERVER_URL=http://localhost:3001/api
   # Add your local API keys here
   ```

## Environment Utilities

The project includes environment utilities at `src/utils/env.ts`:

```typescript
import { isDevelopment, isStaging, isProduction, logger, getEnvConfig } from 'src/utils/env';

// Environment checks
if (isDevelopment) {
  logger.debug('Running in development mode');
}

// Get current environment config
const config = getEnvConfig();
console.log('Current environment:', config.env);
```

## Security Notes

- Never commit sensitive API keys to version control
- Use `.env.local` for local development secrets
- Production environment variables should be set in your deployment environment
- All environment files except `.env.local` are tracked in git

## Troubleshooting

### Environment Variables Not Loading

1. Ensure variables are prefixed with `VITE_`
2. Restart development server after changing environment files
3. Check that the correct environment file exists
4. Verify the build command is using the correct `--mode` flag

### Build Issues

1. Run `npm run type-check` to verify TypeScript issues
2. Clear build cache: `npm run rm:all && npm install`
3. Check for missing environment variables with `validateEnv()`

### Common Issues

- **CORS errors**: Check `VITE_SERVER_URL` matches your backend
- **Asset loading**: Verify `VITE_ASSET_URL` and `VITE_S3_BASE_URL`
- **WebSocket connection**: Ensure `VITE_WEB_SOCKET_URL` is correct for environment

## Deployment

### Development Deployment
```bash
npm run build:dev
# Deploy dist/development/ folder
```

### Staging Deployment  
```bash
npm run build:stage
# Deploy dist/staging/ folder
```

### Production Deployment
```bash
npm run build:prod
# Deploy dist/production/ folder
```

Each environment creates an optimized build with environment-specific configurations and outputs to separate directories for easy deployment management.