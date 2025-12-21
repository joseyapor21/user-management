import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { createHash, createHmac, pbkdf2Sync } from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function verifyPassword(storedPassword: string, providedPassword: string): boolean {
  if (storedPassword.startsWith('sha256$')) {
    try {
      const parts = storedPassword.split('$');
      if (parts.length === 3) {
        const [, salt, storedHash] = parts;
        const testHash = createHmac('sha256', salt).update(providedPassword).digest('hex');
        if (testHash === storedHash) return true;
      }
    } catch {
      // Continue to other methods
    }
  }

  if (storedPassword.startsWith('pbkdf2:sha256')) {
    try {
      const parts = storedPassword.split('$');
      if (parts.length === 3) {
        const [method, salt, storedHash] = parts;
        const iterations = parseInt(method.split(':')[2] || '150000');
        const testHash = pbkdf2Sync(providedPassword, salt, iterations, 32, 'sha256').toString('hex');
        if (testHash === storedHash) return true;
      }
    } catch {
      // Continue to other methods
    }
  }

  if (storedPassword === providedPassword) return true;

  const hashedProvided = createHash('sha256').update(providedPassword).digest('hex');
  if (storedPassword === hashedProvided) return true;

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { email, password } = data;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const db = await getDatabase();
    const normalizedEmail = email.toLowerCase().trim();

    const user = await db.collection('v5users').findOne({ email: normalizedEmail });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!verifyPassword(user.password, password)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = jwt.sign(
      {
        _id: user._id.toString(),
        email: user.email,
        exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
      },
      JWT_SECRET
    );

    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name || '',
          isAdmin: user.isAdmin || user.isSuperUser || false,
          isSuperUser: user.isSuperUser || false,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
