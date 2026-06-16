'use client';

import { useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

export default function CreatedPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params.id;
  const token = searchParams.get('token') ?? '';

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const voteUrl = `${origin}/meeting/${id}`;
  const adminUrl = `${origin}/meeting/${id}/admin?token=${token}`;

  const [copiedVote, setCopiedVote] = useState(false);
  const [copiedAdmin, setCopiedAdmin] = useState(false);

  function copy(text: string, which: 'vote' | 'admin') {
    navigator.clipboard.writeText(text);
    if (which === 'vote') {
      setCopiedVote(true);
      setTimeout(() => setCopiedVote(false), 2000);
    } else {
      setCopiedAdmin(true);
      setTimeout(() => setCopiedAdmin(false), 2000);
    }
  }

  function LinkBox({
    label,
    sub,
    url,
    copied,
    which,
    accentColor,
  }: {
    label: string;
    sub?: string;
    url: string;
    copied: boolean;
    which: 'vote' | 'admin';
    accentColor: string;
  }) {
    return (
      <div className="rounded-lg p-5 space-y-3" style={{ background: '#181818' }}>
        <div>
          <p className="font-bold text-sm text-white">{label}</p>
          {sub && <p className="text-xs mt-0.5" style={{ color: '#b3b3b3' }}>{sub}</p>}
        </div>
        <div className="flex gap-2 items-center">
          <input
            readOnly
            value={url}
            className="flex-1 rounded-lg px-3 py-2 text-sm"
            style={{
              background: '#1f1f1f',
              color: '#b3b3b3',
              boxShadow: 'rgb(18,18,18) 0px 1px 0px, rgb(124,124,124) 0px 0px 0px 1px inset',
            }}
          />
          <button
            onClick={() => copy(url, which)}
            className="px-4 py-2 rounded-full font-bold text-xs uppercase tracking-[1.4px] transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
            style={{ background: accentColor, color: accentColor === '#1ed760' ? '#000' : '#fff' }}
          >
            {copied ? '복사됨' : '복사'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto text-center">
      <div className="text-5xl mb-6">🎉</div>
      <h1 className="text-2xl font-bold text-white mb-2">회의가 생성되었습니다!</h1>
      <p className="text-sm mb-10" style={{ color: '#b3b3b3' }}>
        아래 링크를 참석자에게 공유하세요.
      </p>

      <div className="space-y-3 text-left">
        <LinkBox
          label="참석자 투표 링크"
          url={voteUrl}
          copied={copiedVote}
          which="vote"
          accentColor="#1ed760"
        />
        <LinkBox
          label="주최자 관리 링크"
          sub="이 링크는 주최자만 보관하세요."
          url={adminUrl}
          copied={copiedAdmin}
          which="admin"
          accentColor="#4d4d4d"
        />
      </div>

      <div className="mt-10 flex gap-3 justify-center">
        <Link
          href={`/meeting/${id}`}
          className="px-6 py-2 rounded-full font-bold text-sm uppercase tracking-[1.4px] transition-all hover:scale-105"
          style={{ background: '#1ed760', color: '#000' }}
        >
          투표 페이지 보기
        </Link>
        <Link
          href="/"
          className="px-6 py-2 rounded-full font-bold text-sm uppercase tracking-[1.4px] transition-colors"
          style={{ background: '#1f1f1f', color: '#ffffff', border: '1px solid #4d4d4d' }}
        >
          홈으로
        </Link>
      </div>
    </div>
  );
}
