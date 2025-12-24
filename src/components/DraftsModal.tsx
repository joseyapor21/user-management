'use client';

import { useState, useEffect, useCallback } from 'react';
import { Project, Department } from '@/types';
import { useNotifications } from '@/hooks/useNotifications';

interface DraftsModalProps {
  token: string;
  userId: string;
  isSuperUser: boolean;
  departments: Department[];
  onClose: () => void;
  onRestore: () => void;
}

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export default function DraftsModal({
  token,
  userId,
  isSuperUser,
  departments,
  onClose,
  onRestore,
}: DraftsModalProps) {
  const [archivedTasks, setArchivedTasks] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { showToast, showError } = useNotifications();

  // Check if user can manage a department
  const canManageDepartment = useCallback((deptId: string): boolean => {
    if (isSuperUser) return true;
    const dept = departments.find(d => d.id === deptId);
    return dept?.adminIds?.includes(userId) || false;
  }, [isSuperUser, departments, userId]);

  // Fetch archived tasks
  const fetchArchivedTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects?archived=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setArchivedTasks(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching archived tasks:', error);
      showError('Failed to load drafts');
    } finally {
      setLoading(false);
    }
  }, [token, showError]);

  useEffect(() => {
    fetchArchivedTasks();
  }, [fetchArchivedTasks]);

  // Restore a task
  const handleRestore = async (taskId: string) => {
    setRestoring(taskId);
    try {
      const res = await fetch('/api/projects/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: taskId }),
      });

      const data = await res.json();
      if (data.success) {
        showToast({
          type: 'task_created',
          taskTitle: 'Task',
          taskId: taskId,
          byUser: 'You',
        });
        // Remove from local list
        setArchivedTasks(prev => prev.filter(t => t.id !== taskId));
        onRestore();
      } else {
        showError(data.error || 'Failed to restore task');
      }
    } catch {
      showError('Failed to restore task');
    } finally {
      setRestoring(null);
    }
  };

  // Permanently delete a task
  const handlePermanentDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to permanently delete this task? This cannot be undone.')) {
      return;
    }

    setDeleting(taskId);
    try {
      const res = await fetch(`/api/projects?id=${taskId}&permanent=true`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        showToast({
          type: 'task_deleted',
          taskTitle: 'Task',
          taskId: taskId,
          byUser: 'You',
        });
        // Remove from local list
        setArchivedTasks(prev => prev.filter(t => t.id !== taskId));
      } else {
        showError(data.error || 'Failed to delete task');
      }
    } catch {
      showError('Failed to delete task');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white md:rounded-lg shadow-xl w-full h-full md:h-auto md:max-w-2xl md:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Drafts</h2>
            <p className="text-sm text-gray-500">Deleted tasks that can be restored</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl p-1 touch-manipulation">
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : archivedTasks.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <h3 className="text-lg font-medium text-gray-600 mb-1">No drafts</h3>
              <p className="text-sm text-gray-400">Deleted tasks will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {archivedTasks.map((task) => {
                const canManage = canManageDepartment(task.departmentId);
                return (
                  <div
                    key={task.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-800 truncate">{task.title}</h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description || 'No description'}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="text-xs text-gray-400">{task.departmentName}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${priorityColors[task.priority]}`}>
                            {task.priority}
                          </span>
                          {task.archivedAt && (
                            <span className="text-xs text-gray-400">
                              Deleted {formatDate(task.archivedAt as string)}
                            </span>
                          )}
                        </div>
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleRestore(task.id)}
                            disabled={restoring === task.id}
                            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            {restoring === task.id ? 'Restoring...' : 'Restore'}
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(task.id)}
                            disabled={deleting === task.id}
                            className="px-3 py-1.5 bg-red-100 text-red-600 text-sm rounded hover:bg-red-200 disabled:opacity-50"
                          >
                            {deleting === task.id ? '...' : 'Delete'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
