# Cascading Sharing Permissions with Team-Based Access Control

## How Prompt Visibility Works

### 📝 **Private Scope** ("My Prompt Repository")
- Shows: **All prompts created by the user** regardless of sharing level
- Logic: User sees their own prompts whether they're private, team, or community
- Purpose: Complete view of everything they've created

### 👥 **Team Scope** ("Team Repository") 
- Shows: **Team prompts (same team only) + Community prompts** (cascading access)
- Logic: `(sharing === 'team' AND teamId === userTeamId) OR sharing === 'global'`
- Purpose: Team members see prompts shared within their team plus community content
- **Important**: Teams are isolated - Team 1 cannot see Team 2's prompts

### 🌍 **Community Scope** ("Community Showcase")
- Shows: **Only community prompts** 
- Logic: `sharing === 'global'`
- Purpose: Public showcase of community-shared prompts visible to all users

## Sharing Level Progression

```
Private → Team → Community
   ↓       ↓       ↓
   📝      👥      🌍
```

When a user changes sharing from **Private** to **Team**:
- ✅ Visible to all members of the same team
- ❌ NOT visible to members of other teams
- ✅ Still visible in creator's **Private** scope

When a user changes sharing from **Team** to **Community**:
- ✅ Still visible in **Team** scope (cascading access)
- ✅ Visible in **Community** scope to ALL users
- ✅ Still visible in creator's **Private** scope

## Benefits

1. **Team Isolation**: Teams cannot access each other's private data
2. **No Lost Access**: Teams don't lose prompts when they're shared to community
3. **Natural Progression**: Higher sharing levels include lower levels within the same team
4. **Creator Control**: Creators always see all their prompts in "My Repository"
5. **Security**: Team-based access control prevents unauthorized access

## Database Queries

- **Private**: `createdBy === userId` (all sharing levels)
- **Team**: `(sharing === 'team' AND teamId === userTeamId) OR sharing === 'global'`
- **Community**: `sharing === 'global'`

## Access Control Matrix

| Prompt Type | Creator | Same Team Member | Different Team Member | All Users |
|-------------|---------|------------------|----------------------|-----------|
| Private     | ✅      | ❌               | ❌                   | ❌        |
| Team        | ✅      | ✅               | ❌                   | ❌        |
| Community   | ✅      | ✅               | ✅                   | ✅        |