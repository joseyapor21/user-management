'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { User, Department } from '@/types';
import DepartmentCard from '@/components/DepartmentCard';
import UserSearchModal from '@/components/UserSearchModal';
import KanbanBoard from '@/components/KanbanBoard';

type Tab = 'departments' | 'users' | 'projects';

export default function DashboardPage() {
  const { user, token, isLoading, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('projects');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [modalMode, setModalMode] = useState<'admin' | 'member'>('member');

  // New department/user form
  const [showNewDeptForm, setShowNewDeptForm] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', isAdmin: false, isSuperUser: false });

  // Edit user state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', password: '', isAdmin: false, isSuperUser: false });

  // Profile edit state (for current user)
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', password: '' });

  const fetchData = useCallback(async () => {
    setLoadingData(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch departments
      const deptRes = await fetch('/api/departments', { headers });
      const deptData = await deptRes.json();
      if (deptData.success) {
        setDepartments(deptData.data);
      }

      // Fetch users if SuperUser
      if (user?.isSuperUser) {
        const userRes = await fetch('/api/users', { headers });
        const userData = await userRes.json();
        if (userData.success) {
          setUsers(userData.data);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    }
    setLoadingData(false);
  }, [token, user?.isSuperUser]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, fetchData]);

  const createDepartment = async () => {
    if (!newDeptName.trim()) return;

    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newDeptName }),
      });

      const data = await res.json();
      if (data.success) {
        setNewDeptName('');
        setShowNewDeptForm(false);
        fetchData();
      } else {
        alert(data.error || 'Failed to create department');
      }
    } catch (err) {
      console.error('Error creating department:', err);
      alert('Failed to create department');
    }
  };

  const deleteDepartment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;

    try {
      const res = await fetch(`/api/departments?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || 'Failed to delete department');
      }
    } catch (err) {
      console.error('Error deleting department:', err);
      alert('Failed to delete department');
    }
  };

  const createUser = async () => {
    if (!newUser.email || !newUser.password) {
      alert('Email and password are required');
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newUser),
      });

      const data = await res.json();
      if (data.success) {
        setNewUser({ email: '', password: '', name: '', isAdmin: false, isSuperUser: false });
        setShowNewUserForm(false);
        fetchData();
      } else {
        alert(data.error || 'Failed to create user');
      }
    } catch (err) {
      console.error('Error creating user:', err);
      alert('Failed to create user');
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const res = await fetch(`/api/users?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Failed to delete user');
    }
  };

  const startEditUser = (u: User) => {
    setEditingUser(u);
    setEditForm({
      name: u.name || '',
      password: '',
      isAdmin: u.isAdmin,
      isSuperUser: u.isSuperUser,
    });
  };

  const updateUser = async () => {
    if (!editingUser) return;

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: editingUser.id,
          name: editForm.name,
          password: editForm.password || undefined,
          isAdmin: editForm.isAdmin,
          isSuperUser: editForm.isSuperUser,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEditingUser(null);
        fetchData();
      } else {
        alert(data.error || 'Failed to update user');
      }
    } catch (err) {
      console.error('Error updating user:', err);
      alert('Failed to update user');
    }
  };

  const openUserModal = (dept: Department, mode: 'admin' | 'member') => {
    setSelectedDepartment(dept);
    setModalMode(mode);
    setShowUserModal(true);
  };

  const handleAddUsers = async (userIds: string[]) => {
    if (!selectedDepartment) return;

    const endpoint = modalMode === 'admin'
      ? `/api/departments/${selectedDepartment.id}/admins`
      : `/api/departments/${selectedDepartment.id}/members`;

    try {
      // Add all users sequentially
      for (const userId of userIds) {
        await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId }),
        });
      }
      setShowUserModal(false);
      fetchData();
    } catch (err) {
      console.error('Error adding users:', err);
      alert('Failed to add users');
    }
  };

  const openProfileModal = () => {
    setProfileForm({
      name: user?.name || '',
      password: '',
    });
    setShowProfileModal(true);
  };

  const updateProfile = async () => {
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profileForm.name,
          password: profileForm.password || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowProfileModal(false);
        // Update local user state
        if (data.user) {
          localStorage.setItem('auth_user', JSON.stringify(data.user));
          window.location.reload();
        }
      } else {
        alert(data.error || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Failed to update profile');
    }
  };

  const handleRemoveAdmin = async (deptId: string, userId: string) => {
    try {
      const res = await fetch(`/api/departments/${deptId}/admins?userId=${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Error removing admin:', err);
    }
  };

  const handleRemoveMember = async (deptId: string, userId: string) => {
    try {
      const res = await fetch(`/api/departments/${deptId}/members?userId=${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Error removing member:', err);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">User Management</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user.name || user.email} {user.isSuperUser && <span className="text-blue-600">(SuperUser)</span>}
            </span>
            <button
              onClick={openProfileModal}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Edit Profile
            </button>
            <button
              onClick={logout}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('projects')}
            className={`pb-2 px-4 ${activeTab === 'projects' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Projects
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`pb-2 px-4 ${activeTab === 'departments' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Departments
          </button>
          {user.isSuperUser && (
            <button
              onClick={() => setActiveTab('users')}
              className={`pb-2 px-4 ${activeTab === 'users' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
            >
              All Users
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <KanbanBoard
            token={token!}
            departments={departments}
            userId={user.id}
            isSuperUser={user.isSuperUser}
            isAdmin={user.isAdmin}
          />
        )}

        {loadingData ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <>
            {/* Departments Tab */}
            {activeTab === 'departments' && (
              <div>
                {user.isSuperUser && (
                  <div className="mb-4">
                    {showNewDeptForm ? (
                      <div className="flex gap-2 items-center bg-white p-4 rounded-lg shadow">
                        <input
                          type="text"
                          value={newDeptName}
                          onChange={(e) => setNewDeptName(e.target.value)}
                          placeholder="Department name"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                        />
                        <button
                          onClick={createDepartment}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                        >
                          Create
                        </button>
                        <button
                          onClick={() => setShowNewDeptForm(false)}
                          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowNewDeptForm(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        + New Department
                      </button>
                    )}
                  </div>
                )}

                {departments.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No departments found</p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {departments.map((dept) => (
                      <DepartmentCard
                        key={dept.id}
                        department={dept}
                        token={token!}
                        isSuperUser={user.isSuperUser}
                        onAddAdmin={() => openUserModal(dept, 'admin')}
                        onAddMember={() => openUserModal(dept, 'member')}
                        onRemoveAdmin={(userId) => handleRemoveAdmin(dept.id, userId)}
                        onRemoveMember={(userId) => handleRemoveMember(dept.id, userId)}
                        onDelete={() => deleteDepartment(dept.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Users Tab (SuperUser only) */}
            {activeTab === 'users' && user.isSuperUser && (
              <div>
                <div className="mb-4">
                  {showNewUserForm ? (
                    <div className="bg-white p-4 rounded-lg shadow space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <input
                          type="email"
                          value={newUser.email}
                          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                          placeholder="Email"
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                        />
                        <input
                          type="password"
                          value={newUser.password}
                          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                          placeholder="Password"
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                        />
                        <input
                          type="text"
                          value={newUser.name}
                          onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                          placeholder="Name"
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                        />
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-gray-800 font-medium">
                            <input
                              type="checkbox"
                              checked={newUser.isAdmin}
                              onChange={(e) => setNewUser({ ...newUser, isAdmin: e.target.checked })}
                              className="w-4 h-4"
                            />
                            Admin
                          </label>
                          <label className="flex items-center gap-2 text-gray-800 font-medium">
                            <input
                              type="checkbox"
                              checked={newUser.isSuperUser}
                              onChange={(e) => setNewUser({ ...newUser, isSuperUser: e.target.checked })}
                              className="w-4 h-4"
                            />
                            SuperUser
                          </label>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={createUser}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                        >
                          Create User
                        </button>
                        <button
                          onClick={() => setShowNewUserForm(false)}
                          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowNewUserForm(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      + New User
                    </button>
                  )}
                </div>

                {users.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No users found</p>
                ) : (
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((u) => (
                          <tr key={u.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.name || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {u.isSuperUser ? (
                                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">SuperUser</span>
                              ) : u.isAdmin ? (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Admin</span>
                              ) : (
                                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">User</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-3">
                              <button
                                onClick={() => startEditUser(u)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                Edit
                              </button>
                              {u.id !== user.id && (
                                <button
                                  onClick={() => deleteUser(u.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* User Search Modal */}
      {showUserModal && selectedDepartment && (
        <UserSearchModal
          token={token!}
          onClose={() => setShowUserModal(false)}
          onSelectMultiple={handleAddUsers}
          excludeIds={modalMode === 'admin' ? selectedDepartment.adminIds : selectedDepartment.memberIds}
          title={modalMode === 'admin' ? `Add Admin to ${selectedDepartment.name}` : `Add Member to ${selectedDepartment.name}`}
        />
      )}

      {/* Profile Edit Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Edit Your Profile</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password (leave blank to keep current)</label>
                <input
                  type="password"
                  value={profileForm.password}
                  onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
                  placeholder="Enter new password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={updateProfile}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Save Changes
              </button>
              <button
                onClick={() => setShowProfileModal(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Edit User: {editingUser.name || editingUser.email}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password (leave blank to keep current)</label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Enter new password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-gray-800 font-medium">
                  <input
                    type="checkbox"
                    checked={editForm.isAdmin}
                    onChange={(e) => setEditForm({ ...editForm, isAdmin: e.target.checked })}
                    className="w-4 h-4"
                  />
                  Admin
                </label>
                <label className="flex items-center gap-2 text-gray-800 font-medium">
                  <input
                    type="checkbox"
                    checked={editForm.isSuperUser}
                    onChange={(e) => setEditForm({ ...editForm, isSuperUser: e.target.checked })}
                    className="w-4 h-4"
                  />
                  SuperUser
                </label>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={updateUser}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingUser(null)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
