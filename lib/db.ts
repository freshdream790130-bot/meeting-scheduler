import fs from 'fs';
import path from 'path';
import { Meeting, Vote, MeetingFile } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'meetings.json');

interface DbData {
  meetings: Record<string, Meeting>;
  votes: Record<string, Vote[]>;
}

function migrate(meeting: Meeting): Meeting {
  return {
    ...meeting,
    location: meeting.location ?? '',
    expected_attendees: meeting.expected_attendees ?? [],
    files: meeting.files ?? [],
  };
}

function readDb(): DbData {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const initial: DbData = { meetings: {}, votes: {} };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')) as DbData;
  // Migrate older records that lack new fields
  for (const id in data.meetings) {
    data.meetings[id] = migrate(data.meetings[id]);
  }
  return data;
}

function writeDb(data: DbData): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function getMeeting(id: string): Meeting | null {
  const db = readDb();
  return db.meetings[id] ?? null;
}

export function saveMeeting(meeting: Meeting): void {
  const db = readDb();
  db.meetings[meeting.id] = meeting;
  writeDb(db);
}

export function getVotes(meeting_id: string): Vote[] {
  const db = readDb();
  return db.votes[meeting_id] ?? [];
}

export function saveVote(vote: Vote): void {
  const db = readDb();
  if (!db.votes[vote.meeting_id]) db.votes[vote.meeting_id] = [];
  const idx = db.votes[vote.meeting_id].findIndex(
    (v) => v.attendee_name === vote.attendee_name
  );
  if (idx >= 0) db.votes[vote.meeting_id][idx] = vote;
  else db.votes[vote.meeting_id].push(vote);
  writeDb(db);
}

export function addFileToMeeting(meeting_id: string, file: MeetingFile): void {
  const db = readDb();
  if (db.meetings[meeting_id]) {
    db.meetings[meeting_id].files.push(file);
    writeDb(db);
  }
}

export function removeFileFromMeeting(
  meeting_id: string,
  file_id: string
): MeetingFile | null {
  const db = readDb();
  const meeting = db.meetings[meeting_id];
  if (!meeting) return null;
  const idx = meeting.files.findIndex((f) => f.id === file_id);
  if (idx < 0) return null;
  const [removed] = meeting.files.splice(idx, 1);
  writeDb(db);
  return removed;
}

export function getAllMeetings(): Meeting[] {
  const db = readDb();
  return Object.values(db.meetings)
    .map(migrate)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function deleteMeeting(id: string): boolean {
  const db = readDb();
  if (!db.meetings[id]) return false;
  delete db.meetings[id];
  delete db.votes[id];
  writeDb(db);
  return true;
}
