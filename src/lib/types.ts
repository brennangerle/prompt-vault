export interface Prompt {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
}

export const Categories = ['Marketing', 'Development', 'Writing', 'Business', 'Education', 'Personal'] as const;

export type Category = (typeof Categories)[number] | 'All';
