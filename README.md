# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Environment Configuration

The application requires the following environment variables to be set in your `.env` or `.env.local` file:

### Firebase Configuration
- `NEXT_PUBLIC_FIREBASE_API_KEY`: Your Firebase API key
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: Your Firebase auth domain
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL`: Your Firebase database URL
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: Your Firebase project ID
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`: Your Firebase storage bucket
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`: Your Firebase messaging sender ID
- `NEXT_PUBLIC_FIREBASE_APP_ID`: Your Firebase app ID

### AI Model Configuration
- `MODEL_PROVIDER`: The AI model provider to use (options: 'groq', 'gemini')
- `GEMINI_API_KEY`: Your Google Gemini API key (required if using Gemini)
- `GROQ_API_KEY`: Your GROQ API key (required if using GROQ)
- `GROQ_MODEL`: The GROQ model to use (default: 'llama-3.3-70b-versatile')
