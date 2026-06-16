import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '일정 조율',
  description: '회의 날짜를 쉽게 조율하세요',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={geist.className}>
      <body className="min-h-screen" style={{ background: '#121212', color: '#ffffff' }}>
        <header style={{ background: '#121212', borderBottom: '1px solid #282828' }}>
          <div className="max-w-3xl mx-auto px-6 py-4">
            <a
              href="/"
              className="font-bold text-lg uppercase tracking-[2px]"
              style={{ color: '#1ed760' }}
            >
              일정조율
            </a>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
