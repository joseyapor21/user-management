import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';

const INVITES_COLLECTION = 'v5invites';
const USERS_COLLECTION = 'v5users';

// GET - Validate invite token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const db = await getDatabase();

    const invite = await db.collection(INVITES_COLLECTION).findOne({ token });

    if (!invite) {
      return NextResponse.json({ error: 'Invalid invite token' }, { status: 404 });
    }

    if (invite.used) {
      return NextResponse.json({ error: 'This invite has already been used' }, { status: 400 });
    }

    if (new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'This invite has expired' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        valid: true,
        email: invite.email, // If pre-filled email was specified
        createdBy: invite.createdByName,
      },
    });
  } catch (error) {
    console.error('Validate invite error:', error);
    return NextResponse.json({ error: 'Failed to validate invite' }, { status: 500 });
  }
}

// POST - Create user with invite token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, email, password, name } = body;

    if (!token) {
      return NextResponse.json({ error: 'Invite token is required' }, { status: 400 });
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const db = await getDatabase();

    // Validate the invite token
    const invite = await db.collection(INVITES_COLLECTION).findOne({ token });

    if (!invite) {
      return NextResponse.json({ error: 'Invalid invite token' }, { status: 404 });
    }

    if (invite.used) {
      return NextResponse.json({ error: 'This invite has already been used' }, { status: 400 });
    }

    if (new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'This invite has expired' }, { status: 400 });
    }

    // If invite was restricted to a specific email, validate it
    if (invite.email && invite.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: 'This invite is for a different email address' }, { status: 400 });
    }

    // Check if email already exists
    const existingUser = await db.collection(USERS_COLLECTION).findOne({
      email: email.toLowerCase()
    });

    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const newUser = {
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name || '',
      isAdmin: false,
      isSuperUser: false,
      createdAt: new Date().toISOString(),
      invitedBy: invite.createdBy,
    };

    await db.collection(USERS_COLLECTION).insertOne(newUser);

    // Mark the invite as used
    await db.collection(INVITES_COLLECTION).updateOne(
      { _id: invite._id },
      {
        $set: {
          used: true,
          usedAt: new Date().toISOString(),
          usedByEmail: email.toLowerCase(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. You can now log in.',
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
