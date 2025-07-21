# Project Structure

## Root Directory
- `.env` / `.env.local` - Environment variables
- `firebase.json` - Firebase configuration
- `next.config.ts` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `components.json` - shadcn/ui configuration

## Source Code Organization (`src/`)

### Application Routes (`src/app/`)
- **App Router structure** - Each folder represents a route
- `layout.tsx` - Root layout with providers and global styles
- `page.tsx` - Home page component
- Route-specific folders:
  - `login/` - Authentication pages
  - `settings/` - User settings
  - `super-admin/` - Admin interface
  - `first-time-login/` - Onboarding flow

### Components (`src/components/`)
- **UI Components** (`ui/`) - shadcn/ui components (buttons, dialogs, forms, etc.)
- **Feature Components** - Business logic components:
  - `prompt-*.tsx` - Prompt management components
  - `team-*.tsx` - Team collaboration components
  - `*-dialog.tsx` - Modal dialogs
- **Tests** (`__tests__/`) - Component test files

### Hooks (`src/hooks/`)
- Custom React hooks for:
  - `use-prompt-*.ts` - Prompt-related state management
  - `use-toast.ts` - Toast notifications
  - `use-mobile.tsx` - Responsive utilities

### Library Code (`src/lib/`)
- **Core Services**:
  - `firebase.ts` - Firebase initialization and exports
  - `auth.ts` - Authentication utilities
  - `db.ts` - Database operations and queries
  - `permissions.ts` - Role-based access control
- **Utilities**:
  - `types.ts` - TypeScript type definitions
  - `utils.ts` - General utility functions
  - `user-context.tsx` - User state management

### AI Integration (`src/ai/`)
- `genkit.ts` - Genkit configuration and setup
- `flows/` - AI workflow definitions:
  - `generate-prompt-metadata.ts`
  - `optimize-prompt.ts`
- `error-handler.ts` - AI operation error handling

## Configuration Files
- **Kiro** (`.kiro/`) - AI assistant configuration and specs
- **Scripts** (`scripts/`) - Utility and test scripts
- **Public** (`public/`) - Static assets (favicons, images)

## Naming Conventions
- **Files**: kebab-case (e.g., `prompt-table.tsx`)
- **Components**: PascalCase (e.g., `PromptTable`)
- **Hooks**: camelCase with `use` prefix (e.g., `usePromptTable`)
- **Types**: PascalCase interfaces (e.g., `Prompt`, `User`)
- **Constants**: UPPER_SNAKE_CASE

## Import Patterns
- Use `@/` alias for `src/` directory imports
- Group imports: external libraries, then internal modules
- Prefer named exports over default exports for utilities