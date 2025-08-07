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
- **Backend**: Firebase Realtime Database with authentication
- **AI Integration**: Google AI via Genkit for prompt optimization
- **State Management**: React hooks with Firebase real-time data
- **Styling**: Tailwind CSS with custom design system
- **Analytics**: Google Analytics via Vercel Analytics

### Key Components
- `src/app/page.tsx` - Main application with sidebar navigation and prompt management
- `src/components/prompt-card.tsx` - Individual prompt display and actions
- `src/components/quick-prompt-form.tsx` - Quick prompt creation form
- `src/ai/flows/optimize-prompt.ts` - AI prompt optimization flow using Genkit
- `src/lib/types.ts` - Core TypeScript interfaces (Prompt, User, Team, TeamMember)
- `src/lib/firebase.ts` - Firebase configuration and service initialization

### Data Model
```typescript
interface Prompt {
  id: string;
  title: string;
  content: string;
  tags: string[];
  software?: string;
  sharing: 'private' | 'team' | 'global';
  createdBy?: string;
  teamId?: string;
  createdAt?: string;
}

interface User {
  id: string;
  email: string;
  teamId?: string;
  role?: 'super_user' | 'user';
}

interface Team {
  id: string;
  name: string;
  members: TeamMember[];
  createdBy?: string;
  createdAt?: string;
}
```

### Features
- **Prompt Management**: Create, edit, delete, and organize prompts
- **User Authentication**: Firebase Auth with team-based organization
- **Sharing Scopes**: Private, team, and community sharing levels
- **AI Optimization**: Use Genkit + Google AI to optimize prompt content
- **Tagging System**: Organize prompts with tags (displayed as folders in sidebar)
- **Copy Functionality**: Easy clipboard copy of prompt content
- **Real-time Sync**: Firebase Realtime Database for collaborative editing
- **Analytics**: User interaction tracking with Google Analytics
- **Responsive Design**: Mobile-friendly with sidebar navigation

### AI Integration
- Uses Genkit with Google AI (Gemini 2.0 Flash model)
- Prompt optimization flow provides enhanced prompts and suggestions
- Server-side AI functions with proper schema validation using Zod

### Development Notes
- Uses shadcn/ui component library with Radix UI primitives
- Custom sidebar navigation with scope and tag filtering
- State managed through React hooks integrated with Firebase
- Firebase Realtime Database provides persistent storage and real-time sync
- Firebase Authentication handles user management and team organization
- Environment requires Firebase configuration in `src/lib/firebase.ts`
- Tailwind with dark mode support for sidebar

### Firebase Integration
- **Database**: Firebase Realtime Database with security rules in `database.rules.json`
- **Authentication**: Firebase Auth with Google sign-in
- **Analytics**: Firebase Analytics integrated with Google Analytics
- **Configuration**: Project uses Firebase project `prompt-vault-bw4ot`