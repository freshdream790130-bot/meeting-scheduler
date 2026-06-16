'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Meeting, Vote, MeetingFile } from '@/lib/types';

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

export default function VotePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [meeting, setMeeting] = useState<Omit<Meeting, 'host_token'> | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [selectedName, setSelectedName] = useState('');
  const [fallbackName, setFallbackName] = useState(''); // 참석 대상자 미설정 시 직접 입력
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchVotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/meetings/${id}/votes`);
      if (res.ok) { setVotes(await res.json()); setLastUpdated(new Date()); }
    } catch { /* ignore */ }
  }, [id]);

  useEffect(() => {
    async function load() {
      const [mRes, vRes] = await Promise.all([
        fetch(`/api/meetings/${id}`),
        fetch(`/api/meetings/${id}/votes`),
      ]);
      if (!mRes.ok) { setError('회의를 찾을 수 없습니다.'); setLoading(false); return; }
      setMeeting(await mRes.json());
      setVotes(await vRes.json());
      setLastUpdated(new Date());
      setLoading(false);
    }
    load();
  }, [id]);

  // 30초마다 자동 새로고침
  useEffect(() => {
    const t = setInterval(fetchVotes, 30000);
    return () => clearInterval(t);
  }, [fetchVotes]);

  function handleSelectName(name: string) {
    setSelectedName(name);
    const existing = votes.find((v) => v.attendee_name === name);
    setSelected(existing?.selected_dates ?? []);
    setSubmitted(false);
    setError('');
  }

  function toggle(dateId: string) {
    setSelected((prev) =>
      prev.includes(dateId) ? prev.filter((x) => x !== dateId) : [...prev, dateId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const activeName = selectedName || fallbackName.trim();
    if (!activeName) { setError('이름을 선택해주세요.'); return; }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/meetings/${id}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendee_name: activeName, selected_dates: selected }),
      });
      if (!res.ok) throw new Error();
      const newVote: Vote = await res.json();
      setVotes((prev) => {
        const idx = prev.findIndex((v) => v.attendee_name === newVote.attendee_name);
        return idx >= 0 ? prev.map((v, i) => (i === idx ? newVote : v)) : [...prev, newVote];
      });
      setLastUpdated(new Date());
      setSubmitted(true);
    } catch {
      setError('투표 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-center py-20 text-sm" style={{ color: '#b3b3b3' }}>불러오는 중...</p>;
  if (error && !meeting) return <p className="text-center py-20 text-sm" style={{ color: '#f3727f' }}>{error}</p>;
  if (!meeting) return null;

  const hasExpected = (meeting.expected_attendees?.length ?? 0) > 0;
  const files: MeetingFile[] = meeting.files ?? [];
  const isPastDeadline = meeting.deadline && new Date(meeting.deadline) < new Date(new Date().toDateString());
  const maxCount = Math.max(
    ...meeting.candidate_dates.map((cd) => votes.filter((v) => v.selected_dates.includes(cd.id)).length),
    0
  );

  return (
    <div className="max-w-xl mx-auto space-y-4">

      {/* ── 회의 정보 ── */}
      <div className="rounded-lg p-6" style={{ background: '#181818' }}>
        <h1 className="text-xl font-bold text-white mb-1">{meeting.title}</h1>
        {meeting.description && <p className="text-sm mb-3" style={{ color: '#b3b3b3' }}>{meeting.description}</p>}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: '#7c7c7c' }}>
          <span>주최자: {meeting.host_name}</span>
          {meeting.location && <span>📍 {meeting.location}</span>}
          {meeting.deadline && <span>마감: {meeting.deadline}</span>}
        </div>
      </div>

      {/* ── 실시간 투표 현황 (항상 표시) ── */}
      <div className="rounded-lg p-6 space-y-5" style={{ background: '#181818' }}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-xs uppercase tracking-[1.4px]" style={{ color: '#b3b3b3' }}>
            투표 현황
          </h2>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs" style={{ color: '#7c7c7c' }}>
                {lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 기준
              </span>
            )}
            <button onClick={fetchVotes}
              className="text-xs font-bold uppercase tracking-[1.4px] transition-colors hover:opacity-80"
              style={{ color: '#1ed760' }}>
              새로고침
            </button>
          </div>
        </div>

        {votes.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: '#7c7c7c' }}>아직 투표한 사람이 없습니다.</p>
        ) : (
          meeting.candidate_dates.map((cd) => {
            const yesVoters = votes.filter((v) => v.selected_dates.includes(cd.id));
            const count = yesVoters.length;
            const total = votes.length;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const isBest = count === maxCount && maxCount > 0;
            return (
              <div key={cd.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isBest && (
                      <span className="text-xs font-bold uppercase tracking-[1px] px-1.5 py-0.5 rounded"
                        style={{ background: '#1ed760', color: '#000' }}>최다</span>
                    )}
                    <span className="text-sm font-bold text-white">
                      {formatDate(cd.date_value, cd.time_value)}
                    </span>
                  </div>
                  <span className="text-xs font-bold" style={{ color: isBest ? '#1ed760' : '#b3b3b3' }}>
                    {count}/{total}명
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#282828' }}>
                  <div className="h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: isBest ? '#1ed760' : '#4d4d4d' }} />
                </div>
                {yesVoters.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {yesVoters.map((v) => (
                      <span key={v.id}
                        className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{
                          background: 'rgba(30,215,96,0.12)',
                          color: '#1ed760',
                          border: '1px solid rgba(30,215,96,0.3)',
                        }}>
                        {v.attendee_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}

        <p className="text-xs" style={{ color: '#7c7c7c' }}>총 {votes.length}명 참여</p>
      </div>

      {/* ── 회의 자료 ── */}
      {files.length > 0 && (
        <div className="rounded-lg p-6 space-y-3" style={{ background: '#181818' }}>
          <h2 className="font-bold text-xs uppercase tracking-[1.4px]" style={{ color: '#b3b3b3' }}>회의 자료</h2>
          {files.map((f) => (
            <a key={f.id} href={`/api/meetings/${id}/files/${f.id}`} download={f.original_name}
              className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:scale-[1.01]"
              style={{ background: '#1f1f1f', border: '1px solid #282828' }}>
              <span className="text-xl">📄</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{f.original_name}</p>
                <p className="text-xs" style={{ color: '#7c7c7c' }}>{formatFileSize(f.size)}</p>
              </div>
              <span className="text-xs font-bold uppercase tracking-[1.4px] shrink-0" style={{ color: '#1ed760' }}>다운로드</span>
            </a>
          ))}
        </div>
      )}

      {/* ── 투표 섹션 ── */}
      {isPastDeadline ? (
        <div className="rounded-lg p-6 text-center" style={{ background: '#181818' }}>
          <p className="text-sm" style={{ color: '#b3b3b3' }}>투표 기간이 종료되었습니다.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* 이름 선택 카드 */}
          <div className="rounded-lg p-6 space-y-4" style={{ background: '#181818' }}>
            <h2 className="font-bold text-xs uppercase tracking-[1.4px]" style={{ color: '#b3b3b3' }}>
              참여자 선택
            </h2>

            {hasExpected ? (
              <div className="grid grid-cols-3 gap-2">
                {meeting.expected_attendees!.map((name) => {
                  const hasVoted = votes.some((v) => v.attendee_name === name);
                  const isSelected = selectedName === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleSelectName(name)}
                      className="rounded-lg p-3 text-center transition-all hover:scale-[1.03] active:scale-[0.98]"
                      style={{
                        background: isSelected ? 'rgba(30,215,96,0.12)' : '#1f1f1f',
                        border: `1px solid ${isSelected ? '#1ed760' : hasVoted ? '#4d4d4d' : '#282828'}`,
                      }}
                    >
                      <p className="font-bold text-sm text-white truncate">{name}</p>
                      <p className="text-xs mt-1 font-bold"
                        style={{ color: isSelected ? '#1ed760' : hasVoted ? '#b3b3b3' : '#7c7c7c' }}>
                        {isSelected ? '● 선택됨' : hasVoted ? '✓ 응답완료' : '미응답'}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              // 참석 대상자 미설정 시 텍스트 입력
              <input
                type="text"
                value={fallbackName}
                onChange={(e) => setFallbackName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="sp-input"
              />
            )}
          </div>

          {/* 날짜 선택 (이름 선택 후 표시) */}
          {(selectedName || (!hasExpected && fallbackName.trim())) && (
            <div className="rounded-lg p-6 space-y-4" style={{ background: '#181818' }}>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-xs uppercase tracking-[1.4px]" style={{ color: '#b3b3b3' }}>
                  참석 가능한 날짜
                </h2>
                {selectedName && (
                  <span className="text-xs font-bold ml-auto px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(30,215,96,0.12)', color: '#1ed760', border: '1px solid rgba(30,215,96,0.3)' }}>
                    {selectedName}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {meeting.candidate_dates.map((cd) => {
                  const isChecked = selected.includes(cd.id);
                  return (
                    <label key={cd.id}
                      className="flex items-center gap-3 cursor-pointer px-4 py-3 rounded-lg transition-colors"
                      style={{
                        background: isChecked ? 'rgba(30,215,96,0.1)' : '#1f1f1f',
                        border: `1px solid ${isChecked ? '#1ed760' : '#4d4d4d'}`,
                      }}>
                      <div className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                        style={{ background: isChecked ? '#1ed760' : 'transparent', border: `2px solid ${isChecked ? '#1ed760' : '#7c7c7c'}` }}>
                        {isChecked && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <input type="checkbox" checked={isChecked} onChange={() => toggle(cd.id)} className="sr-only" />
                      <span className="text-sm text-white">{formatDate(cd.date_value, cd.time_value)}</span>
                    </label>
                  );
                })}
              </div>

              {submitted ? (
                <div className="pt-2 text-center space-y-2">
                  <p className="text-sm font-bold" style={{ color: '#1ed760' }}>✓ 투표가 저장되었습니다.</p>
                  <button type="button" onClick={() => setSubmitted(false)}
                    className="text-xs font-bold uppercase tracking-[1.4px]" style={{ color: '#b3b3b3' }}>
                    다시 수정하기
                  </button>
                </div>
              ) : (
                <>
                  {error && <p className="text-xs" style={{ color: '#f3727f' }}>{error}</p>}
                  <button type="submit" disabled={submitting}
                    className="w-full py-3 rounded-full font-bold text-sm uppercase tracking-[1.4px] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
                    style={{ background: '#1ed760', color: '#000' }}>
                    {submitting ? '저장 중...' : votes.some((v) => v.attendee_name === (selectedName || fallbackName.trim())) ? '응답 수정' : '투표하기'}
                  </button>
                </>
              )}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
