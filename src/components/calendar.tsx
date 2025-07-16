'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, LogOut, Sun, Moon, Coffee, Home, Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ShiftType = 'day' | 'night' | 'off' | 'holiday'

interface WorkSchedule {
  id: string
  date: Date
  shiftType: ShiftType
}

const shiftConfig = {
  day: { icon: Sun, label: '주간', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', emoji: '☀️' },
  night: { icon: Moon, label: '야간', color: 'bg-blue-100 text-blue-800 border-blue-200', emoji: '🌙' },
  off: { icon: Coffee, label: '비번', color: 'bg-green-100 text-green-800 border-green-200', emoji: '☕' },
  holiday: { icon: Home, label: '휴일', color: 'bg-red-100 text-red-800 border-red-200', emoji: '🏠' }
}

export default function Calendar() {
  const { data: session } = useSession()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [loading, setLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
    setSelectedDate(date)
  }

  const getShiftForDate = (date: Date) => {
    return workSchedules.find(schedule => isSameDay(schedule.date, date))
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

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth()
  }

  useEffect(() => {
    fetchWorkSchedules()
  }, [currentDate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-4 py-4 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center space-x-3">
            <CalendarIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">교대 근무 달력</h1>
              {session?.user?.name && (
                <p className="text-sm text-gray-600">안녕하세요, {session.user.name}님!</p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => signOut()}
            className="touch-friendly flex items-center space-x-2"
          >
            <LogOut className="h-4 w-4" />
            <span>로그아웃</span>
          </Button>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden calendar-fade-in">
          {/* Calendar Header */}
          <div className="bg-blue-600 text-white p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevMonth}
                className="text-white hover:bg-blue-700 touch-friendly"
              >
                <ChevronLeft className="h-5 w-5" />
                {!isMobile && <span className="ml-2">이전</span>}
              </Button>
              <h2 className="text-xl sm:text-2xl font-bold">
                {format(currentDate, 'yyyy년 M월', { locale: ko })}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextMonth}
                className="text-white hover:bg-blue-700 touch-friendly"
              >
                {!isMobile && <span className="mr-2">다음</span>}
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 bg-gray-50 border-b">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
              <div 
                key={day} 
                className={`p-3 text-center text-sm font-medium ${
                  index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((date, index) => {
              const shift = getShiftForDate(date)
              const isSelected = selectedDate && isSameDay(date, selectedDate)
              const isCurrentDateToday = isToday(date)
              const isInCurrentMonth = isCurrentMonth(date)

              return (
                <div
                  key={date.toISOString()}
                  className={`
                    relative border-b border-r border-gray-200 cursor-pointer
                    transition-all duration-200
                    ${isMobile ? 'mobile-calendar-cell' : 'p-3 min-h-[80px]'}
                    ${isSelected ? 'bg-blue-100 ring-2 ring-blue-500' : ''}
                    ${isCurrentDateToday ? 'bg-blue-50' : ''}
                    ${!isInCurrentMonth ? 'bg-gray-50 text-gray-400' : 'hover:bg-gray-50'}
                    touch-friendly
                  `}
                  onClick={() => handleDateClick(date)}
                >
                  <div className={`
                    text-sm font-medium
                    ${isCurrentDateToday ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}
                    ${index % 7 === 0 ? 'text-red-600' : index % 7 === 6 ? 'text-blue-600' : 'text-gray-900'}
                  `}>
                    {format(date, 'd')}
                  </div>
                  {shift && isInCurrentMonth && (
                    <div className={`
                      mt-1 px-2 py-1 rounded text-xs border
                      ${isMobile ? 'mobile-shift-badge' : ''}
                      ${shiftConfig[shift.shiftType].color}
                    `}>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs">{shiftConfig[shift.shiftType].emoji}</span>
                        {!isMobile && <span>{shiftConfig[shift.shiftType].label}</span>}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Shift Selection Panel */}
        {selectedDate && (
          <div className="mt-6 bg-white rounded-xl shadow-lg p-6 calendar-fade-in">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {format(selectedDate, 'M월 d일 (E)', { locale: ko })} 근무 설정
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(shiftConfig).map(([shiftType, config]) => {
                const Icon = config.icon
                return (
                  <Button
                    key={shiftType}
                    variant="outline"
                    className={`
                      flex flex-col items-center justify-center space-y-2 p-4 h-20
                      touch-friendly transition-all duration-200
                      ${config.color} hover:scale-105
                    `}
                    onClick={() => updateShiftForDate(selectedDate, shiftType as ShiftType)}
                    disabled={loading}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-sm font-medium">{config.label}</span>
                  </Button>
                )
              })}
            </div>
          </div>
        )}

        {/* 범례 */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">근무 형태 안내</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(shiftConfig).map(([shiftType, config]) => {
              const Icon = config.icon
              return (
                <div key={shiftType} className="flex items-center space-x-2">
                  <Icon className="h-5 w-5 text-gray-600" />
                  <span className="text-sm text-gray-700">{config.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
} 