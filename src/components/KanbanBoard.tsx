'use client';

import { useState, useEffect, useCallback } from 'react';
import { Project, ProjectStatus, Department } from '@/types';
import KanbanColumn from './KanbanColumn';
import TaskModal from './TaskModal';
import CreateTaskModal from './CreateTaskModal';

interface KanbanBoardProps {
  token: string;
  departments: Department[];
  userId: string;
  isSuperUser: boolean;
  isAdmin: boolean;
}

const columns: { status: ProjectStatus; title: string }[] = [
  { status: 'backlog', title: 'Backlog' },
  { status: 'todo', title: 'To Do' },
  { status: 'in_progress', title: 'In Progress' },
  { status: 'done', title: 'Done' },
];

export default function KanbanBoard({ token, departments, userId, isSuperUser, isAdmin }: KanbanBoardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'all' | 'assigned'>('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForStatus, setCreateForStatus] = useState<ProjectStatus>('backlog');
  const [draggedProject, setDraggedProject] = useState<Project | null>(null);

  // Check if user can manage tasks (is admin of any department or superuser)
  const canManageTasks = isSuperUser || isAdmin || departments.some(d => d.adminIds.includes(userId));

  const fetchProjects = useCallback(async () => {
    try {
      let url = '/api/projects';
      const params = new URLSearchParams();

      if (selectedDepartment !== 'all') {
        params.append('departmentId', selectedDepartment);
      }

      if (viewMode === 'assigned') {
        params.append('assignedToMe', 'true');
      }

      if (params.toString()) {
        url += '?' + params.toString();
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setProjects(data.data);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  }, [token, selectedDepartment, viewMode]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleDragStart = (e: React.DragEvent, project: Project) => {
    setDraggedProject(project);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStatus: ProjectStatus) => {
    e.preventDefault();
    if (!draggedProject || draggedProject.status === newStatus) {
      setDraggedProject(null);
      return;
    }

    // Check permissions: admins can move any, others can only move their assigned tasks
    const canMove = isSuperUser ||
      departments.some(d => d.id === draggedProject.departmentId && d.adminIds.includes(userId)) ||
      draggedProject.assigneeId === userId;

    if (!canMove) {
      alert('You can only move tasks assigned to you');
      setDraggedProject(null);
      return;
    }

    // Optimistic update
    setProjects(prev => prev.map(p =>
      p.id === draggedProject.id ? { ...p, status: newStatus } : p
    ));

    try {
      const res = await fetch('/api/projects/reorder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId: draggedProject.id,
          newStatus,
        }),
      });

      if (!res.ok) {
        // Revert on error
        fetchProjects();
      }
    } catch {
      fetchProjects();
    }

    setDraggedProject(null);
  };

  const handleAddTask = (status: ProjectStatus) => {
    setCreateForStatus(status);
    setShowCreateModal(true);
  };

  const handleTaskCreated = () => {
    setShowCreateModal(false);
    fetchProjects();
  };

  const handleTaskUpdated = () => {
    setSelectedProject(null);
    fetchProjects();
  };

  const getProjectsByStatus = (status: ProjectStatus) => {
    return projects.filter(p => p.status === status).sort((a, b) => a.order - b.order);
  };

  // Determine which department to use for creating tasks
  const departmentForCreate = selectedDepartment !== 'all'
    ? selectedDepartment
    : departments[0]?.id || '';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
        {/* Department filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Department:</label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">View:</label>
          <div className="flex rounded-md border border-gray-300 overflow-hidden">
            <button
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 text-sm ${
                viewMode === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              All Tasks
            </button>
            <button
              onClick={() => setViewMode('assigned')}
              className={`px-3 py-1.5 text-sm border-l ${
                viewMode === 'assigned'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              My Tasks
            </button>
          </div>
        </div>

        {/* Add task button */}
        {canManageTasks && (
          <button
            onClick={() => handleAddTask('backlog')}
            className="ml-auto px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Task
          </button>
        )}
      </div>

      {/* Kanban Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map(({ status, title }) => (
          <KanbanColumn
            key={status}
            status={status}
            title={title}
            projects={getProjectsByStatus(status)}
            onTaskClick={setSelectedProject}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onAddTask={() => handleAddTask(status)}
            canAddTask={canManageTasks}
          />
        ))}
      </div>

      {/* Task Detail Modal */}
      {selectedProject && (
        <TaskModal
          project={selectedProject}
          token={token}
          userId={userId}
          isSuperUser={isSuperUser}
          departments={departments}
          onClose={() => setSelectedProject(null)}
          onUpdate={handleTaskUpdated}
          onDelete={handleTaskUpdated}
        />
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          token={token}
          departments={departments}
          initialDepartmentId={departmentForCreate}
          initialStatus={createForStatus}
          userId={userId}
          isSuperUser={isSuperUser}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleTaskCreated}
        />
      )}
    </div>
  );
}
