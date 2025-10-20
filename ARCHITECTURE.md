# TestForge AI - Architecture Overview

## 🏗️ System Architecture

TestForge AI is a fullstack testing platform with conversational AI capabilities, built with modern web technologies.

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (PostgreSQL)  │
│                 │    │                 │    │                 │
│ - SPA           │    │ - REST API      │    │ - Prisma ORM    │
│ - TypeScript    │    │ - TypeScript    │    │ - Redis Cache   │
│ - Chakra UI     │    │ - Express       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   AI Services   │
                       │   (OpenAI)      │
                       └─────────────────┘
```

## 🗂️ Project Structure

```
testforge/
├── testforge-frontend/          # React SPA
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API service layer
│   │   ├── stores/            # Zustand state management
│   │   ├── types/             # TypeScript type definitions
│   │   └── utils/             # Utility functions
│   ├── package.json
│   └── vite.config.ts
├── testforge-backend/           # Node.js API server
│   ├── src/
│   │   ├── controllers/       # Request handlers
│   │   ├── routes/            # API route definitions
│   │   ├── services/          # Business logic
│   │   ├── middleware/        # Express middleware
│   │   ├── utils/             # Utility functions
│   │   ├── types/             # TypeScript types
│   │   └── validations/       # Input validation schemas
│   ├── prisma/                # Database schema & migrations
│   ├── package.json
│   └── tsconfig.json
├── docs/                       # Documentation
├── scripts/                    # Build & deployment scripts
└── .github/workflows/          # CI/CD pipelines
```

## 🔧 Technology Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Chakra UI
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Routing**: React Router
- **Charts**: Recharts
- **Icons**: Tabler Icons

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Cache**: Redis
- **Authentication**: JWT
- **Validation**: Joi + Zod
- **Logging**: Winston
- **Security**: Helmet, CORS, Rate Limiting

### AI Integration
- **Provider**: OpenAI API
- **Features**: Conversational testing assistance
- **Models**: GPT-4 for analysis and recommendations

### DevOps
- **Containerization**: Docker (planned)
- **CI/CD**: GitHub Actions
- **Code Quality**: ESLint, Prettier
- **Testing**: Jest, Supertest
- **Monitoring**: Winston logging

## 📊 Data Flow

### User Interaction Flow
1. User interacts with React frontend
2. Frontend makes API calls to Express backend
3. Backend validates requests and processes business logic
4. Database queries executed via Prisma ORM
5. AI services called for intelligent features
6. Response formatted and returned to frontend
7. UI updated with new data

### Authentication Flow
1. User submits credentials
2. Backend validates against database
3. JWT token generated and returned
4. Token stored in localStorage/cookies
5. Subsequent requests include Bearer token
6. Backend validates token on protected routes

## 🗃️ Database Schema

### Core Entities

#### User
- Authentication and profile information
- Relationships: Projects (1:many)

#### Project
- Test project metadata
- Status: Draft, In Progress, Completed
- Relationships: User (many:1), ConversationalAnalysis (1:1)

#### ConversationalAnalysis
- AI-powered test analysis sessions
- Stores conversation history with AI
- Status tracking and progress metrics

#### TestCase
- Generated test cases from AI analysis
- Linked to analysis sessions
- Execution results and metadata

### Key Relationships
```
User
├── Projects (1:many)
│   └── ConversationalAnalysis (1:1)
│       └── TestCases (1:many)
```

## 🔐 Security Architecture

### Authentication & Authorization
- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Token expiration and refresh

### API Security
- Input validation with Joi/Zod
- Rate limiting per user/IP
- CORS configuration
- Helmet security headers
- SQL injection prevention via Prisma

### Data Protection
- Environment variable management
- Sensitive data encryption
- HTTPS enforcement in production
- Audit logging

## 🚀 Deployment Architecture

### Development
- Local development servers
- Hot reload for both frontend/backend
- Shared development database
- Debug logging enabled

### Production
- Frontend: Static hosting (Vercel/Netlify)
- Backend: Cloud server (Railway/Render)
- Database: Managed PostgreSQL (Supabase/PlanetScale)
- Cache: Managed Redis
- CDN for static assets

### Environment Configuration
- Separate configs for dev/staging/prod
- Environment variables for secrets
- Configuration validation on startup

## 📈 Scalability Considerations

### Horizontal Scaling
- Stateless backend design
- Redis for session/cache management
- Database connection pooling
- CDN for static assets

### Performance Optimizations
- Database query optimization
- Caching strategies (Redis)
- API response compression
- Lazy loading in frontend

### Monitoring & Observability
- Structured logging with Winston
- Error tracking and alerting
- Performance metrics collection
- Health check endpoints

## 🔄 API Design Patterns

### RESTful Conventions
- Resource-based URLs
- HTTP methods for CRUD operations
- Consistent response formats
- Proper HTTP status codes

### Error Handling
```typescript
// Success Response
{
  success: true,
  data: { ... },
  message: "Optional success message",
  timestamp: "2025-01-13T10:00:00.000Z"
}

// Error Response
{
  success: false,
  error: "Error message",
  details: { ... },
  timestamp: "2025-01-13T10:00:00.000Z"
}
```

### Pagination
- Cursor-based pagination for large datasets
- Consistent pagination parameters
- Metadata in response headers

## 🧪 Testing Strategy

### Unit Tests
- Backend: Jest with Supertest for API testing
- Frontend: React Testing Library
- Coverage target: 80%+

### Integration Tests
- End-to-end API testing
- Database integration tests
- AI service mocking

### E2E Tests
- Playwright for critical user journeys
- Automated browser testing

## 📚 Development Workflow

### Code Quality
- ESLint for code linting
- Prettier for code formatting
- Pre-commit hooks with Husky
- TypeScript strict mode

### Version Control
- Git flow branching strategy
- Conventional commit messages
- Pull request reviews required
- Automated CI/CD pipelines

This architecture provides a solid foundation for a scalable, maintainable testing platform with AI capabilities.