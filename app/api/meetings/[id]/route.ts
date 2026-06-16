import type { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getMeeting, deleteMeeting } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/meetings/[id]'>
) {
  const { id } = await ctx.params;
  const meeting = getMeeting(id);
  if (!meeting) {
    return Response.json({ error: '회의를 찾을 수 없습니다.' }, { status: 404 });
  }
  const { host_token: _, ...safe } = meeting;
  return Response.json(safe);
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<'/api/meetings/[id]'>
) {
  const { id } = await ctx.params;
  const deleted = deleteMeeting(id);
  if (!deleted) {
    return Response.json({ error: '회의를 찾을 수 없습니다.' }, { status: 404 });
  }
  const uploadDir = path.join(process.cwd(), 'data', 'uploads', id);
  if (fs.existsSync(uploadDir)) {
    fs.rmSync(uploadDir, { recursive: true, force: true });
  }
  return Response.json({ ok: true });
}
