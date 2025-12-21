'use client';

import { useState, useEffect, useCallback } from 'react';
import { Department, User } from '@/types';

interface DepartmentCardProps {
  department: Department;
  token: string;
  isSuperUser: boolean;
  onAddAdmin: () => void;
  onAddMember: () => void;
  onRemoveAdmin: (userId: string) => void;
  onRemoveMember: (userId: string) => void;
  onDelete: () => void;
}

export default function DepartmentCard({
  department,
  token,
  isSuperUser,
  onAddAdmin,
  onAddMember,
  onRemoveAdmin,
  onRemoveMember,
  onDelete,
}: DepartmentCardProps) {
  const [showAdmins, setShowAdmins] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [admins, setAdmins] = useState<User[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [adminsFetched, setAdminsFetched] = useState(false);
  const [membersFetched, setMembersFetched] = useState(false);

  const fetchAdmins = useCallback(async () => {
    setLoadingAdmins(true);
    try {
      const res = await fetch(`/api/departments/${department.id}/admins`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAdmins(data.data);
      }
    } catch (err) {
      console.error('Error fetching admins:', err);
    }
    setLoadingAdmins(false);
    setAdminsFetched(true);
  }, [department.id, token]);

  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const res = await fetch(`/api/departments/${department.id}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMembers(data.data);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
    }
    setLoadingMembers(false);
    setMembersFetched(true);
  }, [department.id, token]);

  useEffect(() => {
    if (showAdmins && !adminsFetched) {
      fetchAdmins();
    }
  }, [showAdmins, adminsFetched, fetchAdmins]);

  useEffect(() => {
    if (showMembers && !membersFetched) {
      fetchMembers();
    }
  }, [showMembers, membersFetched, fetchMembers]);

  const handleRemoveAdmin = (userId: string) => {
    onRemoveAdmin(userId);
    setAdmins(admins.filter((a) => a.id !== userId));
  };

  const handleRemoveMember = (userId: string) => {
    onRemoveMember(userId);
    setMembers(members.filter((m) => m.id !== userId));
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{department.name}</h3>
        {isSuperUser && (
          <button
            onClick={onDelete}
            className="text-red-500 hover:text-red-700 text-sm"
          >
            Delete
          </button>
        )}
      </div>

      {/* Admins Section */}
      <div className="mb-3">
        <button
          onClick={() => setShowAdmins(!showAdmins)}
          className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <span>Admins ({department.adminIds?.length || 0})</span>
          <span>{showAdmins ? '▲' : '▼'}</span>
        </button>

        {showAdmins && (
          <div className="mt-2 pl-2 border-l-2 border-blue-200">
            {loadingAdmins ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : admins.length === 0 ? (
              <p className="text-sm text-gray-500">No admins</p>
            ) : (
              <ul className="space-y-1">
                {admins.map((admin) => (
                  <li key={admin.id} className="flex items-center justify-between text-sm">
                    <div className="text-gray-700">
                      <span className="font-medium">{admin.name || admin.email}</span>
                      {admin.name && <span className="text-gray-500 text-xs ml-1">({admin.email})</span>}
                    </div>
                    <button
                      onClick={() => handleRemoveAdmin(admin.id)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={onAddAdmin}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              + Add Admin
            </button>
          </div>
        )}
      </div>

      {/* Members Section */}
      <div>
        <button
          onClick={() => setShowMembers(!showMembers)}
          className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <span>Members ({department.memberIds?.length || 0})</span>
          <span>{showMembers ? '▲' : '▼'}</span>
        </button>

        {showMembers && (
          <div className="mt-2 pl-2 border-l-2 border-green-200">
            {loadingMembers ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : members.length === 0 ? (
              <p className="text-sm text-gray-500">No members</p>
            ) : (
              <ul className="space-y-1">
                {members.map((member) => (
                  <li key={member.id} className="flex items-center justify-between text-sm">
                    <div className="text-gray-700">
                      <span className="font-medium">{member.name || member.email}</span>
                      {member.name && <span className="text-gray-500 text-xs ml-1">({member.email})</span>}
                    </div>
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={onAddMember}
              className="mt-2 text-sm text-green-600 hover:text-green-800"
            >
              + Add Member
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
