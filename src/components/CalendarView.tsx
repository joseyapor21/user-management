'use client';

import { useState, useMemo } from 'react';
import { Project, Priority } from '@/types';

interface CalendarViewProps {
  projects: Project[];
  onTaskClick: (project: Project) => void;
}

const priorityColors: Record<Priority, string> = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CalendarView({ projects, onTaskClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Get calendar days for the current month
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: Array<{ date: Date | null; isCurrentMonth: boolean }> = [];

    // Add days from previous month
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(currentYear, currentMonth - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }

    // Add days of current month
    for (let day = 1; day <= totalDays; day++) {
      days.push({
        date: new Date(currentYear, currentMonth, day),
        isCurrentMonth: true,
      });
    }

    // Add days from next month to complete the grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days = 42
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: new Date(currentYear, currentMonth + 1, day),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentMonth, currentYear]);

  // Group projects by due date
  const projectsByDate = useMemo(() => {
    const map = new Map<string, Project[]>();
    projects.forEach(project => {
      if (project.dueDate) {
        const dateKey = new Date(project.dueDate).toDateString();
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(project);
      }
    });
    return map;
  }, [projects]);

  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          {monthNames[currentMonth]} {currentYear}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
          >
            Today
          </button>
          <button
            onClick={goToPrevMonth}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goToNextMonth}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {daysOfWeek.map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map(({ date, isCurrentMonth }, index) => {
          if (!date) return <div key={index} className="min-h-[100px]" />;

          const dateKey = date.toDateString();
          const dayProjects = projectsByDate.get(dateKey) || [];
          const displayProjects = dayProjects.slice(0, 3);
          const hasMore = dayProjects.length > 3;

          return (
            <div
              key={index}
              className={`min-h-[100px] border border-gray-100 rounded p-1 ${
                !isCurrentMonth ? 'bg-gray-50' : 'bg-white'
              } ${isToday(date) ? 'ring-2 ring-blue-500' : ''}`}
            >
              <div className={`text-xs font-medium mb-1 ${
                !isCurrentMonth ? 'text-gray-300' :
                isToday(date) ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {date.getDate()}
              </div>

              <div className="space-y-0.5">
                {displayProjects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => onTaskClick(project)}
                    className={`w-full text-left px-1 py-0.5 rounded text-xs truncate hover:opacity-80 ${priorityColors[project.priority]} text-white`}
                    title={project.title}
                  >
                    {project.title}
                  </button>
                ))}
                {hasMore && (
                  <div className="text-xs text-gray-400 px-1">
                    +{dayProjects.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-xs">
        <span className="text-gray-500">Priority:</span>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-green-500"></span>
          <span className="text-gray-600">Low</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-yellow-500"></span>
          <span className="text-gray-600">Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-orange-500"></span>
          <span className="text-gray-600">High</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-red-500"></span>
          <span className="text-gray-600">Urgent</span>
        </div>
      </div>
    </div>
  );
}
