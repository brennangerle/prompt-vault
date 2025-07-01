# Prompt Keeper - Deployment Guide

## Prerequisites

1. **Firebase Project Setup**
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Authentication (Email/Password)
   - Enable Firestore Database
   - Enable Firebase Hosting (optional, if using Firebase Hosting)

2. **Environment Variables**
   - Copy `.env.example` to `.env`
   - Fill in your Firebase configuration values

## Environment Configuration

Create a `.env` file with your Firebase configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id_here
```

## Database Setup

1. **Deploy Firestore Rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Deploy Firestore Indexes**
   ```bash
   firebase deploy --only firestore:indexes
   ```

## Deployment Options

### Option 1: Vercel (Recommended)

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Option 2: Firebase Hosting

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase (if not already done):
   ```bash
   firebase init
   ```

4. Build the application:
   ```bash
   npm run build
   ```

5. Deploy to Firebase:
   ```bash
   firebase deploy
   ```

## Post-Deployment Checklist

- [ ] Verify authentication is working (login/register)
- [ ] Test creating, editing, and deleting prompts
- [ ] Check that database rules are properly applied
- [ ] Verify all environment variables are set correctly
- [ ] Test prompt sharing functionality
- [ ] Monitor Firebase console for any errors

## Security Considerations

1. **Database Rules**: The Firestore rules are configured to:
   - Allow users to only read/write their own data
   - Enforce proper data validation
   - Control access based on sharing settings

2. **Authentication**: 
   - Only authenticated users can access the app
   - Email/password authentication is enabled
   - Consider enabling additional auth providers if needed

3. **API Keys**:
   - All Firebase API keys are client-safe
   - Never expose server-side credentials

## Monitoring

- Use Firebase Console to monitor:
  - Authentication usage
  - Firestore reads/writes
  - Hosting bandwidth
  - Error logs

## Troubleshooting

1. **Authentication Issues**:
   - Verify Firebase Auth is enabled
   - Check that environment variables are loaded
   - Ensure auth domain is correctly configured

2. **Database Issues**:
   - Check Firestore rules are deployed
   - Verify indexes are created
   - Monitor quota usage

3. **Build Issues**:
   - Clear `.next` folder and rebuild
   - Check for TypeScript errors
   - Verify all dependencies are installed