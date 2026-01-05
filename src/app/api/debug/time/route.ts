import { NextResponse } from 'next/server';

// Helper to get New York time
function getNewYorkTime() {
  const now = new Date();
  const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return nyTime;
}

export async function GET() {
  const now = new Date();
  const nyTime = getNewYorkTime();

  return NextResponse.json({
    server: {
      utc: now.toISOString(),
      utcDate: now.toISOString().split('T')[0],
      utcTime: `${now.getUTCHours()}:${String(now.getUTCMinutes()).padStart(2, '0')}`,
      localDate: now.toLocaleDateString(),
      localTime: now.toLocaleTimeString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    newYork: {
      date: nyTime.toISOString().split('T')[0],
      time: `${nyTime.getHours()}:${String(nyTime.getMinutes()).padStart(2, '0')}`,
      formatted: nyTime.toLocaleString('en-US', { timeZone: 'America/New_York' }),
    },
    issue: 'If UTC date differs from New York date, this is likely causing the notification timing issue',
  });
}
