'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
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

export default function AdminPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params.id;
  const token = searchParams.get('token') ?? '';

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/meetings/${id}/admin?token=${encodeURIComponent(token)}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? '접근할 수 없습니다.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setMeeting(data.meeting);
      setVotes(data.votes);
      setLoading(false);
    }
    if (token) load();
    else { setError('주최자 링크를 통해 접속해주세요.'); setLoading(false); }
  }, [id, token]);

  const uploadFile = useCallback(async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('파일 크기는 10MB를 초과할 수 없습니다.');
      return;
    }
    setUploadError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/meetings/${id}/files?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? '업로드 실패');
      }
      const newFile: MeetingFile = await res.json();
      setMeeting((prev) => prev ? { ...prev, files: [...(prev.files ?? []), newFile] } : null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '업로드 실패');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [id, token]);

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  async function handleDeleteFile(fileId: string) {
    const res = await fetch(`/api/meetings/${id}/files/${fileId}?token=${encodeURIComponent(token)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setMeeting((prev) => prev ? { ...prev, files: prev.files.filter((f) => f.id !== fileId) } : null);
    }
  }

  if (loading) return <p className="text-center py-20 text-sm" style={{ color: '#b3b3b3' }}>불러오는 중...</p>;
  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-sm mb-6" style={{ color: '#f3727f' }}>{error}</p>
        <Link href="/" className="px-6 py-2 rounded-full font-bold text-sm uppercase tracking-[1.4px]"
          style={{ background: '#1f1f1f', color: '#fff', border: '1px solid #4d4d4d' }}>홈으로</Link>
      </div>
    );
  }
  if (!meeting) return null;

  const total = votes.length;
  const ranked = meeting.candidate_dates
    .map((cd) => ({
      ...cd,
      count: votes.filter((v) => v.selected_dates.includes(cd.id)).length,
      yes: votes.filter((v) => v.selected_dates.includes(cd.id)).map((v) => v.attendee_name),
      no: votes.filter((v) => !v.selected_dates.includes(cd.id)).map((v) => v.attendee_name),
    }))
    .sort((a, b) => b.count - a.count);

  const maxCount = ranked[0]?.count ?? 0;
  const expected = meeting.expected_attendees ?? [];
  const votedNames = votes.map((v) => v.attendee_name);
  const files = meeting.files ?? [];

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* 헤더 */}
      <div className="rounded-lg p-6" style={{ background: '#181818' }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-[1px] px-2 py-0.5 rounded-full"
            style={{ background: '#1ed760', color: '#000' }}>주최자</span>
        </div>
        <h1 className="text-xl font-bold text-white mb-1">{meeting.title}</h1>
        {meeting.description && <p className="text-sm mb-3" style={{ color: '#b3b3b3' }}>{meeting.description}</p>}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: '#7c7c7c' }}>
          <span>주최자: {meeting.host_name}</span>
          {meeting.location && <span>📍 {meeting.location}</span>}
          {meeting.deadline && <span>마감: {meeting.deadline}</span>}
          <span>총 {total}명 참여</span>
        </div>
      </div>

      {/* 날짜별 결과 */}
      <div className="rounded-lg p-6 space-y-4" style={{ background: '#181818' }}>
        <h2 className="font-bold text-xs uppercase tracking-[1.4px]" style={{ color: '#b3b3b3' }}>날짜별 결과 (투표순)</h2>
        {ranked.map((cd, idx) => {
          const pct = total > 0 ? Math.round((cd.count / total) * 100) : 0;
          const isBest = cd.count === maxCount && maxCount > 0 && idx === 0;
          return (
            <div key={cd.id} className="rounded-lg p-4 space-y-2"
              style={{ background: isBest ? 'rgba(30,215,96,0.06)' : '#1f1f1f', border: `1px solid ${isBest ? '#1ed760' : '#282828'}` }}>
              <div className="flex items-center gap-2">
                {isBest && <span className="text-xs font-bold uppercase tracking-[1px] px-2 py-0.5 rounded-full"
                  style={{ background: '#1ed760', color: '#000' }}>최다</span>}
                <span className="font-bold text-sm text-white">{formatDate(cd.date_value, cd.time_value)}</span>
                <span className="ml-auto text-xs" style={{ color: isBest ? '#1ed760' : '#b3b3b3' }}>
                  {cd.count}/{total}명 ({pct}%)
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#282828' }}>
                <div className="h-1.5 rounded-full"
                  style={{ width: `${pct}%`, background: isBest ? '#1ed760' : '#4d4d4d' }} />
              </div>
              <div className="flex gap-4 text-xs flex-wrap">
                {cd.yes.length > 0 && <span style={{ color: '#1ed760' }}>✓ {cd.yes.join(', ')}</span>}
                {cd.no.length > 0 && <span style={{ color: '#7c7c7c' }}>✕ {cd.no.join(', ')}</span>}
              </div>
            </div>
          );
        })}
      </div>

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
                    background: voted ? 'rgba(30,215,96,0.1)' : 'rgba(243,114,127,0.1)',
                    border: `1px solid ${voted ? '#1ed760' : '#f3727f'}`,
                    color: voted ? '#1ed760' : '#f3727f',
                  }}>
                  {voted ? '✓' : '!'} {name}
                </span>
              );
            })}
          </div>
          <p className="text-xs" style={{ color: '#7c7c7c' }}>
            {votedNames.filter((n) => expected.includes(n)).length}/{expected.length}명 응답 완료
            {expected.length - votedNames.filter((n) => expected.includes(n)).length > 0 &&
              ` · ${expected.filter((n) => !votedNames.includes(n)).join(', ')} 미응답`}
          </p>
        </div>
      )}

      {/* 참여자 상세 */}
      <div className="rounded-lg p-6" style={{ background: '#181818' }}>
        <h2 className="font-bold text-xs uppercase tracking-[1.4px] mb-4" style={{ color: '#b3b3b3' }}>참여자 상세</h2>
        {votes.length === 0 ? (
          <p className="text-sm" style={{ color: '#7c7c7c' }}>아직 참여자가 없습니다.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #282828' }}>
                {['이름', '가능 날짜', '응답 시각'].map((h) => (
                  <th key={h} className={`pb-3 text-xs font-bold uppercase tracking-[1.4px] ${h === '응답 시각' ? 'text-right' : 'text-left'}`}
                    style={{ color: '#7c7c7c' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {votes.map((v) => (
                <tr key={v.id} style={{ borderBottom: '1px solid #1f1f1f' }}>
                  <td className="py-3 font-bold text-white">{v.attendee_name}</td>
                  <td className="py-3 text-xs" style={{ color: '#b3b3b3' }}>
                    {v.selected_dates.length === 0 ? '없음'
                      : v.selected_dates.map((sid) => {
                          const cd = meeting.candidate_dates.find((c) => c.id === sid);
                          return cd ? formatDate(cd.date_value, cd.time_value) : '';
                        }).filter(Boolean).join(' · ')}
                  </td>
                  <td className="py-3 text-right text-xs" style={{ color: '#7c7c7c' }}>
                    {new Date(v.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 회의 자료 관리 */}
      <div className="rounded-lg p-6 space-y-4" style={{ background: '#181818' }}>
        <h2 className="font-bold text-xs uppercase tracking-[1.4px]" style={{ color: '#b3b3b3' }}>회의 자료 관리</h2>

        {/* 드래그앤드롭 업로드 존 */}
        <input ref={fileInputRef} type="file" onChange={handleFileInput} className="hidden" id="file-upload" />
        <div
          onDragOver={(e) => { e.preventDefault(); if (!uploading) setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className="rounded-lg py-8 px-4 text-center cursor-pointer transition-all"
          style={{
            background: dragOver ? 'rgba(30,215,96,0.08)' : '#1f1f1f',
            border: `2px dashed ${dragOver ? '#1ed760' : uploading ? '#4d4d4d' : '#4d4d4d'}`,
            cursor: uploading ? 'not-allowed' : 'pointer',
          }}
        >
          {uploading ? (
            <>
              <p className="text-2xl mb-2">⏳</p>
              <p className="text-sm font-bold text-white">업로드 중...</p>
            </>
          ) : (
            <>
              <p className="text-2xl mb-2" style={{ filter: dragOver ? 'none' : 'grayscale(1) opacity(0.5)' }}>📁</p>
              <p className="text-sm font-bold text-white mb-1">
                {dragOver ? '여기에 놓으세요' : '클릭하거나 파일을 드래그하세요'}
              </p>
              <p className="text-xs" style={{ color: '#7c7c7c' }}>최대 10MB · 모든 파일 형식</p>
            </>
          )}
        </div>
        {uploadError && <p className="text-xs" style={{ color: '#f3727f' }}>{uploadError}</p>}

        {/* 파일 목록 */}
        {files.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-bold" style={{ color: '#7c7c7c' }}>업로드된 파일 {files.length}개</p>
            {files.map((f) => (
              <div key={f.id} className="flex items-center gap-3 px-4 py-3 rounded-lg"
                style={{ background: '#282828', border: '1px solid #333' }}>
                <span className="text-lg">📄</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{f.original_name}</p>
                  <p className="text-xs" style={{ color: '#7c7c7c' }}>
                    {formatFileSize(f.size)} · {new Date(f.uploaded_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <a href={`/api/meetings/${id}/files/${f.id}`} download={f.original_name}
                    className="text-xs font-bold uppercase tracking-[1.4px]" style={{ color: '#1ed760' }}>
                    다운로드
                  </a>
                  <button onClick={() => handleDeleteFile(f.id)}
                    className="text-xs font-bold uppercase tracking-[1.4px] transition-colors"
                    style={{ color: '#7c7c7c' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#f3727f'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#7c7c7c'; }}>
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !uploading && <p className="text-xs" style={{ color: '#7c7c7c' }}>업로드된 파일이 없습니다.</p>
        )}
      </div>

      {/* 내비게이션 */}
      <div className="flex gap-3">
        <Link href={`/meeting/${id}`}
          className="flex-1 text-center py-2 rounded-full font-bold text-sm uppercase tracking-[1.4px]"
          style={{ background: '#1f1f1f', color: '#fff', border: '1px solid #4d4d4d' }}>
          투표 페이지
        </Link>
        <Link href={`/meeting/${id}/results`}
          className="flex-1 text-center py-2 rounded-full font-bold text-sm uppercase tracking-[1.4px]"
          style={{ background: '#1ed760', color: '#000' }}>
          공개 결과
        </Link>
      </div>
    </div>
  );
}
