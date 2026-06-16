import { NextRequest } from 'next/server';
import { saveMeeting, getAllMeetings } from '@/lib/db';
import { Meeting, CandidateDate } from '@/lib/types';
import { randomUUID } from 'crypto';

export async function GET() {
  const meetings = getAllMeetings().map(({ host_token: _, ...safe }) => safe);
  return Response.json(meetings);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    title,
    description,
    location,
    host_name,
    deadline,
    expected_attendees,
    candidate_dates,
  } = body;

  if (!title || !host_name || !candidate_dates?.length) {
    return Response.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
  }

  const id = randomUUID();
  const host_token = randomUUID();

  const meeting: Meeting = {
    id,
    title,
    description: description ?? '',
    location: location ?? '',
    host_name,
    host_token,
    deadline: deadline ?? '',
    expected_attendees: Array.isArray(expected_attendees) ? expected_attendees : [],
    candidate_dates: (candidate_dates as { date_value: string; time_value: string }[]).map(
      (d): CandidateDate => ({
        id: randomUUID(),
        date_value: d.date_value,
        time_value: d.time_value ?? '',
      })
    ),
    files: [],
    created_at: new Date().toISOString(),
  };

  saveMeeting(meeting);
  return Response.json({ id, host_token }, { status: 201 });
}
