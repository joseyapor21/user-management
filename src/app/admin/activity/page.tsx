'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface UserActivityData {
  userId: string;
  userName: string;
  userEmail: string;
  departments: {
    id: string;
    name: string;
    role: 'admin' | 'member';
  }[];
  currentTasks: {
    id: string;
    title: string;
    status: string;
    departmentName: string;
    priority: string;
  }[];
  completedTasksCount: number;
  isBusy: boolean;
  inProgressCount: number;
  lastActive?: string;
}

export default function UserActivityPage() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const [usersActivity, setUsersActivity] = useState<UserActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserActivityData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBusy, setFilterBusy] = useState<'all' | 'busy' | 'available'>('all');

  const fetchActivity = useCallback(async () => {
    if (!token) return;
    setLoading(true);

    try {
      const res = await fetch('/api/users/activity', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        setUsersActivity(data.data);
      }
    } catch (err) {
      console.error('Error fetching activity:', err);
    }

    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (!isLoading && user && !user.isSuperUser) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (token && user?.isSuperUser) {
      fetchActivity();
    }
  }, [token, user?.isSuperUser, fetchActivity]);

  const filteredUsers = usersActivity.filter(u => {
    const matchesSearch =
      u.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.userEmail.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterBusy === 'all' ||
      (filterBusy === 'busy' && u.isBusy) ||
      (filterBusy === 'available' && !u.isBusy);

    return matchesSearch && matchesFilter;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'todo': return 'bg-yellow-100 text-yellow-800';
      case 'done': return 'bg-green-100 text-green-800';
      case 'backlog': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user.isSuperUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-800">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-lg md:text-xl font-bold text-gray-800">User Activity Dashboard</h1>
          </div>
          <button
            onClick={fetchActivity}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
            title="Refresh"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterBusy('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterBusy === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({usersActivity.length})
              </button>
              <button
                onClick={() => setFilterBusy('busy')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterBusy === 'busy'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Busy ({usersActivity.filter(u => u.isBusy).length})
              </button>
              <button
                onClick={() => setFilterBusy('available')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterBusy === 'available'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Available ({usersActivity.filter(u => !u.isBusy).length})
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredUsers.map((userData) => (
              <div
                key={userData.userId}
                onClick={() => setSelectedUser(userData)}
                className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900">{userData.userName}</h3>
                    <p className="text-sm text-gray-500">{userData.userEmail}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      userData.isBusy
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {userData.isBusy ? 'Busy' : 'Available'}
                  </span>
                </div>

                {/* Departments */}
                {userData.departments.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Departments:</p>
                    <div className="flex flex-wrap gap-1">
                      {userData.departments.slice(0, 3).map((dept) => (
                        <span
                          key={dept.id}
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            dept.role === 'admin'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {dept.name}
                        </span>
                      ))}
                      {userData.departments.length > 3 && (
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">
                          +{userData.departments.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-blue-50 rounded p-2">
                    <p className="text-lg font-semibold text-blue-600">{userData.inProgressCount}</p>
                    <p className="text-xs text-gray-500">In Progress</p>
                  </div>
                  <div className="bg-yellow-50 rounded p-2">
                    <p className="text-lg font-semibold text-yellow-600">{userData.currentTasks.length}</p>
                    <p className="text-xs text-gray-500">Active Tasks</p>
                  </div>
                  <div className="bg-green-50 rounded p-2">
                    <p className="text-lg font-semibold text-green-600">{userData.completedTasksCount}</p>
                    <p className="text-xs text-gray-500">Completed</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredUsers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No users found matching your criteria
          </div>
        )}
      </main>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">{selectedUser.userName}</h2>
                  <p className="text-gray-500">{selectedUser.userEmail}</p>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Status Banner */}
              <div
                className={`p-3 rounded-lg mb-4 ${
                  selectedUser.isBusy ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      selectedUser.isBusy ? 'bg-red-500' : 'bg-green-500'
                    }`}
                  />
                  <span className={selectedUser.isBusy ? 'text-red-700' : 'text-green-700'}>
                    {selectedUser.isBusy
                      ? `Currently working on ${selectedUser.inProgressCount} task(s)`
                      : 'Currently available'}
                  </span>
                </div>
              </div>

              {/* Departments Section */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Departments ({selectedUser.departments.length})</h3>
                {selectedUser.departments.length === 0 ? (
                  <p className="text-sm text-gray-500">Not assigned to any department</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.departments.map((dept) => (
                      <span
                        key={dept.id}
                        className={`px-3 py-1 rounded-full text-sm ${
                          dept.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {dept.name}
                        {dept.role === 'admin' && (
                          <span className="ml-1 text-xs">(Admin)</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Current Tasks Section */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Current Tasks ({selectedUser.currentTasks.length})
                </h3>
                {selectedUser.currentTasks.length === 0 ? (
                  <p className="text-sm text-gray-500">No active tasks</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedUser.currentTasks.map((task) => (
                      <div
                        key={task.id}
                        className="border rounded-lg p-3 hover:bg-gray-50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{task.title}</p>
                            <p className="text-xs text-gray-500">{task.departmentName}</p>
                          </div>
                          <div className="flex gap-2">
                            <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(task.status)}`}>
                              {task.status.replace('_', ' ')}
                            </span>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{selectedUser.inProgressCount}</p>
                  <p className="text-sm text-gray-600">In Progress</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {selectedUser.currentTasks.filter(t => t.status === 'todo').length}
                  </p>
                  <p className="text-sm text-gray-600">To Do</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{selectedUser.completedTasksCount}</p>
                  <p className="text-sm text-gray-600">Completed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
