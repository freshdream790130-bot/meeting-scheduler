import type { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getMeeting, removeFileFromMeeting } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/meetings/[id]/files/[fileId]'>
) {
  const { id, fileId } = await ctx.params;
  const meeting = getMeeting(id);
  if (!meeting) {
    return Response.json({ error: '회의를 찾을 수 없습니다.' }, { status: 404 });
  }

  const file = meeting.files?.find((f) => f.id === fileId);
  if (!file) {
    return Response.json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), 'data', 'uploads', id, file.stored_name);
  if (!fs.existsSync(filePath)) {
    return Response.json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  const encoded = encodeURIComponent(file.original_name);

  return new Response(buffer, {
    headers: {
      'Content-Type': file.mime_type || 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encoded}`,
      'Content-Length': String(file.size),
    },
  });
}

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<'/api/meetings/[id]/files/[fileId]'>
) {
  const { id, fileId } = await ctx.params;
  const token = request.nextUrl.searchParams.get('token');

  const meeting = getMeeting(id);
  if (!meeting) {
    return Response.json({ error: '회의를 찾을 수 없습니다.' }, { status: 404 });
  }
  if (meeting.host_token !== token) {
    return Response.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const removed = removeFileFromMeeting(id, fileId);
  if (!removed) {
    return Response.json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), 'data', 'uploads', id, removed.stored_name);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  return Response.json({ ok: true });
}
