# Nexus Retail Manager

## Overview

Nexus Retail Manager is a production-ready web application for retailers to manage the complete order lifecycle and perform business analysis. The system provides order management with status workflows (draft → confirmed → packed → shipped → delivered → cancelled), product and customer CRUD operations, inventory tracking, and analytics dashboards with KPIs.

The application uses a dual-backend architecture with a Python FastAPI backend for the primary API and a Node.js/Express server for serving the React frontend and handling session management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, bundled using Vite
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **Charts**: Recharts for analytics visualizations
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Primary API**: Python FastAPI with modular router structure
  - Authentication via JWT tokens with OAuth2 password flow
  - Routers for: auth, products, customers, orders, analytics
  - Pydantic schemas for request/response validation
- **Secondary Server**: Node.js with Express (for serving frontend and potential session handling)
- **API Documentation**: FastAPI auto-generates Swagger docs at `/docs`

### Data Storage
- **Database**: PostgreSQL
- **ORM Options**: 
  - Python side: SQLAlchemy with declarative models
  - Node.js side: Drizzle ORM with schema defined in `shared/schema.ts`
- **Schema Migrations**: Drizzle Kit for database migrations (`drizzle-kit push`)

### Authentication
- JWT-based authentication with bcrypt password hashing
- Token stored in localStorage on the client
- Protected routes require Bearer token in Authorization header

### Project Structure
```
├── backend/           # Python FastAPI application
│   ├── db/           # Database connection and session
│   ├── models/       # SQLAlchemy models
│   └── routers/      # API route handlers
├── client/           # React frontend application
│   └── src/
│       ├── components/   # UI components
│       ├── hooks/        # Custom React hooks
│       ├── pages/        # Page components
│       └── lib/          # Utilities
├── server/           # Node.js Express server
├── shared/           # Shared types and schemas
│   ├── schema.ts     # Drizzle database schema
│   └── routes.ts     # API route definitions with Zod
└── migrations/       # Database migration files
```

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable

### Authentication
- **jose**: JWT token encoding/decoding (Python backend)
- **passlib**: Password hashing with bcrypt

### Frontend Libraries
- **@tanstack/react-query**: Data fetching and caching
- **recharts**: Dashboard analytics charts
- **date-fns**: Date formatting
- **wouter**: Lightweight routing
- **react-hook-form**: Form state management
- **zod**: Schema validation

### Backend Libraries (Python)
- **FastAPI**: Web framework
- **SQLAlchemy**: Database ORM
- **Pydantic**: Data validation
- **python-jose**: JWT handling
- **passlib**: Password hashing

### Backend Libraries (Node.js)
- **express**: Web server framework
- **drizzle-orm**: Database ORM
- **connect-pg-simple**: PostgreSQL session store

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret key for JWT/session signing