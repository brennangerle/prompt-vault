# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

- **Development**: `npm run dev` - Start development server on port 9002 with Turbopack
- **AI Development**: `npm run genkit:dev` - Start Genkit development server
- **AI Watch Mode**: `npm run genkit:watch` - Start Genkit with file watching
- **Build**: `npm run build` - Build the Next.js application
- **Start**: `npm start` - Start production server
- **Lint**: `npm run lint` - Run Next.js linting
- **Type Check**: `npm run typecheck` - Run TypeScript type checking

## Architecture

This is "The Prompt Keeper", a Next.js application for managing and organizing prompts with AI optimization capabilities.

### Core Structure
- **Frontend**: Next.js 15 with TypeScript, React 18, and Tailwind CSS
- **UI Components**: Radix UI primitives with custom shadcn/ui components
- **AI Integration**: Google AI via Genkit for prompt optimization
- **State Management**: React hooks and local state (no external state library)
- **Styling**: Tailwind CSS with custom design system

### Key Components
- `src/app/page.tsx` - Main application with sidebar navigation and prompt management
- `src/components/prompt-card.tsx` - Individual prompt display and actions
- `src/components/quick-prompt-form.tsx` - Quick prompt creation form
- `src/ai/flows/optimize-prompt.ts` - AI prompt optimization flow using Genkit
- `src/lib/types.ts` - Core TypeScript interfaces (Prompt interface)

### Data Model
```typescript
interface Prompt {
  id: string;
  title: string;
  content: string;
  tags: string[];
  software?: string;
  sharing: 'private' | 'team' | 'global';
}
```

### Features
- **Prompt Management**: Create, edit, delete, and organize prompts
- **Sharing Scopes**: Private, team, and community sharing levels
- **AI Optimization**: Use Genkit + Google AI to optimize prompt content
- **Tagging System**: Organize prompts with tags (displayed as folders in sidebar)
- **Copy Functionality**: Easy clipboard copy of prompt content
- **Responsive Design**: Mobile-friendly with sidebar navigation

### AI Integration
- Uses Genkit with configurable AI providers:
  - GROQ (default for testing phase)
  - Google AI (Gemini 2.0 Flash model)
- Provider selection via MODEL_PROVIDER environment variable
- Prompt optimization flow provides enhanced prompts and suggestions
- Server-side AI functions with proper schema validation using Zod
- Error handling and performance monitoring for AI operations

### Development Notes
- Uses shadcn/ui component library with Radix UI primitives
- Custom sidebar navigation with scope and tag filtering
- State managed entirely through React hooks
- No persistence layer implemented (uses in-memory state)
- Tailwind with dark mode support for sidebar