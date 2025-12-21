import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const COLLECTION_NAME = 'v5projects';
const USERS_COLLECTION = 'v5users';
const DEPARTMENTS_COLLECTION = 'v5departments';

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
      isSuperUser: user.isSuperUser || false,
    };
  } catch {
    return null;
  }
}

// Check if user has access to this project
async function hasProjectAccess(userId: string, isSuperUser: boolean, projectId: string): Promise<{ hasAccess: boolean; project: Record<string, unknown> | null }> {
  const db = await getDatabase();

  const project = await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(projectId) });
  if (!project) return { hasAccess: false, project: null };

  if (isSuperUser) return { hasAccess: true, project };

  // Check if user is assignee
  if (project.assigneeId === userId) return { hasAccess: true, project };

  // Check if user is admin or member of the department
  const department = await db.collection(DEPARTMENTS_COLLECTION).findOne({
    _id: new ObjectId(project.departmentId),
    $or: [{ adminIds: userId }, { memberIds: userId }]
  });

  return { hasAccess: !!department, project };
}

// POST - Add comment
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
    const { text } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Comment text is required' }, { status: 400 });
    }

    const { hasAccess, project } = await hasProjectAccess(userInfo.userId, userInfo.isSuperUser, id);
    if (!hasAccess || !project) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const db = await getDatabase();

    const newComment = {
      id: uuidv4(),
      userId: userInfo.userId,
      userName: userInfo.userName,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };

    await db.collection(COLLECTION_NAME).updateOne(
      { _id: new ObjectId(id) },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        $push: { comments: newComment } as any,
        $set: { 'metadata.updatedAt': new Date().toISOString() }
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Comment added successfully',
      comment: newComment,
    });
  } catch (error) {
    console.error('Add comment error:', error);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}

// DELETE - Delete comment
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
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
    }

    const db = await getDatabase();
    const project = await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Find the comment
    const comment = project.comments?.find((c: { id: string }) => c.id === commentId);
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Only comment author or superuser can delete
    if (comment.userId !== userInfo.userId && !userInfo.isSuperUser) {
      return NextResponse.json({ error: 'You can only delete your own comments' }, { status: 403 });
    }

    await db.collection(COLLECTION_NAME).updateOne(
      { _id: new ObjectId(id) },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        $pull: { comments: { id: commentId } } as any,
        $set: { 'metadata.updatedAt': new Date().toISOString() }
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
