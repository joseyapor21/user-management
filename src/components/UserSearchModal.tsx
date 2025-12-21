'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from '@/types';

interface UserSearchModalProps {
  token: string;
  onClose: () => void;
  onSelectMultiple: (userIds: string[]) => void;
  excludeIds: string[];
  title: string;
}

export default function UserSearchModal({
  token,
  onClose,
  onSelectMultiple,
  excludeIds,
  title,
}: UserSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter((user) => {
    if (excludeIds.includes(user.id)) return false;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        user.email.toLowerCase().includes(search) ||
        (user.name && user.name.toLowerCase().includes(search))
      );
    }
    return true;
  });

  const toggleSelection = (userId: string) => {
    setSelectedIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAll = () => {
    setSelectedIds(filteredUsers.map((u) => u.id));
  };

  const deselectAll = () => {
    setSelectedIds([]);
  };

  const handleAddSelected = () => {
    if (selectedIds.length > 0) {
      onSelectMultiple(selectedIds);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="p-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by email or name..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-4 bg-white text-gray-900"
            autoFocus
          />

          {/* Select All / Deselect All */}
          {filteredUsers.length > 0 && (
            <div className="flex gap-2 mb-3">
              <button
                onClick={selectAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Select All
              </button>
              <span className="text-gray-400">|</span>
              <button
                onClick={deselectAll}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Deselect All
              </button>
              {selectedIds.length > 0 && (
                <span className="text-sm text-gray-500 ml-auto">
                  {selectedIds.length} selected
                </span>
              )}
            </div>
          )}

          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              {searchTerm ? 'No users found' : 'All users are already added'}
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {filteredUsers.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center px-4 py-3 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(user.id)}
                    onChange={() => toggleSelection(user.id)}
                    className="w-4 h-4 mr-3"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{user.name || user.email}</p>
                    {user.name && <p className="text-sm text-gray-500">{user.email}</p>}
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* Add Selected Button */}
          {selectedIds.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <button
                onClick={handleAddSelected}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
              >
                Add {selectedIds.length} User{selectedIds.length > 1 ? 's' : ''}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
