'use client';

import { useState, useEffect, useCallback } from 'react';
import { Project, Department, Priority, ProjectStatus, User, Label, LabelColor, Subtask } from '@/types';
import { useNotifications } from '@/hooks/useNotifications';

interface TaskModalProps {
  project: Project;
  token: string;
  userId: string;
  isSuperUser: boolean;
  departments: Department[];
  onClose: () => void;
  onUpdate: () => void;
  onDelete: () => void;
}

const priorityOptions: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const statusOptions: { value: ProjectStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

const labelColorOptions: { value: LabelColor; bg: string; label: string }[] = [
  { value: 'red', bg: 'bg-red-500', label: 'Red' },
  { value: 'orange', bg: 'bg-orange-500', label: 'Orange' },
  { value: 'yellow', bg: 'bg-yellow-500', label: 'Yellow' },
  { value: 'green', bg: 'bg-green-500', label: 'Green' },
  { value: 'blue', bg: 'bg-blue-500', label: 'Blue' },
  { value: 'purple', bg: 'bg-purple-500', label: 'Purple' },
  { value: 'pink', bg: 'bg-pink-500', label: 'Pink' },
  { value: 'gray', bg: 'bg-gray-500', label: 'Gray' },
];

export default function TaskModal({
  project,
  token,
  userId,
  isSuperUser,
  departments,
  onClose,
  onUpdate,
  onDelete,
}: TaskModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [members, setMembers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'subtasks' | 'attachments' | 'dependencies' | 'activity'>('details');
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState<LabelColor>('blue');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const { showToast, showError } = useNotifications();

  const [form, setForm] = useState({
    title: project.title,
    description: project.description,
    status: project.status,
    priority: project.priority,
    assigneeId: project.assigneeId || '',
    dueDate: project.dueDate || '',
    labels: project.labels || [] as Label[],
    subtasks: project.subtasks || [] as Subtask[],
    estimatedHours: project.estimatedHours || 0,
    loggedHours: project.loggedHours || 0,
    blockedBy: project.blockedBy || [] as string[],
  });
  const [availableTasks, setAvailableTasks] = useState<Project[]>([]);

  // Check if user can edit (is admin of the department or superuser)
  const canEdit = isSuperUser || departments.some(d =>
    d.id === project.departmentId && d.adminIds.includes(userId)
  );

  // Check if user is assignee
  const isAssignee = project.assigneeId === userId || project.assigneeIds?.includes(userId);

  // Check if user can change status (is assignee or admin)
  const canChangeStatus = canEdit || isAssignee;

  // Log time state
  const [showLogTime, setShowLogTime] = useState(false);
  const [logTimeValue, setLogTimeValue] = useState(project.loggedHours || 0);

  // Fetch department members for assignee dropdown
  const fetchMembers = useCallback(async () => {
    try {
      const [adminsRes, membersRes] = await Promise.all([
        fetch(`/api/departments/${project.departmentId}/admins`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/departments/${project.departmentId}/members`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const adminsData = await adminsRes.json();
      const membersData = await membersRes.json();

      const allMembers = [
        ...(adminsData.success ? adminsData.data : []),
        ...(membersData.success ? membersData.data : []),
      ];

      // Remove duplicates
      const uniqueMembers = allMembers.filter((m, i, arr) =>
        arr.findIndex(x => x.id === m.id) === i
      );

      setMembers(uniqueMembers);
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  }, [project.departmentId, token]);

  // Fetch available tasks for dependencies
  const fetchAvailableTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects?departmentId=${project.departmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        // Filter out current task
        setAvailableTasks(data.data.filter((t: Project) => t.id !== project.id));
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  }, [project.departmentId, project.id, token]);

  useEffect(() => {
    if (isEditing) {
      fetchMembers();
      fetchAvailableTasks();
    }
  }, [isEditing, fetchMembers, fetchAvailableTasks]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: project.id,
          title: form.title,
          description: form.description,
          status: form.status,
          priority: form.priority,
          assigneeId: form.assigneeId || null,
          dueDate: form.dueDate || null,
          labels: form.labels,
          subtasks: form.subtasks,
          estimatedHours: form.estimatedHours || null,
          loggedHours: form.loggedHours || null,
          blockedBy: form.blockedBy,
        }),
      });

      if (res.ok) {
        // Detect what changed
        const changedFields: string[] = [];
        if (form.title !== project.title) changedFields.push('title');
        if (form.description !== project.description) changedFields.push('description');
        if (form.priority !== project.priority) changedFields.push('priority');
        if (form.dueDate !== (project.dueDate || '')) changedFields.push('due date');
        if (form.status !== project.status) changedFields.push('status');

        const originalAssigneeId = project.assigneeId;
        const newAssigneeId = form.assigneeId || null;
        const assigneeChanged = newAssigneeId !== originalAssigneeId;

        if (assigneeChanged) {
          changedFields.push('assignee');
        }

        // Show toast for edited task
        if (changedFields.length > 0) {
          showToast({
            type: 'task_edited',
            taskTitle: form.title,
            taskId: project.id,
            byUser: 'You',
            details: { changedFields },
          });
        }

        // Send push notification if assignee changed
        if (assigneeChanged && newAssigneeId && newAssigneeId !== userId) {
          showToast({
            type: 'task_assigned',
            taskTitle: form.title,
            taskId: project.id,
            byUser: 'You',
          });

          fetch('/api/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              userId: newAssigneeId,
              notification: {
                title: 'Task Assigned',
                body: `You've been assigned to "${form.title}"`,
                url: `/dashboard`,
              },
            }),
          }).catch(() => {});
        }

        // Notify original assignee about changes (if not the current user)
        if (!assigneeChanged && project.assigneeId && project.assigneeId !== userId && changedFields.length > 0) {
          fetch('/api/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              userId: project.assigneeId,
              notification: {
                title: 'Task Updated',
                body: `"${form.title}" was updated (${changedFields.join(', ')})`,
                url: `/dashboard`,
              },
            }),
          }).catch(() => {});
        }

        onUpdate();
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to update task');
      }
    } catch {
      showError('Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/projects?id=${project.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        showToast({
          type: 'task_deleted',
          taskTitle: project.title,
          taskId: project.id,
          byUser: 'You',
        });
        onDelete();
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to delete task');
      }
    } catch {
      showError('Failed to delete task');
    } finally {
      setDeleting(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setAddingComment(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: newComment }),
      });

      if (res.ok) {
        showToast({
          type: 'comment_added',
          taskTitle: project.title,
          taskId: project.id,
          byUser: 'You',
        });

        // Notify assignee and creator about new comment (if different from current user)
        const usersToNotify: string[] = [];
        if (project.assigneeId && project.assigneeId !== userId && !usersToNotify.includes(project.assigneeId)) {
          usersToNotify.push(project.assigneeId);
        }
        if (project.createdBy && project.createdBy !== userId && !usersToNotify.includes(project.createdBy)) {
          usersToNotify.push(project.createdBy);
        }

        usersToNotify.forEach((targetUserId) => {
          fetch('/api/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              userId: targetUserId,
              notification: {
                title: 'New Comment',
                body: `New comment on "${project.title}"`,
                url: `/dashboard`,
              },
            }),
          }).catch(() => {});
        });

        setNewComment('');
        onUpdate();
      }
    } catch {
      showError('Failed to add comment');
    } finally {
      setAddingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await fetch(`/api/projects/${project.id}/comments?commentId=${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      onUpdate();
    } catch {
      showError('Failed to delete comment');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  // Label management
  const addLabel = () => {
    if (!newLabelName.trim()) return;
    const newLabel: Label = {
      id: Date.now().toString(),
      name: newLabelName.trim(),
      color: newLabelColor,
    };
    setForm({ ...form, labels: [...form.labels, newLabel] });
    setNewLabelName('');
  };

  const removeLabel = (labelId: string) => {
    setForm({ ...form, labels: form.labels.filter(l => l.id !== labelId) });
  };

  // Subtask management
  const addSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSubtask: Subtask = {
      id: Date.now().toString(),
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    setForm({ ...form, subtasks: [...form.subtasks, newSubtask] });
    setNewSubtaskTitle('');
  };

  const toggleSubtask = (subtaskId: string) => {
    setForm({
      ...form,
      subtasks: form.subtasks.map(s =>
        s.id === subtaskId ? { ...s, completed: !s.completed } : s
      ),
    });
  };

  const removeSubtask = (subtaskId: string) => {
    setForm({ ...form, subtasks: form.subtasks.filter(s => s.id !== subtaskId) });
  };

  const subtaskProgress = form.subtasks.length > 0
    ? Math.round((form.subtasks.filter(s => s.completed).length / form.subtasks.length) * 100)
    : 0;

  // Attachment management
  const handleAddAttachment = async () => {
    if (!attachmentUrl.trim()) {
      showError('Please enter a URL');
      return;
    }

    setUploadingFile(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/attachments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: attachmentName || attachmentUrl.split('/').pop() || 'Attachment',
          url: attachmentUrl,
          type: getFileType(attachmentUrl),
        }),
      });

      if (res.ok) {
        showToast({
          type: 'task_edited',
          taskTitle: project.title,
          taskId: project.id,
          byUser: 'You',
          details: { changedFields: ['attachment added'] },
        });
        setAttachmentUrl('');
        setAttachmentName('');
        onUpdate();
      } else {
        showError('Failed to add attachment');
      }
    } catch {
      showError('Failed to add attachment');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await fetch(`/api/projects/${project.id}/attachments?attachmentId=${attachmentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      onUpdate();
    } catch {
      showError('Failed to delete attachment');
    }
  };

  const getFileType = (url: string): string => {
    const ext = url.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
    if (['pdf'].includes(ext)) return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'document';
    if (['xls', 'xlsx'].includes(ext)) return 'spreadsheet';
    if (['mp4', 'mov', 'avi'].includes(ext)) return 'video';
    return 'file';
  };

  // Handle log time save
  const handleLogTime = async () => {
    try {
      const res = await fetch('/api/projects', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: project.id,
          loggedHours: logTimeValue,
        }),
      });

      if (res.ok) {
        showToast({
          type: 'task_edited',
          taskTitle: project.title,
          taskId: project.id,
          byUser: 'You',
          details: { changedFields: ['logged hours'] },
        });
        setShowLogTime(false);
        onUpdate();
      } else {
        showError('Failed to log time');
      }
    } catch {
      showError('Failed to log time');
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'pdf':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white md:rounded-lg shadow-xl w-full h-full md:h-auto md:max-w-2xl md:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEditing ? 'Edit Task' : 'Task Details'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl p-1 touch-manipulation">
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {isEditing ? (
            <>
              {/* Edit Form */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                  >
                    {priorityOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                  <select
                    value={form.assigneeId}
                    onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                  >
                    <option value="">Unassigned</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name || member.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={form.dueDate ? form.dueDate.split('T')[0] : ''}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.estimatedHours || ''}
                    onChange={(e) => setForm({ ...form, estimatedHours: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logged Hours</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.loggedHours || ''}
                    onChange={(e) => setForm({ ...form, loggedHours: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Labels Section */}
              <div className="pt-4 border-t">
                <label className="block text-sm font-medium text-gray-700 mb-2">Labels</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.labels.map((label) => (
                    <span
                      key={label.id}
                      className={`${labelColorOptions.find(c => c.value === label.color)?.bg} text-white text-xs px-2 py-1 rounded flex items-center gap-1`}
                    >
                      {label.name}
                      <button onClick={() => removeLabel(label.id)} className="hover:text-gray-200">&times;</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    placeholder="Label name"
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLabel())}
                  />
                  <div className="flex gap-1">
                    {labelColorOptions.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setNewLabelColor(color.value)}
                        className={`w-6 h-6 rounded ${color.bg} ${newLabelColor === color.value ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                        title={color.label}
                      />
                    ))}
                  </div>
                  <button
                    onClick={addLabel}
                    disabled={!newLabelName.trim()}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Subtasks Section */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Subtasks ({form.subtasks.filter(s => s.completed).length}/{form.subtasks.length})
                  </label>
                  {form.subtasks.length > 0 && (
                    <span className="text-xs text-gray-500">{subtaskProgress}% complete</span>
                  )}
                </div>
                {form.subtasks.length > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
                    <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${subtaskProgress}%` }} />
                  </div>
                )}
                <div className="space-y-2 mb-2 max-h-40 overflow-y-auto">
                  {form.subtasks.map((subtask) => (
                    <div key={subtask.id} className="flex items-center gap-2 group">
                      <input
                        type="checkbox"
                        checked={subtask.completed}
                        onChange={() => toggleSubtask(subtask.id)}
                        className="w-4 h-4"
                      />
                      <span className={`flex-1 text-sm ${subtask.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                        {subtask.title}
                      </span>
                      <button
                        onClick={() => removeSubtask(subtask.id)}
                        className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Add a subtask..."
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubtask())}
                  />
                  <button
                    onClick={addSubtask}
                    disabled={!newSubtaskTitle.trim()}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Dependencies Section */}
              <div className="pt-4 border-t">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Blocked By (Dependencies)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Select tasks that must be completed before this one.
                </p>
                <div className="border border-gray-300 rounded-md max-h-40 overflow-y-auto">
                  {availableTasks.length === 0 ? (
                    <p className="p-2 text-sm text-gray-500">No other tasks in this department</p>
                  ) : (
                    availableTasks.map((task) => (
                      <label
                        key={task.id}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={form.blockedBy.includes(task.id)}
                          onChange={() => {
                            setForm(prev => ({
                              ...prev,
                              blockedBy: prev.blockedBy.includes(task.id)
                                ? prev.blockedBy.filter(id => id !== task.id)
                                : [...prev.blockedBy, task.id]
                            }));
                          }}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-gray-700 truncate block">{task.title}</span>
                          <span className={`text-xs ${
                            task.status === 'done' ? 'text-green-600' : 'text-gray-400'
                          }`}>
                            {task.status === 'done' ? 'Done' : task.status.replace('_', ' ')}
                          </span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                {form.blockedBy.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    {form.blockedBy.length} dependency{form.blockedBy.length > 1 ? 'ies' : ''} selected
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              {/* View Mode */}
              <div>
                <h3 className="text-xl font-semibold text-gray-800">{project.title}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Department: {project.departmentName}
                </p>
                {/* Labels Display */}
                {project.labels && project.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {project.labels.map((label) => (
                      <span
                        key={label.id}
                        className={`${labelColorOptions.find(c => c.value === label.color)?.bg} text-white text-xs px-2 py-0.5 rounded`}
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {project.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <p className="text-gray-600 whitespace-pre-wrap">{project.description}</p>
                </div>
              )}

              {/* Tabs for Details, Subtasks, Attachments, Activity */}
              <div className="border-b border-gray-200">
                <nav className="flex space-x-4">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'details'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Details
                  </button>
                  <button
                    onClick={() => setActiveTab('subtasks')}
                    className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'subtasks'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Subtasks ({project.subtasks?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('attachments')}
                    className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'attachments'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Files ({project.attachments?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('dependencies')}
                    className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'dependencies'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Deps ({project.blockedBy?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('activity')}
                    className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'activity'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Activity ({project.activityLog?.length || 0})
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              {activeTab === 'details' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <span className="ml-2 font-medium text-gray-800">
                        {statusOptions.find(s => s.value === project.status)?.label}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Priority:</span>
                      <span className="ml-2 font-medium text-gray-800">
                        {priorityOptions.find(p => p.value === project.priority)?.label}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Assignee:</span>
                      <span className="ml-2 font-medium text-gray-800">
                        {project.assigneeName || 'Unassigned'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Due Date:</span>
                      <span className={`ml-2 font-medium ${
                        project.dueDate && new Date(project.dueDate) < new Date()
                          ? 'text-red-600'
                          : 'text-gray-800'
                      }`}>
                        {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'No due date'}
                        {project.dueDate && new Date(project.dueDate) < new Date() && ' (Overdue)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Created by:</span>
                      <span className="ml-2 font-medium text-gray-800">{project.creatorName}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <span className="ml-2 font-medium text-gray-800">
                        {formatDate(project.metadata.createdAt)}
                      </span>
                    </div>
                    {(project.estimatedHours || project.loggedHours) && (
                      <>
                        <div>
                          <span className="text-gray-500">Time Estimate:</span>
                          <span className="ml-2 font-medium text-gray-800">
                            {project.estimatedHours ? `${project.estimatedHours}h` : 'Not set'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Time Logged:</span>
                          <span className={`ml-2 font-medium ${
                            project.estimatedHours && project.loggedHours && project.loggedHours > project.estimatedHours
                              ? 'text-red-600'
                              : 'text-gray-800'
                          }`}>
                            {project.loggedHours || 0}h
                            {project.estimatedHours && ` / ${project.estimatedHours}h`}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Time Progress Bar */}
                  {project.estimatedHours && project.estimatedHours > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Time Progress</span>
                        <span>{Math.round(((project.loggedHours || 0) / project.estimatedHours) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            (project.loggedHours || 0) > project.estimatedHours
                              ? 'bg-red-500'
                              : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(((project.loggedHours || 0) / project.estimatedHours) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Log Time for assignees */}
                  {(isAssignee || canEdit) && (
                    <div className="pt-4 border-t">
                      {!showLogTime ? (
                        <button
                          onClick={() => setShowLogTime(true)}
                          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Log Time
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">Log Hours</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={logTimeValue}
                              onChange={(e) => setLogTimeValue(parseFloat(e.target.value) || 0)}
                              className="w-24 px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900"
                            />
                            <span className="text-sm text-gray-500">hours</span>
                            <button
                              onClick={handleLogTime}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setShowLogTime(false);
                                setLogTimeValue(project.loggedHours || 0);
                              }}
                              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                          {project.estimatedHours && (
                            <p className="text-xs text-gray-500">
                              Estimated: {project.estimatedHours}h
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quick Status Change for assignees */}
                  {canChangeStatus && !canEdit && (
                    <div className="pt-4 border-t">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Change Status</label>
                      <div className="flex gap-2">
                        {statusOptions.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={async () => {
                              await fetch('/api/projects', {
                                method: 'PUT',
                                headers: {
                                  'Content-Type': 'application/json',
                                  Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({ id: project.id, status: opt.value }),
                              });
                              onUpdate();
                            }}
                            className={`px-3 py-1 text-sm rounded-md ${
                              project.status === opt.value
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'subtasks' && (
                <div className="space-y-3">
                  {project.subtasks && project.subtasks.length > 0 ? (
                    <>
                      {/* Subtask Progress */}
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">
                            {project.subtasks.filter(s => s.completed).length} of {project.subtasks.length} completed
                          </span>
                          <span className="text-gray-500">
                            {Math.round((project.subtasks.filter(s => s.completed).length / project.subtasks.length) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{
                              width: `${(project.subtasks.filter(s => s.completed).length / project.subtasks.length) * 100}%`
                            }}
                          />
                        </div>
                      </div>

                      {/* Subtask List */}
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {project.subtasks.map((subtask) => (
                          <div
                            key={subtask.id}
                            className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                          >
                            <span className={`w-5 h-5 flex items-center justify-center rounded ${
                              subtask.completed ? 'bg-green-500 text-white' : 'border-2 border-gray-300'
                            }`}>
                              {subtask.completed && (
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </span>
                            <span className={`flex-1 text-sm ${
                              subtask.completed ? 'text-gray-400 line-through' : 'text-gray-700'
                            }`}>
                              {subtask.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-400 text-sm text-center py-4">No subtasks added</p>
                  )}
                </div>
              )}

              {activeTab === 'attachments' && (
                <div className="space-y-4">
                  {/* Attachment list */}
                  {project.attachments && project.attachments.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {project.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg group"
                        >
                          {getFileIcon(attachment.type)}
                          <div className="flex-1 min-w-0">
                            <a
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-blue-600 hover:underline truncate block"
                            >
                              {attachment.name}
                            </a>
                            <p className="text-xs text-gray-400">
                              {formatDate(attachment.uploadedAt)}
                            </p>
                          </div>
                          {canEdit && (
                            <button
                              onClick={() => handleDeleteAttachment(attachment.id)}
                              className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm text-center py-4">No attachments yet</p>
                  )}

                  {/* Add attachment form */}
                  {canEdit && (
                    <div className="pt-4 border-t border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Add Attachment (URL)
                      </label>
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={attachmentName}
                          onChange={(e) => setAttachmentName(e.target.value)}
                          placeholder="Name (optional)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900"
                        />
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={attachmentUrl}
                            onChange={(e) => setAttachmentUrl(e.target.value)}
                            placeholder="https://example.com/file.pdf"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900"
                          />
                          <button
                            onClick={handleAddAttachment}
                            disabled={uploadingFile || !attachmentUrl.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                          >
                            {uploadingFile ? '...' : 'Add'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'dependencies' && (
                <div className="space-y-4">
                  {/* Blocked by info */}
                  {project.blockedBy && project.blockedBy.length > 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-700 mb-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="font-medium">This task is blocked</span>
                      </div>
                      <p className="text-sm text-yellow-600">
                        Complete the blocking tasks below before working on this one.
                      </p>
                    </div>
                  )}

                  {/* Blocking tasks list */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Blocked By ({project.blockedBy?.length || 0})
                    </h4>
                    {project.blockedBy && project.blockedBy.length > 0 ? (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {availableTasks
                          .filter(t => project.blockedBy?.includes(t.id))
                          .map(task => (
                            <div
                              key={task.id}
                              className={`flex items-center justify-between p-2 rounded border ${
                                task.status === 'done'
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${
                                  task.status === 'done' ? 'bg-green-500' : 'bg-yellow-500'
                                }`} />
                                <span className={`text-sm ${
                                  task.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-700'
                                }`}>
                                  {task.title}
                                </span>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                task.status === 'done'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {task.status === 'done' ? 'Done' : task.status.replace('_', ' ')}
                              </span>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm">No dependencies</p>
                    )}
                  </div>

                  {/* Edit dependencies when in edit mode */}
                  {canEdit && (
                    <div className="pt-4 border-t border-gray-200">
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Edit Dependencies
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {project.activityLog && project.activityLog.length > 0 ? (
                    project.activityLog.slice().reverse().map((entry) => (
                      <div key={entry.id} className="flex items-start gap-3 text-sm">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                          {entry.userName?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="flex-1">
                          <div className="text-gray-800">
                            <span className="font-medium">{entry.userName}</span>
                            <span className="text-gray-500"> {entry.action}</span>
                          </div>
                          {entry.details && (
                            <p className="text-gray-500 text-xs mt-0.5">{entry.details}</p>
                          )}
                          <p className="text-gray-400 text-xs mt-1">
                            {formatDate(entry.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm text-center py-4">No activity recorded</p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Comments Section */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Comments ({project.comments.length})
            </h4>

            {/* Comment List */}
            <div className="space-y-3 max-h-48 overflow-y-auto mb-3">
              {project.comments.length === 0 ? (
                <p className="text-sm text-gray-400">No comments yet</p>
              ) : (
                project.comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800">{comment.userName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{formatDate(comment.createdAt)}</span>
                        {(comment.userId === userId || isSuperUser) && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{comment.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
              />
              <button
                onClick={handleAddComment}
                disabled={addingComment || !newComment.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {addingComment ? '...' : 'Add'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-between">
          <div>
            {canEdit && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
                >
                  Close
                </button>
                {canEdit && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                  >
                    Edit
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
