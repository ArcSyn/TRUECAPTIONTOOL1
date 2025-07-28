# 🤝 Contributing to CapEdify

Thank you for your interest in contributing to CapEdify! We welcome contributions from the community and are excited to see what you'll bring to this project.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- Git
- Basic understanding of JavaScript/TypeScript
- Familiarity with React and Node.js

### Development Setup

1. **Fork the repository**
   ```bash
   git fork https://github.com/yourusername/capedify.git
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/yourusername/capedify.git
   cd capedify
   ```

3. **Install dependencies**
   ```bash
   npm install
   cd server && npm install
   cd ../client && npm install
   ```

4. **Start development environment**
   ```bash
   npm start
   ```

## 📋 How to Contribute

### Reporting Bugs

Before creating bug reports, please check the [existing issues](https://github.com/yourusername/capedify/issues) to avoid duplicates.

**Good Bug Reports Include:**
- Clear, descriptive title
- Step-by-step reproduction instructions
- Expected vs actual behavior
- Environment details (OS, Node.js version, etc.)
- Screenshots/error logs if applicable

### Suggesting Enhancements

Enhancement suggestions are welcome! Please:
- Use a clear, descriptive title
- Provide detailed description of the proposed feature
- Explain why this enhancement would be useful
- Consider the scope and complexity

### Pull Requests

1. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make your changes**
   - Write clean, readable code
   - Follow existing code style
   - Add tests for new features
   - Update documentation as needed

3. **Test your changes**
   ```bash
   npm test
   npm run lint
   ```

4. **Commit your changes**
   ```bash
   git commit -m "feat: add amazing feature"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/amazing-feature
   ```

## 📝 Code Style Guidelines

### JavaScript/TypeScript
- Use ES6+ features
- Prefer `const` and `let` over `var`
- Use arrow functions for simple functions
- Add JSDoc comments for complex functions
- Use TypeScript types where applicable

### React Components
- Use functional components with hooks
- Keep components small and focused
- Use descriptive prop names
- Add PropTypes or TypeScript interfaces

### Node.js/Express
- Use async/await over Promises
- Implement proper error handling
- Add logging for debugging
- Follow RESTful API conventions

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run server tests
cd server && npm test

# Run client tests  
cd client && npm test
```

### Writing Tests
- Add unit tests for new functions
- Add integration tests for API endpoints
- Test edge cases and error scenarios
- Maintain high test coverage

## 📚 Documentation

When contributing, please:
- Update README.md if needed
- Add JSDoc comments to functions
- Update API documentation in `/docs`
- Include usage examples

## 🔧 Development Areas

### High Priority
- **Performance Optimization** - Improve processing speed
- **Error Handling** - Better error messages and recovery
- **Testing** - Increase test coverage
- **Documentation** - API docs and tutorials

### Medium Priority
- **UI/UX Improvements** - Better user interface
- **Additional Export Formats** - More output options
- **Cloud Integration** - AWS, Google Cloud support
- **Mobile Support** - Responsive design improvements

### Low Priority
- **Advanced Features** - New styling options
- **Automation** - CI/CD improvements
- **Monitoring** - Analytics and logging

## 🏗️ Architecture Overview

### Project Structure
```
CapEdify/
├── client/          # React frontend
├── server/          # Node.js backend
├── docs/           # Documentation
├── scripts/        # Build and utility scripts
└── whisper-cpp/    # Whisper integration
```

### Key Components
- **WhisperChunkerAgent** - Handles long-form video processing
- **AEJSXExporterAgent** - Generates After Effects JSX
- **TemplateInheritanceAgent** - Manages styling templates
- **PrecisionTimingAgent** - Ensures frame-accurate timing

## 🚫 What We Don't Accept

- Breaking changes without discussion
- Code that introduces security vulnerabilities
- Features that significantly increase complexity
- Changes without proper testing
- Plagiarized or copyrighted content

## 🎯 Commit Message Guidelines

We use [Conventional Commits](https://conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code formatting (no functional changes)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

**Examples:**
```bash
feat: add support for WebVTT export format
fix: resolve server crash during chunked processing
docs: update API documentation for Phase 3 endpoints
```

## 🔍 Code Review Process

1. **Automated Checks** - CI/CD runs tests and linting
2. **Maintainer Review** - Core team reviews code quality
3. **Testing** - Manual testing of new features
4. **Documentation** - Ensure docs are updated
5. **Merge** - Approved PRs are merged to main

## 🏆 Recognition

Contributors are recognized in:
- README.md contributors section
- GitHub contributor graphs
- Release notes for significant contributions
- Special mention for major features

## 📞 Getting Help

- **Discord**: Join our development chat (coming soon)
- **GitHub Discussions**: For general questions
- **Issues**: For bug reports and feature requests
- **Email**: contact@capedify.com (for security issues)

## 📜 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). We are committed to providing a welcoming and inclusive environment for all contributors.

## 🙏 Thank You

Every contribution, no matter how small, helps make CapEdify better. Whether you're fixing a typo, adding a feature, or improving documentation, your efforts are appreciated!

---

**Happy coding! 🚀**