'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, addMonths, getDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { getMonthlyHolidayCount, isKoreanHoliday, getHolidayName } from '@/lib/holidays'

type ShiftType = 'day' | 'night' | 'off' | 'holiday' | 'annual' | 'special' | 'sick' | 'annual_half' | 'extra_half'

interface WorkSchedule {
  id: string
  date: Date
  shiftType: ShiftType
}

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

const shiftConfig = {
  day: { icon: '/주.svg', label: '주', color: 'text-yellow-600' },
  night: { icon: '/야.svg', label: '야', color: 'text-blue-600' },
  off: { icon: '/비.svg', label: '비', color: 'text-red-600' },
  holiday: { icon: '/휴.svg', label: '휴', color: 'text-green-600' },
  annual: { icon: '/연.svg', label: '연', color: 'text-purple-600' },
  special: { icon: '/특.svg', label: '특', color: 'text-pink-600' },
  sick: { icon: '/병.svg', label: '병', color: 'text-orange-600' },
  annual_half: { icon: '/반.svg', label: '연반차', color: 'text-indigo-600' },
  extra_half: { icon: '/반.svg', label: '추반차', color: 'text-teal-600' }
}

export default function RecordsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
  }

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const userData = await response.json()
        setUserProfile(userData.profile)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const fetchWorkSchedules = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/work-schedule?month=${format(currentDate, 'yyyy-MM')}`)
      if (response.ok) {
        const schedules = await response.json()
        setWorkSchedules(schedules.map((schedule: { id: string; date: string; shiftType: ShiftType }) => ({
          ...schedule,
          date: new Date(schedule.date)
        })))
      }
    } catch (error) {
      console.error('Error fetching work schedules:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPatternShiftForDate = (date: Date, teamName: string): WorkSchedule | null => {
    // 2024년 5월 29일을 기준점으로 설정
    const baseDate = new Date('2024-05-29')
    const daysDiff = Math.floor((date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24))
    
    // 4조 3교대 패턴: ['day', 'night', 'off', 'holiday']
    const pattern: ShiftType[] = ['day', 'night', 'off', 'holiday']
    
    // 각 조의 시작 오프셋 (5월 29일 기준)
    // pattern = ['day', 'night', 'off', 'holiday'] (인덱스: 0, 1, 2, 3)
    const teamOffsets: { [key: string]: number } = {
      'A조': 0,  // 주 (day) → index 0
      'D조': 1,  // 야 (night) → index 1  
      'C조': 2,  // 비 (off) → index 2
      'B조': 3   // 휴 (holiday) → index 3
    }
    
    const teamOffset = teamOffsets[teamName] || 0
    const patternIndex = (daysDiff + teamOffset) % 4
    const shiftType = pattern[patternIndex < 0 ? patternIndex + 4 : patternIndex]
    
    return {
      id: `pattern-${date.toISOString()}`,
      date: date,
      shiftType: shiftType
    }
  }

  const getShiftForDate = (date: Date) => {
    // 먼저 데이터베이스에서 저장된 스케줄 확인 (사용자가 수정한 것)
    const savedSchedule = workSchedules.find(schedule => isSameDay(schedule.date, date))
    if (savedSchedule) {
      return savedSchedule
    }

    // 저장된 스케줄이 없으면 패턴 기반으로 계산
    if (!userProfile?.teamName) return null
    
    return getPatternShiftForDate(date, userProfile.teamName)
  }

  const getMonthlyStats = () => {
    const stats = {
      day: 0,
      night: 0,
      off: 0,
      holiday: 0,
      annual: 0,
      special: 0,
      sick: 0,
      annual_half: 0,
      extra_half: 0
    }

    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
    
    monthDays.forEach(date => {
      const shift = getShiftForDate(date)
      if (shift && stats[shift.shiftType as keyof typeof stats] !== undefined) {
        stats[shift.shiftType as keyof typeof stats]++
      }
    })

    return stats
  }

  useEffect(() => {
    if (status === 'authenticated') {
      fetchUserProfile()
    }
  }, [status])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchWorkSchedules()
    }
  }, [currentDate, status])

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const stats = getMonthlyStats()

  if (status === 'loading' || loading || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">로딩 중...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* 헤더 */}
        <div className="bg-blue-500 p-6">
          <div className="flex items-center justify-between text-white">
            <Button
              onClick={() => router.push('/')}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-blue-400"
            >
              ← 돌아가기
            </Button>
            <h1 className="text-xl font-bold">근무 기록 ({userProfile.teamName})</h1>
            <div></div>
          </div>
        </div>

        {/* 월 선택 */}
        <div className="flex items-center justify-between p-4 border-b">
          <button 
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Image
              src="/Arrow left-circle.svg"
              alt="이전 월"
              width={24}
              height={24}
            />
          </button>
          
          <h2 className="text-xl font-bold text-gray-800">
            {format(currentDate, 'yyyy년 M월', { locale: ko })}
          </h2>
          
          <button 
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Image
              src="/Arrow right-circle.svg"
              alt="다음 월"
              width={24}
              height={24}
            />
          </button>
        </div>

        {/* 월별 통계 */}
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">이번 달 근무 통계</h3>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(shiftConfig).map(([key, config]) => (
              <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Image
                    src={config.icon}
                    alt={config.label}
                    width={16}
                    height={16}
                  />
                  <span className="text-xs font-medium">{config.label}</span>
                </div>
                <span className={`text-sm font-bold ${config.color}`}>
                  {stats[key as keyof typeof stats]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 날짜별 근무 기록 */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">날짜별 근무 기록</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {monthDays.map(date => {
              const shift = getShiftForDate(date)
              const config = shift ? shiftConfig[shift.shiftType] : null
              const isModified = workSchedules.some(schedule => isSameDay(schedule.date, date))
              const isHoliday = isKoreanHoliday(date)
              const holidayName = getHolidayName(date)
              
              return (
                <div key={date.toISOString()} className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 ${isModified ? 'border-blue-300 bg-blue-50' : ''} ${isHoliday ? 'bg-red-50 border-red-200' : ''}`}>
                  <div className="flex items-center space-x-3">
                    <span className={`text-sm font-medium ${
                      isHoliday ? 'text-red-600 font-bold' : 'text-gray-700'
                    }`}>
                      {format(date, 'M월 d일 (E)', { locale: ko })}
                    </span>
                    {isModified && (
                      <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">수정됨</span>
                    )}
                    {holidayName && (
                      <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">{holidayName}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {config ? (
                      <>
                        <Image
                          src={config.icon}
                          alt={config.label}
                          width={16}
                          height={16}
                        />
                        <span className={`text-sm font-medium ${config.color}`}>
                          {config.label}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-400">근무 없음</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 총합 정보 */}
        <div className="p-6 bg-gray-50 border-t">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              {format(currentDate, 'M월', { locale: ko })} 총 근무일: 
              <span className="font-bold text-gray-800 ml-1">
                {Object.values(stats).reduce((sum, count) => sum + count, 0)}일
              </span>
            </p>
            <p className="text-xs text-gray-500">
              파란색 표시는 수정된 날짜입니다
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 