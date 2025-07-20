'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

type ShiftType = 'day' | 'night' | 'off' | 'holiday'

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
}

const shiftConfig = {
  day: { icon: '/주.svg', label: '주' },
  night: { icon: '/야.svg', label: '야' },
  off: { icon: '/비.svg', label: '비' },
  holiday: { icon: '/휴.svg', label: '휴' }
}

export default function Calendar() {
  const { data: session } = useSession()
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [loading, setLoading] = useState(false)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
    setSelectedDate(null)
  }

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
    setSelectedDate(null)
  }

  const handleDateClick = (date: Date) => {
    if (!isSameMonth(date, currentDate)) return
    setSelectedDate(date)
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

  const getTodayShift = () => {
    const todayShift = getShiftForDate(new Date())
    if (!todayShift) return '없음'
    return shiftConfig[todayShift.shiftType].label
  }

  const getMonthlyHolidays = () => {
    let holidayCount = 0
    const monthDays = eachDayOfInterval({ 
      start: startOfMonth(currentDate), 
      end: endOfMonth(currentDate) 
    })
    
    monthDays.forEach(date => {
      const shift = getShiftForDate(date)
      if (shift && shift.shiftType === 'holiday') {
        holidayCount++
      }
    })
    
    return holidayCount
  }

  const updateShiftForDate = async (date: Date, shiftType: ShiftType) => {
    setLoading(true)
    try {
      const response = await fetch('/api/work-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: date.toISOString(),
          shiftType,
        }),
      })

      if (response.ok) {
        const newSchedule = await response.json()
        setWorkSchedules(prev => {
          const filtered = prev.filter(schedule => !isSameDay(schedule.date, date))
          return [...filtered, { ...newSchedule, date: new Date(newSchedule.date) }]
        })
        setSelectedDate(null)
      }
    } catch (error) {
      console.error('Error updating shift:', error)
    } finally {
      setLoading(false)
    }
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
    try {
      const response = await fetch(`/api/work-schedule?month=${format(currentDate, 'yyyy-MM')}`)
      if (response.ok) {
        const schedules = await response.json()
        setWorkSchedules(schedules.map((schedule: any) => ({
          ...schedule,
          date: new Date(schedule.date)
        })))
      }
    } catch (error) {
      console.error('Error fetching work schedules:', error)
    }
  }

  useEffect(() => {
    fetchUserProfile()
  }, [])

  useEffect(() => {
    fetchWorkSchedules()
  }, [currentDate])

  const handleRecordsClick = () => {
    router.push('/records')
  }

  if (!userProfile) {
    return <div className="min-h-screen flex items-center justify-center">로딩 중...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* 상단 정보 */}
        <div className="bg-gray-200 p-6 text-center">
          <h1 className="text-xl font-bold text-gray-800 mb-2">
            {userProfile.stationName}
          </h1>
          <p className="text-lg text-gray-700 mb-3">
            {userProfile.teamName}
          </p>
          <p className="text-base text-gray-600">
            오늘 근무는 <span className="text-red-500 font-medium">{getTodayShift()}</span> 입니다
          </p>
        </div>

        {/* 달력 헤더 */}
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
            {format(currentDate, 'M월', { locale: ko })}
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

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 border-b">
          {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
            <div 
              key={day} 
              className={`p-3 text-center text-sm font-medium ${
                index === 0 ? 'text-red-500' : 
                index === 6 ? 'text-blue-500' : 
                'text-gray-700'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 달력 그리드 */}
        <div className="grid grid-cols-7">
          {calendarDays.map((date, index) => {
            const shift = getShiftForDate(date)
            const isSelected = selectedDate && isSameDay(date, selectedDate)
            const isCurrentDateToday = isToday(date)
            const isInCurrentMonth = isSameMonth(date, currentDate)

            return (
              <div
                key={date.toISOString()}
                className={`
                  relative h-16 border-r border-b border-gray-200 cursor-pointer
                  flex flex-col items-center justify-center
                  ${isSelected ? 'bg-blue-50' : ''}
                  ${isCurrentDateToday ? 'bg-yellow-50' : ''}
                  ${!isInCurrentMonth ? 'bg-gray-50 opacity-50' : 'hover:bg-gray-50'}
                `}
                onClick={() => handleDateClick(date)}
              >
                <span className={`text-sm font-medium mb-1 ${
                  !isInCurrentMonth ? 'text-gray-300' :
                  isCurrentDateToday ? 'text-blue-600 font-bold' : 
                  index % 7 === 0 ? 'text-red-500' : 
                  index % 7 === 6 ? 'text-blue-500' : 
                  'text-gray-700'
                }`}>
                  {format(date, 'd')}
                </span>
                
                {shift && isInCurrentMonth && (
                  <Image
                    src={shiftConfig[shift.shiftType].icon}
                    alt={shiftConfig[shift.shiftType].label}
                    width={20}
                    height={20}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* 하단 정보 */}
        <div className="p-6 bg-white">
          <div className="space-y-2 mb-4">
            <p className="text-sm text-gray-700">
              남은 연차: <span className="font-medium">{userProfile.totalAnnualLeave - userProfile.usedAnnualLeave}개</span>
            </p>
            <p className="text-sm text-gray-700">
              남은 병가: <span className="font-medium">{userProfile.totalSickLeave - userProfile.usedSickLeave}개</span>
            </p>
            <p className="text-sm text-gray-700">
              이번달 남은 휴가 휴무: <span className="font-medium">{getMonthlyHolidays()}개</span>
            </p>
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={handleRecordsClick}
              className="text-blue-500 text-sm font-medium hover:text-blue-600 transition-colors"
            >
              기록보기
            </button>
          </div>
        </div>

        {/* 날짜 선택 시 시프트 선택 모달 */}
        {selectedDate && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold text-center mb-4">
                {format(selectedDate, 'M월 d일 (E)', { locale: ko })}
              </h3>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                {Object.entries(shiftConfig).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => updateShiftForDate(selectedDate, key as ShiftType)}
                    disabled={loading}
                    className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <Image
                      src={config.icon}
                      alt={config.label}
                      width={24}
                      height={24}
                      className="mb-2"
                    />
                    <span className="text-sm font-medium">{config.label}</span>
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setSelectedDate(null)}
                className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 