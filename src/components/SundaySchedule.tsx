'use client';

import { useState, useEffect, useCallback } from 'react';
import { ScheduleSlot, SERVICE_PHASES, SCHEDULE_DEPARTMENTS, User } from '@/types';

interface SundayScheduleProps {
  token: string;
  userId: string;
  isSuperUser: boolean;
}

interface ScheduleData {
  id?: string;
  date: string;
  slots: ScheduleSlot[];
}

interface UserOption {
  id: string;
  name: string;
  email: string;
}

// Get next Sunday from a date
function getNextSunday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Format date for display
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Format date for API
function formatDateForApi(date: Date): string {
  return date.toISOString().split('T')[0];
}

export default function SundaySchedule({ token, userId, isSuperUser }: SundayScheduleProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(getNextSunday(new Date()));
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [scheduleAdminId, setScheduleAdminId] = useState<string | null>(null);
  const [scheduleAdminName, setScheduleAdminName] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ phase: string; dept: string } | null>(null);
  const [cellValue, setCellValue] = useState('');

  // Admin management state (for SuperUser)
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string>('');
  const [savingAdmin, setSavingAdmin] = useState(false);

  // Build a map for quick slot lookup
  const getSlotValue = useCallback((phase: string, dept: string): string => {
    if (!schedule?.slots) return '';
    const slot = schedule.slots.find(s => s.phase === phase && s.department === dept);
    return slot?.assignees || '';
  }, [schedule]);

  // Fetch schedule for selected date
  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const dateStr = formatDateForApi(selectedDate);
      const res = await fetch(`/api/schedules?date=${dateStr}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        setSchedule(data.data ? {
          id: data.data.id,
          date: data.data.date,
          slots: data.data.slots || [],
        } : {
          date: dateStr,
          slots: [],
        });
        setCanEdit(data.canEdit);
        setScheduleAdminId(data.scheduleAdminId);
        setScheduleAdminName(data.scheduleAdminName);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  }, [token, selectedDate]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Fetch users for admin selection (SuperUser only)
  const fetchUsers = useCallback(async () => {
    if (!isSuperUser) return;
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.data.map((u: User) => ({
          id: u.id,
          name: u.name || u.email,
          email: u.email,
        })));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, [token, isSuperUser]);

  // Open admin modal
  const openAdminModal = () => {
    fetchUsers();
    setSelectedAdminId(scheduleAdminId || '');
    setShowAdminModal(true);
  };

  // Save schedule admin
  const saveScheduleAdmin = async () => {
    setSavingAdmin(true);
    try {
      const res = await fetch('/api/schedules/admin', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: selectedAdminId || null }),
      });
      const data = await res.json();
      if (data.success) {
        // Refresh to get updated admin info
        await fetchSchedule();
        setShowAdminModal(false);
      }
    } catch (error) {
      console.error('Error saving schedule admin:', error);
    } finally {
      setSavingAdmin(false);
    }
  };

  // Navigate to previous/next Sunday
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedDate(newDate);
  };

  // Start editing a cell
  const startEditing = (phase: string, dept: string) => {
    if (!canEdit) return;
    setEditingCell({ phase, dept });
    setCellValue(getSlotValue(phase, dept));
  };

  // Save cell edit
  const saveCell = async () => {
    if (!editingCell || !schedule) return;

    const { phase, dept } = editingCell;
    const newSlots = [...schedule.slots];

    // Find existing slot or create new
    const existingIndex = newSlots.findIndex(s => s.phase === phase && s.department === dept);

    if (existingIndex >= 0) {
      if (cellValue.trim()) {
        newSlots[existingIndex] = { ...newSlots[existingIndex], assignees: cellValue.trim() };
      } else {
        newSlots.splice(existingIndex, 1);
      }
    } else if (cellValue.trim()) {
      newSlots.push({ phase, department: dept, assignees: cellValue.trim() });
    }

    // Update local state immediately
    setSchedule({ ...schedule, slots: newSlots });
    setEditingCell(null);

    // Save to server
    setSaving(true);
    try {
      await fetch('/api/schedules', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: schedule.date,
          slots: newSlots,
        }),
      });
    } catch (error) {
      console.error('Error saving schedule:', error);
    } finally {
      setSaving(false);
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingCell(null);
    setCellValue('');
  };

  // Handle key press in edit mode
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveCell();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Admin Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Set Schedule Admin</h3>
              <button onClick={() => setShowAdminModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                &times;
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                Select a user who will have permission to edit the Sunday schedule. Only you (SuperUser) can change this setting.
              </p>
              <select
                value={selectedAdminId}
                onChange={(e) => setSelectedAdminId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
              >
                <option value="">No admin (only SuperUser can edit)</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setShowAdminModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={saveScheduleAdmin}
                disabled={savingAdmin}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {savingAdmin ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Sunday Service Schedule</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-gray-500">
                {scheduleAdminName ? (
                  <>Admin: <span className="font-medium">{scheduleAdminName}</span></>
                ) : (
                  'No schedule admin assigned'
                )}
                {canEdit && <span className="ml-2 text-green-600">(You can edit)</span>}
              </p>
              {isSuperUser && (
                <button
                  onClick={openAdminModal}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Change
                </button>
              )}
            </div>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateWeek('prev')}
              className="p-2 rounded-md border border-gray-300 hover:bg-gray-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="px-4 py-2 bg-blue-50 rounded-md min-w-[200px] text-center">
              <span className="font-medium text-blue-800">{formatDate(selectedDate)}</span>
            </div>

            <button
              onClick={() => navigateWeek('next')}
              className="p-2 rounded-md border border-gray-300 hover:bg-gray-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={() => setSelectedDate(getNextSunday(new Date()))}
              className="px-3 py-2 text-sm bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Today
            </button>
          </div>
        </div>

        {saving && (
          <div className="mt-2 text-sm text-blue-600 flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            Saving...
          </div>
        )}
      </div>

      {/* Schedule Grid */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="sticky left-0 z-10 bg-gray-100 px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b border-r min-w-[120px]">
                  Phase
                </th>
                {SCHEDULE_DEPARTMENTS.map((dept) => (
                  <th
                    key={dept}
                    className="px-2 py-2 text-center text-xs font-semibold text-gray-700 border-b whitespace-nowrap min-w-[100px]"
                  >
                    {dept}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SERVICE_PHASES.map((phase, phaseIndex) => (
                <tr key={phase} className={phaseIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="sticky left-0 z-10 px-3 py-2 text-sm font-medium text-gray-800 border-r whitespace-nowrap bg-inherit">
                    {phase}
                  </td>
                  {SCHEDULE_DEPARTMENTS.map((dept) => {
                    const isEditing = editingCell?.phase === phase && editingCell?.dept === dept;
                    const value = getSlotValue(phase, dept);

                    return (
                      <td
                        key={`${phase}-${dept}`}
                        className={`px-2 py-1 text-xs border-r border-b ${
                          canEdit ? 'cursor-pointer hover:bg-blue-50' : ''
                        } ${isEditing ? 'bg-blue-100' : ''}`}
                        onClick={() => !isEditing && startEditing(phase, dept)}
                      >
                        {isEditing ? (
                          <textarea
                            value={cellValue}
                            onChange={(e) => setCellValue(e.target.value)}
                            onBlur={saveCell}
                            onKeyDown={handleKeyDown}
                            className="w-full min-h-[60px] p-1 text-xs border border-blue-400 rounded resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                          />
                        ) : (
                          <div className="min-h-[40px] whitespace-pre-wrap text-gray-700">
                            {value || <span className="text-gray-300">-</span>}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend / Help */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Instructions</h3>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Click on any cell to edit the assigned person(s)</li>
          <li>• Press Enter to save, Escape to cancel</li>
          <li>• Use arrows to navigate between Sundays</li>
          <li>• Multiple names can be entered, separated by commas or on new lines</li>
        </ul>
      </div>
    </div>
  );
}
