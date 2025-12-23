'use client';

import { useState, useEffect } from 'react';
import { CustomColumn } from '@/types';

interface TemplateSelectorProps {
  token: string;
  departmentId: string;
  onClose: () => void;
  onApply: (columns: CustomColumn[]) => void;
}

interface Template {
  id: string;
  name: string;
  description: string;
  columns: CustomColumn[];
  sampleTasks: { title: string; description: string; priority: string; status: string }[];
  isGlobal: boolean;
  createdBy: string;
}

export default function TemplateSelector({
  token,
  departmentId,
  onClose,
  onApply,
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [includeSampleTasks, setIncludeSampleTasks] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setTemplates(data.data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!selectedTemplate) return;

    setApplying(true);
    try {
      const res = await fetch('/api/templates/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          departmentId,
          includeSampleTasks,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onApply(data.data.columns);
      } else {
        alert(data.error || 'Failed to apply template');
      }
    } catch {
      alert('Failed to apply template');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Board Templates</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Choose a template to set up your board. This will update the columns for your department.
              </p>

              {/* Template Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedTemplate?.id === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-800">{template.name}</h3>
                      {template.isGlobal && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          Built-in
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-3">{template.description}</p>

                    {/* Column Preview */}
                    <div className="flex flex-wrap gap-1">
                      {template.columns.map((col) => (
                        <span
                          key={col.id}
                          className="text-xs px-2 py-0.5 rounded text-white"
                          style={{ backgroundColor: col.color || '#6b7280' }}
                        >
                          {col.name}
                        </span>
                      ))}
                    </div>

                    {/* Sample tasks indicator */}
                    {template.sampleTasks && template.sampleTasks.length > 0 && (
                      <p className="text-xs text-gray-400 mt-2">
                        Includes {template.sampleTasks.length} sample task{template.sampleTasks.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Selected template details */}
              {selectedTemplate && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                  <h4 className="font-medium text-gray-800 mb-2">
                    Selected: {selectedTemplate.name}
                  </h4>

                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      This will set up {selectedTemplate.columns.length} columns:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.columns.map((col, idx) => (
                        <div key={col.id} className="flex items-center gap-1 text-sm">
                          <span className="text-gray-400">{idx + 1}.</span>
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: col.color || '#6b7280' }}
                          />
                          <span className="text-gray-700">{col.name}</span>
                        </div>
                      ))}
                    </div>

                    {/* Sample tasks option */}
                    {selectedTemplate.sampleTasks && selectedTemplate.sampleTasks.length > 0 && (
                      <label className="flex items-center gap-2 mt-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeSampleTasks}
                          onChange={(e) => setIncludeSampleTasks(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">
                          Include {selectedTemplate.sampleTasks.length} sample tasks
                        </span>
                      </label>
                    )}
                  </div>

                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                    <strong>Note:</strong> Applying this template will replace your current column configuration.
                    Existing tasks will keep their status but may need to be reassigned to new columns.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!selectedTemplate || applying}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {applying ? 'Applying...' : 'Apply Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
