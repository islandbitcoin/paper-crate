# Paper Crate Development Guide

This guide covers setting up a development environment for Paper Crate, including prerequisites, installation, and development workflows.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Development Environment](#development-environment)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Quality](#code-quality)
- [Debugging](#debugging)
- [Contributing](#contributing)

## Prerequisites

### Required Software

1. **Node.js** (Version 18 or higher)
   ```bash
   # Check version
   node --version
   # Should output v18.0.0 or higher
   ```

2. **npm** (Usually comes with Node.js)
   ```bash
   # Check version
   npm --version
   ```

3. **Git**
   ```bash
   # Check version
   git --version
   ```

### Recommended Browser Extensions

For Nostr development and testing:

- **Alby**: Lightning wallet and Nostr signer
- **nos2x**: Simple Nostr signer extension
- **Flamingo**: Advanced Nostr client extension

### Development Tools

- **VS Code** (Recommended editor)
- **Chrome DevTools** or equivalent
- **Lightning wallet** (for payment testing)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/paper-crate.git
cd paper-crate
```

### 2. Install Dependencies

```bash
npm install
```

This installs all project dependencies including:
- React 18.x
- Vite (build tool)
- TailwindCSS
- Nostrify (Nostr protocol library)
- shadcn/ui components
- TypeScript

### 3. Environment Setup

Create a `.env.local` file for development configuration:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your development settings:

```env
# Development Configuration
NODE_ENV=development
VITE_APP_NAME=Paper Crate Dev
VITE_APP_VERSION=dev

# Nostr Configuration
VITE_DEFAULT_RELAY=wss://relay.nostr.band
VITE_BACKUP_RELAYS=wss://relay.damus.io,wss://relay.primal.net

# Development Features
VITE_ENABLE_DEV_TOOLS=true
VITE_ENABLE_LOGGING=true
VITE_MOCK_PAYMENTS=true

# Optional: Custom relay for development
VITE_DEV_RELAY=ws://localhost:7000
```

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:8080`

## Development Environment

### Development Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format

# Deploy to Nostr
npm run deploy
```

### VS Code Configuration

Recommended VS Code extensions:

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "ms-vscode.vscode-json",
    "yoavbls.pretty-ts-errors"
  ]
}
```

### EditorConfig

The project includes `.editorconfig` for consistent formatting:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

## Project Structure

### Directory Overview

```
paper-crate/
├── public/                 # Static assets
│   ├── manifest.webmanifest
│   └── favicon.ico
├── src/                    # Source code
│   ├── components/         # React components
│   │   ├── ui/            # shadcn/ui components
│   │   ├── auth/          # Authentication components
│   │   └── ...            # Feature components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions
│   │   ├── security/      # Security utilities
│   │   └── utils.ts       # General utilities
│   ├── pages/             # Page components
│   ├── stores/            # State management
│   ├── test/              # Test utilities
│   ├── App.tsx            # Main app component
│   ├── main.tsx           # Entry point
│   └── index.css          # Global styles
├── docs/                  # Documentation
├── .github/               # GitHub workflows
├── dist/                  # Build output (generated)
├── package.json           # Dependencies and scripts
├── vite.config.ts         # Vite configuration
├── tailwind.config.ts     # TailwindCSS configuration
├── tsconfig.json          # TypeScript configuration
└── README.md              # Project overview
```

### Key Directories

#### `/src/components/`
Reusable React components organized by feature:

- **`ui/`**: Base UI components from shadcn/ui
- **`auth/`**: Authentication-related components
- **`dashboard/`**: Dashboard and analytics components
- **`campaign/`**: Campaign management components
- **`payment/`**: Payment and invoice components

#### `/src/hooks/`
Custom React hooks for:

- **Nostr integration**: `useNostr`, `useAuthor`, `useNostrPublish`
- **Authentication**: `useAuth`, `useCurrentUser`
- **Data fetching**: Campaign and application hooks
- **Utilities**: `useLocalStorage`, `useToast`, `useTheme`

#### `/src/lib/`
Utility functions and business logic:

- **`security/`**: Security implementations
- **`utils.ts`**: General utility functions
- **`api/`**: API integration functions
- **`types/`**: TypeScript type definitions

## Development Workflow

### Feature Development

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/new-feature-name
   ```

2. **Implement Feature**
   - Write components and hooks
   - Add necessary types
   - Implement tests
   - Update documentation

3. **Test Changes**
   ```bash
   npm run test
   npm run lint
   npm run type-check
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/new-feature-name
   ```

### Commit Message Convention

Follow conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tool changes

Examples:
```bash
git commit -m "feat(auth): add role-based access control"
git commit -m "fix(payments): resolve invoice validation issue"
git commit -m "docs(api): update endpoint documentation"
```

### Code Organization

#### Component Structure

```typescript
// components/ExampleComponent.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useExampleHook } from '@/hooks/useExampleHook';

interface ExampleComponentProps {
  title: string;
  onAction?: () => void;
}

export function ExampleComponent({ title, onAction }: ExampleComponentProps) {
  const [state, setState] = useState(false);
  const { data, loading } = useExampleHook();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      <Button onClick={onAction}>
        Action
      </Button>
    </div>
  );
}
```

#### Hook Structure

```typescript
// hooks/useExample.ts
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';

interface UseExampleReturn {
  data: ExampleData[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useExample(): UseExampleReturn {
  const { nostr } = useNostr();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['example'],
    queryFn: async () => {
      const events = await nostr.query([{ kinds: [1], limit: 10 }]);
      return events;
    },
  });

  return {
    data: data || [],
    loading: isLoading,
    error: error?.message || null,
    refetch,
  };
}
```

## Testing

### Test Setup

The project uses Vitest with React Testing Library:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- components/ExampleComponent.test.tsx
```

### Writing Tests

#### Component Tests

```typescript
// components/__tests__/ExampleComponent.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TestApp } from '@/test/TestApp';
import { ExampleComponent } from '../ExampleComponent';

describe('ExampleComponent', () => {
  it('renders correctly', () => {
    render(
      <TestApp>
        <ExampleComponent title="Test Title" />
      </TestApp>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleAction = vi.fn();
    
    render(
      <TestApp>
        <ExampleComponent title="Test" onAction={handleAction} />
      </TestApp>
    );

    fireEvent.click(screen.getByText('Action'));
    expect(handleAction).toHaveBeenCalled();
  });
});
```

#### Hook Tests

```typescript
// hooks/__tests__/useExample.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { TestApp } from '@/test/TestApp';
import { useExample } from '../useExample';

describe('useExample', () => {
  it('fetches data correctly', async () => {
    const { result } = renderHook(() => useExample(), {
      wrapper: TestApp,
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
  });
});
```

### Test Utilities

The project includes `TestApp` component for testing:

```typescript
// test/TestApp.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NostrProvider } from '@nostrify/react';
import { Toaster } from '@/components/ui/sonner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

export function TestApp({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <NostrProvider>
        {children}
        <Toaster />
      </NostrProvider>
    </QueryClientProvider>
  );
}
```

## Code Quality

### ESLint Configuration

The project uses ESLint for code quality:

```json
{
  "extends": [
    "@eslint/js",
    "@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  "rules": {
    "react/react-in-jsx-scope": "off",
    "@typescript-eslint/no-unused-vars": "warn",
    "prefer-const": "error"
  }
}
```

### Prettier Configuration

Code formatting with Prettier:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

### TypeScript Configuration

Strict TypeScript settings:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

## Debugging

### Browser DevTools

#### React DevTools
Install React DevTools browser extension for debugging React components.

#### Nostr DevTools
Use browser console to inspect Nostr events:

```javascript
// In browser console
window.nostr.getPublicKey().then(console.log);
```

### Development Logging

Enable detailed logging in development:

```typescript
// lib/debug.ts
export const debug = {
  log: (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.log(`[Paper Crate] ${message}`, data);
    }
  },
  error: (message: string, error?: Error) => {
    if (import.meta.env.DEV) {
      console.error(`[Paper Crate] ${message}`, error);
    }
  },
};
```

### Vite DevTools

Vite provides hot module replacement and detailed error messages in development.

## Contributing

### Pull Request Process

1. **Fork the repository**
2. **Create feature branch** from `main`
3. **Make changes** following code standards
4. **Write tests** for new functionality
5. **Update documentation** as needed
6. **Submit pull request** with clear description

### Code Review Guidelines

- **Security**: Review for security vulnerabilities
- **Performance**: Check for performance impacts
- **Maintainability**: Ensure code is readable and maintainable
- **Testing**: Verify adequate test coverage
- **Documentation**: Confirm documentation updates

### Development Best Practices

#### Security
- Never commit private keys or secrets
- Validate all user inputs
- Use TypeScript for type safety
- Follow security guidelines in `docs/SECURITY.md`

#### Performance
- Use React.memo for expensive components
- Implement proper loading states
- Optimize bundle size with code splitting
- Monitor Core Web Vitals

#### Accessibility
- Use semantic HTML elements
- Provide proper ARIA labels
- Ensure keyboard navigation works
- Test with screen readers

#### Nostr Best Practices
- Always validate event signatures
- Use proper event kinds for data
- Implement proper error handling for relay connections
- Cache frequently accessed data

### Getting Help

- **Documentation**: Check `docs/` folder
- **Issues**: GitHub issue tracker
- **Discussions**: GitHub discussions
- **Code Review**: Request review from maintainers

---

Happy coding! 🚀