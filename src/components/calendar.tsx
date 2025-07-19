'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Sun, Moon, Coffee, Home, Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ShiftType = 'day' | 'night' | 'off' | 'holiday'

interface WorkSchedule {
  id: string
  date: Date
  shiftType: ShiftType
}

const shiftConfig = {
  day: { icon: Sun, label: '주', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', emoji: '☀️' },
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
    <div className="container mx-auto px-4 py-4 max-w-6xl">
      {/* Calendar */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden calendar-fade-in">
        {/* Calendar Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevMonth}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 touch-friendly"
            >
              <ChevronLeft className="h-5 w-5" />
              {!isMobile && <span className="ml-2">이전</span>}
            </Button>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              {format(currentDate, 'yyyy년 M월', { locale: ko })}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextMonth}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 touch-friendly"
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
                  ${isSelected ? 'bg-blue-50 ring-2 ring-blue-500' : ''}
                  ${isCurrentDateToday ? 'bg-yellow-50' : ''}
                  ${!isInCurrentMonth ? 'bg-gray-50/50' : ''}
                  hover:bg-gray-50
                `}
                onClick={() => handleDateClick(date)}
              >
                <div className="flex flex-col h-full">
                  <div className={`text-sm font-medium mb-1 ${
                    !isInCurrentMonth ? 'text-gray-300' :
                    isCurrentDateToday ? 'text-blue-600 font-bold' : 
                    index % 7 === 0 ? 'text-red-600' : 
                    index % 7 === 6 ? 'text-blue-600' : 
                    'text-gray-700'
                  }`}>
                    {format(date, 'd')}
                  </div>
                  
                  {shift && isInCurrentMonth && (
                    <div className={`
                      inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border
                      ${shiftConfig[shift.shiftType].color}
                      ${isMobile ? 'text-xs' : ''}
                    `}>
                      <span className="mr-1">{shiftConfig[shift.shiftType].emoji}</span>
                      <span>{shiftConfig[shift.shiftType].label}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom Panel for Shift Selection */}
        {selectedDate && (
          <div className="bg-gray-50 p-4 border-t">
            <div className="flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {format(selectedDate, 'M월 d일 (E)', { locale: ko })}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(null)}
                  className="touch-friendly"
                >
                  닫기
                </Button>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(shiftConfig).map(([key, config]) => {
                  const Icon = config.icon
                  return (
                    <Button
                      key={key}
                      variant="outline"
                      size="sm"
                      onClick={() => updateShiftForDate(selectedDate, key as ShiftType)}
                      disabled={loading}
                      className={`
                        touch-friendly flex items-center justify-center space-x-2 h-12
                        ${config.color}
                        hover:opacity-80 transition-opacity
                      `}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{config.label}</span>
                    </Button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">근무 종류</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(shiftConfig).map(([key, config]) => (
            <div key={key} className="flex items-center space-x-2">
              <div className={`w-4 h-4 rounded-full ${config.color.split(' ')[0]}`} />
              <span className="text-sm text-gray-700">{config.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 