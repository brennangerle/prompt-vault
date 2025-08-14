# Firebase Rules Fix Instructions

## What This Fixes

1. **Page Load Error**: Your layout component tries to read from Firebase before authentication
2. **Login Error**: Your app queries users by email but rules only allowed direct user reads

## Key Changes Made

- Added `".read": "auth != null && query.orderByChild == 'email' && query.equalTo == auth.token.email"` to allow self-email lookups
- Added `/public` path for pre-auth data
- Simplified validation rules while keeping security

## How to Apply These Rules

### Option 1: Firebase Console (Recommended)
1. Go to https://console.firebase.google.com
2. Select your project: `prompt-vault-bw4ot`
3. Go to **Realtime Database** → **Rules**
4. Copy the entire contents from `firebase-rules-fixed.json`
5. Paste and replace all existing rules
6. Click **Publish**

### Option 2: Firebase CLI
```bash
# If you have firebase CLI installed
firebase deploy --only database
```

## Code Changes Needed

Your layout component is making database calls before authentication. Find the file `layout-6d62043f449683af.js` and wrap database reads in:

```javascript
import { onAuthStateChanged } from "firebase/auth";

onAuthStateChanged(auth, (user) => {
  if (user) {
    // Move your database reads here
    // Safe to read user data now
  } else {
    // User not logged in
    // Only read from /public if needed
  }
});
```

## What's Now Allowed

- ✅ Users can query for their own email after login
- ✅ Users can read/write their own profile
- ✅ Team admins can manage their teams
- ✅ Super users have full access
- ✅ Public data accessible to everyone
- ❌ No unauthorized database access
- ❌ No privilege escalation

## Test After Applying

1. Try logging in - should work without "Permission denied"
2. Check that you can access your user profile
3. Verify team functionality still works
4. Confirm prompts load correctly

The warning about "insecure rules" should disappear from Firebase console.