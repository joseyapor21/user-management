'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Ticket, TicketType } from '@/types';

export default function SupportPage() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tickets state
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newResponse, setNewResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // New ticket form
  const [newTicket, setNewTicket] = useState({
    type: 'bug' as TicketType,
    title: '',
    description: '',
    screenshots: [] as string[],
    priority: 'medium',
  });
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);

  const fetchTickets = useCallback(async () => {
    if (!token) return;
    setLoading(true);

    try {
      const res = await fetch('/api/tickets', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        setTickets(data.data);
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
    }

    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (token) {
      fetchTickets();
    }
  }, [token, fetchTickets]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingScreenshot(true);

    try {
      // For now, convert to base64 data URLs
      // In production, you'd upload to a file storage service
      const newScreenshots: string[] = [];

      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          alert('Only image files are allowed');
          continue;
        }

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert('File size must be less than 5MB');
          continue;
        }

        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        newScreenshots.push(dataUrl);
      }

      setNewTicket(prev => ({
        ...prev,
        screenshots: [...prev.screenshots, ...newScreenshots],
      }));
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('Failed to upload file');
    }

    setUploadingScreenshot(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeScreenshot = (index: number) => {
    setNewTicket(prev => ({
      ...prev,
      screenshots: prev.screenshots.filter((_, i) => i !== index),
    }));
  };

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTicket.title.trim() || !newTicket.description.trim()) {
      alert('Title and description are required');
      return;
    }

    if (newTicket.screenshots.length === 0) {
      alert('At least one screenshot is required to help us understand the issue');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newTicket),
      });

      const data = await res.json();

      if (data.success) {
        setNewTicket({
          type: 'bug',
          title: '',
          description: '',
          screenshots: [],
          priority: 'medium',
        });
        setShowNewTicketForm(false);
        fetchTickets();
        alert('Ticket submitted successfully!');
      } else {
        alert(data.error || 'Failed to submit ticket');
      }
    } catch (err) {
      console.error('Error creating ticket:', err);
      alert('Failed to submit ticket');
    }

    setSubmitting(false);
  };

  const addResponse = async () => {
    if (!selectedTicket || !newResponse.trim()) return;

    setSubmitting(true);

    try {
      const res = await fetch('/api/tickets', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: selectedTicket.id,
          response: newResponse,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setNewResponse('');
        fetchTickets();
        // Refresh selected ticket
        const updatedRes = await fetch(`/api/tickets?id=${selectedTicket.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const updatedData = await updatedRes.json();
        if (updatedData.success) {
          setSelectedTicket(updatedData.data);
        }
      } else {
        alert(data.error || 'Failed to add response');
      }
    } catch (err) {
      console.error('Error adding response:', err);
      alert('Failed to add response');
    }

    setSubmitting(false);
  };

  const getTypeIcon = (type: TicketType) => {
    switch (type) {
      case 'bug':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'feature':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      case 'question':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
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
            <h1 className="text-lg md:text-xl font-bold text-gray-800">Support</h1>
          </div>
          <button
            onClick={() => setShowNewTicketForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
          >
            Report Issue
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Quick Links */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="font-medium text-gray-800 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => {
                setNewTicket({ ...newTicket, type: 'bug' });
                setShowNewTicketForm(true);
              }}
              className="flex flex-col items-center p-3 border rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors"
            >
              <svg className="w-8 h-8 text-red-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm text-gray-700">Report Bug</span>
            </button>
            <button
              onClick={() => {
                setNewTicket({ ...newTicket, type: 'feature' });
                setShowNewTicketForm(true);
              }}
              className="flex flex-col items-center p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors"
            >
              <svg className="w-8 h-8 text-blue-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="text-sm text-gray-700">Request Feature</span>
            </button>
            <button
              onClick={() => {
                setNewTicket({ ...newTicket, type: 'question' });
                setShowNewTicketForm(true);
              }}
              className="flex flex-col items-center p-3 border rounded-lg hover:bg-yellow-50 hover:border-yellow-200 transition-colors"
            >
              <svg className="w-8 h-8 text-yellow-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-gray-700">Ask Question</span>
            </button>
            <button
              onClick={() => {
                setNewTicket({ ...newTicket, type: 'other' });
                setShowNewTicketForm(true);
              }}
              className="flex flex-col items-center p-3 border rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <svg className="w-8 h-8 text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <span className="text-sm text-gray-700">Other</span>
            </button>
          </div>
        </div>

        {/* Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Link
            href="/help"
            className="flex items-center gap-3 bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
          >
            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <div>
              <p className="font-medium text-gray-800">Knowledge Base</p>
              <p className="text-sm text-gray-500">Learn how to use the app</p>
            </div>
          </Link>

          {user.isSuperUser && (
            <Link
              href="/admin/tickets"
              className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-lg p-4 hover:bg-purple-100 transition-colors"
            >
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <div>
                <p className="font-medium text-purple-800">Manage All Tickets</p>
                <p className="text-sm text-purple-600">View and respond to all user tickets</p>
              </div>
            </Link>
          )}

          {user.isSuperUser && (
            <Link
              href="/admin/activity"
              className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4 hover:bg-blue-100 transition-colors"
            >
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <div>
                <p className="font-medium text-blue-800">User Activity Dashboard</p>
                <p className="text-sm text-blue-600">View user workloads and tasks</p>
              </div>
            </Link>
          )}
        </div>

        {/* My Tickets */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h2 className="font-medium text-gray-800">My Tickets</h2>
              <button
                onClick={fetchTickets}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
                title="Refresh"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>No tickets yet</p>
              <p className="text-sm">Submit a ticket if you have any issues or ideas</p>
            </div>
          ) : (
            <div className="divide-y">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    {getTypeIcon(ticket.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-gray-900 truncate">{ticket.title}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(ticket.status)}`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{ticket.description}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>{new Date(ticket.metadata.createdAt).toLocaleDateString()}</span>
                        {ticket.responses.length > 0 && (
                          <span>{ticket.responses.length} response(s)</span>
                        )}
                      </div>
                    </div>
                    {ticket.screenshots.length > 0 && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {ticket.screenshots.length}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* New Ticket Modal */}
      {showNewTicketForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Submit a Ticket</h2>
                <button
                  onClick={() => setShowNewTicketForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={createTicket} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={newTicket.type}
                    onChange={(e) => setNewTicket({ ...newTicket, type: e.target.value as TicketType })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  >
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Request</option>
                    <option value="question">Question</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newTicket.title}
                    onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    placeholder="Brief description of the issue"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    placeholder="Provide detailed information about the issue or request..."
                    rows={4}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Screenshots <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">At least one screenshot is required to help us understand the issue</p>

                  {/* Screenshot Preview */}
                  {newTicket.screenshots.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {newTicket.screenshots.map((screenshot, index) => (
                        <div key={index} className="relative">
                          <img
                            src={screenshot}
                            alt={`Screenshot ${index + 1}`}
                            className="w-20 h-20 object-cover rounded border"
                          />
                          <button
                            type="button"
                            onClick={() => removeScreenshot(index)}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingScreenshot}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-500 transition-colors disabled:opacity-50"
                  >
                    {uploadingScreenshot ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        Uploading...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Add Screenshots
                      </span>
                    )}
                  </button>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNewTicketForm(false)}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    disabled={submitting || newTicket.screenshots.length === 0}
                  >
                    {submitting ? 'Submitting...' : 'Submit Ticket'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start gap-3">
                  {getTypeIcon(selectedTicket.type)}
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">{selectedTicket.title}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(selectedTicket.status)}`}>
                        {selectedTicket.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(selectedTicket.metadata.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Description */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-gray-700 whitespace-pre-wrap">{selectedTicket.description}</p>
              </div>

              {/* Screenshots */}
              {selectedTicket.screenshots.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Screenshots</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedTicket.screenshots.map((screenshot, index) => (
                      <a
                        key={index}
                        href={screenshot}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={screenshot}
                          alt={`Screenshot ${index + 1}`}
                          className="w-32 h-32 object-cover rounded border hover:opacity-80"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Responses */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Responses</h3>
                {selectedTicket.responses.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No responses yet</p>
                ) : (
                  <div className="space-y-3">
                    {selectedTicket.responses.map((response) => (
                      <div
                        key={response.id}
                        className={`p-3 rounded-lg ${
                          response.isAdmin ? 'bg-blue-50 border-l-4 border-blue-500' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-gray-900">
                            {response.userName}
                          </span>
                          {response.isAdmin && (
                            <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">Admin</span>
                          )}
                          <span className="text-xs text-gray-500">
                            {new Date(response.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{response.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Response */}
              {selectedTicket.status !== 'closed' && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Add Response</h3>
                  <textarea
                    value={newResponse}
                    onChange={(e) => setNewResponse(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    placeholder="Type your response..."
                    rows={3}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={addResponse}
                      disabled={submitting || !newResponse.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                    >
                      {submitting ? 'Sending...' : 'Send Response'}
                    </button>
                  </div>
                </div>
              )}

              {selectedTicket.status === 'closed' && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-500 text-center">This ticket is closed</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
