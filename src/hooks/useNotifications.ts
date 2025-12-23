import toast from 'react-hot-toast';
import { NotificationPayload, getNotificationMessage } from '@/lib/notifications';

export function useNotifications() {
  const showToast = (payload: NotificationPayload) => {
    const message = getNotificationMessage(payload);

    switch (payload.type) {
      case 'task_assigned':
        toast.success(message, {
          icon: '👤',
          duration: 5000,
        });
        break;
      case 'task_moved':
        toast(message, {
          icon: '📋',
          duration: 4000,
        });
        break;
      case 'task_edited':
        toast(message, {
          icon: '✏️',
          duration: 4000,
        });
        break;
      case 'comment_added':
        toast(message, {
          icon: '💬',
          duration: 4000,
        });
        break;
      case 'task_created':
        toast.success(message, {
          icon: '✨',
          duration: 4000,
        });
        break;
      case 'task_deleted':
        toast(message, {
          icon: '🗑️',
          duration: 4000,
        });
        break;
      default:
        toast(message);
    }
  };

  const showError = (message: string) => {
    toast.error(message, {
      duration: 5000,
    });
  };

  const showSuccess = (message: string) => {
    toast.success(message, {
      duration: 4000,
    });
  };

  return { showToast, showError, showSuccess };
}
