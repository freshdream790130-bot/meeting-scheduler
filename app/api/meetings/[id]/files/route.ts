import type { NextRequest } from 'next/server';
import { put } from '@vercel/blob';
import { getMeeting, addFileToMeeting } from '@/lib/db';
import { MeetingFile } from '@/lib/types';
import { randomUUID } from 'crypto';

const MAX_SIZE = 10 * 1024 * 1024;

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/meetings/[id]/files'>
) {
  const { id } = await ctx.params;
  const meeting = await getMeeting(id);
  if (!meeting) return Response.json({ error: '회의를 찾을 수 없습니다.' }, { status: 404 });
  return Response.json(meeting.files ?? []);
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/meetings/[id]/files'>
) {
  const { id } = await ctx.params;
  const token = request.nextUrl.searchParams.get('token');

  const meeting = await getMeeting(id);
  if (!meeting) return Response.json({ error: '회의를 찾을 수 없습니다.' }, { status: 404 });
  if (meeting.host_token !== token) return Response.json({ error: '권한이 없습니다.' }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) return Response.json({ error: '파일이 없습니다.' }, { status: 400 });
  if (file.size > MAX_SIZE) return Response.json({ error: '파일 크기는 10MB를 초과할 수 없습니다.' }, { status: 400 });

  const fileId = randomUUID();
  const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : '';
  const storedName = `meetings/${id}/${fileId}${ext}`;

  const blob = await put(storedName, file, {
    access: 'public',
    contentType: file.type || 'application/octet-stream',
  });

  const meetingFile: MeetingFile = {
    id: fileId,
    original_name: file.name,
    stored_name: storedName,
    blob_url: blob.url,
    size: file.size,
    mime_type: file.type || 'application/octet-stream',
    uploaded_at: new Date().toISOString(),
  };

  await addFileToMeeting(id, meetingFile);
  return Response.json(meetingFile, { status: 201 });
}
