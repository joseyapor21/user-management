'use client';

import { useState } from 'react';
import { CustomColumn } from '@/types';

interface ColumnManagerProps {
  columns: CustomColumn[];
  token: string;
  departmentId: string;
  onClose: () => void;
  onSave: (columns: CustomColumn[]) => void;
}

const colorOptions = [
  { value: '#6b7280', label: 'Gray' },
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#fbbf24', label: 'Yellow' },
  { value: '#22c55e', label: 'Green' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
];

export default function ColumnManager({
  columns: initialColumns,
  token,
  departmentId,
  onClose,
  onSave,
}: ColumnManagerProps) {
  const [columns, setColumns] = useState<CustomColumn[]>(
    initialColumns.map((c, i) => ({ ...c, order: i }))
  );
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newColumnName, setNewColumnName] = useState('');

  const handleAddColumn = () => {
    if (!newColumnName.trim()) return;

    const newColumn: CustomColumn = {
      id: `custom_${Date.now()}`,
      name: newColumnName.trim(),
      order: columns.length,
      color: '#6b7280',
    };

    setColumns([...columns, newColumn]);
    setNewColumnName('');
  };

  const handleRemoveColumn = (id: string) => {
    if (columns.length <= 2) {
      alert('You must have at least 2 columns');
      return;
    }
    setColumns(columns.filter(c => c.id !== id).map((c, i) => ({ ...c, order: i })));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newColumns = [...columns];
    [newColumns[index - 1], newColumns[index]] = [newColumns[index], newColumns[index - 1]];
    setColumns(newColumns.map((c, i) => ({ ...c, order: i })));
  };

  const handleMoveDown = (index: number) => {
    if (index === columns.length - 1) return;
    const newColumns = [...columns];
    [newColumns[index], newColumns[index + 1]] = [newColumns[index + 1], newColumns[index]];
    setColumns(newColumns.map((c, i) => ({ ...c, order: i })));
  };

  const handleUpdateColumn = (id: string, updates: Partial<CustomColumn>) => {
    setColumns(columns.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleSave = async () => {
    if (columns.length < 2) {
      alert('You must have at least 2 columns');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/departments/${departmentId}/columns`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ columns }),
      });

      if (res.ok) {
        onSave(columns);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save columns');
      }
    } catch {
      alert('Failed to save columns');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset columns to defaults? All custom columns will be removed.')) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/departments/${departmentId}/columns`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        onSave(data.data);
      }
    } catch {
      alert('Failed to reset columns');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Customize Columns</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {/* Column list */}
          <div className="space-y-2">
            {columns.map((column, index) => (
              <div
                key={column.id}
                className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border"
              >
                {/* Order controls */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === columns.length - 1}
                    className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Color indicator */}
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: column.color || '#6b7280' }}
                />

                {/* Name */}
                {editingId === column.id ? (
                  <input
                    type="text"
                    value={column.name}
                    onChange={(e) => handleUpdateColumn(column.id, { name: e.target.value })}
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                    className="flex-1 px-2 py-1 border rounded text-sm bg-white text-gray-900"
                    autoFocus
                  />
                ) : (
                  <span
                    className="flex-1 text-sm font-medium text-gray-700 cursor-pointer"
                    onClick={() => setEditingId(column.id)}
                  >
                    {column.name}
                  </span>
                )}

                {/* Color selector */}
                <select
                  value={column.color || '#6b7280'}
                  onChange={(e) => handleUpdateColumn(column.id, { color: e.target.value })}
                  className="text-xs px-1 py-1 border rounded bg-white"
                >
                  {colorOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                {/* Delete button */}
                <button
                  onClick={() => handleRemoveColumn(column.id)}
                  disabled={columns.length <= 2}
                  className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Add new column */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
              placeholder="New column name..."
              className="flex-1 px-3 py-2 border rounded-md text-sm bg-white text-gray-900"
            />
            <button
              onClick={handleAddColumn}
              disabled={!newColumnName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>

          <p className="text-xs text-gray-500">
            Click on a column name to edit it. Drag columns to reorder. Minimum 2 columns required.
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-between">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-red-600 hover:text-red-700 text-sm"
          >
            Reset to Defaults
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
