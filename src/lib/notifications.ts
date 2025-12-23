export type NotificationType =
  | 'task_assigned'
  | 'task_moved'
  | 'task_edited'
  | 'comment_added'
  | 'task_created'
  | 'task_deleted';

export interface NotificationPayload {
  type: NotificationType;
  taskTitle: string;
  taskId: string;
  byUser: string;
  details?: {
    oldStatus?: string;
    newStatus?: string;
    assigneeName?: string;
    changedFields?: string[];
  };
}

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

export function getNotificationMessage(payload: NotificationPayload): string {
  switch (payload.type) {
    case 'task_assigned':
      return `${payload.byUser} assigned you to "${payload.taskTitle}"`;
    case 'task_moved':
      const oldStatus = STATUS_LABELS[payload.details?.oldStatus || ''] || payload.details?.oldStatus;
      const newStatus = STATUS_LABELS[payload.details?.newStatus || ''] || payload.details?.newStatus;
      return `"${payload.taskTitle}" moved from ${oldStatus} to ${newStatus}`;
    case 'task_edited':
      const fields = payload.details?.changedFields?.join(', ') || 'details';
      return `"${payload.taskTitle}" was updated (${fields})`;
    case 'comment_added':
      return `${payload.byUser} commented on "${payload.taskTitle}"`;
    case 'task_created':
      return `New task created: "${payload.taskTitle}"`;
    case 'task_deleted':
      return `Task "${payload.taskTitle}" was deleted`;
    default:
      return 'Notification';
  }
}

export function getNotificationTitle(type: NotificationType): string {
  switch (type) {
    case 'task_assigned':
      return 'Task Assigned';
    case 'task_moved':
      return 'Task Status Changed';
    case 'task_edited':
      return 'Task Updated';
    case 'comment_added':
      return 'New Comment';
    case 'task_created':
      return 'Task Created';
    case 'task_deleted':
      return 'Task Deleted';
    default:
      return 'Notification';
  }
}
