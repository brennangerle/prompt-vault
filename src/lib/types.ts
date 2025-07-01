export interface Prompt {
  id: string;
  title: string;
  content: string;
  tags: string[];
  software?: string;
  sharing: 'private' | 'team' | 'global';
  createdBy?: string;
}

export interface User {
  id: string;
  email: string;
  teamId?: string;
}

export interface Team {
  id: string;
  name: string;
  members: TeamMember[];
}

export interface TeamMember {
  id: string;
  email: string;
  role: 'admin' | 'member';
  joinedAt: string;
}
