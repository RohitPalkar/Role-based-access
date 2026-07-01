# Puravankara Portal

> A comprehensive real estate management portal for Puravankara Projects, built with React, TypeScript, and modern web technologies.

## 🏢 About

Puravankara Portal is a web application designed for managing real estate operations including:

- **EOI (Expression of Interest) Management** - Handle customer expressions of interest
- **Voucher & Booking Form Management** - Streamline booking processes
- **Multi-Role Dashboard System** - Role-based access and permissions
- **Customer Relationship Management** - Track leads and customer interactions
- **Finance Administration** - Payment tracking and financial operations
- **Sales Team Management** - Tools for sales teams across different levels

## 🚀 Features

### Core Features
- 📊 **Multi-Dashboard System** - Different dashboards for various user roles

- 📱 **Responsive Design** - Works seamlessly across devices
- 🔐 **Secure Authentication** - JWT-based authentication with SSO support
- 📈 **Real-time Updates** - WebSocket integration for live updates
- 📋 **Dynamic Form Management** - Advanced form handling and validation

### User Roles Supported
- **Super User (BI Team)** - Full administrative access
- **RM (Relationship Manager)** - Customer relationship management
- **Finance Admin** - Financial operations and tracking
- **Sales Team Hierarchy** (TL, RSH, BH) - Sales management at different levels
- **Channel Partners** - External partner management
- **Pre-Sales Team** - Lead qualification and management
- **GRE Team** - Guest Relation Executive team
- **Backend Checker** - Data verification and quality control

### Technical Features
- **Material-UI Components** - Professional UI/UX design
- **Advanced Data Grids** - Efficient data management with filtering and sorting
- **File Upload & Management** - Document handling with cloud storage
- **Real-time Notifications** - Instant updates and alerts
- **Multi-language Support** - Internationalization ready
- **Export Capabilities** - Data export in multiple formats
- **Advanced Search & Filtering** - Powerful search functionality

## 🛠️ Tech Stack

### Frontend
- **React 18.3** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and development server
- **Material-UI (MUI)** - React component library
- **Redux Toolkit** - State management
- **React Hook Form** - Efficient form handling
- **React Router** - Client-side routing

### Development Tools
- **ESLint + Prettier** - Code quality and formatting
- **TypeScript** - Static type checking
- **Vite** - Lightning-fast builds

### External Services
- **Puravankara API** - Backend integration
- **AWS S3/CloudFront** - File storage and CDN
- **Google Maps API** - Location services
- **WebSocket** - Real-time communication

## 📋 Prerequisites

Before running this project, make sure you have:

- **Node.js 20.x** (Recommended LTS version)
- **Yarn** (Recommended) or **npm**
- **Modern browser** with ES2020+ support

## 🚀 Quick Start

### Installation

**Using Yarn (Recommended)**
```bash
# Clone the repository
git clone <repository-url>
cd puravankara-portal

# Install dependencies
yarn install

# Start development server
yarn dev
```

**Using NPM**
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Development Server
The application will be available at `http://localhost:5173`

### Environment Setup
1. Copy the environment file and configure:
   ```bash
   cp .env.example .env
   ```
2. Update the `.env` file with your configuration values

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `yarn dev` | Start development server |
| `yarn build` | Build for production |
| `yarn start` | Preview production build |
| `yarn lint` | Run ESLint |
| `yarn lint:fix` | Fix ESLint issues |
| `yarn fm:check` | Check code formatting |
| `yarn fm:fix` | Fix code formatting |
| `yarn dev:host` | Start dev server with network access |

### Maintenance Scripts
| Script | Description |
|--------|-------------|
| `yarn rm:all` | Clean all build artifacts and dependencies |
| `yarn re:start` | Clean install and restart development |
| `yarn re:build` | Clean install and build for production |

## 🏗️ Project Structure

```
src/
├── assets/           # Static assets (images, icons, etc.)
├── auth/             # Authentication logic and guards
├── components/       # Reusable UI components
├── config/           # Configuration files
├── hooks/            # Custom React hooks
├── layouts/          # Page layouts and navigation
├── pages/            # Page components
├── redux/            # State management (Redux)
├── routes/           # Routing configuration
├── sections/         # Feature-specific components
├── services/         # API services and utilities
├── theme/            # UI theme and styling
├── types/            # TypeScript type definitions
└── utils/            # Utility functions and constants
```

## 🔑 Environment Variables

Key environment variables you need to configure:

```env
# API Configuration
VITE_SERVER_URL=https://dev-api.puravankaraprojects.com/api/dev
VITE_ASSET_URL=https://dev-api.puravankaraprojects.com/api/dev

# Frontend URLs
VITE_BOOKING_FORM_URL=https://dev.puravankaraprojects.com/booking-form
VITE_REFERRAL_FORM_URL=https://dev.puravankaraprojects.com/referral-form

# External Services
VITE_S3_BASE_URL=https://d1ctb0vs5bv9pb.cloudfront.net/puravankara
REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# WebSocket
VITE_WEB_SOCKET_URL=wss://dev-ws.puravankaraprojects.com/notification_event
```

## 🎯 Key Features in Detail

### Role-Based Permissions
The application implements a sophisticated role-based permission system:
- **Dynamic UI Elements** - Components show/hide based on user roles
- **API Access Control** - Backend validates permissions
- **Granular Permissions** - Column visibility, actions, and data access
- **Conditional Actions** - Actions available based on data state

### EOI Management System
Comprehensive Expression of Interest tracking:
- **Multi-Stage Forms** - Progressive form filling
- **Status Tracking** - Complete lifecycle management
- **Document Management** - File uploads and verification

### Dashboard System
Role-specific dashboards with:
- **Real-time Analytics** - Live data updates
- **Custom Widgets** - Role-relevant information
- **Interactive Charts** - Data visualization
- **Quick Actions** - Common task shortcuts

## 🔐 Authentication & Security

- **JWT Authentication** - Secure token-based auth
- **SSO Integration** - Single sign-on support
- **Role-based Access** - Granular permission system
- **Secure API Communication** - HTTPS and token validation
- **Session Management** - Automatic token refresh

## 🚀 Deployment

### Production Build
```bash
# Create production build
yarn build

# Preview production build locally
yarn start
```

### Deployment Platforms
The application is configured for deployment on:
- **Vercel** (Primary)
- **Netlify**
- **AWS S3 + CloudFront**
- **Traditional hosting** (with static files)

## 🧪 Testing

### Running Tests
```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Generate coverage report
yarn test:coverage
```

### Test Structure
```
src/
├── components/__tests__/
├── hooks/__tests__/
├── services/__tests__/
└── utils/__tests__/
```

## 🤝 Contributing

### Development Workflow
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Standards
- **TypeScript** - All new code must be typed
- **ESLint** - Follow the established linting rules
- **Prettier** - Code formatting is enforced
- **Component Structure** - Follow the established patterns

### Commit Convention
We follow conventional commits:
```
feat: add new dashboard widget
fix: resolve authentication issue
docs: update API documentation
style: format code according to standards
refactor: restructure component hierarchy
test: add unit tests for utility functions
```

## 📚 Documentation

Additional documentation available in `/src/docs/`:
- [Role-Based Permissions](src/docs/ROLE_BASED_PERMISSIONS.md)
- [Status Constants Refactor](src/docs/status-constants-refactor.md)
- [Permission Improvements](src/docs/role-permissions-improvements.md)

## 🐛 Troubleshooting

### Common Issues

**Node Version Issues**
```bash
# Use Node 20.x
nvm use 20
# or
nvm install 20 && nvm use 20
```

**Dependency Issues**
```bash
# Clear cache and reinstall
yarn rm:all
yarn install
```

**Build Issues**
```bash
# Clean build
rm -rf dist
yarn build
```

### Getting Help
- **Documentation** - Check the `/src/docs/` directory
- **Code Comments** - Inline documentation in components
- **Console Logs** - Development mode provides debugging info

## 📄 License

This project is proprietary software developed for Puravankara Projects.

## 👥 Team

**Development Team**
- Frontend Development
- Backend Integration
- UI/UX Design
- Quality Assurance

**Business Team**
- Product Management
- Business Analysis
- User Experience
- Testing & Validation

---

