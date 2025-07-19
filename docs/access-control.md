# Access Control Implementation

## Overview
This document explains how access control is implemented in the Prompt Vault application to ensure proper visibility of prompts based on user roles and team membership.

## Key Changes Implemented

### 1. Database Rules (database.rules.json)
- **Users**: Can only read/write their own user data
- **Teams**: Members can only read their own team's data, only admins can write
- **Prompts**: 
  - Global prompts: Visible to all authenticated users
  - Team prompts: Only visible to members of the same team
  - Private prompts: Only visible to the creator

### 2. Data Model Updates
- Added `teamId` field to the `Prompt` interface
- Prompts now store the team they belong to when created

### 3. Prompt Filtering Logic
- **Private View**: Shows all prompts created by the user (regardless of sharing level)
- **Team View**: Shows only prompts from the user's team + global prompts
- **Community View**: Shows only global prompts

### 4. Settings Page
- Users can only see and manage their own team
- Only team admins can add/remove team members
- Removed hardcoded cross-team visibility logic

## How It Works

### Creating Prompts
1. When a user creates a prompt, it automatically includes their `teamId`
2. New prompts start as "private" by default
3. Users can toggle between private/team sharing
4. Users can share to community (global)

### Viewing Prompts
1. **My Prompt Repository**: 
   - Query: `createdBy === userId`
   - Shows all prompts created by the user

2. **Team Repository**:
   - Query: All prompts, then filter client-side
   - Filter: `sharing === 'global' || (sharing === 'team' && teamId === userTeamId)`
   - Shows team prompts (same team only) + community prompts

3. **Community Showcase**:
   - Query: `sharing === 'global'`
   - Shows only community prompts

### Team Management
- Each team is isolated - members can only see their own team
- Team admins can:
  - Add new members to their team
  - Remove members from their team
- Regular members can only view the team roster

## Security Considerations
1. Firebase rules enforce access at the database level
2. Client-side filtering provides additional security layer
3. Team isolation prevents data leakage between teams
4. User can only modify prompts they created

## Testing Access Control
To test the implementation:

1. **Test User Isolation**: 
   - Login as tester1@t1.com (Team 1)
   - Create a private prompt - only visible in "My Repository"
   - Change to team sharing - visible in Team Repository
   - Login as tester3@t2.com (Team 2)
   - Verify Team 1's team prompt is NOT visible

2. **Test Team Isolation**:
   - Team 1 members cannot see Team 2's team prompts
   - Team 2 members cannot see Team 1's team prompts

3. **Test Community Sharing**:
   - Any user can share a prompt to community
   - All users can see community prompts
   - Community prompts appear in both Team and Community views

4. **Test Admin Functions**:
   - Login as admin (tester1@t1.com or tester3@t2.com)
   - Can add/remove team members
   - Login as regular member
   - Cannot see add/remove options