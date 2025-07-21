# Technology Stack

## Framework & Runtime
- **Next.js 15.3.3** - React framework with App Router
- **React 18.3.1** - UI library
- **TypeScript 5.8.3** - Type safety
- **Node.js 20.19.4** - Runtime environment

## Backend & Database
- **Firebase** - Backend-as-a-Service
  - Realtime Database for data storage
  - Authentication for user management
  - Analytics for usage tracking
- **Genkit** - AI framework for prompt flows and model integration

## AI Integration
- **Google Gemini** - Primary AI model provider
- **GROQ** - Alternative AI model provider
- **Genkit AI flows** - Structured AI operations (prompt optimization, metadata generation)

## UI & Styling
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Headless component primitives
- **Lucide React** - Icon library
- **shadcn/ui** - Pre-built component system

## Development Tools
- **Turbopack** - Fast bundler for development
- **ESLint** - Code linting (disabled during builds)
- **TypeScript** - Type checking (build errors ignored for flexibility)

## Common Commands

### Development
```bash
npm run dev              # Start development server with Turbopack on port 9002
npm run genkit:dev       # Start Genkit development server
npm run genkit:watch     # Start Genkit with file watching
```

### Build & Deploy
```bash
npm run build           # Build production application
npm run start           # Start production server
npm run typecheck       # Run TypeScript type checking
npm run lint            # Run ESLint
```

### Testing
```bash
# No test runner configured - tests run manually or via custom scripts
```

## Environment Configuration
Required environment variables in `.env` or `.env.local`:
- Firebase config: `NEXT_PUBLIC_FIREBASE_*` variables
- AI providers: `GEMINI_API_KEY`, `GROQ_API_KEY`, `MODEL_PROVIDER`