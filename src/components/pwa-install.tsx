'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallButton, setShowInstallButton] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowInstallButton(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // 이미 설치되었는지 확인
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallButton(false)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setShowInstallButton(false)
    }
  }

  if (!showInstallButton) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50">
      <div className="bg-blue-600 text-white p-4 rounded-lg shadow-lg flex items-center justify-between">
        <div>
          <p className="font-semibold">앱으로 설치하기</p>
          <p className="text-sm opacity-90">홈 화면에 추가하여 더 빠르게 접근하세요</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowInstallButton(false)}
            className="px-3 py-1 text-sm border border-white/30 rounded hover:bg-white/10"
          >
            나중에
          </button>
          <button
            onClick={handleInstall}
            className="px-3 py-1 text-sm bg-white text-blue-600 rounded font-medium hover:bg-gray-100"
          >
            설치
          </button>
        </div>
      </div>
    </div>
  )
} 