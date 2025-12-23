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

// Label colors for categorizing tasks
export type LabelColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'gray';

export interface Label {
  id: string;
  name: string;
  color: LabelColor;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface ActivityLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details?: string;
  timestamp: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
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

// Recurring task types
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface RecurrenceConfig {
  type: RecurrenceType;
  endDate?: string | null;  // Optional end date for recurrence
  lastGenerated?: string | null;  // Track when we last generated a recurring instance
}

// Custom column configuration
export interface CustomColumn {
  id: string;
  name: string;
  order: number;
  color?: string;
}

// Board template types
export interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  columns: CustomColumn[];
  sampleTasks: TemplateSampleTask[];
  createdBy: string;
  isGlobal: boolean;  // Available to all departments
  metadata: {
    createdAt: string;
    updatedAt: string;
  };
}

export interface TemplateSampleTask {
  title: string;
  description: string;
  priority: Priority;
  status: string;  // Column id reference
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
  assigneeIds?: string[];  // Multiple assignees
  assigneeNames?: string[];
  createdBy: string;
  creatorName?: string;
  dueDate: string | null;
  labels: Label[];
  subtasks: Subtask[];
  attachments: Attachment[];
  comments: Comment[];
  activityLog: ActivityLogEntry[];
  estimatedHours?: number;
  loggedHours?: number;
  blockedBy?: string[];  // Task IDs this task is blocked by
  recurrence?: RecurrenceConfig;  // Recurring task configuration
  parentRecurringId?: string;  // Reference to parent recurring task
  order: number;
  metadata: {
    createdAt: string;
    updatedAt: string;
  };
}
