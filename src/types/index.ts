export interface User {
  id: string;
  _id?: string;
  email: string;
  name: string;
  isAdmin: boolean;
  isSuperUser: boolean;
  departments: string[];
  profile: Record<string, unknown>;
  settings: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface Department {
  id: string;
  _id?: string;
  name: string;
  adminIds: string[];
  memberIds: string[];
  metadata: {
    createdAt: string;
    updatedAt: string;
  };
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  isSuperUser: boolean;
}

// Project/Task types for Kanban board
export type ProjectStatus = 'backlog' | 'todo' | 'in_progress' | 'done';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface Project {
  id: string;
  _id?: string;
  departmentId: string;
  departmentName?: string;
  title: string;
  description: string;
  status: ProjectStatus;
  priority: Priority;
  assigneeId: string | null;
  assigneeName?: string;
  createdBy: string;
  creatorName?: string;
  dueDate: string | null;
  attachments: Attachment[];
  comments: Comment[];
  order: number;
  metadata: {
    createdAt: string;
    updatedAt: string;
  };
}
