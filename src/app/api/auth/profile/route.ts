import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { createHmac, randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const COLLECTION_NAME = 'v5users';

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = createHmac('sha256', salt).update(password).digest('hex');
  return `sha256$${salt}$${hash}`;
}

// Get current user from token
async function getUserFromRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { _id: string };

    const db = await getDatabase();
    const user = await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(decoded._id) });

    return user;
  } catch {
    return null;
  }
}

// PUT - Update own profile (name and password)
export async function PUT(request: NextRequest) {
  const currentUser = await getUserFromRequest(request);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, password } = body;

    const db = await getDatabase();
    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (password) updateData.password = hashPassword(password);

    await db.collection(COLLECTION_NAME).updateOne(
      { _id: currentUser._id },
      { $set: updateData }
    );

    // Return updated user info
    const updatedUser = await db.collection(COLLECTION_NAME).findOne({ _id: currentUser._id });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser?._id.toString(),
        email: updatedUser?.email,
        name: updatedUser?.name || '',
        isAdmin: updatedUser?.isAdmin || updatedUser?.isSuperUser || false,
        isSuperUser: updatedUser?.isSuperUser || false,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

// GET - Get own profile
export async function GET(request: NextRequest) {
  const currentUser = await getUserFromRequest(request);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    data: {
      id: currentUser._id.toString(),
      email: currentUser.email,
      name: currentUser.name || '',
      isAdmin: currentUser.isAdmin || currentUser.isSuperUser || false,
      isSuperUser: currentUser.isSuperUser || false,
    },
  });
}
