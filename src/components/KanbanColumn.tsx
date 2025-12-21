'use client';

import { Project, ProjectStatus } from '@/types';
import TaskCard from './TaskCard';

interface KanbanColumnProps {
  status: ProjectStatus;
  title: string;
  projects: Project[];
  onTaskClick: (project: Project) => void;
  onDragStart: (e: React.DragEvent, project: Project) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: ProjectStatus) => void;
  onAddTask?: () => void;
  canAddTask: boolean;
}

const columnColors: Record<ProjectStatus, { header: string; bg: string }> = {
  backlog: { header: 'bg-gray-500', bg: 'bg-gray-50' },
  todo: { header: 'bg-blue-500', bg: 'bg-blue-50' },
  in_progress: { header: 'bg-yellow-500', bg: 'bg-yellow-50' },
  done: { header: 'bg-green-500', bg: 'bg-green-50' },
};

export default function KanbanColumn({
  status,
  title,
  projects,
  onTaskClick,
  onDragStart,
  onDragOver,
  onDrop,
  onAddTask,
  canAddTask,
}: KanbanColumnProps) {
  const colors = columnColors[status];

  return (
    <div className={`flex flex-col rounded-lg ${colors.bg} min-w-[280px] max-w-[320px] flex-1`}>
      {/* Column Header */}
      <div className={`${colors.header} text-white px-3 py-2 rounded-t-lg flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{title}</span>
          <span className="bg-white bg-opacity-30 text-xs px-1.5 py-0.5 rounded-full">
            {projects.length}
          </span>
        </div>
        {canAddTask && onAddTask && (
          <button
            onClick={onAddTask}
            className="hover:bg-white hover:bg-opacity-20 rounded p-1 transition-colors"
            title="Add task"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>

      {/* Tasks Container */}
      <div
        className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px] max-h-[calc(100vh-300px)]"
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, status)}
      >
        {projects.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            No tasks
          </div>
        ) : (
          projects.map((project) => (
            <TaskCard
              key={project.id}
              project={project}
              onClick={() => onTaskClick(project)}
              onDragStart={onDragStart}
            />
          ))
        )}
      </div>
    </div>
  );
}
