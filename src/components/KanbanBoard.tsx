'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Project, ProjectStatus, Department, Priority, CustomColumn } from '@/types';
import KanbanColumn from './KanbanColumn';
import TaskModal from './TaskModal';
import CreateTaskModal from './CreateTaskModal';
import CalendarView from './CalendarView';
import ColumnManager from './ColumnManager';
import TemplateSelector from './TemplateSelector';
import DraftsModal from './DraftsModal';
import { useNotifications } from '@/hooks/useNotifications';

interface KanbanBoardProps {
  token: string;
  departments: Department[];
  userId: string;
  userName: string;
  isSuperUser: boolean;
  isAdmin: boolean;
}

const DEFAULT_COLUMNS: CustomColumn[] = [
  { id: 'backlog', name: 'Backlog', order: 0, color: '#6b7280' },
  { id: 'todo', name: 'To Do', order: 1, color: '#fbbf24' },
  { id: 'in_progress', name: 'In Progress', order: 2, color: '#8b5cf6' },
  { id: 'done', name: 'Done', order: 3, color: '#22c55e' },
];

type DueDateFilter = 'all' | 'overdue' | 'today' | 'week' | 'no_date';

export default function KanbanBoard({ token, departments, userId, userName, isSuperUser, isAdmin }: KanbanBoardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'all' | 'assigned'>('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForStatus, setCreateForStatus] = useState<ProjectStatus>('backlog');
  const [draggedProject, setDraggedProject] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [dueDateFilter, setDueDateFilter] = useState<DueDateFilter>('all');
  const [showStats, setShowStats] = useState(false);
  const [boardView, setBoardView] = useState<'standard' | 'swimlane' | 'calendar'>('standard');
  const [swimlaneBy, setSwimlaneBy] = useState<'priority' | 'assignee'>('priority');
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>(DEFAULT_COLUMNS);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const { showToast, showError } = useNotifications();

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

  // Fetch custom columns when department changes
  const fetchColumns = useCallback(async (deptId: string) => {
    if (deptId === 'all') {
      setCustomColumns(DEFAULT_COLUMNS);
      return;
    }

    try {
      const res = await fetch(`/api/departments/${deptId}/columns`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setCustomColumns(data.data);
      } else {
        setCustomColumns(DEFAULT_COLUMNS);
      }
    } catch {
      setCustomColumns(DEFAULT_COLUMNS);
    }
  }, [token]);

  useEffect(() => {
    fetchColumns(selectedDepartment);
  }, [selectedDepartment, fetchColumns]);

  const handleDragStart = (e: React.DragEvent, project: Project) => {
    setDraggedProject(project);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
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
      showError('You can only move tasks assigned to you');
      setDraggedProject(null);
      return;
    }

    const oldStatus = draggedProject.status;

    // Optimistic update
    setProjects(prev => prev.map(p =>
      p.id === draggedProject.id ? { ...p, status: newStatus as ProjectStatus } : p
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

      if (res.ok) {
        // Show toast notification for task moved
        showToast({
          type: 'task_moved',
          taskTitle: draggedProject.title,
          taskId: draggedProject.id,
          byUser: 'You',
          details: {
            oldStatus,
            newStatus,
          },
        });

        // Send push notification to assignee if different from current user
        if (draggedProject.assigneeId && draggedProject.assigneeId !== userId) {
          const statusLabels: Record<string, string> = {
            backlog: 'Backlog',
            todo: 'To Do',
            in_progress: 'In Progress',
            done: 'Done',
          };
          const oldStatusLabel = statusLabels[oldStatus] || oldStatus;
          const newStatusLabel = statusLabels[newStatus] || newStatus;

          fetch('/api/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              userId: draggedProject.assigneeId,
              notification: {
                title: 'Task Status Changed',
                body: `"${draggedProject.title}" moved from ${oldStatusLabel} to ${newStatusLabel}`,
                url: `/dashboard`,
                taskId: draggedProject.id,
                department: draggedProject.departmentName,
                priority: draggedProject.priority,
                dueDate: draggedProject.dueDate,
              },
            }),
          }).catch(() => {});
        }
      } else {
        // Revert on error
        showError('Failed to move task');
        fetchProjects();
      }
    } catch {
      showError('Failed to move task');
      fetchProjects();
    }

    setDraggedProject(null);
  };

  const handleAddTask = (status: string) => {
    setCreateForStatus(status as ProjectStatus);
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

  // Filter projects based on search, priority, and due date
  const filteredProjects = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    return projects.filter(p => {
      // Search filter - check title, description, and labels
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(query);
        const matchesDescription = p.description?.toLowerCase().includes(query);
        const matchesLabels = p.labels?.some(l => l.name.toLowerCase().includes(query));
        const matchesAssignee = p.assigneeName?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDescription && !matchesLabels && !matchesAssignee) {
          return false;
        }
      }

      // Priority filter
      if (priorityFilter !== 'all' && p.priority !== priorityFilter) {
        return false;
      }

      // Due date filter
      if (dueDateFilter !== 'all') {
        const dueDate = p.dueDate ? new Date(p.dueDate) : null;
        switch (dueDateFilter) {
          case 'overdue':
            if (!dueDate || dueDate >= today) return false;
            break;
          case 'today':
            if (!dueDate) return false;
            const dueDateDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
            if (dueDateDay.getTime() !== today.getTime()) return false;
            break;
          case 'week':
            if (!dueDate || dueDate < today || dueDate > weekFromNow) return false;
            break;
          case 'no_date':
            if (dueDate) return false;
            break;
        }
      }

      return true;
    });
  }, [projects, searchQuery, priorityFilter, dueDateFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = filteredProjects.length;
    const byStatus = {
      backlog: filteredProjects.filter(p => p.status === 'backlog').length,
      todo: filteredProjects.filter(p => p.status === 'todo').length,
      in_progress: filteredProjects.filter(p => p.status === 'in_progress').length,
      done: filteredProjects.filter(p => p.status === 'done').length,
    };
    const overdue = filteredProjects.filter(p => p.dueDate && new Date(p.dueDate) < new Date()).length;
    const urgent = filteredProjects.filter(p => p.priority === 'urgent').length;
    const high = filteredProjects.filter(p => p.priority === 'high').length;
    const completionRate = total > 0 ? Math.round((byStatus.done / total) * 100) : 0;

    // Time tracking stats
    const totalEstimated = filteredProjects.reduce((sum, p) => sum + (p.estimatedHours || 0), 0);
    const totalLogged = filteredProjects.reduce((sum, p) => sum + (p.loggedHours || 0), 0);

    return { total, byStatus, overdue, urgent, high, completionRate, totalEstimated, totalLogged };
  }, [filteredProjects]);

  const getProjectsByStatus = (status: string) => {
    return filteredProjects.filter(p => p.status === status).sort((a, b) => a.order - b.order);
  };

  const getProjectsByStatusAndSwimlane = (status: string, swimlaneKey: string) => {
    return filteredProjects.filter(p => {
      if (p.status !== status) return false;
      if (swimlaneBy === 'priority') {
        return p.priority === swimlaneKey;
      } else {
        return (p.assigneeId || 'unassigned') === swimlaneKey;
      }
    }).sort((a, b) => a.order - b.order);
  };

  // Get unique swimlane keys
  const swimlanes = useMemo(() => {
    if (swimlaneBy === 'priority') {
      return [
        { key: 'urgent', label: 'Urgent', color: 'bg-red-100 border-red-300' },
        { key: 'high', label: 'High', color: 'bg-orange-100 border-orange-300' },
        { key: 'medium', label: 'Medium', color: 'bg-yellow-100 border-yellow-300' },
        { key: 'low', label: 'Low', color: 'bg-green-100 border-green-300' },
      ];
    } else {
      // Group by assignee
      const assigneeMap = new Map<string, string>();
      filteredProjects.forEach(p => {
        const key = p.assigneeId || 'unassigned';
        const name = p.assigneeName || 'Unassigned';
        if (!assigneeMap.has(key)) {
          assigneeMap.set(key, name);
        }
      });
      return Array.from(assigneeMap.entries()).map(([key, name]) => ({
        key,
        label: name,
        color: key === 'unassigned' ? 'bg-gray-100 border-gray-300' : 'bg-blue-50 border-blue-200',
      }));
    }
  }, [swimlaneBy, filteredProjects]);

  const clearFilters = () => {
    setSearchQuery('');
    setPriorityFilter('all');
    setDueDateFilter('all');
  };

  const hasActiveFilters = searchQuery || priorityFilter !== 'all' || dueDateFilter !== 'all';

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
      {/* Search and Filters */}
      <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm space-y-3 md:space-y-4">
        {/* Top row - Search and Add button */}
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          {/* Search input */}
          <div className="relative flex-1 min-w-0 order-1">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Add task button - prominent on mobile */}
          {canManageTasks && (
            <button
              onClick={() => handleAddTask('backlog')}
              className="order-2 px-3 md:px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 flex items-center gap-1 md:gap-2 whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">New Task</span>
              <span className="sm:hidden">Add</span>
            </button>
          )}

          {/* Board view toggle */}
          <div className="flex rounded-md border border-gray-300 overflow-hidden order-3 w-full sm:w-auto">
            <button
              onClick={() => setBoardView('standard')}
              className={`flex-1 sm:flex-none px-3 py-2 text-sm ${
                boardView === 'standard'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setBoardView('swimlane')}
              className={`flex-1 sm:flex-none px-3 py-2 text-sm border-l ${
                boardView === 'swimlane'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Swimlanes
            </button>
            <button
              onClick={() => setBoardView('calendar')}
              className={`flex-1 sm:flex-none px-3 py-2 text-sm border-l ${
                boardView === 'calendar'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Calendar
            </button>
          </div>

          {/* Swimlane by selector */}
          {boardView === 'swimlane' && (
            <select
              value={swimlaneBy}
              onChange={(e) => setSwimlaneBy(e.target.value as 'priority' | 'assignee')}
              className="order-4 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900"
            >
              <option value="priority">By Priority</option>
              <option value="assignee">By Assignee</option>
            </select>
          )}

          {/* Stats toggle button - hidden on small mobile */}
          <button
            onClick={() => setShowStats(!showStats)}
            className={`hidden sm:flex order-5 px-3 py-2 text-sm rounded-md items-center gap-2 ${
              showStats
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Stats
          </button>

          {/* Drafts button */}
          {canManageTasks && (
            <button
              onClick={() => setShowDraftsModal(true)}
              className="hidden sm:flex order-5 px-3 py-2 text-sm rounded-md items-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              Drafts
            </button>
          )}

          {/* Column manager button - only show when a specific department is selected */}
          {selectedDepartment !== 'all' && canManageTasks && (
            <>
              <button
                onClick={() => setShowColumnManager(true)}
                className="hidden md:flex order-6 px-3 py-2 text-sm rounded-md items-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                Columns
              </button>
              <button
                onClick={() => setShowTemplateSelector(true)}
                className="hidden md:flex order-7 px-3 py-2 text-sm rounded-md items-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
                Templates
              </button>
            </>
          )}
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          {/* Department filter */}
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Due date filter - hidden on very small screens */}
          <select
            value={dueDateFilter}
            onChange={(e) => setDueDateFilter(e.target.value as DueDateFilter)}
            className="hidden sm:block px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          >
            <option value="all">All Dates</option>
            <option value="overdue">Overdue</option>
            <option value="today">Due Today</option>
            <option value="week">This Week</option>
            <option value="no_date">No Date</option>
          </select>

          {/* View mode toggle */}
          <div className="flex rounded-md border border-gray-300 overflow-hidden">
            <button
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 text-sm ${
                viewMode === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setViewMode('assigned')}
              className={`px-3 py-1.5 text-sm border-l ${
                viewMode === 'assigned'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Mine
            </button>
          </div>

          {/* Clear filters button */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-2 py-1.5 text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>

        {/* Active filters indicator */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Showing {filteredProjects.length} of {projects.length} tasks</span>
            {searchQuery && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">Search: &quot;{searchQuery}&quot;</span>
            )}
            {priorityFilter !== 'all' && (
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded capitalize">{priorityFilter} Priority</span>
            )}
            {dueDateFilter !== 'all' && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                {dueDateFilter === 'overdue' ? 'Overdue' :
                 dueDateFilter === 'today' ? 'Due Today' :
                 dueDateFilter === 'week' ? 'Due This Week' : 'No Due Date'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stats Panel */}
      {showStats && (
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
              <div className="text-xs text-gray-500">Total Tasks</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.completionRate}%</div>
              <div className="text-xs text-gray-500">Completed</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{stats.byStatus.backlog}</div>
              <div className="text-xs text-gray-500">Backlog</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.byStatus.todo}</div>
              <div className="text-xs text-gray-500">To Do</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.byStatus.in_progress}</div>
              <div className="text-xs text-gray-500">In Progress</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.byStatus.done}</div>
              <div className="text-xs text-gray-500">Done</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
              <div className="text-xs text-gray-500">Overdue</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{stats.urgent + stats.high}</div>
              <div className="text-xs text-gray-500">High Priority</div>
            </div>
          </div>
          {/* Time tracking summary */}
          {(stats.totalEstimated > 0 || stats.totalLogged > 0) && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-600">Time Tracking:</span>
                <span className="font-medium text-gray-800">{stats.totalLogged}h logged</span>
                <span className="text-gray-400">/</span>
                <span className="text-gray-600">{stats.totalEstimated}h estimated</span>
                {stats.totalEstimated > 0 && (
                  <div className="flex-1 max-w-xs">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          stats.totalLogged > stats.totalEstimated ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min((stats.totalLogged / stats.totalEstimated) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Kanban Columns - Standard View */}
      {boardView === 'standard' && (
        <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory md:snap-none">
          {customColumns.sort((a, b) => a.order - b.order).map((column) => (
            <KanbanColumn
              key={column.id}
              status={column.id as ProjectStatus}
              title={column.name}
              projects={getProjectsByStatus(column.id)}
              onTaskClick={setSelectedProject}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
              onAddTask={() => handleAddTask(column.id)}
              canAddTask={canManageTasks}
              columnColor={column.color}
            />
          ))}
        </div>
      )}

      {/* Kanban Columns - Swimlane View */}
      {boardView === 'swimlane' && (
        <div className="space-y-6 overflow-x-auto pb-4">
          {swimlanes.map((swimlane) => {
            const swimlaneTaskCount = customColumns.reduce(
              (acc, col) => acc + getProjectsByStatusAndSwimlane(col.id, swimlane.key).length,
              0
            );

            if (swimlaneTaskCount === 0 && swimlaneBy === 'assignee') return null;

            return (
              <div key={swimlane.key} className={`rounded-lg border ${swimlane.color} p-4`}>
                {/* Swimlane Header */}
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-semibold text-gray-800">{swimlane.label}</h3>
                  <span className="text-sm text-gray-500">({swimlaneTaskCount} tasks)</span>
                </div>

                {/* Columns within swimlane */}
                <div className="flex gap-4">
                  {customColumns.sort((a, b) => a.order - b.order).map((column) => {
                    const tasks = getProjectsByStatusAndSwimlane(column.id, swimlane.key);
                    return (
                      <div
                        key={`${swimlane.key}-${column.id}`}
                        className="flex-1 min-w-[250px] bg-white rounded-lg shadow-sm"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, column.id)}
                      >
                        <div className="p-3 border-b border-gray-100">
                          <h4 className="text-sm font-medium text-gray-600">
                            {column.name} <span className="text-gray-400">({tasks.length})</span>
                          </h4>
                        </div>
                        <div className="p-2 space-y-2 min-h-[100px]">
                          {tasks.map((project) => (
                            <div
                              key={project.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, project)}
                              onClick={() => setSelectedProject(project)}
                              className="bg-gray-50 hover:bg-gray-100 rounded p-2 cursor-pointer border border-gray-200"
                            >
                              <p className="text-sm font-medium text-gray-800 truncate">
                                {project.title}
                              </p>
                              {project.dueDate && (
                                <p className={`text-xs mt-1 ${
                                  new Date(project.dueDate) < new Date()
                                    ? 'text-red-500'
                                    : 'text-gray-400'
                                }`}>
                                  {new Date(project.dueDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Calendar View */}
      {boardView === 'calendar' && (
        <CalendarView
          projects={filteredProjects}
          onTaskClick={setSelectedProject}
        />
      )}

      {/* Task Detail Modal */}
      {selectedProject && (
        <TaskModal
          project={selectedProject}
          token={token}
          userId={userId}
          userName={userName}
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

      {/* Column Manager Modal */}
      {showColumnManager && selectedDepartment !== 'all' && (
        <ColumnManager
          columns={customColumns}
          token={token}
          departmentId={selectedDepartment}
          onClose={() => setShowColumnManager(false)}
          onSave={(newColumns) => {
            setCustomColumns(newColumns);
            setShowColumnManager(false);
          }}
        />
      )}

      {/* Template Selector Modal */}
      {showTemplateSelector && selectedDepartment !== 'all' && (
        <TemplateSelector
          token={token}
          departmentId={selectedDepartment}
          onClose={() => setShowTemplateSelector(false)}
          onApply={(newColumns) => {
            setCustomColumns(newColumns);
            setShowTemplateSelector(false);
            fetchProjects(); // Refresh to see any sample tasks
          }}
        />
      )}

      {/* Drafts Modal */}
      {showDraftsModal && (
        <DraftsModal
          token={token}
          userId={userId}
          isSuperUser={isSuperUser}
          departments={departments}
          onClose={() => setShowDraftsModal(false)}
          onRestore={() => {
            fetchProjects();
          }}
        />
      )}
    </div>
  );
}
