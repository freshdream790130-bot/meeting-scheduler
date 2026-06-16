import { getMeeting, getVotes } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MeetingFile } from '@/lib/types';

function formatDate(dateVal: string, timeVal: string) {
  const d = new Date(dateVal + 'T00:00:00');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const base = `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
  return timeVal ? `${base} ${timeVal}` : base;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const meeting = getMeeting(id);
  if (!meeting) notFound();

  const votes = getVotes(id);
  const total = votes.length;

  const ranked = meeting.candidate_dates
    .map((cd) => ({
      ...cd,
      count: votes.filter((v) => v.selected_dates.includes(cd.id)).length,
      attendees: votes.filter((v) => v.selected_dates.includes(cd.id)).map((v) => v.attendee_name),
    }))
    .sort((a, b) => b.count - a.count);

  const maxCount = ranked[0]?.count ?? 0;
  const files: MeetingFile[] = meeting.files ?? [];

  // 참석 대상자 vs 실제 참여자
  const expected = meeting.expected_attendees ?? [];
  const votedNames = votes.map((v) => v.attendee_name);

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* 헤더 */}
      <div className="rounded-lg p-6" style={{ background: '#181818' }}>
        <p className="text-xs font-bold uppercase tracking-[1.4px] mb-2" style={{ color: '#1ed760' }}>투표 결과</p>
        <h1 className="text-xl font-bold text-white mb-1">{meeting.title}</h1>
        {meeting.description && <p className="text-sm mb-3" style={{ color: '#b3b3b3' }}>{meeting.description}</p>}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: '#7c7c7c' }}>
          <span>주최자: {meeting.host_name}</span>
          {meeting.location && <span>📍 {meeting.location}</span>}
          <span>총 {total}명 참여</span>
        </div>
      </div>

      {/* 날짜별 결과 */}
      {total === 0 ? (
        <div className="rounded-lg p-12 text-center" style={{ background: '#181818' }}>
          <p className="text-sm" style={{ color: '#b3b3b3' }}>아직 투표한 사람이 없습니다.</p>
        </div>
      ) : (
        <div className="rounded-lg p-6 space-y-4" style={{ background: '#181818' }}>
          <h2 className="font-bold text-xs uppercase tracking-[1.4px]" style={{ color: '#b3b3b3' }}>날짜별 결과</h2>
          {ranked.map((cd, idx) => {
            const pct = total > 0 ? Math.round((cd.count / total) * 100) : 0;
            const isBest = cd.count === maxCount && maxCount > 0 && idx === 0;
            return (
              <div key={cd.id} className="rounded-lg p-4 space-y-2"
                style={{ background: isBest ? 'rgba(30,215,96,0.06)' : '#1f1f1f', border: `1px solid ${isBest ? '#1ed760' : '#282828'}` }}>
                <div className="flex items-center gap-2">
                  {isBest && (
                    <span className="text-xs font-bold uppercase tracking-[1px] px-2 py-0.5 rounded-full"
                      style={{ background: '#1ed760', color: '#000' }}>최다</span>
                  )}
                  <span className="font-bold text-sm text-white">{formatDate(cd.date_value, cd.time_value)}</span>
                  <span className="ml-auto text-xs" style={{ color: isBest ? '#1ed760' : '#b3b3b3' }}>
                    {cd.count}/{total}명
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#282828' }}>
                  <div className="h-1.5 rounded-full"
                    style={{ width: `${pct}%`, background: isBest ? '#1ed760' : '#4d4d4d' }} />
                </div>
                {cd.attendees.length > 0 && (
                  <p className="text-xs" style={{ color: '#b3b3b3' }}>{cd.attendees.join(' · ')}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 참석 대상자 응답 현황 */}
      {expected.length > 0 && (
        <div className="rounded-lg p-6 space-y-3" style={{ background: '#181818' }}>
          <h2 className="font-bold text-xs uppercase tracking-[1.4px]" style={{ color: '#b3b3b3' }}>참석 대상자 응답 현황</h2>
          <div className="flex flex-wrap gap-2">
            {expected.map((name) => {
              const voted = votedNames.includes(name);
              return (
                <span key={name}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: voted ? 'rgba(30,215,96,0.1)' : 'rgba(179,179,179,0.1)',
                    border: `1px solid ${voted ? '#1ed760' : '#4d4d4d'}`,
                    color: voted ? '#1ed760' : '#b3b3b3',
                  }}>
                  {voted ? '✓' : '○'} {name}
                </span>
              );
            })}
          </div>
          <p className="text-xs" style={{ color: '#7c7c7c' }}>
            {votedNames.filter((n) => expected.includes(n)).length}/{expected.length}명 응답
          </p>
        </div>
      )}

      {/* 참여자 목록 */}
      <div className="rounded-lg p-6 space-y-3" style={{ background: '#181818' }}>
        <h2 className="font-bold text-xs uppercase tracking-[1.4px]" style={{ color: '#b3b3b3' }}>참여자 목록</h2>
        {votes.length === 0 ? (
          <p className="text-sm" style={{ color: '#7c7c7c' }}>아직 참여자가 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {votes.map((v) => (
              <div key={v.id} className="flex items-start gap-3 text-sm py-2" style={{ borderBottom: '1px solid #282828' }}>
                <span className="font-bold text-white shrink-0" style={{ width: '6rem' }}>{v.attendee_name}</span>
                <span className="text-xs" style={{ color: '#b3b3b3' }}>
                  {v.selected_dates.length === 0
                    ? '가능한 날짜 없음'
                    : v.selected_dates.map((sid) => {
                        const cd = meeting.candidate_dates.find((c) => c.id === sid);
                        return cd ? formatDate(cd.date_value, cd.time_value) : '';
                      }).filter(Boolean).join(' · ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 회의 자료 */}
      {files.length > 0 && (
        <div className="rounded-lg p-6 space-y-3" style={{ background: '#181818' }}>
          <h2 className="font-bold text-xs uppercase tracking-[1.4px]" style={{ color: '#b3b3b3' }}>회의 자료</h2>
          <div className="space-y-2">
            {files.map((f) => (
              <a key={f.id} href={`/api/meetings/${id}/files/${f.id}`} download={f.original_name}
                className="flex items-center gap-3 px-4 py-3 rounded-lg"
                style={{ background: '#1f1f1f', border: '1px solid #282828' }}>
                <span className="text-lg">📄</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{f.original_name}</p>
                  <p className="text-xs" style={{ color: '#7c7c7c' }}>{formatFileSize(f.size)}</p>
                </div>
                <span className="text-xs font-bold uppercase tracking-[1.4px] shrink-0" style={{ color: '#1ed760' }}>다운로드</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 내비게이션 */}
      <div className="flex gap-3">
        <Link href={`/meeting/${id}`}
          className="flex-1 text-center py-2 rounded-full font-bold text-sm uppercase tracking-[1.4px]"
          style={{ background: '#1f1f1f', color: '#fff', border: '1px solid #4d4d4d' }}>
          투표 페이지
        </Link>
        <Link href="/"
          className="flex-1 text-center py-2 rounded-full font-bold text-sm uppercase tracking-[1.4px]"
          style={{ background: '#1f1f1f', color: '#fff', border: '1px solid #4d4d4d' }}>
          홈으로
        </Link>
      </div>
    </div>
  );
}
