import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { createHmac, randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const COLLECTION_NAME = 'v5users';

// Verify SuperUser from token
async function verifySuperUser(request: NextRequest): Promise<{ isSuperUser: boolean; userId?: string }> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { isSuperUser: false };
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { _id: string };

    const db = await getDatabase();
    const user = await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(decoded._id) });

    if (!user) return { isSuperUser: false };

    return {
      isSuperUser: user.isSuperUser || false,
      userId: user._id.toString(),
    };
  } catch {
    return { isSuperUser: false };
  }
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = createHmac('sha256', salt).update(password).digest('hex');
  return `sha256$${salt}$${hash}`;
}

// GET - List all users (SuperUser only)
export async function GET(request: NextRequest) {
  const { isSuperUser } = await verifySuperUser(request);
  if (!isSuperUser) {
    return NextResponse.json({ error: 'Unauthorized - SuperUser access required' }, { status: 403 });
  }

  try {
    const db = await getDatabase();
    const users = await db
      .collection(COLLECTION_NAME)
      .find({})
      .project({ password: 0 })
      .sort({ createdAt: -1 })
      .toArray();

    const normalizedUsers = users.map((u) => ({
      ...u,
      id: u._id.toString(),
    }));

    return NextResponse.json({ success: true, data: normalizedUsers });
  } catch (error) {
    console.error('Fetch users error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST - Create new user (SuperUser only)
export async function POST(request: NextRequest) {
  const { isSuperUser } = await verifySuperUser(request);
  if (!isSuperUser) {
    return NextResponse.json({ error: 'Unauthorized - SuperUser access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email, password, name, isAdmin, isSuperUser: makeSuperUser } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const db = await getDatabase();
    const normalizedEmail = email.toLowerCase().trim();

    // Check for existing user
    const existing = await db.collection(COLLECTION_NAME).findOne({ email: normalizedEmail });
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const newUser = {
      email: normalizedEmail,
      password: hashPassword(password),
      name: name || '',
      isAdmin: isAdmin || false,
      isSuperUser: makeSuperUser || false,
      departments: [],
      profile: {},
      settings: {},
      createdAt: new Date().toISOString(),
    };

    await db.collection(COLLECTION_NAME).insertOne(newUser);

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

// PUT - Update user (SuperUser only)
export async function PUT(request: NextRequest) {
  const { isSuperUser } = await verifySuperUser(request);
  if (!isSuperUser) {
    return NextResponse.json({ error: 'Unauthorized - SuperUser access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, name, isAdmin, isSuperUser: makeSuperUser, password } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const db = await getDatabase();
    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (isAdmin !== undefined) updateData.isAdmin = isAdmin;
    if (makeSuperUser !== undefined) updateData.isSuperUser = makeSuperUser;
    if (password) updateData.password = hashPassword(password);

    await db.collection(COLLECTION_NAME).updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE - Delete user (SuperUser only, can delete anyone including other SuperUsers)
export async function DELETE(request: NextRequest) {
  const { isSuperUser, userId } = await verifySuperUser(request);
  if (!isSuperUser) {
    return NextResponse.json({ error: 'Unauthorized - SuperUser access required' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Prevent self-deletion
    if (id === userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const db = await getDatabase();

    // Remove user from all departments
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.collection('v5departments').updateMany({}, { $pull: { adminIds: id, memberIds: id } as any });

    // Delete the user
    await db.collection(COLLECTION_NAME).deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
