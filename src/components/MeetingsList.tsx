'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Meeting, Department } from '@/types';

interface MeetingsListProps {
  token: string;
  isSuperUser: boolean;
  onCreateMeeting: () => void;
  refreshTrigger?: number;
}

export default function MeetingsList({
  token,
  isSuperUser,
  onCreateMeeting,
  refreshTrigger,
}: MeetingsListProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Calendar state
  const [displayedMonth, setDisplayedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedDepartment === 'all'
        ? '/api/meetings'
        : `/api/meetings?departmentId=${selectedDepartment}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMeetings(data.data);
      }
    } catch (err) {
      console.error('Error fetching meetings:', err);
    }
    setLoading(false);
  }, [token, selectedDepartment]);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch('/api/departments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setDepartments(data.data);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings, refreshTrigger]);

  // Calendar helpers
  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    const year = displayedMonth.getFullYear();
    const month = displayedMonth.getMonth();

    // First day of month
    const firstOfMonth = new Date(year, month, 1);
    // Go back to Sunday
    const startDate = new Date(firstOfMonth);
    startDate.setDate(startDate.getDate() - firstOfMonth.getDay());

    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }

    return days;
  }, [displayedMonth]);

  const monthYearString = useMemo(() => {
    return displayedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [displayedMonth]);

  const goToPreviousMonth = () => {
    setDisplayedMonth(new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setDisplayedMonth(new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 1));
  };

  const goToCurrentMonth = () => {
    setDisplayedMonth(new Date());
    setSelectedDate(null);
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === displayedMonth.getMonth() &&
           date.getFullYear() === displayedMonth.getFullYear();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return selectedDate ? date.toDateString() === selectedDate.toDateString() : false;
  };

  const hasMeetings = (date: Date) => {
    const dateString = formatDateString(date);
    return meetings.some(m => m.date === dateString);
  };

  const meetingsForDate = (date: Date) => {
    const dateString = formatDateString(date);
    return meetings
      .filter(m => m.date === dateString)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const formatDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatSelectedDateDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleDelete = async (meetingId: string) => {
    if (!confirm('Are you sure you want to delete this meeting?')) return;

    try {
      const res = await fetch(`/api/meetings?id=${meetingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMeetings(meetings.filter(m => m.id !== meetingId));
      } else {
        alert(data.error || 'Failed to delete meeting');
      }
    } catch (err) {
      console.error('Error deleting meeting:', err);
      alert('Failed to delete meeting');
    }
  };

  const handleEdit = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeeting) return;

    try {
      const res = await fetch('/api/meetings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingMeeting),
      });
      const data = await res.json();
      if (data.success) {
        setShowEditModal(false);
        setEditingMeeting(null);
        fetchMeetings();
      } else {
        alert(data.error || 'Failed to update meeting');
      }
    } catch (err) {
      console.error('Error updating meeting:', err);
      alert('Failed to update meeting');
    }
  };

  const formatDate = (date: string) => {
    if (!date) return 'No date';
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    if (!time) return 'N/A';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const isUpcoming = (date: string) => {
    if (!date) return false;
    const meetingDate = new Date(date + 'T23:59:59');
    return meetingDate >= new Date();
  };

  const upcomingMeetings = meetings.filter(m => isUpcoming(m.date));
  const pastMeetings = meetings.filter(m => !isUpcoming(m.date));

  return (
    <div className="space-y-6">
      {/* Header with filters and create button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-800">Meetings</h2>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>
        {isSuperUser && (
          <button
            onClick={onCreateMeeting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Schedule Meeting
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading meetings...</div>
      ) : (
        <>
          {/* Calendar View */}
          <div className="bg-white rounded-lg shadow p-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={goToPreviousMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-800">{monthYearString}</h3>
                <button
                  onClick={goToCurrentMonth}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Today
                </button>
              </div>
              <button
                onClick={goToNextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {daysOfWeek.map(day => (
                <div
                  key={day}
                  className={`text-center text-sm font-semibold py-2 ${
                    day === 'Sun' ? 'text-blue-600' : 'text-gray-600'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, index) => {
                const inMonth = isCurrentMonth(date);
                const today = isToday(date);
                const selected = isSelected(date);
                const hasMtg = hasMeetings(date);

                return (
                  <button
                    key={index}
                    onClick={() => {
                      if (inMonth) {
                        setSelectedDate(selected ? null : date);
                      }
                    }}
                    disabled={!inMonth}
                    className={`
                      aspect-square p-1 rounded-lg flex flex-col items-center justify-center
                      transition-colors relative
                      ${!inMonth ? 'text-gray-300 cursor-default' : 'cursor-pointer hover:bg-gray-100'}
                      ${today ? 'bg-green-500 text-white hover:bg-green-600' : ''}
                      ${selected && !today ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
                      ${hasMtg && inMonth && !today && !selected ? 'ring-2 ring-blue-500 ring-inset' : ''}
                    `}
                  >
                    <span className={`text-sm ${hasMtg && inMonth ? 'font-semibold' : ''} ${hasMtg && inMonth && !today && !selected ? 'text-blue-600' : ''}`}>
                      {date.getDate()}
                    </span>
                    {hasMtg && inMonth && (
                      <span className={`w-1 h-1 rounded-full mt-0.5 ${today || selected ? 'bg-white' : 'bg-blue-500'}`} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Has meetings</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span>Today</span>
              </div>
            </div>
          </div>

          {/* Meetings List */}
          {selectedDate ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-700">
                  {formatSelectedDateDisplay(selectedDate)}
                </h3>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Show All
                </button>
              </div>
              {meetingsForDate(selectedDate).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No meetings on this day
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {meetingsForDate(selectedDate).map(meeting => (
                    <MeetingCard
                      key={meeting.id}
                      meeting={meeting}
                      isSuperUser={isSuperUser}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      formatDate={formatDate}
                      formatTime={formatTime}
                      isUpcoming={true}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : meetings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No meetings scheduled</p>
              {isSuperUser && (
                <button
                  onClick={onCreateMeeting}
                  className="mt-4 text-blue-600 hover:text-blue-700"
                >
                  Schedule your first meeting
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Upcoming Meetings */}
              {upcomingMeetings.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-3">Upcoming Meetings</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {upcomingMeetings.map(meeting => (
                      <MeetingCard
                        key={meeting.id}
                        meeting={meeting}
                        isSuperUser={isSuperUser}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        formatDate={formatDate}
                        formatTime={formatTime}
                        isUpcoming={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Past Meetings */}
              {pastMeetings.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-500 mb-3">Past Meetings</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {pastMeetings.map(meeting => (
                      <MeetingCard
                        key={meeting.id}
                        meeting={meeting}
                        isSuperUser={isSuperUser}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        formatDate={formatDate}
                        formatTime={formatTime}
                        isUpcoming={false}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Edit Modal */}
      {showEditModal && editingMeeting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Edit Meeting</h3>
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editingMeeting.title}
                    onChange={(e) => setEditingMeeting({ ...editingMeeting, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editingMeeting.description}
                    onChange={(e) => setEditingMeeting({ ...editingMeeting, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editingMeeting.date}
                    onChange={(e) => setEditingMeeting({ ...editingMeeting, date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={editingMeeting.startTime}
                      onChange={(e) => setEditingMeeting({ ...editingMeeting, startTime: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={editingMeeting.endTime}
                      onChange={(e) => setEditingMeeting({ ...editingMeeting, endTime: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <select
                    value={editingMeeting.departmentId}
                    onChange={(e) => setEditingMeeting({ ...editingMeeting, departmentId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    required
                  >
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location (optional)
                  </label>
                  <input
                    type="text"
                    value={editingMeeting.location}
                    onChange={(e) => setEditingMeeting({ ...editingMeeting, location: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    placeholder="e.g., Conference Room A"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingMeeting(null);
                    }}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface MeetingCardProps {
  meeting: Meeting;
  isSuperUser: boolean;
  onEdit: (meeting: Meeting) => void;
  onDelete: (meetingId: string) => void;
  formatDate: (date: string) => string;
  formatTime: (time: string) => string;
  isUpcoming: boolean;
}

function MeetingCard({
  meeting,
  isSuperUser,
  onEdit,
  onDelete,
  formatDate,
  formatTime,
  isUpcoming,
}: MeetingCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow p-4 ${!isUpcoming ? 'opacity-60' : ''}`}>
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-gray-800">{meeting.title}</h4>
        {isSuperUser && (
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(meeting)}
              className="text-blue-500 hover:text-blue-700 text-sm"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(meeting.id)}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <span className="font-medium">Date:</span>
          <span>{formatDate(meeting.date)}</span>
        </div>

        <div className="flex items-center gap-2 text-gray-600">
          <span className="font-medium">Time:</span>
          <span>{formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-600">Department:</span>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
            {meeting.departmentName}
          </span>
        </div>

        {meeting.location && (
          <div className="flex items-center gap-2 text-gray-600">
            <span className="font-medium">Location:</span>
            <span>{meeting.location}</span>
          </div>
        )}

        {meeting.description && (
          <p className="text-gray-600 mt-2 pt-2 border-t">{meeting.description}</p>
        )}

        <div className="text-xs text-gray-400 mt-2">
          Scheduled by: {meeting.creatorName}
        </div>
      </div>
    </div>
  );
}
