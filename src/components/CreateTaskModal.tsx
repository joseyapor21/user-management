'use client';

import { useState, useEffect, useCallback } from 'react';
import { Department, Priority, ProjectStatus, User, RecurrenceType } from '@/types';
import { useNotifications } from '@/hooks/useNotifications';

interface CreateTaskModalProps {
  token: string;
  departments: Department[];
  initialDepartmentId: string;
  initialStatus: ProjectStatus;
  userId: string;
  isSuperUser: boolean;
  onClose: () => void;
  onCreate: () => void;
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

const recurrenceOptions: { value: RecurrenceType; label: string }[] = [
  { value: 'none', label: 'No Repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function CreateTaskModal({
  token,
  departments,
  initialDepartmentId,
  initialStatus,
  userId,
  isSuperUser,
  onClose,
  onCreate,
}: CreateTaskModalProps) {
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<User[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const { showToast, showError } = useNotifications();

  const [form, setForm] = useState({
    departmentId: initialDepartmentId,
    title: '',
    description: '',
    status: initialStatus,
    priority: 'medium' as Priority,
    assigneeId: '',
    assigneeIds: [] as string[],
    dueDate: '',
    estimatedHours: 0,
    recurrence: 'none' as RecurrenceType,
    recurrenceEndDate: '',
  });
  const [showMultiAssign, setShowMultiAssign] = useState(false);

  // Filter departments where user is admin (or all if superuser)
  const availableDepartments = isSuperUser
    ? departments
    : departments.filter(d => d.adminIds.includes(userId));

  // Fetch department members for assignee dropdown
  const fetchMembers = useCallback(async (deptId: string) => {
    if (!deptId) return;

    setLoadingMembers(true);
    try {
      const [adminsRes, membersRes] = await Promise.all([
        fetch(`/api/departments/${deptId}/admins`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/departments/${deptId}/members`, {
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
    } finally {
      setLoadingMembers(false);
    }
  }, [token]);

  useEffect(() => {
    if (form.departmentId) {
      fetchMembers(form.departmentId);
    }
  }, [form.departmentId, fetchMembers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      showError('Title is required');
      return;
    }

    if (!form.departmentId) {
      showError('Please select a department');
      return;
    }

    setSaving(true);
    try {
      // Determine primary assignee and additional assignees
      const primaryAssignee = showMultiAssign
        ? (form.assigneeIds[0] || null)
        : (form.assigneeId || null);
      const allAssignees = showMultiAssign ? form.assigneeIds : (form.assigneeId ? [form.assigneeId] : []);

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          assigneeId: primaryAssignee,
          assigneeIds: allAssignees,
          dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
          estimatedHours: form.estimatedHours || null,
          recurrence: form.recurrence !== 'none' ? {
            type: form.recurrence,
            endDate: form.recurrenceEndDate ? new Date(form.recurrenceEndDate).toISOString() : null,
          } : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();

        showToast({
          type: 'task_created',
          taskTitle: form.title,
          taskId: data.data?.id || '',
          byUser: 'You',
        });

        // Send push notification to all assignees
        const assigneesToNotify = allAssignees.filter(id => id !== userId);
        assigneesToNotify.forEach(assigneeId => {
          fetch('/api/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              userId: assigneeId,
              notification: {
                title: 'New Task Assigned',
                body: `You've been assigned to "${form.title}"`,
                url: `/dashboard`,
              },
            }),
          }).catch(() => {});
        });

        onCreate();
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to create task');
      }
    } catch {
      showError('Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  const toggleAssignee = (memberId: string) => {
    setForm(prev => ({
      ...prev,
      assigneeIds: prev.assigneeIds.includes(memberId)
        ? prev.assigneeIds.filter(id => id !== memberId)
        : [...prev.assigneeIds, memberId]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Create New Task</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            &times;
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value, assigneeId: '' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
              required
            >
              <option value="">Select department...</option>
              {availableDepartments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
              placeholder="Enter task title"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
              placeholder="Enter task description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
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

            {/* Priority */}
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

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
              />
            </div>

            {/* Estimated Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Est. Hours</label>
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
          </div>

          {/* Recurrence Section */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Repeat
              </label>
              <select
                value={form.recurrence}
                onChange={(e) => setForm({ ...form, recurrence: e.target.value as RecurrenceType })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
              >
                {recurrenceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {form.recurrence !== 'none' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Repeat Until
                </label>
                <input
                  type="date"
                  value={form.recurrenceEndDate}
                  onChange={(e) => setForm({ ...form, recurrenceEndDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                  placeholder="Optional"
                />
              </div>
            )}
          </div>

          {/* Assignee Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Assignee{showMultiAssign ? 's' : ''}
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowMultiAssign(!showMultiAssign);
                  // Clear selections when toggling
                  setForm({ ...form, assigneeId: '', assigneeIds: [] });
                }}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                {showMultiAssign ? 'Single Assignee' : 'Multiple Assignees'}
              </button>
            </div>

            {!showMultiAssign ? (
              <select
                value={form.assigneeId}
                onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                disabled={loadingMembers || !form.departmentId}
              >
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name || member.email}
                  </option>
                ))}
              </select>
            ) : (
              <div className="border border-gray-300 rounded-md max-h-32 overflow-y-auto">
                {loadingMembers ? (
                  <p className="p-2 text-sm text-gray-500">Loading members...</p>
                ) : members.length === 0 ? (
                  <p className="p-2 text-sm text-gray-500">No members in this department</p>
                ) : (
                  members.map((member) => (
                    <label
                      key={member.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={form.assigneeIds.includes(member.id)}
                        onChange={() => toggleAssignee(member.id)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{member.name || member.email}</span>
                    </label>
                  ))
                )}
              </div>
            )}
            {showMultiAssign && form.assigneeIds.length > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                {form.assigneeIds.length} assignee{form.assigneeIds.length > 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
