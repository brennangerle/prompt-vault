export interface Prompt {
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

export interface User {
  id: string;
  email: string;
  teamId?: string;
  role?: 'super_user' | 'user';
}

export interface Team {
  id: string;
  name: string;
  members: TeamMember[];
  createdBy?: string;
  createdAt?: string;
}

export interface TeamMember {
  id: string;
  email: string;
  role: 'admin' | 'member';
  joinedAt: string;
}
