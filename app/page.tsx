'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Meeting } from '@/lib/types';

type SafeMeeting = Omit<Meeting, 'host_token'>;

function formatRelativeDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function Home() {
  const [meetings, setMeetings] = useState<SafeMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function handleCopy(id: string) {
    const url = `${window.location.origin}/meeting/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  useEffect(() => {
    fetch('/api/meetings')
      .then((r) => r.json())
      .then((data) => { setMeetings(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`"${title}" 회의를 삭제할까요?\n투표 데이터와 업로드 파일도 모두 삭제됩니다.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/meetings/${id}`, { method: 'DELETE' });
      if (res.ok) setMeetings((prev) => prev.filter((m) => m.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">

      {/* 상단 헤더 */}
      <div className="flex items-center justify-between pt-4">
        <h1 className="text-lg font-bold text-white">회의 목록</h1>
        <Link href="/create"
          className="px-5 py-2 rounded-full font-bold text-sm uppercase tracking-[1.4px] transition-all hover:scale-105 active:scale-95"
          style={{ background: '#1ed760', color: '#000' }}>
          + 새 회의
        </Link>
      </div>

      {/* 회의 목록 */}
      {loading ? (
        <p className="text-center py-16 text-sm" style={{ color: '#b3b3b3' }}>불러오는 중...</p>
      ) : meetings.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <p className="text-4xl">📅</p>
          <p className="font-bold text-white">아직 생성된 회의가 없습니다</p>
          <p className="text-sm" style={{ color: '#b3b3b3' }}>
            후보 날짜를 제시하고 참석자들이 링크 하나로 투표합니다.<br />
            로그인 없이 누구나 사용할 수 있어요.
          </p>
          <Link href="/create"
            className="inline-block mt-4 px-10 py-3 rounded-full font-bold text-sm uppercase tracking-[1.4px] transition-all hover:scale-105 active:scale-95"
            style={{ background: '#1ed760', color: '#000' }}>
            회의 만들기
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((m) => {
            const isDel = deleting === m.id;
            return (
              <div key={m.id}
                className="rounded-lg p-5 transition-all"
                style={{ background: '#181818', border: '1px solid #282828', opacity: isDel ? 0.5 : 1 }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-white text-base truncate mb-1">{m.title}</h2>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs" style={{ color: '#7c7c7c' }}>
                      <span>주최자: {m.host_name}</span>
                      {m.location && <span>📍 {m.location}</span>}
                      <span>후보 {m.candidate_dates.length}개</span>
                      {m.deadline && <span>마감: {m.deadline}</span>}
                    </div>
                    <p className="text-xs mt-1.5" style={{ color: '#4d4d4d' }}>
                      {formatRelativeDate(m.created_at)} 생성
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(m.id, m.title)}
                    disabled={isDel}
                    className="text-xs font-bold uppercase tracking-[1px] shrink-0 transition-colors disabled:opacity-40"
                    style={{ color: '#4d4d4d' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#f3727f'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#4d4d4d'; }}>
                    {isDel ? '삭제 중...' : '삭제'}
                  </button>
                </div>
                <div className="flex gap-2 mt-4">
                  <Link href={`/meeting/${m.id}`}
                    className="flex-1 text-center py-2 rounded-full font-bold text-xs uppercase tracking-[1.4px] transition-colors"
                    style={{ background: '#282828', color: '#fff', border: '1px solid #333' }}>
                    투표 페이지
                  </Link>
                  <button
                    onClick={() => handleCopy(m.id)}
                    className="flex-1 py-2 rounded-full font-bold text-xs uppercase tracking-[1.4px] transition-all"
                    style={{
                      background: copied === m.id ? 'rgba(30,215,96,0.15)' : '#282828',
                      color: copied === m.id ? '#1ed760' : '#fff',
                      border: `1px solid ${copied === m.id ? '#1ed760' : '#333'}`,
                    }}>
                    {copied === m.id ? '✓ 복사됨' : '링크 복사'}
                  </button>
                  <Link href={`/meeting/${m.id}/results`}
                    className="flex-1 text-center py-2 rounded-full font-bold text-xs uppercase tracking-[1.4px] transition-colors"
                    style={{ background: '#282828', color: '#fff', border: '1px solid #333' }}>
                    결과 보기
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
