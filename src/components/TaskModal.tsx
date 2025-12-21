'use client';

import { useState, useEffect, useCallback } from 'react';
import { Project, Department, Priority, ProjectStatus, User } from '@/types';

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

  const [form, setForm] = useState({
    title: project.title,
    description: project.description,
    status: project.status,
    priority: project.priority,
    assigneeId: project.assigneeId || '',
    dueDate: project.dueDate || '',
  });

  // Check if user can edit (is admin of the department or superuser)
  const canEdit = isSuperUser || departments.some(d =>
    d.id === project.departmentId && d.adminIds.includes(userId)
  );

  // Check if user can change status (is assignee or admin)
  const canChangeStatus = canEdit || project.assigneeId === userId;

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

  useEffect(() => {
    if (isEditing) {
      fetchMembers();
    }
  }, [isEditing, fetchMembers]);

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
          ...form,
          assigneeId: form.assigneeId || null,
          dueDate: form.dueDate || null,
        }),
      });

      if (res.ok) {
        onUpdate();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update task');
      }
    } catch {
      alert('Failed to update task');
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
        onDelete();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete task');
      }
    } catch {
      alert('Failed to delete task');
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
        setNewComment('');
        onUpdate();
      }
    } catch {
      alert('Failed to add comment');
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
      alert('Failed to delete comment');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEditing ? 'Edit Task' : 'Task Details'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
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

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              {project.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <p className="text-gray-600 whitespace-pre-wrap">{project.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
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
                  <span className="ml-2 font-medium text-gray-800">
                    {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'No due date'}
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
              </div>

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
