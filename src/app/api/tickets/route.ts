import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import webpush from 'web-push';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const COLLECTION_NAME = 'v5tickets';
const USERS_COLLECTION = 'v5users';
const SUBSCRIPTIONS_COLLECTION = 'v5push_subscriptions';

// VAPID keys for push notifications
const VAPID_PUBLIC_KEY = 'BJhtjt4mkjp_f-dFU8PHLFRjDqFpeHncXVY2VwtiQH_5_GTdmtdj9K1or3pwkOWRTXWhLr7JVtlhfDVsuV-GqHI';
const VAPID_PRIVATE_KEY = 'LD2qY1dgXDty4tPoB0s5LoCH_AlowBBIa26UBgocq1w';

// Configure web-push
webpush.setVapidDetails(
  'mailto:admin@ccoan-ny.org',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Send push notification to a user
async function sendTicketNotification(userId: string, notification: { title: string; body: string; url: string; tag: string }) {
  try {
    const db = await getDatabase();
    const subscriptions = await db.collection(SUBSCRIPTIONS_COLLECTION)
      .find({ userId })
      .toArray();

    if (subscriptions.length === 0) return;

    const payload = JSON.stringify({
      ...notification,
      ticketId: notification.tag,
    });

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(sub.subscription, payload);
        } catch (error: unknown) {
          const webPushError = error as { statusCode?: number };
          if (webPushError.statusCode === 410 || webPushError.statusCode === 404) {
            await db.collection(SUBSCRIPTIONS_COLLECTION).deleteOne({ _id: sub._id });
          }
        }
      })
    );
  } catch (error) {
    console.error('Failed to send ticket notification:', error);
  }
}

// Get user info from token
async function getUserFromRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { _id: string };

    const db = await getDatabase();
    const user = await db.collection(USERS_COLLECTION).findOne({ _id: new ObjectId(decoded._id) });

    if (!user) return null;

    return {
      userId: user._id.toString(),
      userName: user.name || user.email,
      userEmail: user.email,
      isSuperUser: user.isSuperUser || false,
      isAdmin: user.isAdmin || false,
    };
  } catch {
    return null;
  }
}

// GET - List tickets (SuperUsers see all, others see their own)
export async function GET(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('id');
    const status = searchParams.get('status');

    const db = await getDatabase();

    // If requesting a single ticket by ID
    if (ticketId) {
      const ticket = await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(ticketId) });

      if (!ticket) {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }

      // Check access: SuperUsers can see all, others can only see their own
      if (!userInfo.isSuperUser && ticket.submittedBy !== userInfo.userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const normalizedTicket = {
        ...ticket,
        id: ticket._id.toString(),
      };

      return NextResponse.json({ success: true, data: normalizedTicket });
    }

    // Build query based on user role
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};

    // SuperUsers see all tickets, others see only their own
    if (!userInfo.isSuperUser) {
      query.submittedBy = userInfo.userId;
    }

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    const tickets = await db
      .collection(COLLECTION_NAME)
      .find(query)
      .sort({ 'metadata.createdAt': -1 })
      .toArray();

    const normalizedTickets = tickets.map((t) => ({
      ...t,
      id: t._id.toString(),
    }));

    return NextResponse.json({ success: true, data: normalizedTickets });
  } catch (error) {
    console.error('Fetch tickets error:', error);
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
}

// POST - Create a new ticket
export async function POST(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, title, description, screenshots, priority } = body;

    if (!type || !title || !description) {
      return NextResponse.json({ error: 'Type, title, and description are required' }, { status: 400 });
    }

    // Screenshots are mandatory
    if (!screenshots || screenshots.length === 0) {
      return NextResponse.json({ error: 'At least one screenshot is required' }, { status: 400 });
    }

    const db = await getDatabase();

    const newTicket = {
      type,
      title: title.trim(),
      description: description.trim(),
      screenshots,
      status: 'open',
      priority: priority || 'medium',
      submittedBy: userInfo.userId,
      submittedByName: userInfo.userName,
      submittedByEmail: userInfo.userEmail,
      assignedTo: null,
      assignedToName: null,
      responses: [],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    const result = await db.collection(COLLECTION_NAME).insertOne(newTicket);

    // Notify all superusers about new ticket
    const superUsers = await db.collection(USERS_COLLECTION).find({ isSuperUser: true }).toArray();
    for (const su of superUsers) {
      if (su._id.toString() !== userInfo.userId) {
        await sendTicketNotification(su._id.toString(), {
          title: 'New Support Ticket',
          body: `${userInfo.userName} submitted: ${title}`,
          url: '/admin/tickets',
          tag: `new-ticket-${result.insertedId.toString()}`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Ticket created successfully',
      id: result.insertedId.toString(),
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
  }
}

// PUT - Update ticket (SuperUsers can update status/assign, submitters can add responses)
export async function PUT(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, status, priority, assignedTo, response } = body;

    if (!id) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
    }

    const db = await getDatabase();

    const existingTicket = await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) });
    if (!existingTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check permissions
    const isSubmitter = existingTicket.submittedBy === userInfo.userId;

    if (!userInfo.isSuperUser && !isSubmitter) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const now = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      'metadata.updatedAt': now,
    };

    // SuperUsers can update status, priority, and assignment
    if (userInfo.isSuperUser) {
      if (status !== undefined) {
        updateData.status = status;

        // Track resolution
        if (status === 'resolved') {
          updateData.resolvedAt = now;
          updateData.resolvedBy = userInfo.userId;
          updateData.resolvedByName = userInfo.userName;
        }
      }
      if (priority !== undefined) {
        updateData.priority = priority;
      }
      if (assignedTo !== undefined) {
        updateData.assignedTo = assignedTo;
        // Get assignee name
        if (assignedTo) {
          const assignee = await db.collection(USERS_COLLECTION).findOne({ _id: new ObjectId(assignedTo) });
          updateData.assignedToName = assignee?.name || assignee?.email || 'Unknown';
        } else {
          updateData.assignedToName = null;
        }
      }
    }

    // Build update operation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateOperation: any = { $set: updateData };

    // Add response if provided (both SuperUsers and submitters can respond)
    if (response && response.trim()) {
      const newResponse = {
        id: new ObjectId().toString(),
        userId: userInfo.userId,
        userName: userInfo.userName,
        message: response.trim(),
        isAdmin: userInfo.isSuperUser,
        createdAt: now,
      };
      updateOperation.$push = { responses: newResponse };
    }

    await db.collection(COLLECTION_NAME).updateOne(
      { _id: new ObjectId(id) },
      updateOperation
    );

    // Send notifications
    if (response && response.trim()) {
      // If admin responded, notify the ticket submitter
      if (userInfo.isSuperUser && existingTicket.submittedBy !== userInfo.userId) {
        await sendTicketNotification(existingTicket.submittedBy, {
          title: 'Ticket Update',
          body: `Admin responded to your ticket: ${existingTicket.title}`,
          url: '/support',
          tag: `ticket-${id}`,
        });
      }
      // If submitter responded, notify all superusers
      else if (!userInfo.isSuperUser) {
        const superUsers = await db.collection(USERS_COLLECTION).find({ isSuperUser: true }).toArray();
        for (const su of superUsers) {
          if (su._id.toString() !== userInfo.userId) {
            await sendTicketNotification(su._id.toString(), {
              title: 'New Ticket Response',
              body: `${userInfo.userName} responded to: ${existingTicket.title}`,
              url: '/admin/tickets',
              tag: `ticket-${id}`,
            });
          }
        }
      }
    }

    // Notify on status change
    if (status !== undefined && status !== existingTicket.status) {
      // Notify the submitter of status changes
      if (existingTicket.submittedBy !== userInfo.userId) {
        let statusMessage = '';
        if (status === 'resolved') {
          statusMessage = `Your ticket "${existingTicket.title}" has been resolved`;
        } else if (status === 'in_progress') {
          statusMessage = `Your ticket "${existingTicket.title}" is now being worked on`;
        } else if (status === 'closed') {
          statusMessage = `Your ticket "${existingTicket.title}" has been closed`;
        }

        if (statusMessage) {
          await sendTicketNotification(existingTicket.submittedBy, {
            title: 'Ticket Status Update',
            body: statusMessage,
            url: '/support',
            tag: `ticket-status-${id}`,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Ticket updated successfully',
    });
  } catch (error) {
    console.error('Update ticket error:', error);
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
  }
}

// DELETE - Delete ticket (SuperUsers only)
export async function DELETE(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!userInfo.isSuperUser) {
    return NextResponse.json({ error: 'Only SuperUsers can delete tickets' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
    }

    const db = await getDatabase();

    const result = await db.collection(COLLECTION_NAME).deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Ticket deleted successfully',
    });
  } catch (error) {
    console.error('Delete ticket error:', error);
    return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 });
  }
}
