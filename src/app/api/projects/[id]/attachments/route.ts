import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const COLLECTION_NAME = 'v5projects';
const USERS_COLLECTION = 'v5users';

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
    };
  } catch {
    return null;
  }
}

// POST - Add attachment (stores metadata - in production, file would be uploaded to cloud storage)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, url, type, size } = body;

    if (!name || !url) {
      return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 });
    }

    const db = await getDatabase();
    const project = await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const attachment = {
      id: new ObjectId().toString(),
      name,
      url,
      type: type || 'file',
      size: size || 0,
      uploadedAt: new Date().toISOString(),
      uploadedBy: userInfo.userId,
      uploadedByName: userInfo.userName,
    };

    await db.collection(COLLECTION_NAME).updateOne(
      { _id: new ObjectId(id) },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        $push: { attachments: attachment } as any,
        $set: { 'metadata.updatedAt': new Date().toISOString() },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Attachment added',
      data: attachment,
    });
  } catch (error) {
    console.error('Add attachment error:', error);
    return NextResponse.json({ error: 'Failed to add attachment' }, { status: 500 });
  }
}

// DELETE - Remove attachment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userInfo = await getUserFromRequest(request);
  if (!userInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('attachmentId');

    if (!attachmentId) {
      return NextResponse.json({ error: 'Attachment ID required' }, { status: 400 });
    }

    const db = await getDatabase();

    await db.collection(COLLECTION_NAME).updateOne(
      { _id: new ObjectId(id) },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        $pull: { attachments: { id: attachmentId } } as any,
        $set: { 'metadata.updatedAt': new Date().toISOString() },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Attachment removed',
    });
  } catch (error) {
    console.error('Remove attachment error:', error);
    return NextResponse.json({ error: 'Failed to remove attachment' }, { status: 500 });
  }
}
