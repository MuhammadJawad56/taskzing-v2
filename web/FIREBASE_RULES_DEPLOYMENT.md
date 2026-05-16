# Firebase Security Rules Deployment Guide

## Problem
The mobile app is getting `permission-denied` errors when trying to apply for jobs posted through the web application. This is because Firebase Security Rules need to be configured to allow authenticated users to create proposals/applications.

## Solution
A `firestore.rules` file has been created with proper security rules that allow:
- Authenticated users to create proposals/applications
- Users to read their own proposals
- Job owners (clients) to read proposals for their jobs
- Users to update their own proposals
- Job owners to update proposals for their jobs (to set isHired, status, etc.)

## How to Deploy

### Option 1: Using Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `task-zing-m-v-p-e11l44`
3. Navigate to **Firestore Database** → **Rules** tab
4. Copy the contents of `firestore.rules` file
5. Paste it into the rules editor
6. Click **Publish**

### Option 2: Using Firebase CLI

1. Install Firebase CLI (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project (if not already done):
   ```bash
   firebase init firestore
   ```
   - Select your existing project
   - Use the existing `firestore.rules` file

4. Deploy the rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

## What the Rules Do

The security rules support multiple collection names that might be used:
- `job_applications`
- `proposals`
- `applications`

For each collection, the rules allow:
- **Read**: Users can read proposals they created (providerId/userId matches) OR proposals for jobs they own (clientId matches)
- **Create**: Any authenticated user can create a proposal, but the providerId/userId must match their auth.uid
- **Update**: Users can update their own proposals OR job owners can update proposals for their jobs
- **Delete**: Only the provider who created the proposal can delete it

The rules also support both `providerId` and `userId` field names for backward compatibility with different app versions.

## Testing

After deploying the rules, test by:
1. Logging into the mobile app
2. Trying to apply for a job posted through the web application
3. The application should now be created successfully without permission errors

## Important Notes

- The rules require users to be authenticated (`request.auth != null`)
- The rules validate that users can only create proposals with their own userId/providerId
- Job owners (clients) can read and update proposals for their jobs
- The rules are designed to be secure while allowing necessary operations
