# 🤝 Contributing to TestForge AI

¡Gracias por tu interés en contribuir a TestForge! Este documento te guiará sobre cómo contribuir efectivamente al proyecto.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Setup
1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/bkupTestforge.git
   cd bkupTestforge
   ```

3. Install dependencies:
   ```bash
   # Backend
   cd testforge-backend
   npm install

   # Frontend
   cd ../testforge-frontend
   npm install
   ```

4. Set up environment variables (see .env.example files)

5. Start development servers:
   ```bash
   # Backend
   cd testforge-backend
   npm run dev

   # Frontend (new terminal)
   cd testforge-frontend
   npm run dev
   ```

## 📝 Development Workflow

### Branch Naming
- `feature/feature-name` - New features
- `bugfix/bug-description` - Bug fixes
- `hotfix/critical-fix` - Critical fixes
- `refactor/refactor-description` - Code refactoring

### Commit Messages
Follow conventional commits:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Tests
- `chore:` - Maintenance

### Pull Requests
1. Create a feature branch from `main`
2. Make your changes
3. Run tests: `npm test`
4. Run lint: `npm run lint`
5. Update documentation if needed
6. Create a PR with a clear description

## 🧪 Testing

### Backend Tests
```bash
cd testforge-backend
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage
```

### Frontend Tests
```bash
cd testforge-frontend
npm run test
```

## 📚 Code Style

### Backend (TypeScript)
- Use TypeScript strict mode
- Follow ESLint configuration
- Use meaningful variable names
- Add JSDoc comments for public APIs

### Frontend (React/TypeScript)
- Use functional components with hooks
- Follow Chakra UI patterns
- Use TypeScript interfaces for props
- Follow ESLint configuration

## 🔧 API Guidelines

### REST API Design
- Use RESTful conventions
- Return consistent JSON responses:
  ```json
  {
    "success": true,
    "data": { ... },
    "message": "Optional message",
    "timestamp": "2025-01-13T10:00:00.000Z"
  }
  ```

### Error Handling
- Use appropriate HTTP status codes
- Provide meaningful error messages
- Log errors appropriately

## 🔒 Security

- Never commit sensitive data
- Use environment variables for secrets
- Follow OWASP guidelines
- Validate all inputs
- Use HTTPS in production

## 📖 Documentation

- Update README.md for new features
- Add JSDoc comments for new functions
- Update API documentation for endpoint changes
- Keep CHANGELOG.md updated

## 🤝 Code Review

### Review Checklist
- [ ] Code follows style guidelines
- [ ] Tests are included/updated
- [ ] Documentation is updated
- [ ] No console.log statements
- [ ] Security considerations addressed
- [ ] Performance impact considered

## 📞 Support

If you need help:
1. Check existing issues
2. Create a new issue with detailed description
3. Join our Discord community

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project.

Thank you for contributing to TestForge AI! 🎉