import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const COLLECTION_NAME = 'v5invites';
const USERS_COLLECTION = 'v5users';

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
      email: user.email,
      isSuperUser: user.isSuperUser || false,
      isAdmin: user.isAdmin || false,
    };
  } catch {
    return null;
  }
}

// Generate a unique token
function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// GET - List all invites (SuperUser/Admin only)
export async function GET(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!userInfo.isSuperUser && !userInfo.isAdmin) {
    return NextResponse.json({ error: 'Only admins can view invites' }, { status: 403 });
  }

  try {
    const db = await getDatabase();

    const invites = await db.collection(COLLECTION_NAME)
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const normalizedInvites = invites.map((invite) => ({
      id: invite._id.toString(),
      token: invite.token,
      email: invite.email || null,
      createdBy: invite.createdByName,
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt,
      used: invite.used,
      usedAt: invite.usedAt || null,
      usedByEmail: invite.usedByEmail || null,
    }));

    return NextResponse.json({ success: true, data: normalizedInvites });
  } catch (error) {
    console.error('Fetch invites error:', error);
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 });
  }
}

// POST - Create a new invite token (SuperUser/Admin only)
export async function POST(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!userInfo.isSuperUser && !userInfo.isAdmin) {
    return NextResponse.json({ error: 'Only admins can create invites' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email, expiresInDays = 7 } = body;

    const db = await getDatabase();
    const token = generateInviteToken();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const invite = {
      token,
      email: email || null, // Optional: restrict invite to specific email
      createdBy: userInfo.userId,
      createdByName: userInfo.userName,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      used: false,
      usedAt: null,
      usedByEmail: null,
    };

    await db.collection(COLLECTION_NAME).insertOne(invite);

    // Generate the signup URL
    const baseUrl = request.headers.get('origin') || 'http://localhost:3000';
    const signupUrl = `${baseUrl}/signup?token=${token}`;

    return NextResponse.json({
      success: true,
      message: 'Invite created successfully',
      data: {
        token,
        signupUrl,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Create invite error:', error);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}

// DELETE - Delete an invite (SuperUser/Admin only)
export async function DELETE(request: NextRequest) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!userInfo.isSuperUser && !userInfo.isAdmin) {
    return NextResponse.json({ error: 'Only admins can delete invites' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Invite ID is required' }, { status: 400 });
    }

    const db = await getDatabase();
    await db.collection(COLLECTION_NAME).deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      success: true,
      message: 'Invite deleted successfully',
    });
  } catch (error) {
    console.error('Delete invite error:', error);
    return NextResponse.json({ error: 'Failed to delete invite' }, { status: 500 });
  }
}
