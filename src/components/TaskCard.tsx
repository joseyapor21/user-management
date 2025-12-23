'use client';

import { Project, Priority, LabelColor } from '@/types';

interface TaskCardProps {
  project: Project;
  onClick: () => void;
  onDragStart: (e: React.DragEvent, project: Project) => void;
}

const priorityColors: Record<Priority, { bg: string; text: string; border: string }> = {
  low: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  urgent: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
};

const priorityLabels: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

const labelColors: Record<LabelColor, string> = {
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  gray: 'bg-gray-500',
};

export default function TaskCard({ project, onClick, onDragStart }: TaskCardProps) {
  const priority = priorityColors[project.priority] || priorityColors.medium;
  const isOverdue = project.dueDate && new Date(project.dueDate) < new Date();

  // Calculate subtask progress
  const subtasks = project.subtasks || [];
  const completedSubtasks = subtasks.filter(s => s.completed).length;
  const hasSubtasks = subtasks.length > 0;
  const isBlocked = project.blockedBy && project.blockedBy.length > 0;
  const isRecurring = project.recurrence && project.recurrence.type !== 'none';

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, project)}
      onClick={onClick}
      className={`bg-white rounded-lg shadow-sm border ${priority.border} p-3 cursor-pointer hover:shadow-md transition-shadow`}
    >
      {/* Labels */}
      {project.labels && project.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {project.labels.slice(0, 3).map((label) => (
            <span
              key={label.id}
              className={`${labelColors[label.color]} text-white text-xs px-1.5 py-0.5 rounded`}
              title={label.name}
            >
              {label.name.length > 10 ? label.name.substring(0, 10) + '...' : label.name}
            </span>
          ))}
          {project.labels.length > 3 && (
            <span className="text-xs text-gray-400">+{project.labels.length - 3}</span>
          )}
        </div>
      )}

      {/* Blocked indicator */}
      {isBlocked && (
        <div className="flex items-center gap-1 mb-1 text-yellow-600">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-xs">Blocked</span>
        </div>
      )}

      {/* Recurring indicator */}
      {isRecurring && (
        <div className="flex items-center gap-1 mb-1 text-blue-600">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-xs capitalize">{project.recurrence?.type}</span>
        </div>
      )}

      {/* Title */}
      <h4 className="font-medium text-gray-800 text-sm mb-2 line-clamp-2">
        {project.title}
      </h4>

      {/* Description preview */}
      {project.description && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-2">
          {project.description}
        </p>
      )}

      {/* Meta row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Priority badge */}
        <span className={`text-xs px-2 py-0.5 rounded-full ${priority.bg} ${priority.text}`}>
          {priorityLabels[project.priority]}
        </span>

        {/* Due date */}
        {project.dueDate && (
          <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
            {isOverdue ? 'Overdue: ' : ''}{formatDate(project.dueDate)}
          </span>
        )}
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        {/* Assignees */}
        {project.assigneeIds && project.assigneeIds.length > 1 ? (
          <div className="flex items-center">
            <div className="flex -space-x-1">
              {project.assigneeIds.slice(0, 3).map((_, idx) => (
                <div
                  key={idx}
                  className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium border border-white"
                  title={project.assigneeNames?.[idx]}
                >
                  {project.assigneeNames?.[idx]?.charAt(0).toUpperCase() || '?'}
                </div>
              ))}
            </div>
            {project.assigneeIds.length > 3 && (
              <span className="text-xs text-gray-500 ml-1">+{project.assigneeIds.length - 3}</span>
            )}
          </div>
        ) : project.assigneeName ? (
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium">
              {project.assigneeName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-gray-600 truncate max-w-[80px]">
              {project.assigneeName}
            </span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">Unassigned</span>
        )}

        {/* Comments, Attachments & Subtasks count */}
        <div className="flex items-center gap-2">
          {hasSubtasks && (
            <span className="text-xs text-gray-400 flex items-center gap-0.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              {completedSubtasks}/{subtasks.length}
            </span>
          )}
          {project.comments && project.comments.length > 0 && (
            <span className="text-xs text-gray-400 flex items-center gap-0.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {project.comments.length}
            </span>
          )}
          {project.attachments && project.attachments.length > 0 && (
            <span className="text-xs text-gray-400 flex items-center gap-0.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              {project.attachments.length}
            </span>
          )}
          {project.estimatedHours && (
            <span className="text-xs text-gray-400 flex items-center gap-0.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {project.loggedHours || 0}/{project.estimatedHours}h
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
