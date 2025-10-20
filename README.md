# 🔥 TestForge AI - Plataforma de Testing Impulsada por IA

> **Una plataforma completa de testing que utiliza inteligencia artificial para generar, gestionar y analizar casos de prueba de forma automática.**

## 🌟 Características Principales

- 🤖 **Generación automática de tests con IA** (OpenAI GPT-4)
- 📊 **Dashboard interactivo** con métricas en tiempo real
- 💬 **Chat conversacional** para análisis de requisitos
- 🔐 **Autenticación segura** con JWT y rate limiting
- 📱 **UI moderna y responsive** con Chakra UI
- 🚀 **Backend robusto** con MongoDB y caching Redis
- 📋 **Gestión completa de proyectos** con estado persistente
- 🩺 **Health checks** y monitoreo integrado

## 🛠️ Stack Tecnológico

### 🔧 Backend
- **Node.js + TypeScript + Express**
- **MongoDB + Prisma ORM**
- **Redis** (caching opcional)
- **OpenAI API** (GPT-4o-mini)
- **JWT Authentication**
- **Rate Limiting + Security**

### 🌐 Frontend  
- **React 19 + TypeScript**
- **Vite** (bundling ultrarrápido)
- **Chakra UI** (componentes modernos)
- **Zustand** (estado global)
- **React Query** (data fetching)
- **React Router v7**

## 🚀 Instalación Rápida para Windows

### Opción 1: Script Automático (Recomendado)

1. **Clona el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/testforge-ai.git
   cd testforge-ai
   ```

2. **Ejecuta la instalación automática:**
   ```bash
   instalar-testforge.bat
   ```

3. **Configura las variables de entorno** (ver sección de configuración)

4. **Inicia el proyecto:**
   ```bash
   ejecutar-proyecto.bat
   ```

### Opción 2: Instalación Manual

#### 📋 Requisitos Previos

- **Node.js v18+** ([Descargar](https://nodejs.org/))
- **Cuenta MongoDB Atlas** ([Crear gratis](https://www.mongodb.com/cloud/atlas))
- **OpenAI API Key** ([Obtener](https://platform.openai.com/api-keys))

### 🧠 Backend Setup

1. Navigate to backend directory:

```bash
cd testforge-backend
```

2. Install dependencies:

```bash
npm install
```

3. Create environment file:

```bash
cp .env.example .env
```

4. Configure your `.env` file with:

```env
# Database Configuration
DATABASE_URL="postgresql://postgres:password@localhost:5432/testforge"

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL="gpt-3.5-turbo"

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here

# Server Configuration
PORT=3000
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173"
```

5. Start the development server:

```bash
npm run dev
```

The backend will be available at: **<http://localhost:3000>**

### 🌐 Frontend Setup

1. Navigate to frontend directory:

```bash
cd testforge-frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

The frontend will be available at: **<http://localhost:5173>**

## 🛠️ Features

TestForge includes the following main features:

- **User Authentication** - JWT-based authentication system
- **Project Management** - Create and manage testing projects
- **Test Suite Organization** - Hierarchical test organization
- **AI-Powered Test Generation** - Generate tests using OpenAI
- **Analysis and Strategies** - AI-generated testing strategies
- **Caching System** - Redis-based caching with memory fallback
- **Rate Limiting** - API protection and security
- **Modern Frontend** - React with Chakra UI components

## 🧪 API Testing

### Quick Health Check

1. **Health Endpoint**: `GET http://localhost:3000/health`
2. **Database Test**: `GET http://localhost:3000/db-test`

### Authentication Flow

#### 1. Register User

```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "testuser@example.com",
  "password": "password123",
  "name": "Test User"
}
```

#### 2. Login User

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "testuser@example.com",
  "password": "password123"
}
```

**Response**: Save the `token` from the response for authenticated requests.

#### 3. Get User Profile

```http
GET http://localhost:3000/api/auth/profile
Authorization: Bearer <your_token_here>
```

### Project Management

#### Create Project

```http
POST http://localhost:3000/api/projects
Authorization: Bearer <your_token_here>
Content-Type: application/json

{
  "name": "My Test Project",
  "description": "A project for testing APIs"
}
```

#### Get All Projects

```http
GET http://localhost:3000/api/projects
Authorization: Bearer <your_token_here>
```

#### Get Specific Project

```http
GET http://localhost:3000/api/projects/{project_id}
Authorization: Bearer <your_token_here>
```

### Analysis & AI Features

#### Create Analysis

```http
POST http://localhost:3000/api/analysis
Authorization: Bearer <your_token_here>
Content-Type: application/json

{
  "projectId": "your_project_id",
  "codeContent": "function add(a, b) { return a + b; }",
  "analysisType": "unit_test"
}
```

#### Get All Analyses

```http
GET http://localhost:3000/api/analysis
Authorization: Bearer <your_token_here>
```

#### Generate AI Questions

```http
POST http://localhost:3000/api/analysis/{analysis_id}/questions
Authorization: Bearer <your_token_here>
```

#### Generate AI Test Strategy

```http
POST http://localhost:3000/api/analysis/{analysis_id}/strategy
Authorization: Bearer <your_token_here>
```

### Dashboard Stats

```http
GET http://localhost:3000/api/dashboard/stats
Authorization: Bearer <your_token_here>
```

## 📋 Testing Tools

You can test these APIs using:

1. **Postman** - Import and test all endpoints
2. **Thunder Client** (VS Code extension) - Test directly in VS Code
3. **curl** - Command line testing
4. **Browser** - For GET endpoints (health, db-test)

## 🔧 Troubleshooting

### Common Issues

1. **Redis Connection Error**: The application will automatically fallback to memory cache if Redis is not available.

2. **Database Connection**: Ensure PostgreSQL is running and the DATABASE_URL is correct.

3. **Missing Dependencies**: Run `npm install` in both backend and frontend directories.

4. **Environment Variables**: Make sure all required environment variables are set in the `.env` file.

5. **Port Conflicts**: If port 3000 or 5173 are in use, update the PORT in `.env` or stop conflicting services.

## 🚀 Production Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Configure production database
3. Set up Redis server
4. Configure proper CORS origins
5. Use environment-specific secrets
6. Build frontend: `npm run build`
7. Serve built files through a web server

## 📄 License

This project is licensed under the ISC License.
