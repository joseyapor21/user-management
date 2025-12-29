'use client';

import { useState } from 'react';
import Link from 'next/link';

type Section = 'getting-started' | 'tasks' | 'comments' | 'notifications' | 'admin' | 'tips';

export default function HelpPage() {
  const [activeSection, setActiveSection] = useState<Section>('getting-started');

  const sections = [
    { id: 'getting-started', label: 'Getting Started', icon: '🚀' },
    { id: 'tasks', label: 'Managing Tasks', icon: '📋' },
    { id: 'comments', label: 'Comments & Chat', icon: '💬' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'admin', label: 'Admin Features', icon: '⚙️' },
    { id: 'tips', label: 'Tips & Tricks', icon: '💡' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-gray-800">Help & Knowledge Base</h1>
          </div>
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar Navigation */}
          <nav className="md:w-64 shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-2 sticky top-20">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id as Section)}
                  className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl">{section.icon}</span>
                  <span className="font-medium">{section.label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Content */}
          <main className="flex-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              {activeSection === 'getting-started' && <GettingStarted />}
              {activeSection === 'tasks' && <ManagingTasks />}
              {activeSection === 'comments' && <CommentsChat />}
              {activeSection === 'notifications' && <Notifications />}
              {activeSection === 'admin' && <AdminFeatures />}
              {activeSection === 'tips' && <TipsAndTricks />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function GettingStarted() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Getting Started</h2>
        <p className="text-gray-600">Welcome to the Task Management App! Here&apos;s everything you need to know to get started.</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">What is this app?</h3>
        <p className="text-gray-600">
          This is a Kanban-style task management application that helps teams organize, track, and collaborate on tasks.
          Tasks are organized into columns (Backlog, To Do, In Progress, Done) and can be assigned to team members.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Logging In</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600">
          <li>Go to the login page</li>
          <li>Enter your email and password</li>
          <li>Click &quot;Sign In&quot; to access your dashboard</li>
        </ol>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm">
            <strong>Tip:</strong> If you received an invite link, use that to sign up with the &quot;Sign Up&quot; page.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Understanding the Dashboard</h3>
        <p className="text-gray-600">The dashboard is your main workspace. Here&apos;s what you&apos;ll see:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
          <li><strong>Kanban Board</strong> - Tasks organized in columns by status</li>
          <li><strong>Search Bar</strong> - Find tasks by title, description, or labels</li>
          <li><strong>Filters</strong> - Filter by department, priority, or due date</li>
          <li><strong>View Modes</strong> - Switch between Board, Swimlane, or Calendar view</li>
          <li><strong>&quot;All&quot; / &quot;Mine&quot; Toggle</strong> - See all tasks or just yours</li>
        </ul>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Your Role</h3>
        <div className="grid gap-3">
          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-gray-800">Regular User</h4>
            <p className="text-gray-600 text-sm mt-1">Can view tasks, update status on assigned tasks, add comments, and log time.</p>
          </div>
          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-gray-800">Department Admin</h4>
            <p className="text-gray-600 text-sm mt-1">Can create, edit, and delete tasks in their department. Can assign tasks to members.</p>
          </div>
          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-gray-800">Super User</h4>
            <p className="text-gray-600 text-sm mt-1">Has full access to all departments and all features.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ManagingTasks() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Managing Tasks</h2>
        <p className="text-gray-600">Learn how to create, edit, and organize your tasks.</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Creating a New Task</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600">
          <li>Click the <strong>&quot;Add&quot;</strong> or <strong>&quot;New Task&quot;</strong> button</li>
          <li>Fill in the task title (required)</li>
          <li>Add a description if needed</li>
          <li>Select the department</li>
          <li>Set priority (Low, Medium, High, Urgent)</li>
          <li>Assign to a team member (optional)</li>
          <li>Set a due date (optional)</li>
          <li>Click <strong>&quot;Create Task&quot;</strong></li>
        </ol>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Viewing Task Details</h3>
        <p className="text-gray-600">Click on any task card to open its details. You&apos;ll see several tabs:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
          <li><strong>Details</strong> - Status, priority, assignee, due date, time tracking</li>
          <li><strong>Subtasks</strong> - Break down the task into smaller items</li>
          <li><strong>Files</strong> - View attached files</li>
          <li><strong>Deps</strong> - Task dependencies (blocked by other tasks)</li>
          <li><strong>Activity</strong> - History of changes to the task</li>
          <li><strong>Comments</strong> - Team discussion about the task</li>
        </ul>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Moving Tasks (Changing Status)</h3>
        <p className="text-gray-600">There are two ways to move a task:</p>
        <div className="grid gap-3">
          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-gray-800">Drag and Drop</h4>
            <p className="text-gray-600 text-sm mt-1">Click and hold a task card, then drag it to another column.</p>
          </div>
          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-gray-800">Edit the Task</h4>
            <p className="text-gray-600 text-sm mt-1">Open the task, click Edit, and change the Status dropdown.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Editing a Task</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600">
          <li>Click on the task to open it</li>
          <li>Click the <strong>&quot;Edit&quot;</strong> button</li>
          <li>Make your changes</li>
          <li>Click <strong>&quot;Save&quot;</strong> to confirm</li>
        </ol>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Moving to Drafts (Soft Delete)</h3>
        <p className="text-gray-600">
          Tasks aren&apos;t permanently deleted. Instead, they go to &quot;Drafts&quot; where they can be restored later.
        </p>
        <ol className="list-decimal list-inside space-y-2 text-gray-600">
          <li>Open the task</li>
          <li>Click <strong>&quot;Move to Drafts&quot;</strong></li>
          <li>To restore, go to <strong>Drafts</strong> and click <strong>&quot;Restore&quot;</strong></li>
        </ol>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Time Tracking</h3>
        <p className="text-gray-600">Track time spent on tasks:</p>
        <ol className="list-decimal list-inside space-y-2 text-gray-600">
          <li>Open a task assigned to you</li>
          <li>Go to the <strong>Details</strong> tab</li>
          <li>Click <strong>&quot;Log Time&quot;</strong></li>
          <li>Enter the hours worked</li>
          <li>Click <strong>&quot;Save&quot;</strong></li>
        </ol>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Using Labels</h3>
        <p className="text-gray-600">Labels help categorize and filter tasks:</p>
        <ol className="list-decimal list-inside space-y-2 text-gray-600">
          <li>Edit the task</li>
          <li>Scroll to the Labels section</li>
          <li>Type a label name and select a color</li>
          <li>Click <strong>&quot;Add&quot;</strong></li>
        </ol>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Subtasks</h3>
        <p className="text-gray-600">Break down complex tasks into smaller steps:</p>
        <ol className="list-decimal list-inside space-y-2 text-gray-600">
          <li>Open the task and go to <strong>Subtasks</strong> tab</li>
          <li>Type the subtask title</li>
          <li>Click <strong>&quot;Add&quot;</strong></li>
          <li>Check off subtasks as you complete them</li>
        </ol>
      </div>
    </div>
  );
}

function CommentsChat() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Comments & Chat</h2>
        <p className="text-gray-600">Communicate with your team about specific tasks.</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Adding a Comment</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600">
          <li>Open the task by clicking on it</li>
          <li>Go to the <strong>Comments</strong> tab</li>
          <li>Type your message in the input field</li>
          <li>Press <strong>Enter</strong> or click the send button</li>
        </ol>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Chat Features</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
          <li><strong>Your messages</strong> appear on the right in blue</li>
          <li><strong>Others&apos; messages</strong> appear on the left in white</li>
          <li><strong>Timestamps</strong> show when each message was sent</li>
          <li><strong>Newest messages</strong> are at the bottom</li>
        </ul>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Deleting Comments</h3>
        <p className="text-gray-600">You can delete your own comments:</p>
        <ol className="list-decimal list-inside space-y-2 text-gray-600">
          <li>Find the comment you want to delete</li>
          <li>Click the <strong>&quot;Delete&quot;</strong> link next to the timestamp</li>
        </ol>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            <strong>Note:</strong> Admins can delete any comment. Regular users can only delete their own.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Who Gets Notified?</h3>
        <p className="text-gray-600">When you add a comment, notifications are sent to:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
          <li>The task&apos;s assignee</li>
          <li>The person who created the task</li>
        </ul>
      </div>
    </div>
  );
}

function Notifications() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Notifications</h2>
        <p className="text-gray-600">Stay updated on task changes and comments.</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Push Notifications</h3>
        <p className="text-gray-600">The app sends push notifications for:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
          <li>When a task is assigned to you</li>
          <li>When someone comments on your task</li>
          <li>When your task&apos;s status changes</li>
          <li>When a task you created gets updated</li>
        </ul>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Enabling Notifications</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600">
          <li>When you first visit, you&apos;ll see a notification permission request</li>
          <li>Click <strong>&quot;Allow&quot;</strong> to enable notifications</li>
          <li>You&apos;ll now receive alerts even when the app is closed</li>
        </ol>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm">
            <strong>Tip:</strong> On iPhone, add the app to your home screen for the best notification experience.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Clicking Notifications</h3>
        <p className="text-gray-600">When you tap a notification:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
          <li>The app will open</li>
          <li>It will navigate directly to the relevant task</li>
          <li>You can view the update or respond to comments immediately</li>
        </ul>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Auto-Refresh</h3>
        <p className="text-gray-600">
          The dashboard automatically refreshes every 10 seconds to show the latest updates.
          If someone else makes a change, you&apos;ll see it within seconds.
        </p>
      </div>
    </div>
  );
}

function AdminFeatures() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Admin Features</h2>
        <p className="text-gray-600">Advanced features for department admins and super users.</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Managing Departments</h3>
        <p className="text-gray-600">Super users can create and manage departments from the admin panel:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
          <li>Create new departments</li>
          <li>Add/remove department members</li>
          <li>Assign department admins</li>
        </ul>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Custom Columns</h3>
        <p className="text-gray-600">Customize your Kanban board columns:</p>
        <ol className="list-decimal list-inside space-y-2 text-gray-600">
          <li>Select a specific department (not &quot;All Departments&quot;)</li>
          <li>Click the <strong>&quot;Columns&quot;</strong> button</li>
          <li>Add, rename, reorder, or delete columns</li>
          <li>Set custom colors for each column</li>
        </ol>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Board Templates</h3>
        <p className="text-gray-600">Quickly set up a board with pre-configured columns:</p>
        <ol className="list-decimal list-inside space-y-2 text-gray-600">
          <li>Select a department</li>
          <li>Click <strong>&quot;Templates&quot;</strong></li>
          <li>Choose from available templates:
            <ul className="list-disc list-inside ml-6 mt-2">
              <li>Software Development</li>
              <li>Content Creation</li>
              <li>Marketing Campaign</li>
              <li>Bug Tracking</li>
              <li>Simple (Basic 3-column)</li>
            </ul>
          </li>
        </ol>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Inviting Users</h3>
        <p className="text-gray-600">Add new team members:</p>
        <ol className="list-decimal list-inside space-y-2 text-gray-600">
          <li>Go to the admin panel</li>
          <li>Click <strong>&quot;Invite User&quot;</strong></li>
          <li>Enter their email address</li>
          <li>Select which departments they should join</li>
          <li>Send the invite</li>
        </ol>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Drafts Management</h3>
        <p className="text-gray-600">Manage deleted tasks:</p>
        <ol className="list-decimal list-inside space-y-2 text-gray-600">
          <li>Click the <strong>&quot;Drafts&quot;</strong> button</li>
          <li>View all archived/deleted tasks</li>
          <li>Click <strong>&quot;Restore&quot;</strong> to bring a task back</li>
          <li>Click <strong>&quot;Delete Permanently&quot;</strong> to remove forever</li>
        </ol>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Task Statistics</h3>
        <p className="text-gray-600">View board analytics:</p>
        <ol className="list-decimal list-inside space-y-2 text-gray-600">
          <li>Click the <strong>&quot;Stats&quot;</strong> button</li>
          <li>See total tasks, completion rate, overdue items</li>
          <li>View time tracking summaries</li>
        </ol>
      </div>
    </div>
  );
}

function TipsAndTricks() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Tips & Tricks</h2>
        <p className="text-gray-600">Get the most out of the app with these helpful tips.</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Keyboard Shortcuts</h3>
        <div className="grid gap-2">
          <div className="flex justify-between border-b py-2">
            <span className="text-gray-600">Send comment</span>
            <kbd className="bg-gray-100 px-2 py-1 rounded text-sm">Enter</kbd>
          </div>
          <div className="flex justify-between border-b py-2">
            <span className="text-gray-600">New line in comment</span>
            <kbd className="bg-gray-100 px-2 py-1 rounded text-sm">Shift + Enter</kbd>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Quick Filters</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
          <li>Use <strong>&quot;Mine&quot;</strong> view to focus on your assigned tasks</li>
          <li>Filter by <strong>&quot;Overdue&quot;</strong> to see what needs attention</li>
          <li>Filter by <strong>&quot;Urgent&quot;</strong> priority for critical items</li>
          <li>Use the search bar to find tasks by keywords or labels</li>
        </ul>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">View Modes</h3>
        <div className="grid gap-3">
          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-gray-800">Board View</h4>
            <p className="text-gray-600 text-sm mt-1">Classic Kanban columns. Best for daily task management.</p>
          </div>
          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-gray-800">Swimlane View</h4>
            <p className="text-gray-600 text-sm mt-1">Group tasks by priority or assignee. Great for team overview.</p>
          </div>
          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-gray-800">Calendar View</h4>
            <p className="text-gray-600 text-sm mt-1">See tasks by due date. Perfect for deadline planning.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Mobile Tips</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
          <li><strong>Add to Home Screen</strong> - For app-like experience and better notifications</li>
          <li><strong>Pull to Refresh</strong> - Scroll up to refresh the board</li>
          <li><strong>Swipe columns</strong> - In mobile view, swipe left/right between columns</li>
        </ul>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Best Practices</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
          <li>Keep task titles short and descriptive</li>
          <li>Use labels to categorize tasks (e.g., &quot;Bug&quot;, &quot;Feature&quot;, &quot;Urgent&quot;)</li>
          <li>Set due dates for time-sensitive tasks</li>
          <li>Break large tasks into subtasks</li>
          <li>Log time regularly to track progress</li>
          <li>Use comments to communicate instead of external chat</li>
          <li>Move completed tasks to &quot;Done&quot; promptly</li>
        </ul>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-medium text-green-800 mb-2">Need More Help?</h4>
        <p className="text-green-700 text-sm">
          Contact your administrator if you need assistance with your account or have questions not covered here.
        </p>
      </div>
    </div>
  );
}
