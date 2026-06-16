import { kv } from '@vercel/kv';
import { Meeting, Vote, MeetingFile } from './types';

function migrate(meeting: Meeting): Meeting {
  return {
    ...meeting,
    location: meeting.location ?? '',
    expected_attendees: meeting.expected_attendees ?? [],
    files: meeting.files ?? [],
  };
}

export async function getMeeting(id: string): Promise<Meeting | null> {
  const data = await kv.get<Meeting>(`meeting:${id}`);
  return data ? migrate(data) : null;
}

export async function saveMeeting(meeting: Meeting): Promise<void> {
  await kv.set(`meeting:${meeting.id}`, meeting);
  await kv.zadd('meetings:index', {
    score: new Date(meeting.created_at).getTime(),
    member: meeting.id,
  });
}

export async function getAllMeetings(): Promise<Meeting[]> {
  const ids = await kv.zrange<string[]>('meetings:index', 0, -1, { rev: true });
  if (!ids.length) return [];
  const meetings = await Promise.all(ids.map(getMeeting));
  return meetings.filter((m): m is Meeting => m !== null);
}

export async function deleteMeeting(id: string): Promise<boolean> {
  const exists = await kv.exists(`meeting:${id}`);
  if (!exists) return false;
  await Promise.all([
    kv.del(`meeting:${id}`),
    kv.del(`votes:${id}`),
    kv.zrem('meetings:index', id),
  ]);
  return true;
}

export async function getVotes(meeting_id: string): Promise<Vote[]> {
  return (await kv.get<Vote[]>(`votes:${meeting_id}`)) ?? [];
}

export async function saveVote(vote: Vote): Promise<void> {
  const votes = await getVotes(vote.meeting_id);
  const idx = votes.findIndex((v) => v.attendee_name === vote.attendee_name);
  if (idx >= 0) votes[idx] = vote;
  else votes.push(vote);
  await kv.set(`votes:${vote.meeting_id}`, votes);
}

export async function addFileToMeeting(meeting_id: string, file: MeetingFile): Promise<void> {
  const meeting = await getMeeting(meeting_id);
  if (!meeting) return;
  meeting.files.push(file);
  await kv.set(`meeting:${meeting_id}`, meeting);
}

export async function removeFileFromMeeting(
  meeting_id: string,
  file_id: string
): Promise<MeetingFile | null> {
  const meeting = await getMeeting(meeting_id);
  if (!meeting) return null;
  const idx = meeting.files.findIndex((f) => f.id === file_id);
  if (idx < 0) return null;
  const [removed] = meeting.files.splice(idx, 1);
  await kv.set(`meeting:${meeting_id}`, meeting);
  return removed;
}
