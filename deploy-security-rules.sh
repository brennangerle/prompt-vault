#!/bin/bash

# Deploy Firebase Database Security Rules
# This script deploys the updated security rules to Firebase Realtime Database

echo "🔐 Deploying Firebase Database Security Rules..."
echo "Project: prompt-vault-bw4ot"
echo "Database: prompt-vault-bw4ot-default-rtdb"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Check if user is authenticated
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not authenticated with Firebase. Please run:"
    echo "   firebase login"
    echo "   Then run this script again."
    exit 1
fi

# Deploy database rules
echo "🚀 Deploying database rules..."
firebase deploy --only database

if [ $? -eq 0 ]; then
    echo "✅ Database security rules deployed successfully!"
    echo ""
    echo "🔍 Next steps:"
    echo "1. Go to Firebase Console: https://console.firebase.google.com/"
    echo "2. Select project: prompt-vault-bw4ot"
    echo "3. Navigate to Realtime Database > Rules"
    echo "4. Verify the new rules are active"
    echo "5. Test the rules using the Firebase Console simulator"
    echo ""
    echo "📋 Security improvements applied:"
    echo "- Removed root-level read/write permissions"
    echo "- Users can only access their own data"
    echo "- Team access restricted to members only"
    echo "- Prompt sharing follows privacy settings"
    echo "- Email verification secured for super users"
else
    echo "❌ Failed to deploy database rules"
    echo "Please check your Firebase authentication and try again"
    exit 1
fi