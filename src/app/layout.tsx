import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SessionProvider } from '@/components/session-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '교대 근무 달력',
  description: '주야비휴 교대 근무를 위한 달력 앱',
}
//update
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link 
          rel="stylesheet" 
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" 
        />
        <style>{`
          * {
            font-family: "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif;
          }
        `}</style>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Service Worker 제거 스크립트
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for(let registration of registrations) {
                    registration.unregister();
                  }
                });
              }
              
              // OAuth 콜백 URL에 대한 Service Worker 우회 설정
              if (typeof window !== 'undefined' && window.location.pathname.includes('/api/auth/')) {
                // Service Worker가 OAuth 콜백을 처리하지 않도록 강제 설정
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistration().then(function(registration) {
                    if (registration) {
                      registration.unregister();
                    }
                  });
                }
              }
            `,
          }}
        />
      </head>
      <body className={`${inter.className} h-full`}>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
