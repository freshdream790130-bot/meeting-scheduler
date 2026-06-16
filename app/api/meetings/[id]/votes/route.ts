import type { NextRequest } from 'next/server';
import { getMeeting, getVotes, saveVote } from '@/lib/db';
import { Vote } from '@/lib/types';
import { randomUUID } from 'crypto';

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/meetings/[id]/votes'>
) {
  const { id } = await ctx.params;
  if (!(await getMeeting(id))) {
    return Response.json({ error: '회의를 찾을 수 없습니다.' }, { status: 404 });
  }
  return Response.json(await getVotes(id));
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/meetings/[id]/votes'>
) {
  const { id } = await ctx.params;
  const meeting = await getMeeting(id);
  if (!meeting) {
    return Response.json({ error: '회의를 찾을 수 없습니다.' }, { status: 404 });
  }

  const body = await request.json();
  const { attendee_name, selected_dates } = body;

  if (!attendee_name || !Array.isArray(selected_dates)) {
    return Response.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
  }

  const vote: Vote = {
    id: randomUUID(),
    meeting_id: id,
    attendee_name,
    selected_dates,
    created_at: new Date().toISOString(),
  };

  await saveVote(vote);
  return Response.json(vote, { status: 201 });
}
