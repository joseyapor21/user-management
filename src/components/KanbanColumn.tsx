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
  columnColor?: string;
}

const columnColors: Record<ProjectStatus, { header: string; bg: string }> = {
  backlog: { header: 'bg-gray-500', bg: 'bg-gray-50' },
  todo: { header: 'bg-blue-500', bg: 'bg-blue-50' },
  in_progress: { header: 'bg-yellow-500', bg: 'bg-yellow-50' },
  done: { header: 'bg-green-500', bg: 'bg-green-50' },
  archived: { header: 'bg-orange-500', bg: 'bg-orange-50' },
};

// Helper to determine if a color is light or dark
function isLightColor(color: string): boolean {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128;
}

// Helper to lighten a color for the background
function lightenColor(color: string, percent: number): string {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  const newR = Math.round(r + (255 - r) * (percent / 100));
  const newG = Math.round(g + (255 - g) * (percent / 100));
  const newB = Math.round(b + (255 - b) * (percent / 100));

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

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
  columnColor,
}: KanbanColumnProps) {
  const colors = columnColors[status];

  // Use custom color if provided, otherwise use default
  const headerStyle = columnColor ? { backgroundColor: columnColor } : undefined;
  const bgStyle = columnColor ? { backgroundColor: lightenColor(columnColor, 90) } : undefined;
  const textColorClass = columnColor && isLightColor(columnColor) ? 'text-gray-800' : 'text-white';

  return (
    <div
      className={`flex flex-col rounded-lg w-[75vw] sm:w-[280px] md:min-w-[280px] md:max-w-[320px] flex-shrink-0 md:flex-1 snap-center ${!columnColor ? colors.bg : ''}`}
      style={bgStyle}
    >
      {/* Column Header */}
      <div
        className={`px-3 py-2 rounded-t-lg flex items-center justify-between ${!columnColor ? colors.header + ' text-white' : textColorClass}`}
        style={headerStyle}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{title}</span>
          <span className="bg-white bg-opacity-30 text-xs px-1.5 py-0.5 rounded-full">
            {projects.length}
          </span>
        </div>
        {canAddTask && onAddTask && (
          <button
            onClick={onAddTask}
            className="hover:bg-white hover:bg-opacity-20 rounded p-1.5 transition-colors touch-manipulation"
            title="Add task"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>

      {/* Tasks Container */}
      <div
        className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[150px] md:min-h-[200px] max-h-[calc(100vh-280px)] md:max-h-[calc(100vh-300px)]"
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
