# Architecture Guide

## 1. Overview

This document describes how the Last Man Standing app is structured, outlining how we write, organise, and test our code.

### Key Principles
- We use TypeScript (.ts or .tsx) wherever possible
- We write all comments and documentation in GB (UK) English
- We do not overwrite existing comments from other contributors
- If additional clarification is needed, we add short, clear comments instead of deleting or rewriting existing ones

## 2. Core Principles

### TypeScript-First
- All new files and components should be written in TypeScript
- Ensure strict type-checking by using the strict setting in tsconfig.json
- Whenever possible, install the matching @types packages for any new libraries

### GB (UK) English
- We consistently use UK spellings in variable names, comments, and documentation
  - Examples: "colour", "organise", etc.
- This also applies to user-facing text, error messages, and documentation

### Minimal, Clear Comments
- Do not overwrite existing comments from other contributors
- Only add new comments if it provides genuine clarification
- Keep comments concise and straightforward

### Modularity & Separation of Concerns
- Each module or component should serve a single clear purpose
- Presentation (UI components) is separated from business logic (in lib/ or utility files)

### Tests Near the Source
- Tests live in the same directory as the files they test
  - Example: `TeamSelectionModal.test.tsx` next to `TeamSelectionModal.tsx`
- This keeps tests easily discoverable and encourages thorough coverage

### Scalability & Maintainability
- Directory structure should remain logical as the app grows
- Use well-defined interfaces or types for data structures
- Avoid large monolithic files that handle multiple responsibilities

###  Leverage Well-Maintained Libraries
   - Where possible, use reliable libraries to reduce boilerplate and streamline logic.
   - Example: **shadcn/ui** can provide pre-built, accessible UI components that integrate easily with Tailwind, saving time and keeping code DRY.


## 3. Directory Structure

```
├── pages
│   ├── api
│   │   └── auth
│   │       └── [...nextauth].ts   // NextAuth routes
│   ├── dashboard.tsx              // Main dashboard page
│   ├── index.tsx                  // Landing page
│   └── ...
├── components
│   ├── Navbar
│   │   ├── Navbar.tsx
│   │   └── Navbar.test.tsx
│   ├── TeamSelection
│   │   ├── TeamSelectionModal.tsx
│   │   ├── TeamSelectionModal.test.tsx
│   │   └── ...
│   └── ...
├── lib
│   ├── auth
│   │   ├── index.ts
│   │   └── index.test.ts
│   ├── stripe
│   │   ├── createCheckoutSession.ts
│   │   └── createCheckoutSession.test.ts
│   └── ...
├── prisma (or models / db)
│   ├── schema.prisma
│   └── ...
├── styles
│   └── globals.css
├── tests (optional additional top-level folder for integration/E2E tests)
│   └── integration
│       └── ...
├── public
│   └── ...
├── .env
├── .eslintrc.js
├── .prettierrc
├── architecture.md
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## 4. Coding Conventions

### Naming
- PascalCase for React components and TypeScript types/interfaces
  - Examples: `TeamSelectionModal.tsx`, `UserProfileInfo.ts`
- camelCase for function and variable names
  - Example: `fetchUserDetails`
- UPPER_CASE for constants
  - Example: `MAX_ROUNDS`

### Commenting Guidelines
- Write concise comments in UK English for clarity
- If existing comments are present, do not overwrite them
- Add supplementary comments only if necessary for clarity

### Linting & Formatting
- Use ESLint and Prettier with UK English where relevant
- Run `npm run lint` and `npm run format` before pushing or as part of continuous integration

### Error Handling
- Show user-friendly messages, using UK spelling
- Log technical details to the server logs

## 5. Testing Strategy

### Unit Tests
- Each component/function has a matching test file in the same folder
  - Example: `TeamSelectionModal.test.tsx`
- Use Jest and @testing-library/react
- Focus on component behavior and edge cases

### Integration Tests
- Stored in `tests/integration` or `pages/__tests__`
- Test multiple modules working together
  - Example: user auth → team selection flow

### E2E Tests (Optional)
- Use Cypress or Playwright for full user-flow testing
- Test complete scenarios like sign-in → payment → team pick → elimination

### Coverage
- Aim for robust test coverage of core features
- Focus on quality over chasing 100% coverage

## 6. Pull Requests & Code Reviews

### Pull Request Template
- Summarise changes
- Link any issues/tickets
- Provide screenshots or testing steps

### Review Checklist
- Code uses TypeScript correctly (no unnecessary `any`)
- Comments follow UK English and don't overwrite existing ones
- Code is modular, consistent, and tested adequately

## 7. Deployment & CI/CD

### GitHub Actions
- Automated builds and tests for all pull requests
- Use environment variables in GitHub secrets
- Separate configurations for staging/production

### Environments
- Staging for test deployments
- Production for live app
- Vercel for Next.js deployment
  - Preview deployments for pull requests
  - Auto-deployment on merges to main

## 8. Future Considerations

### Mobile App Wrappers
- Potential PWA implementation
- React Native wrapper possibility
- Keep business logic in `lib/` for cross-platform reuse

### Microservices
- Consider splitting services as the codebase grows
  - Payment processing
  - Match results
  - User management

## Summary

- Write code in TypeScript (.ts and .tsx)
- Use UK English consistently
- Don't overwrite existing comments
- Keep tests close to the source
- Follow linting/formatting guidelines
- Ensure modularity and separation of concerns

This approach ensures your project remains organised, maintainable, and scalable as it grows. 