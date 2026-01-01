'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Meeting, Department } from '@/types';

interface MeetingsListProps {
  token: string;
  isSuperUser: boolean;
  isAdmin: boolean;
  userId: string;
  adminDepartmentIds: string[];
  onCreateMeeting: () => void;
  refreshTrigger?: number;
}

export default function MeetingsList({
  token,
  isSuperUser,
  isAdmin,
  userId,
  adminDepartmentIds,
  onCreateMeeting,
  refreshTrigger,
}: MeetingsListProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [processingMeetingId, setProcessingMeetingId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<Meeting | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showApproveModal, setShowApproveModal] = useState<Meeting | null>(null);
  const [approveFormData, setApproveFormData] = useState({
    date: '',
    startTime: '',
    endTime: '',
  });

  // Check if user can request meetings (is admin of at least one department)
  const canRequestMeeting = isAdmin || adminDepartmentIds.length > 0;

  // Weekly calendar state
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getWeekStart(new Date()));

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

  // Week helpers
  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sunday
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      days.push(date);
    }
    return days;
  }, [currentWeekStart]);

  const weekRangeString = useMemo(() => {
    if (weekDays.length === 0) return '';
    const first = weekDays[0];
    const last = weekDays[6];
    const startStr = first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = last.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  }, [weekDays]);

  const goToPreviousWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  };

  const goToNextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(getWeekStart(new Date()));
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const formatDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const meetingsForDate = (date: Date) => {
    const dateString = formatDateString(date);
    return meetings
      .filter(m => m.date === dateString && (m.status === 'approved' || !m.status))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  // Get pending meetings for superusers
  const pendingMeetings = useMemo(() => {
    return meetings.filter(m => m.status === 'pending');
  }, [meetings]);

  // Get user's own pending requests
  const myPendingRequests = useMemo(() => {
    return meetings.filter(m => m.status === 'pending' && m.requestedBy === userId);
  }, [meetings, userId]);

  // Check for conflicts with a given meeting time
  const getConflicts = useCallback((date: string, startTime: string, endTime: string, departmentId: string, excludeMeetingId?: string) => {
    return meetings.filter(m => {
      // Exclude the current meeting being checked
      if (excludeMeetingId && m.id === excludeMeetingId) return false;
      // Only check approved meetings in the same department
      if (m.departmentId !== departmentId) return false;
      if (m.status !== 'approved' && m.status !== undefined) return false;
      if (m.date !== date) return false;

      // Check time overlap
      const newStart = startTime.replace(':', '');
      const newEnd = endTime.replace(':', '');
      const existStart = m.startTime.replace(':', '');
      const existEnd = m.endTime.replace(':', '');

      // Overlap if: newStart < existEnd AND newEnd > existStart
      return newStart < existEnd && newEnd > existStart;
    });
  }, [meetings]);

  // Open approve modal
  const openApproveModal = (meeting: Meeting) => {
    setShowApproveModal(meeting);
    setApproveFormData({
      date: meeting.date,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
    });
  };

  // Get conflicts for the approve modal
  const approveModalConflicts = useMemo(() => {
    if (!showApproveModal) return [];
    return getConflicts(
      approveFormData.date,
      approveFormData.startTime,
      approveFormData.endTime,
      showApproveModal.departmentId,
      showApproveModal.id
    );
  }, [showApproveModal, approveFormData, getConflicts]);

  // Approve meeting with optional modified date/time
  const handleApprove = async () => {
    if (!showApproveModal) return;
    setProcessingMeetingId(showApproveModal.id);
    try {
      const res = await fetch('/api/meetings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: showApproveModal.id,
          action: 'approve',
          // Include modified date/time if changed
          date: approveFormData.date,
          startTime: approveFormData.startTime,
          endTime: approveFormData.endTime,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowApproveModal(null);
        fetchMeetings();
      } else {
        alert(data.error || 'Failed to approve meeting');
      }
    } catch (err) {
      console.error('Error approving meeting:', err);
      alert('Failed to approve meeting');
    }
    setProcessingMeetingId(null);
  };

  // Reject meeting
  const handleReject = async () => {
    if (!showRejectModal) return;
    setProcessingMeetingId(showRejectModal.id);
    try {
      const res = await fetch('/api/meetings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: showRejectModal.id,
          action: 'reject',
          rejectionReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowRejectModal(null);
        setRejectionReason('');
        fetchMeetings();
      } else {
        alert(data.error || 'Failed to reject meeting');
      }
    } catch (err) {
      console.error('Error rejecting meeting:', err);
      alert('Failed to reject meeting');
    }
    setProcessingMeetingId(null);
  };

  const formatDayHeader = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const formatDayNumber = (date: Date) => {
    return date.getDate().toString();
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

  const formatTime = (time: string) => {
    if (!time) return 'N/A';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <div className="space-y-4">
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
          <button
            onClick={() => fetchMeetings()}
            disabled={loading}
            className={`p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md ${loading ? 'animate-spin' : ''}`}
            title="Refresh"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        {(isSuperUser || canRequestMeeting) && (
          <button
            onClick={onCreateMeeting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {isSuperUser ? '+ Schedule Meeting' : '+ Request Meeting'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading meetings...</div>
      ) : (
        <>
          {/* Pending Meetings for SuperUsers */}
          {isSuperUser && pendingMeetings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <h3 className="text-lg font-semibold text-amber-800 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pending Meeting Requests ({pendingMeetings.length})
              </h3>
              <div className="space-y-3">
                {pendingMeetings.map(meeting => (
                  <div key={meeting.id} className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800">{meeting.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {meeting.date} • {formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            {meeting.departmentName}
                          </span>
                          {meeting.location && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                              {meeting.location}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Requested by: <span className="font-medium">{meeting.requestedByName || 'Unknown'}</span>
                        </p>
                        {meeting.description && (
                          <p className="text-sm text-gray-600 mt-2">{meeting.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2 sm:flex-col">
                        <button
                          onClick={() => openApproveModal(meeting)}
                          disabled={processingMeetingId === meeting.id}
                          className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm"
                        >
                          Review & Approve
                        </button>
                        <button
                          onClick={() => setShowRejectModal(meeting)}
                          disabled={processingMeetingId === meeting.id}
                          className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* My Pending Requests (for non-superusers) */}
          {!isSuperUser && myPendingRequests.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                My Pending Requests ({myPendingRequests.length})
              </h3>
              <div className="space-y-3">
                {myPendingRequests.map(meeting => (
                  <div key={meeting.id} className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-800">{meeting.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {meeting.date} • {formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            {meeting.departmentName}
                          </span>
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                            Awaiting Approval
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Week Navigation */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={goToPreviousWeek}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-800">{weekRangeString}</h3>
                <button
                  onClick={goToCurrentWeek}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Today
                </button>
              </div>
              <button
                onClick={goToNextWeek}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Weekly Calendar */}
          <div className="space-y-2">
            {weekDays.map((date, index) => {
              const dayMeetings = meetingsForDate(date);
              const today = isToday(date);

              return (
                <div key={index} className="bg-white rounded-lg shadow">
                  {/* Day Header */}
                  <div className="flex items-center p-4 border-b">
                    <div
                      className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg mr-4 ${
                        today ? 'bg-green-500 text-white' : ''
                      }`}
                    >
                      <span className={`text-xs font-medium ${today ? 'text-white' : 'text-gray-500'}`}>
                        {formatDayHeader(date)}
                      </span>
                      <span className={`text-xl font-bold ${today ? 'text-white' : 'text-gray-800'}`}>
                        {formatDayNumber(date)}
                      </span>
                    </div>
                    <div className="flex-1">
                      {dayMeetings.length === 0 && (
                        <span className="text-sm text-gray-400">No meetings</span>
                      )}
                    </div>
                  </div>

                  {/* Meetings for this day */}
                  {dayMeetings.length > 0 && (
                    <div className="p-4 space-y-3">
                      {dayMeetings.map(meeting => (
                        <MeetingItemCard
                          key={meeting.id}
                          meeting={meeting}
                          isSuperUser={isSuperUser}
                          isMyDepartment={adminDepartmentIds.includes(meeting.departmentId)}
                          onEdit={() => handleEdit(meeting)}
                          onDelete={() => handleDelete(meeting.id)}
                          formatTime={formatTime}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Reject Meeting Request</h3>
              <p className="text-sm text-gray-600 mb-4">
                Rejecting: <span className="font-medium">{showRejectModal.title}</span>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason (optional)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  rows={3}
                  placeholder="Provide a reason for rejection..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectModal(null);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={processingMeetingId === showRejectModal.id}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {processingMeetingId === showRejectModal.id ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal with conflict detection */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Review & Approve Meeting</h3>

              {/* Meeting Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-gray-800">{showApproveModal.title}</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Department: <span className="font-medium">{showApproveModal.departmentName}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Requested by: <span className="font-medium">{showApproveModal.requestedByName || 'Unknown'}</span>
                </p>
                {showApproveModal.description && (
                  <p className="text-sm text-gray-600 mt-2">{showApproveModal.description}</p>
                )}
              </div>

              {/* Date/Time Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={approveFormData.date}
                    onChange={(e) => setApproveFormData({ ...approveFormData, date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={approveFormData.startTime}
                      onChange={(e) => setApproveFormData({ ...approveFormData, startTime: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={approveFormData.endTime}
                      onChange={(e) => setApproveFormData({ ...approveFormData, endTime: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Conflict Warning */}
              {approveModalConflicts.length > 0 && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-red-800 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Time Conflict Detected ({approveModalConflicts.length})
                  </h4>
                  <p className="text-sm text-red-700 mt-1">
                    The following meetings overlap with the selected time:
                  </p>
                  <ul className="mt-2 space-y-1">
                    {approveModalConflicts.map(conflict => (
                      <li key={conflict.id} className="text-sm text-red-700">
                        • <span className="font-medium">{conflict.title}</span> ({formatTime(conflict.startTime)} - {formatTime(conflict.endTime)})
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-red-600 mt-2">
                    Please adjust the time or date to avoid conflicts.
                  </p>
                </div>
              )}

              {/* No conflicts message */}
              {approveModalConflicts.length === 0 && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-700 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    No time conflicts detected
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(null)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={processingMeetingId === showApproveModal.id || approveModalConflicts.length > 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingMeetingId === showApproveModal.id ? 'Approving...' : 'Approve Meeting'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface MeetingItemCardProps {
  meeting: Meeting;
  isSuperUser: boolean;
  isMyDepartment: boolean;
  onEdit: () => void;
  onDelete: () => void;
  formatTime: (time: string) => string;
}

function MeetingItemCard({
  meeting,
  isSuperUser,
  isMyDepartment,
  onEdit,
  onDelete,
  formatTime,
}: MeetingItemCardProps) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${
      isMyDepartment
        ? 'bg-purple-50 border-l-4 border-purple-500'
        : 'bg-gray-50'
    }`}>
      {/* Time column */}
      <div className="flex flex-col items-end w-16 flex-shrink-0">
        <span className="text-sm font-medium text-gray-700">{formatTime(meeting.startTime)}</span>
        <span className="text-xs text-gray-400">{formatTime(meeting.endTime)}</span>
      </div>

      {/* Meeting details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-semibold text-gray-800 truncate">{meeting.title}</h4>
          {isMyDepartment && (
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
              My Dept
            </span>
          )}
        </div>
        {meeting.departmentName && (
          <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
            {meeting.departmentName}
          </span>
        )}
        {meeting.location && (
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{meeting.location}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {isSuperUser && (
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-1 text-blue-500 hover:text-blue-700"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-red-500 hover:text-red-700"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
