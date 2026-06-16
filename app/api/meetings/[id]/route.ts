import type { NextRequest } from 'next/server';
import { del } from '@vercel/blob';
import { getMeeting, deleteMeeting } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/meetings/[id]'>
) {
  const { id } = await ctx.params;
  const meeting = await getMeeting(id);
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
  const meeting = await getMeeting(id);
  if (!meeting) {
    return Response.json({ error: '회의를 찾을 수 없습니다.' }, { status: 404 });
  }

  // Vercel Blob에 업로드된 파일 삭제
  const blobUrls = meeting.files.map((f) => f.blob_url).filter((u): u is string => !!u);
  if (blobUrls.length > 0) {
    await Promise.all(blobUrls.map((url) => del(url)));
  }

  await deleteMeeting(id);
  return Response.json({ ok: true });
}
