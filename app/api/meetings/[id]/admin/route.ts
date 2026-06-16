import type { NextRequest } from 'next/server';
import { getMeeting, getVotes } from '@/lib/db';

export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/api/meetings/[id]/admin'>
) {
  const { id } = await ctx.params;
  const token = request.nextUrl.searchParams.get('token');

  const meeting = await getMeeting(id);
  if (!meeting) {
    return Response.json({ error: '회의를 찾을 수 없습니다.' }, { status: 404 });
  }
  if (meeting.host_token !== token) {
    return Response.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const votes = await getVotes(id);
  return Response.json({ meeting, votes });
}
