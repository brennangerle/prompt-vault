# Cascading Sharing Permissions

## How Prompt Visibility Works

### 📝 **Private Scope** ("My Prompt Repository")
- Shows: **All prompts created by the user** regardless of sharing level
- Logic: User sees their own prompts whether they're private, team, or community
- Purpose: Complete view of everything they've created

### 👥 **Team Scope** ("Team Repository") 
- Shows: **Team prompts + Community prompts** (cascading access)
- Logic: `sharing === 'team' OR sharing === 'global'`
- Purpose: Team has access to both team-shared and community-shared content

### 🌍 **Community Scope** ("Community Showcase")
- Shows: **Only community prompts** 
- Logic: `sharing === 'global'`
- Purpose: Public showcase of community-shared prompts

## Sharing Level Progression

```
Private → Team → Community
   ↓       ↓       ↓
   📝      👥      🌍
```

When a user changes sharing from **Team** to **Community**:
- ✅ Still visible in **Team** scope (cascading access)
- ✅ Still visible in **Community** scope
- ✅ Still visible in creator's **Private** scope

## Benefits

1. **No Lost Access**: Teams don't lose prompts when they're shared to community
2. **Natural Progression**: Higher sharing levels include lower levels
3. **Creator Control**: Creators always see all their prompts in "My Repository"
4. **Intuitive UX**: Users expect team access to include community content

## Database Queries

- **Private**: `createdBy === userId` (all sharing levels)
- **Team**: `sharing === 'team' OR sharing === 'global'`
- **Community**: `sharing === 'global'`