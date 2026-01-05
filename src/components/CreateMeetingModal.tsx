'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Department, User } from '@/types';

interface CreateMeetingModalProps {
  token: string;
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  isSuperUser: boolean;
  adminDepartmentIds: string[];
}

export default function CreateMeetingModal({
  token,
  isOpen,
  onClose,
  onCreated,
  isSuperUser,
  adminDepartmentIds,
}: CreateMeetingModalProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    departmentId: '',
    location: '',
    allMembers: true,
    attendeeIds: [] as string[],
  });

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch('/api/departments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        // Filter departments for non-superusers to only show their admin departments
        const filteredDepts = isSuperUser
          ? data.data
          : data.data.filter((dept: Department) => adminDepartmentIds.includes(dept.id));
        setDepartments(filteredDepts);
        // Set first department as default
        if (filteredDepts.length > 0) {
          setFormData(prev => prev.departmentId ? prev : { ...prev, departmentId: filteredDepts[0].id });
        }
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  }, [token, isSuperUser, adminDepartmentIds]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  }, [token]);

  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
      fetchUsers();
      // Reset form
      setFormData({
        title: '',
        description: '',
        date: '',
        startTime: '',
        endTime: '',
        departmentId: '',
        location: '',
        allMembers: true,
        attendeeIds: [],
      });
      setAttendeeSearch('');
    }
  }, [isOpen, fetchDepartments, fetchUsers]);

  // Get department members for the selected department
  const departmentMembers = useMemo(() => {
    if (!formData.departmentId) return [];
    const dept = departments.find(d => d.id === formData.departmentId);
    if (!dept) return [];
    const memberIds = [...(dept.adminIds || []), ...(dept.memberIds || [])];
    return users.filter(u => memberIds.includes(u.id));
  }, [formData.departmentId, departments, users]);

  // Filter members by search
  const filteredMembers = useMemo(() => {
    if (!attendeeSearch) return departmentMembers;
    const query = attendeeSearch.toLowerCase();
    return departmentMembers.filter(u =>
      u.name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query)
    );
  }, [departmentMembers, attendeeSearch]);

  // Get selected attendee names for display
  const selectedAttendees = useMemo(() => {
    return users.filter(u => formData.attendeeIds.includes(u.id));
  }, [users, formData.attendeeIds]);

  const toggleAttendee = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      attendeeIds: prev.attendeeIds.includes(userId)
        ? prev.attendeeIds.filter(id => id !== userId)
        : [...prev.attendeeIds, userId],
    }));
  };

  const selectAllMembers = () => {
    setFormData(prev => ({
      ...prev,
      attendeeIds: departmentMembers.map(u => u.id),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.success) {
        onCreated();
        onClose();
      } else {
        alert(data.error || 'Failed to create meeting');
      }
    } catch (err) {
      console.error('Error creating meeting:', err);
      alert('Failed to create meeting');
    }

    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              {isSuperUser ? 'Schedule Meeting' : 'Request Meeting'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
          </div>

          {!isSuperUser && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-700">
                Your meeting request will be sent to administrators for approval. You will be notified when it is approved or rejected.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                placeholder="Meeting title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                required
              >
                <option value="">Select a department</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                placeholder="e.g., Conference Room A, Zoom link"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                placeholder="Meeting agenda or details..."
                rows={3}
              />
            </div>

            {/* Attendees Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attendees
              </label>

              {/* All Members Toggle */}
              <div className="flex items-center gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, allMembers: true, attendeeIds: [] })}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    formData.allMembers
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    All Members
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, allMembers: false })}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    !formData.allMembers
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Select Specific
                  </span>
                </button>
              </div>

              {/* Member Selection (when not all members) */}
              {!formData.allMembers && (
                <div className="border rounded-lg p-3 bg-gray-50">
                  {!formData.departmentId ? (
                    <p className="text-sm text-gray-500 text-center py-2">
                      Select a department first to see members
                    </p>
                  ) : departmentMembers.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-2">
                      No members in this department
                    </p>
                  ) : (
                    <>
                      {/* Search and Select All */}
                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          value={attendeeSearch}
                          onChange={(e) => setAttendeeSearch(e.target.value)}
                          placeholder="Search members..."
                          className="flex-1 px-3 py-1.5 border rounded text-sm bg-white text-gray-900"
                        />
                        <button
                          type="button"
                          onClick={selectAllMembers}
                          className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Select All
                        </button>
                      </div>

                      {/* Selected Attendees */}
                      {selectedAttendees.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {selectedAttendees.map(user => (
                            <span
                              key={user.id}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                            >
                              {user.name}
                              <button
                                type="button"
                                onClick={() => toggleAttendee(user.id)}
                                className="hover:text-blue-900"
                              >
                                &times;
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Member List */}
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {filteredMembers.map(user => (
                          <label
                            key={user.id}
                            className="flex items-center gap-2 p-2 rounded hover:bg-white cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={formData.attendeeIds.includes(user.id)}
                              onChange={() => toggleAttendee(user.id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{user.name}</span>
                            <span className="text-xs text-gray-400">{user.email}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {formData.allMembers && formData.departmentId && (
                <p className="text-xs text-gray-500 mt-1">
                  All {departmentMembers.length} member{departmentMembers.length !== 1 ? 's' : ''} of this department will be notified
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading
                  ? (isSuperUser ? 'Creating...' : 'Submitting...')
                  : (isSuperUser ? 'Create Meeting' : 'Submit Request')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
