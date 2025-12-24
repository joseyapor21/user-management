'use client';

import { useState, useEffect, useCallback } from 'react';
import { ScheduleSlot, SERVICE_PHASES, SCHEDULE_DEPARTMENTS, User, Department } from '@/types';

interface SundayScheduleProps {
  token: string;
  isSuperUser: boolean;
  departments: Department[];
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

interface SelectedUser {
  id: string;
  name: string;
}

interface ScheduleConfig {
  departments: string[];
  phases: string[];
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

export default function SundaySchedule({ token, isSuperUser, departments }: SundayScheduleProps) {
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

  // Cell editing with user selector
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Schedule configuration (custom departments and phases)
  const [config, setConfig] = useState<ScheduleConfig>({
    departments: [...SCHEDULE_DEPARTMENTS],
    phases: [...SERVICE_PHASES],
  });
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<'departments' | 'phases' | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editingItemValue, setEditingItemValue] = useState('');

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

  // Fetch department members for user selection
  const fetchUsers = useCallback(async () => {
    try {
      // Get all unique member IDs from all departments
      const allMemberIds = new Set<string>();
      departments.forEach(dept => {
        dept.memberIds?.forEach(id => allMemberIds.add(id));
        dept.adminIds?.forEach(id => allMemberIds.add(id));
      });

      if (allMemberIds.size === 0) {
        setUsers([]);
        return;
      }

      // Fetch user details for each member
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        // Filter to only include department members
        const departmentMembers = data.data
          .filter((u: User) => allMemberIds.has(u.id))
          .map((u: User) => ({
            id: u.id,
            name: u.name || u.email,
            email: u.email,
          }));
        setUsers(departmentMembers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, [token, departments]);

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Fetch schedule configuration
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/schedules/config', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setConfig({
          departments: data.data.departments || [...SCHEDULE_DEPARTMENTS],
          phases: data.data.phases || [...SERVICE_PHASES],
        });
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  }, [token]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Save schedule configuration
  const saveConfig = async (newConfig: Partial<ScheduleConfig>) => {
    try {
      await fetch('/api/schedules/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newConfig),
      });
    } catch (error) {
      console.error('Error saving config:', error);
    }
  };

  // Add new department or phase
  const addItem = async (type: 'departments' | 'phases') => {
    if (!newItemName.trim()) return;
    const newList = [...config[type], newItemName.trim()];
    setConfig({ ...config, [type]: newList });
    await saveConfig({ [type]: newList });
    setNewItemName('');
  };

  // Delete department or phase
  const deleteItem = async (type: 'departments' | 'phases', index: number) => {
    const newList = config[type].filter((_, i) => i !== index);
    setConfig({ ...config, [type]: newList });
    await saveConfig({ [type]: newList });
  };

  // Rename department or phase
  const renameItem = async (type: 'departments' | 'phases', index: number) => {
    if (!editingItemValue.trim()) return;
    const newList = [...config[type]];
    newList[index] = editingItemValue.trim();
    setConfig({ ...config, [type]: newList });
    await saveConfig({ [type]: newList });
    setEditingItemIndex(null);
    setEditingItemValue('');
  };

  // Move item up/down
  const moveItem = async (type: 'departments' | 'phases', index: number, direction: 'up' | 'down') => {
    const newList = [...config[type]];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newList.length) return;
    [newList[index], newList[newIndex]] = [newList[newIndex], newList[index]];
    setConfig({ ...config, [type]: newList });
    await saveConfig({ [type]: newList });
  };

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
    const currentValue = getSlotValue(phase, dept);
    setCellValue(currentValue);

    // Parse existing assignees to pre-select users
    if (currentValue) {
      const names = currentValue.split(/[,\n]/).map(n => n.trim()).filter(Boolean);
      const matched: SelectedUser[] = [];
      names.forEach(name => {
        const user = users.find(u => u.name.toLowerCase() === name.toLowerCase());
        if (user) {
          matched.push({ id: user.id, name: user.name });
        }
      });
      setSelectedUsers(matched);
    } else {
      setSelectedUsers([]);
    }
    setShowUserDropdown(false);
  };

  // Toggle user selection
  const toggleUserSelection = (user: UserOption) => {
    setSelectedUsers(prev => {
      const exists = prev.find(u => u.id === user.id);
      if (exists) {
        return prev.filter(u => u.id !== user.id);
      }
      return [...prev, { id: user.id, name: user.name }];
    });
  };

  // Update cell value when selected users change
  const updateCellFromUsers = useCallback(() => {
    const names = selectedUsers.map(u => u.name).join(', ');
    setCellValue(names);
  }, [selectedUsers]);

  useEffect(() => {
    if (editingCell) {
      updateCellFromUsers();
    }
  }, [selectedUsers, editingCell, updateCellFromUsers]);

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
    setSelectedUsers([]);
    setShowUserDropdown(false);
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

      {/* Config Modal - Edit Departments/Phases */}
      {showConfigModal && editingConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowConfigModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                Edit {editingConfig === 'departments' ? 'Departments' : 'Phases'}
              </h3>
              <button onClick={() => setShowConfigModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                &times;
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {/* Add new item */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder={`Add ${editingConfig === 'departments' ? 'department' : 'phase'}...`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900"
                  onKeyDown={(e) => e.key === 'Enter' && addItem(editingConfig)}
                />
                <button
                  onClick={() => addItem(editingConfig)}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                >
                  Add
                </button>
              </div>

              {/* List items */}
              <div className="space-y-2">
                {config[editingConfig].map((item, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                    {editingItemIndex === index ? (
                      <>
                        <input
                          type="text"
                          value={editingItemValue}
                          onChange={(e) => setEditingItemValue(e.target.value)}
                          className="flex-1 px-2 py-1 border border-blue-400 rounded text-sm bg-white text-gray-900"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') renameItem(editingConfig, index);
                            if (e.key === 'Escape') {
                              setEditingItemIndex(null);
                              setEditingItemValue('');
                            }
                          }}
                        />
                        <button
                          onClick={() => renameItem(editingConfig, index)}
                          className="px-2 py-1 bg-green-600 text-white rounded text-xs"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingItemIndex(null);
                            setEditingItemValue('');
                          }}
                          className="px-2 py-1 bg-gray-400 text-white rounded text-xs"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-gray-700">{item}</span>
                        <button
                          onClick={() => moveItem(editingConfig, index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                          title="Move up"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => moveItem(editingConfig, index, 'down')}
                          disabled={index === config[editingConfig].length - 1}
                          className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                          title="Move down"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            setEditingItemIndex(index);
                            setEditingItemValue(item);
                          }}
                          className="p-1 text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${item}"?`)) {
                              deleteItem(editingConfig, index);
                            }
                          }}
                          className="p-1 text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t">
              <button
                onClick={() => setShowConfigModal(false)}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
              >
                Done
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

            {/* Config buttons for admins */}
            {canEdit && (
              <>
                <button
                  onClick={() => {
                    setEditingConfig('phases');
                    setShowConfigModal(true);
                  }}
                  className="px-3 py-2 text-sm bg-gray-100 rounded-md hover:bg-gray-200 flex items-center gap-1"
                  title="Edit Phases"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <span className="hidden sm:inline">Phases</span>
                </button>
                <button
                  onClick={() => {
                    setEditingConfig('departments');
                    setShowConfigModal(true);
                  }}
                  className="px-3 py-2 text-sm bg-gray-100 rounded-md hover:bg-gray-200 flex items-center gap-1"
                  title="Edit Departments"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                  <span className="hidden sm:inline">Depts</span>
                </button>
              </>
            )}
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
                {config.departments.map((dept) => (
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
              {config.phases.map((phase, phaseIndex) => (
                <tr key={phase} className={phaseIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="sticky left-0 z-10 px-3 py-2 text-sm font-medium text-gray-800 border-r whitespace-nowrap bg-inherit">
                    {phase}
                  </td>
                  {config.departments.map((dept) => {
                    const isEditing = editingCell?.phase === phase && editingCell?.dept === dept;
                    const value = getSlotValue(phase, dept);

                    return (
                      <td
                        key={`${phase}-${dept}`}
                        className={`px-2 py-1 text-xs border-r border-b ${
                          canEdit ? 'cursor-pointer hover:bg-blue-50' : ''
                        } ${isEditing ? 'bg-blue-100 relative' : ''}`}
                        onClick={() => !isEditing && startEditing(phase, dept)}
                      >
                        {isEditing ? (
                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                            {/* Selected users display */}
                            <div className="min-h-[40px] p-1 bg-white border border-blue-400 rounded text-gray-900">
                              <div className="flex flex-wrap gap-1 mb-1">
                                {selectedUsers.map((u) => (
                                  <span
                                    key={u.id}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs"
                                  >
                                    {u.name}
                                    <button
                                      type="button"
                                      onClick={() => toggleUserSelection({ id: u.id, name: u.name, email: '' })}
                                      className="text-blue-600 hover:text-blue-800"
                                    >
                                      &times;
                                    </button>
                                  </span>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowUserDropdown(!showUserDropdown)}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                + Add user
                              </button>
                            </div>

                            {/* User dropdown */}
                            {showUserDropdown && (
                              <div className="absolute left-0 top-full mt-1 w-48 max-h-40 overflow-y-auto bg-white border border-gray-300 rounded-md shadow-lg z-20">
                                {users.length === 0 ? (
                                  <div className="p-2 text-xs text-gray-500">No users available</div>
                                ) : (
                                  users.map((user) => {
                                    const isSelected = selectedUsers.some(u => u.id === user.id);
                                    return (
                                      <button
                                        key={user.id}
                                        type="button"
                                        onClick={() => toggleUserSelection(user)}
                                        className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center gap-2 ${
                                          isSelected ? 'bg-blue-50 text-blue-800' : 'text-gray-700'
                                        }`}
                                      >
                                        <span className={`w-4 h-4 border rounded flex items-center justify-center ${
                                          isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                                        }`}>
                                          {isSelected && (
                                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                          )}
                                        </span>
                                        {user.name}
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex gap-1 mt-1">
                              <button
                                type="button"
                                onClick={saveCell}
                                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditing}
                                className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
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

      {/* Legend / Help - Only shown to admins who can edit */}
      {canEdit && (
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Instructions</h3>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Click on any cell to edit the assigned person(s)</li>
            <li>• Click &quot;+ Add user&quot; to select members from the dropdown</li>
            <li>• Click Save to confirm or Cancel to discard changes</li>
            <li>• Use arrows to navigate between Sundays</li>
          </ul>
        </div>
      )}
    </div>
  );
}
