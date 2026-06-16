export interface CandidateDate {
  id: string;
  date_value: string; // "YYYY-MM-DD"
  time_value: string; // "HH:MM" (24h) or ""
}

export interface MeetingFile {
  id: string;
  original_name: string;
  stored_name: string;
  blob_url?: string;
  size: number;
  mime_type: string;
  uploaded_at: string;
}

export interface Meeting {
  id: string;
  title: string;
  description: string;
  location: string;
  host_name: string;
  host_token: string;
  deadline: string;
  expected_attendees: string[];
  candidate_dates: CandidateDate[];
  files: MeetingFile[];
  created_at: string;
}

export interface Vote {
  id: string;
  meeting_id: string;
  attendee_name: string;
  selected_dates: string[];
  created_at: string;
}
