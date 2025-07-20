'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface UserProfile {
  id: string
  stationName: string
  teamName: string
  totalAnnualLeave: number
  usedAnnualLeave: number
  totalSickLeave: number
  usedSickLeave: number
  totalSpecialLeave: number
  usedSpecialLeave: number
  usedExtraDaysOff: number
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const userData = await response.json()
        setProfile(userData.profile)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!profile) return

    setSaving(true)
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      })

      if (response.ok) {
        alert('프로필이 저장되었습니다!')
        router.push('/')
      } else {
        alert('저장 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof UserProfile, value: string | number) => {
    if (profile) {
      setProfile({
        ...profile,
        [field]: value
      })
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      fetchProfile()
    }
  }, [status])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">로딩 중...</div>
      </div>
    )
  }

  if (!session || !profile) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-blue-500 p-6 text-center">
          <h1 className="text-xl font-bold text-white">프로필 편집</h1>
        </div>

        <div className="p-6 space-y-6">
          {/* 역 정보 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                역 이름
              </label>
              <input
                type="text"
                value={profile.stationName}
                onChange={(e) => handleInputChange('stationName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="예: 흑대입구 역"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                조
              </label>
              <select
                value={profile.teamName}
                onChange={(e) => handleInputChange('teamName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="A조">A조</option>
                <option value="B조">B조</option>
                <option value="C조">C조</option>
                <option value="D조">D조</option>
              </select>
            </div>
          </div>

          {/* 연차 정보 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">연차 정보</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                총 연차 개수
              </label>
              <input
                type="number"
                value={profile.totalAnnualLeave}
                onChange={(e) => handleInputChange('totalAnnualLeave', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                사용한 연차 개수
              </label>
              <input
                type="number"
                step="0.5"
                value={profile.usedAnnualLeave}
                onChange={(e) => handleInputChange('usedAnnualLeave', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                max={profile.totalAnnualLeave}
              />
            </div>

            <div className="text-sm text-gray-600">
              남은 연차: {profile.totalAnnualLeave - profile.usedAnnualLeave}개
            </div>
          </div>

          {/* 병가 정보 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">병가 정보</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                총 병가 개수
              </label>
              <input
                type="number"
                value={profile.totalSickLeave}
                onChange={(e) => handleInputChange('totalSickLeave', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                사용한 병가 개수
              </label>
              <input
                type="number"
                value={profile.usedSickLeave}
                onChange={(e) => handleInputChange('usedSickLeave', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                max={profile.totalSickLeave}
              />
            </div>

            <div className="text-sm text-gray-600">
              남은 병가: {profile.totalSickLeave - profile.usedSickLeave}개
            </div>
          </div>

          {/* 특별휴가 정보 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">특별휴가 정보</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                총 특별휴가 개수
              </label>
              <input
                type="number"
                value={profile.totalSpecialLeave}
                onChange={(e) => handleInputChange('totalSpecialLeave', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                사용한 특별휴가 개수
              </label>
              <input
                type="number"
                value={profile.usedSpecialLeave}
                onChange={(e) => handleInputChange('usedSpecialLeave', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                max={profile.totalSpecialLeave}
              />
            </div>

            <div className="text-sm text-gray-600">
              남은 특별휴가: {profile.totalSpecialLeave - profile.usedSpecialLeave}개
            </div>
          </div>

          {/* 추가휴무 정보 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">추가휴무 정보</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                사용한 추가휴무 개수
              </label>
              <input
                type="number"
                step="0.5"
                value={profile.usedExtraDaysOff}
                onChange={(e) => handleInputChange('usedExtraDaysOff', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
              />
            </div>

            <div className="text-sm text-gray-600">
              추가휴무는 주말 개수에서 휴일 개수를 뺀 값에서 사용량을 차감한 값입니다.
            </div>
          </div>

          {/* 버튼들 */}
          <div className="flex space-x-3 pt-4">
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="flex-1"
              disabled={saving}
            >
              취소
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1"
              disabled={saving}
            >
              {saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 