'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface DateEntry {
  date_value: string;
  time_value: string;
}

// 24h 시간 옵션: 00:00, 00:30, 01:00 ... 23:30
const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    TIME_OPTIONS.push(
      `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    );
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg p-6 space-y-4"
      style={{ background: '#181818', boxShadow: 'rgba(0,0,0,0.3) 0px 8px 8px' }}
    >
      <h2 className="font-bold text-xs uppercase tracking-[1.4px]" style={{ color: '#b3b3b3' }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function Label({ required, children }: { required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-bold text-white mb-1">
      {children}
      {required && <span className="ml-1" style={{ color: '#1ed760' }}>*</span>}
    </label>
  );
}

export default function CreatePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [hostName, setHostName] = useState('');
  const [deadline, setDeadline] = useState('');
  const [dates, setDates] = useState<DateEntry[]>([{ date_value: '', time_value: '' }]);
  const [attendees, setAttendees] = useState<string[]>([]);
  const [attendeeInput, setAttendeeInput] = useState('');
  const attendeeRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* ── 날짜 관리 ── */
  function addDate() {
    setDates((prev) => [...prev, { date_value: '', time_value: '' }]);
  }
  function removeDate(idx: number) {
    setDates((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateDate(idx: number, field: keyof DateEntry, value: string) {
    setDates((prev) => prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)));
  }

  /* ── 참석자 관리 ── */
  function addAttendee() {
    const name = attendeeInput.trim();
    if (!name || attendees.includes(name)) {
      attendeeRef.current?.focus();
      return;
    }
    setAttendees((prev) => [...prev, name]);
    setAttendeeInput('');
    attendeeRef.current?.focus();
  }
  function removeAttendee(name: string) {
    setAttendees((prev) => prev.filter((a) => a !== name));
  }
  function handleAttendeeKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addAttendee();
    }
  }

  /* ── 제출 ── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const validDates = dates.filter((d) => d.date_value.trim());
    if (!title.trim() || !hostName.trim() || validDates.length === 0) {
      setError('제목, 주최자 이름, 날짜를 최소 하나 이상 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          location: location.trim(),
          host_name: hostName.trim(),
          deadline,
          expected_attendees: attendees,
          candidate_dates: validDates,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? '오류가 발생했습니다.');
      }
      const { id, host_token } = await res.json();
      router.push(`/meeting/${id}/created?token=${host_token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-8">새 회의 만들기</h1>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* 기본 정보 */}
        <Section title="기본 정보">
          <div>
            <Label required>회의 제목</Label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 3분기 기획 회의" className="sp-input" />
          </div>
          <div>
            <Label>설명 (선택)</Label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="회의 안건이나 참고 사항을 입력하세요" rows={2}
              className="sp-input resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label required>주최자 이름</Label>
              <input type="text" value={hostName} onChange={(e) => setHostName(e.target.value)}
                placeholder="홍길동" className="sp-input" />
            </div>
            <div>
              <Label>투표 마감일 (선택)</Label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                className="sp-input" />
            </div>
          </div>
        </Section>

        {/* 장소 */}
        <Section title="회의 장소 (선택)">
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="예: 본사 3층 회의실 A, Zoom 링크 등"
            className="sp-input"
          />
        </Section>

        {/* 후보 날짜 */}
        <Section title="후보 날짜">
          <div className="space-y-2">
            {dates.map((d, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input type="date" value={d.date_value}
                  onChange={(e) => updateDate(idx, 'date_value', e.target.value)}
                  className="sp-input flex-1" />
                <select value={d.time_value}
                  onChange={(e) => updateDate(idx, 'time_value', e.target.value)}
                  className="sp-input" style={{ width: '9rem' }}>
                  <option value="">시간 미정</option>
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {dates.length > 1 && (
                  <button type="button" onClick={() => removeDate(idx)}
                    className="text-sm font-bold px-2 shrink-0 transition-colors"
                    style={{ color: '#b3b3b3' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#f3727f'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#b3b3b3'; }}>
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addDate}
            className="text-xs font-bold uppercase tracking-[1.4px] transition-colors"
            style={{ color: '#1ed760' }}>
            + 날짜 추가
          </button>
        </Section>

        {/* 참석 대상자 */}
        <Section title="참석 대상자 (선택)">
          <p className="text-xs" style={{ color: '#7c7c7c' }}>
            이름을 입력하고 Enter 또는 추가 버튼을 눌러 등록하세요. 투표 페이지에서 자동완성으로 사용됩니다.
          </p>
          <div className="flex gap-2">
            <input
              ref={attendeeRef}
              type="text"
              value={attendeeInput}
              onChange={(e) => setAttendeeInput(e.target.value)}
              onKeyDown={handleAttendeeKeyDown}
              placeholder="이름 입력"
              className="sp-input flex-1"
            />
            <button
              type="button"
              onClick={addAttendee}
              className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-[1.4px] shrink-0 transition-colors"
              style={{ background: '#1f1f1f', color: '#ffffff', border: '1px solid #4d4d4d' }}
            >
              추가
            </button>
          </div>
          {attendees.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {attendees.map((name) => (
                <span
                  key={name}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: '#1f1f1f', color: '#ffffff', border: '1px solid #4d4d4d' }}
                >
                  {name}
                  <button
                    type="button"
                    onClick={() => removeAttendee(name)}
                    className="transition-colors"
                    style={{ color: '#7c7c7c' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#f3727f'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#7c7c7c'; }}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </Section>

        {error && (
          <p className="text-xs px-4 py-3 rounded-lg"
            style={{ color: '#f3727f', background: 'rgba(243,114,127,0.1)', border: '1px solid rgba(243,114,127,0.3)' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-full font-bold text-sm uppercase tracking-[1.4px] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
          style={{ background: '#1ed760', color: '#000000' }}>
          {loading ? '생성 중...' : '회의 만들기'}
        </button>
      </form>
    </div>
  );
}
