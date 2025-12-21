'use client';

import { useState, useEffect, useCallback } from 'react';
import { Department, Priority, ProjectStatus, User } from '@/types';

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

  const [form, setForm] = useState({
    departmentId: initialDepartmentId,
    title: '',
    description: '',
    status: initialStatus,
    priority: 'medium' as Priority,
    assigneeId: '',
    dueDate: '',
  });

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
      alert('Title is required');
      return;
    }

    if (!form.departmentId) {
      alert('Please select a department');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          assigneeId: form.assigneeId || null,
          dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        }),
      });

      if (res.ok) {
        onCreate();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create task');
      }
    } catch {
      alert('Failed to create task');
    } finally {
      setSaving(false);
    }
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

            {/* Assignee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
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
