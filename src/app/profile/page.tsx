'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { ArrowLeft, User, Mail, Calendar, Edit2, Save, X } from 'lucide-react'
import Header from '@/components/header'

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
    if (session?.user) {
      setName(session.user.name || '')
      setEmail(session.user.email || '')
    }
  }, [session, status, router])

  const handleSave = async () => {
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
        }),
      })

      if (response.ok) {
        setIsEditing(false)
        // 여기서 session을 업데이트하거나 페이지를 새로고침할 수 있습니다
        window.location.reload()
      } else {
        console.error('프로필 업데이트 실패')
      }
    } catch (error) {
      console.error('프로필 업데이트 중 오류 발생:', error)
    }
  }

  const handleCancel = () => {
    setName(session?.user?.name || '')
    setEmail(session?.user?.email || '')
    setIsEditing(false)
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <Header />
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="text-white hover:bg-blue-500/20"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                뒤로가기
              </Button>
              
              <div className="flex items-center space-x-3">
                {!isEditing ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="text-white hover:bg-blue-500/20"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    수정
                  </Button>
                ) : (
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSave}
                      className="text-white hover:bg-blue-500/20"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      저장
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancel}
                      className="text-white hover:bg-blue-500/20"
                    >
                      <X className="h-4 w-4 mr-2" />
                      취소
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 프로필 내용 */}
          <div className="px-6 py-8">
            <div className="text-center mb-8">
              <Avatar className="h-24 w-24 mx-auto mb-4">
                <AvatarImage src={session.user?.image || ''} alt="Profile" />
                <AvatarFallback className="bg-blue-600 text-white text-2xl">
                  <User className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">프로필 설정</h1>
              <p className="text-gray-600">계정 정보를 확인하고 수정할 수 있습니다</p>
            </div>

            <div className="space-y-6">
              {/* 이름 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <User className="h-5 w-5 text-gray-500 mr-2" />
                  <label className="text-sm font-medium text-gray-700">이름</label>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="이름을 입력하세요"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{session.user?.name || '이름 없음'}</p>
                )}
              </div>

              {/* 이메일 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <Mail className="h-5 w-5 text-gray-500 mr-2" />
                  <label className="text-sm font-medium text-gray-700">이메일</label>
                </div>
                <p className="text-gray-900 font-medium">{session.user?.email}</p>
                <p className="text-sm text-gray-500 mt-1">이메일은 변경할 수 없습니다</p>
              </div>

              {/* 가입일 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <Calendar className="h-5 w-5 text-gray-500 mr-2" />
                  <label className="text-sm font-medium text-gray-700">가입일</label>
                </div>
                <p className="text-gray-900 font-medium">
                  {new Date().toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 