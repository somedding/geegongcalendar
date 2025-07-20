'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth, getDay } from 'date-fns'
import { ko } from 'date-fns/locale'
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
  day: { icon: '/주.svg', label: '주' },
  night: { icon: '/야.svg', label: '야' },
  off: { icon: '/비.svg', label: '비' },
  holiday: { icon: '/휴.svg', label: '휴' },
  annual: { icon: '/연.svg', label: '연' },
  special: { icon: '/특.svg', label: '특' },
  sick: { icon: '/병.svg', label: '병' },
  annual_half: { icon: '/반.svg', label: '연반차' },
  extra_half: { icon: '/휴.svg', label: '추반차' }
}

export default function Calendar() {
  const { data: session } = useSession()
  // session은 향후 사용을 위해 유지
  console.log('Session:', session)
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedHolidayName, setSelectedHolidayName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showLeaveSelectionModal, setShowLeaveSelectionModal] = useState(false)
  const [pendingShiftType, setPendingShiftType] = useState<ShiftType | null>(null)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
    setSelectedDate(null)
    setSelectedHolidayName(null)
  }

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
    setSelectedDate(null)
    setSelectedHolidayName(null)
  }

  const handleDateClick = (date: Date) => {
    if (!isSameMonth(date, currentDate)) return
    
    const holidayName = getHolidayName(date)
    setSelectedDate(date)
    setSelectedHolidayName(holidayName)
  }

  const getShiftForDate = (date: Date): WorkSchedule | null => {
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

  const getMonthlyWeekends = () => {
    let weekendCount = 0
    const monthDays = eachDayOfInterval({ 
      start: startOfMonth(currentDate), 
      end: endOfMonth(currentDate) 
    })
    
    monthDays.forEach(date => {
      const dayOfWeek = getDay(date) // 0: 일요일, 6: 토요일
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekendCount++
      }
    })
    
    return weekendCount
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

  const getAdditionalDaysOff = () => {
    const weekends = getMonthlyWeekends()
    const holidays = getMonthlyHolidays()
    const legalHolidays = getMonthlyHolidayCount(currentDate.getFullYear(), currentDate.getMonth())
    
    const totalAvailable = Math.max(0, weekends + legalHolidays - holidays)
    const used = userProfile?.usedExtraDaysOff || 0
    return Math.max(0, totalAvailable - used)
  }

  // 휴가 타입별 차감량 계산
  const getShiftDeductionAmount = (shiftType: ShiftType, previousShiftType?: ShiftType) => {
    switch (shiftType) {
      case 'annual': return { type: 'annual', amount: 1 }
      case 'annual_half': return { type: 'annual', amount: 0.5 }
      case 'special': return { type: 'special', amount: 1 }
      case 'sick': return { type: 'sick', amount: 1 }
      case 'extra_half': return { type: 'extra', amount: 0.5 }
      case 'holiday': 
        // 주간이나 야간을 휴로 바꾸는 경우만 추가휴무 차감
        if (previousShiftType === 'day' || previousShiftType === 'night') {
          return { type: 'extra', amount: 1 }
        }
        return null
      default: return null
    }
  }

  // 야간/비번에 휴가 사용 시 2배 차감
  const getShiftDeductionAmountWithNightOff = (shiftType: ShiftType, currentShift: ShiftType) => {
    const baseDeduction = getShiftDeductionAmount(shiftType, currentShift)
    if (!baseDeduction) return null

    // 야간이나 비번에 휴가 사용 시 2배 차감
    if ((currentShift === 'night' || currentShift === 'off') && 
        (shiftType === 'annual' || shiftType === 'special' || shiftType === 'sick' || shiftType === 'extra_half')) {
      return {
        ...baseDeduction,
        amount: baseDeduction.amount * 2
      }
    }

    return baseDeduction
  }

  // 휴가 복구 (이전 시프트가 휴가였던 경우)
  const restoreLeaveUsage = async (previousShiftType: ShiftType, currentShift: ShiftType) => {
    const deduction = getShiftDeductionAmountWithNightOff(previousShiftType, currentShift)
    if (!deduction || !userProfile) return

    const updatedProfile = { ...userProfile }
    
    switch (deduction.type) {
      case 'annual':
        updatedProfile.usedAnnualLeave = Math.max(0, userProfile.usedAnnualLeave - deduction.amount)
        break
      case 'special':
        updatedProfile.usedSpecialLeave = Math.max(0, userProfile.usedSpecialLeave - deduction.amount)
        break
      case 'sick':
        updatedProfile.usedSickLeave = Math.max(0, userProfile.usedSickLeave - deduction.amount)
        break
      case 'extra':
        updatedProfile.usedExtraDaysOff = Math.max(0, (userProfile.usedExtraDaysOff || 0) - deduction.amount)
        break
    }

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedProfile),
      })

      if (response.ok) {
        setUserProfile(updatedProfile)
      }
    } catch (error) {
      console.error('Error restoring leave usage:', error)
    }
  }

  // 시프트 변경 가능 여부 확인
  const canChangeShift = (date: Date, newShiftType: ShiftType) => {
    const currentShift = getShiftForDate(date)
    if (!currentShift) return true

    // 이미 휴일인 날짜에는 각종 휴무 사용 불가
    if (currentShift.shiftType === 'holiday' && 
        (newShiftType === 'annual' || newShiftType === 'special' || newShiftType === 'sick' || 
         newShiftType === 'annual_half' || newShiftType === 'extra_half')) {
      return false
    }

    // 야간/비번/휴일에는 반차 사용 불가
    if ((currentShift.shiftType === 'night' || currentShift.shiftType === 'off' || currentShift.shiftType === 'holiday') && 
        (newShiftType === 'annual_half' || newShiftType === 'extra_half')) {
      return false
    }

    return true
  }

  // 휴가 사용 가능 여부 확인
  const canUseLeave = (shiftType: ShiftType, currentShift: ShiftType) => {
    if (!userProfile) return false

    const deduction = getShiftDeductionAmountWithNightOff(shiftType, currentShift)
    if (!deduction) return false

    switch (deduction.type) {
      case 'annual':
          const remainingAnnual = userProfile.totalAnnualLeave - userProfile.usedAnnualLeave
        return remainingAnnual >= deduction.amount
      case 'special':
        const remainingSpecial = userProfile.totalSpecialLeave - userProfile.usedSpecialLeave
        return remainingSpecial >= deduction.amount
      case 'sick':
        const remainingSick = userProfile.totalSickLeave - userProfile.usedSickLeave
        return remainingSick >= deduction.amount
      case 'extra':
        const availableExtra = getAdditionalDaysOff()
        return availableExtra >= deduction.amount
      default:
        return false
    }
  }

  const handleShiftSelection = (shiftType: ShiftType) => {
    if (!selectedDate) return

    const currentShift = getShiftForDate(selectedDate)
    if (!currentShift) return

    // 야간/비번에서 휴가 사용 시 특별 처리
    if ((currentShift.shiftType === 'night' || currentShift.shiftType === 'off') && 
        (shiftType === 'annual' || shiftType === 'special' || shiftType === 'sick')) {
      
      // 휴가 사용 불가능한 경우 체크
      if (!canUseLeave(shiftType, currentShift.shiftType)) {
        const deduction = getShiftDeductionAmountWithNightOff(shiftType, currentShift.shiftType)
        if (deduction) {
          if (deduction.type === 'annual') {
            alert(`남은 연차가 부족합니다. (필요: ${deduction.amount}개)`)
          } else if (deduction.type === 'special') {
            alert(`남은 특별휴가가 부족합니다. (필요: ${deduction.amount}개)`)
          } else if (deduction.type === 'sick') {
            alert(`남은 병가가 부족합니다. (필요: ${deduction.amount}개)`)
          }
        }
        return
      }

      // 추가휴무 사용 가능 여부도 체크
      const availableExtra = getAdditionalDaysOff()
      const hasAnnualLeave = (userProfile?.totalAnnualLeave || 0) - (userProfile?.usedAnnualLeave || 0) >= 2
      const hasExtraLeave = availableExtra >= 2

      if (!hasAnnualLeave && !hasExtraLeave) {
        alert('연차와 추가휴무가 모두 부족합니다.')
        return
      }

      setPendingShiftType(shiftType)
      setShowLeaveSelectionModal(true)
            return
          }

    // 일반 휴가 타입인 경우
    if (shiftType === 'annual' || shiftType === 'special' || shiftType === 'sick' || 
        shiftType === 'annual_half' || shiftType === 'extra_half') {
      
      // 변경 불가능한 경우
      if (!canChangeShift(selectedDate, shiftType)) {
        const currentShiftType = currentShift.shiftType as ShiftType
        if (currentShiftType === 'holiday') {
          alert('이미 휴일인 날짜에는 휴가를 사용할 수 없습니다.')
        } else if (currentShiftType === 'night' || currentShiftType === 'off') {
          alert('야간/비번/휴일에는 반차를 사용할 수 없습니다.')
        }
            return
      }

      // 휴가 사용 불가능한 경우
      if (!canUseLeave(shiftType, currentShift.shiftType)) {
        const deduction = getShiftDeductionAmountWithNightOff(shiftType, currentShift.shiftType)
        if (deduction) {
          if (deduction.type === 'annual') {
            alert(`남은 연차가 부족합니다. (필요: ${deduction.amount}개)`)
          } else if (deduction.type === 'special') {
            alert(`남은 특별휴가가 부족합니다. (필요: ${deduction.amount}개)`)
          } else if (deduction.type === 'sick') {
            alert(`남은 병가가 부족합니다. (필요: ${deduction.amount}개)`)
          } else if (deduction.type === 'extra') {
            const availableExtra = getAdditionalDaysOff()
            alert(`추가휴무가 부족합니다.\n\n현재 사용 가능한 추가휴무: ${availableExtra}개\n필요한 추가휴무: ${deduction.amount}개\n\n추가휴무를 사용할 수 없습니다.`)
          }
        }
        return
      }

      setPendingShiftType(shiftType)
      setShowLeaveSelectionModal(true)
            return
          }

        // '휴' 타입 선택 시 처리
    if (shiftType === 'holiday') {
      // 야간/비번에서 휴로 바꾸는 경우 선택 모달 표시
      if (currentShift.shiftType === 'night' || currentShift.shiftType === 'off') {
        // 추가휴무 사용 가능 여부도 체크
        const availableExtra = getAdditionalDaysOff()
        const hasAnnualLeave = (userProfile?.totalAnnualLeave || 0) - (userProfile?.usedAnnualLeave || 0) >= 2
        const hasExtraLeave = availableExtra >= 2

        if (!hasAnnualLeave && !hasExtraLeave) {
          alert('연차와 추가휴무가 모두 부족합니다.')
          return
        }

        setPendingShiftType('holiday')
        setShowLeaveSelectionModal(true)
        return
      }
      
      // 주간을 휴로 바꾸는 경우만 추가휴무 차감 체크
      if (currentShift.shiftType === 'day') {
          const availableExtra = getAdditionalDaysOff()
        if (availableExtra < 1) {
          alert(`추가휴무가 부족합니다.\n\n현재 사용 가능한 추가휴무: ${availableExtra}개\n필요한 추가휴무: 1개\n\n추가휴무를 사용할 수 없습니다.`)
            return
          }
        }
      }

    // 일반 시프트 변경
    updateShiftForDate(selectedDate, shiftType)
  }

  const handleLeaveSelection = async (leaveType: 'annual' | 'annual_half' | 'special' | 'sick' | 'extra' | 'mixed_annual_extra' | 'mixed_extra_annual') => {
    if (!selectedDate || !pendingShiftType) return

    const currentShift = getShiftForDate(selectedDate)
    if (!currentShift) return

    // 야간/비번에서 특별 처리
    if (currentShift.shiftType === 'night' || currentShift.shiftType === 'off') {
      const nextDate = new Date(selectedDate)
      nextDate.setDate(nextDate.getDate() + 1)
      
      if (leaveType === 'extra') {
        // 추가휴무 2개 사용
        await Promise.all([
          updateShiftForDate(selectedDate, 'holiday'),
          updateShiftForDate(nextDate, 'holiday', true)
        ])
      } else if (leaveType === 'mixed_annual_extra') {
        // 첫 번째 날: 연차, 두 번째 날: 추가휴무
        // 연차 1개 + 추가휴무 1개 차감
        if (userProfile) {
          const updatedProfile = { ...userProfile }
          updatedProfile.usedAnnualLeave = userProfile.usedAnnualLeave + 1
          updatedProfile.usedExtraDaysOff = (userProfile.usedExtraDaysOff || 0) + 1
          
          await fetch('/api/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedProfile),
          })
          setUserProfile(updatedProfile)
        }
        
        await Promise.all([
          updateShiftForDate(selectedDate, pendingShiftType === 'holiday' ? 'annual' : pendingShiftType),
          updateShiftForDate(nextDate, 'holiday', true)
        ])
      } else if (leaveType === 'mixed_extra_annual') {
        // 첫 번째 날: 추가휴무, 두 번째 날: 연차
        // 추가휴무 1개 + 연차 1개 차감
        if (userProfile) {
          const updatedProfile = { ...userProfile }
          updatedProfile.usedExtraDaysOff = (userProfile.usedExtraDaysOff || 0) + 1
          updatedProfile.usedAnnualLeave = userProfile.usedAnnualLeave + 1
          
          await fetch('/api/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedProfile),
          })
          setUserProfile(updatedProfile)
        }
        
        await Promise.all([
          updateShiftForDate(selectedDate, 'holiday'),
          updateShiftForDate(nextDate, pendingShiftType === 'holiday' ? 'annual' : pendingShiftType, true)
        ])
      } else {
        // 일반 휴가 2개 사용
        const actualShiftType = pendingShiftType === 'holiday' ? 'annual' : pendingShiftType
        await Promise.all([
          updateShiftForDate(selectedDate, actualShiftType),
          updateShiftForDate(nextDate, actualShiftType, true)
        ])
      }
      
      setSelectedDate(null)
      setSelectedHolidayName(null)
      setShowLeaveSelectionModal(false)
      setPendingShiftType(null)
      return
    }

    // 선택된 휴가 타입에 따라 실제 시프트 타입 결정
    let actualShiftType: ShiftType
    switch (leaveType) {
      case 'annual':
        actualShiftType = 'annual'
        break
      case 'annual_half':
        actualShiftType = 'annual_half'
        break
      case 'special':
        actualShiftType = 'special'
        break
      case 'sick':
        actualShiftType = 'sick'
        break
      case 'extra':
        actualShiftType = 'extra_half'
        break
      default:
        return
    }

    // 야간/비번에 휴가 사용 시 다음 날짜도 함께 변경
    const shiftType = currentShift.shiftType as string
    const isNightOrOff = shiftType === 'night' || shiftType === 'off'
    const isLeaveType = actualShiftType === 'annual' || actualShiftType === 'special' || actualShiftType === 'sick' || actualShiftType === 'extra_half'
    if (isNightOrOff && isLeaveType) {
      
      // 다음 날짜 계산 (야간→비번, 비번→야간)
      const nextDate = new Date(selectedDate)
      nextDate.setDate(nextDate.getDate() + 1)
      
      // 현재 날짜와 다음 날짜 모두 휴가로 변경
      await Promise.all([
        updateShiftForDate(selectedDate, actualShiftType),
        updateShiftForDate(nextDate, actualShiftType, true) // 두 번째 날짜는 페어의 일부
      ])
      
      // 야간/비번 페어 처리 후 모달 닫기
      setSelectedDate(null)
      setSelectedHolidayName(null)
    } else {
      // 일반적인 경우
      await updateShiftForDate(selectedDate, actualShiftType)
    }

    setShowLeaveSelectionModal(false)
    setPendingShiftType(null)
  }

  const updateShiftForDate = async (date: Date, shiftType: ShiftType, isPartOfNightOffPair: boolean = false) => {
    setLoading(true)
    try {
      // 기존 시프트 확인 (휴가 복구를 위해)
      const existingSchedule = workSchedules.find(schedule => isSameDay(schedule.date, date))
      const previousShiftType = existingSchedule?.shiftType

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

        // 이전 휴가 복구 (이전에 휴가였다면)
        if (previousShiftType && getShiftDeductionAmount(previousShiftType, shiftType)) {
          await restoreLeaveUsage(previousShiftType, shiftType)
        }

        // 새로운 휴가 사용 시 프로필 업데이트 (야간/비번 페어의 첫 번째 날짜에서만)
        if (getShiftDeductionAmount(shiftType, previousShiftType) && !isPartOfNightOffPair) {
          if (shiftType === 'annual' || shiftType === 'annual_half' || shiftType === 'special' || 
              shiftType === 'sick' || shiftType === 'extra_half' || shiftType === 'holiday') {
            await updateUserProfileUsage(shiftType, shiftType)
          }
        }

        // 야간/비번 페어가 아닌 경우에만 모달 닫기
        if (!isPartOfNightOffPair) {
        setSelectedDate(null)
        setSelectedHolidayName(null)
        }
      }
    } catch (error) {
      console.error('Error updating shift:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateUserProfileUsage = async (shiftType: 'annual' | 'annual_half' | 'special' | 'sick' | 'extra_half' | 'holiday', currentShift: ShiftType) => {
    if (!userProfile) return

    const deduction = getShiftDeductionAmountWithNightOff(shiftType, currentShift)
    if (!deduction) return

    const updatedProfile = { ...userProfile }
    
    switch (deduction.type) {
      case 'annual':
        updatedProfile.usedAnnualLeave = userProfile.usedAnnualLeave + deduction.amount
        break
      case 'special':
        updatedProfile.usedSpecialLeave = userProfile.usedSpecialLeave + deduction.amount
        break
      case 'sick':
        updatedProfile.usedSickLeave = userProfile.usedSickLeave + deduction.amount
        break
      case 'extra':
        updatedProfile.usedExtraDaysOff = (userProfile.usedExtraDaysOff || 0) + deduction.amount
        break
    }

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedProfile),
      })

      if (response.ok) {
        setUserProfile(updatedProfile)
      }
    } catch (error) {
      console.error('Error updating profile usage:', error)
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
        setWorkSchedules(schedules.map((schedule: { id: string; date: string; shiftType: ShiftType }) => ({
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

  const handleModalClose = () => {
    setSelectedDate(null)
    setSelectedHolidayName(null)
  }

  if (!userProfile) {
    return <div className="flex justify-center items-center min-h-screen">로딩 중...</div>
  }

  return (
    <div className="p-4 min-h-screen bg-gray-100">
      <div className="overflow-hidden mx-auto max-w-md bg-white rounded-2xl shadow-lg">
        {/* 상단 정보 */}
        <div className="px-6 py-8 text-center bg-gradient-to-b from-blue-50 to-blue-100">
          <h1 className="mb-3 text-2xl font-bold text-gray-900">
            {userProfile.stationName}
          </h1>
          <p className="mb-4 text-xl font-semibold text-blue-700">
            {userProfile.teamName}
          </p>
          <div className="px-4 py-2 bg-white rounded-full shadow-sm">
            <p className="text-lg font-medium text-gray-700">
              오늘 근무: <span className="font-bold text-red-600">{getTodayShift()}</span>
            </p>
          </div>
        </div>

        {/* 달력 헤더 */}
        <div className="flex justify-between items-center px-6 py-4 bg-white border-b border-gray-100">
          <button 
            onClick={handlePrevMonth}
            className="p-3 rounded-full transition-colors hover:bg-blue-50 active:bg-blue-100"
          >
            <Image
              src="/Arrow left-circle.svg"
              alt="이전 월"
              width={28}
              height={28}
            />
          </button>
          
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            {format(currentDate, 'yyyy년 M월', { locale: ko })}
          </h2>
          
          <button 
            onClick={handleNextMonth}
            className="p-3 rounded-full transition-colors hover:bg-blue-50 active:bg-blue-100"
          >
            <Image
              src="/Arrow right-circle.svg"
              alt="다음 월"
              width={28}
              height={28}
            />
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
            <div 
              key={day} 
              className={`py-4 text-center text-base font-semibold ${
                index === 0 ? 'text-red-600' : 
                index === 6 ? 'text-blue-600' : 
                'text-gray-800'
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
            const isHoliday = isKoreanHoliday(date)

            return (
              <div
                key={date.toISOString()}
                className={`
                  relative h-20 border-r border-b border-gray-100 cursor-pointer
                  flex flex-col items-center justify-center transition-colors
                  ${isSelected ? 'bg-blue-100 border-blue-300' : ''}
                  ${isCurrentDateToday ? 'bg-yellow-100 border-yellow-300' : ''}
                  ${!isInCurrentMonth ? 'bg-gray-50 opacity-50' : 'hover:bg-gray-50 active:bg-gray-100'}
                `}
                onClick={() => handleDateClick(date)}
              >
                <span className={`text-lg font-semibold mb-1 ${
                  !isInCurrentMonth ? 'text-gray-300' :
                  isCurrentDateToday ? 'text-blue-700 font-bold' : 
                  isHoliday ? 'text-red-600 font-bold' : // 공휴일은 빨간색으로
                  index % 7 === 0 ? 'text-red-600' : 
                  index % 7 === 6 ? 'text-blue-600' : 
                  'text-gray-800'
                }`}>
                  {format(date, 'd')}
                </span>
                
                {shift && isInCurrentMonth && (
                  <Image
                    src={shiftConfig[shift.shiftType].icon}
                    alt={shiftConfig[shift.shiftType].label}
                    width={24}
                    height={24}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* 하단 정보 */}
        <div className="px-6 py-8 bg-gradient-to-b from-white to-gray-50">
          <div className="mb-6 space-y-4">
            <div className="flex justify-between items-center p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
              <span className="text-base font-medium text-gray-700">남은 연차</span>
              <span className="text-xl font-bold text-blue-600">{userProfile.totalAnnualLeave - userProfile.usedAnnualLeave}개</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
              <span className="text-base font-medium text-gray-700">남은 특별휴가</span>
              <span className="text-xl font-bold text-green-600">{userProfile.totalSpecialLeave - userProfile.usedSpecialLeave}개</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
              <span className="text-base font-medium text-gray-700">남은 병가</span>
              <span className="text-xl font-bold text-purple-600">{userProfile.totalSickLeave - userProfile.usedSickLeave}개</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
              <span className="text-base font-medium text-gray-700">이번달 추가휴무</span>
              <span className="text-xl font-bold text-orange-600">{getAdditionalDaysOff()}개</span>
            </div>
          </div>
          
          <div className="flex justify-center">
            <button
              onClick={handleRecordsClick}
              className="px-6 py-3 text-base font-semibold text-white bg-blue-600 rounded-xl shadow-md transition-colors hover:bg-blue-700 active:bg-blue-800"
            >
              기록보기
            </button>
          </div>
        </div>

        {/* 날짜 선택 시 시프트 선택 모달 */}
        {selectedDate && (
          <div className="flex absolute inset-0 z-50 justify-center items-center p-4 bg-black bg-opacity-50">
            <div className="p-6 w-full max-w-sm bg-white rounded-xl">
              <div className="mb-4 text-center">
                <h3 className="mb-2 text-lg font-bold">
                  {format(selectedDate, 'M월 d일 (E)', { locale: ko })}
                </h3>
                {selectedHolidayName && (
                  <div className="p-3 mb-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex justify-center items-center space-x-2">
                      <span className="text-2xl text-red-600">🎉</span>
                      <span className="text-sm font-medium text-red-700">
                        {selectedHolidayName}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-3 mb-4">
                {Object.entries(shiftConfig).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => handleShiftSelection(key as ShiftType)}
                    disabled={loading}
                    className="flex flex-col justify-center items-center p-3 rounded-lg border transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Image
                      src={config.icon}
                      alt={config.label}
                      width={20}
                      height={20}
                      className="mb-1"
                    />
                    <span className="text-xs font-medium">{config.label}</span>
                  </button>
                ))}
              </div>
              
              <button
                onClick={handleModalClose}
                className="px-4 py-2 w-full font-medium text-gray-700 bg-gray-100 rounded-lg transition-colors hover:bg-gray-200"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* 휴가 선택 모달 */}
        {showLeaveSelectionModal && pendingShiftType && selectedDate && (
          <div className="flex absolute inset-0 z-50 justify-center items-center p-4 bg-black bg-opacity-50">
            <div className="p-6 w-full max-w-sm bg-white rounded-xl">
              <div className="mb-4 text-center">
                <h3 className="mb-2 text-lg font-bold">
                  {format(selectedDate, 'M월 d일 (E)', { locale: ko })}
                </h3>
                <p className="text-sm text-gray-700">
                  {(() => {
                    const currentShift = getShiftForDate(selectedDate)
                    if (currentShift && (currentShift.shiftType === 'night' || currentShift.shiftType === 'off')) {
                      return '어떤 휴가를 사용하시겠습니까?'
                    }
                    return '휴가를 사용하시겠습니까?'
                  })()}
                </p>
              </div>
              
              {/* 남은 휴가 정보 표시 */}
              <div className="p-3 mb-4 bg-gray-50 rounded-lg">
                <div className="space-y-1 text-xs text-gray-600">
                  <p>남은 연차: <span className="font-medium">{userProfile.totalAnnualLeave - userProfile.usedAnnualLeave}개</span></p>
                  <p>남은 특별휴가: <span className="font-medium">{userProfile.totalSpecialLeave - userProfile.usedSpecialLeave}개</span></p>
                  <p>남은 병가: <span className="font-medium">{userProfile.totalSickLeave - userProfile.usedSickLeave}개</span></p>
                  <p>이번달 추가 휴무: <span className="font-medium">{getAdditionalDaysOff()}개</span></p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {(() => {
                  const currentShift = getShiftForDate(selectedDate)
                  const isNightOrOff = currentShift && (currentShift.shiftType === 'night' || currentShift.shiftType === 'off')
                  
                  // 야간/비번에서 휴가 사용 시 연차 vs 추가휴무 선택
                  if (isNightOrOff && (pendingShiftType === 'annual' || pendingShiftType === 'special' || pendingShiftType === 'sick' || pendingShiftType === 'holiday')) {
                    const availableExtra = getAdditionalDaysOff()
                    const hasAnnualLeave = (userProfile?.totalAnnualLeave || 0) - (userProfile?.usedAnnualLeave || 0) >= 2
                    const hasExtraLeave = availableExtra >= 2
                    
                    return (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => handleLeaveSelection(pendingShiftType === 'holiday' ? 'annual' : pendingShiftType as 'annual' | 'special' | 'sick')}
                          disabled={loading || !hasAnnualLeave}
                          className={`flex flex-col justify-center items-center p-3 rounded-lg border transition-colors disabled:opacity-50 ${
                            !hasAnnualLeave ? 'bg-gray-100 cursor-not-allowed' : 'hover:bg-gray-50'
                          }`}
                        >
                          <Image
                            src={pendingShiftType === 'holiday' ? '/연.svg' : pendingShiftType === 'annual' ? '/연.svg' : pendingShiftType === 'special' ? '/특.svg' : '/병.svg'}
                            alt={pendingShiftType === 'holiday' ? '연차' : pendingShiftType === 'annual' ? '연차' : pendingShiftType === 'special' ? '특별휴가' : '병가'}
                            width={20}
                            height={20}
                            className="mb-1"
                          />
                          <span className="text-xs font-medium">
                            {pendingShiftType === 'holiday' ? '연차' : pendingShiftType === 'annual' ? '연차' : pendingShiftType === 'special' ? '특별휴가' : '병가'} (2개)
                          </span>
                          {!hasAnnualLeave && (
                            <span className="mt-1 text-xs text-red-500">부족</span>
                          )}
                        </button>
                        <button
                          onClick={() => handleLeaveSelection('extra')}
                          disabled={loading || !hasExtraLeave}
                          className={`flex flex-col justify-center items-center p-3 rounded-lg border transition-colors disabled:opacity-50 ${
                            !hasExtraLeave ? 'bg-gray-100 cursor-not-allowed' : 'hover:bg-gray-50'
                          }`}
                        >
                          <Image
                            src="/휴.svg"
                            alt="추가휴무"
                            width={20}
                            height={20}
                            className="mb-1"
                          />
                          <span className="text-xs font-medium">추가휴무 (2개)</span>
                          {!hasExtraLeave && (
                            <span className="mt-1 text-xs text-red-500">부족</span>
                          )}
                        </button>
                        <div className="col-span-2 mt-2">
                          <p className="mb-2 text-xs text-center text-gray-600">또는 각각 다른 휴가 사용:</p>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleLeaveSelection('mixed_annual_extra')}
                              disabled={loading || !hasAnnualLeave || !hasExtraLeave}
                              className={`flex flex-col justify-center items-center p-2 rounded-lg border transition-colors disabled:opacity-50 text-xs ${
                                (!hasAnnualLeave || !hasExtraLeave) ? 'bg-gray-100 cursor-not-allowed' : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center space-x-1">
                                <Image src="/연.svg" alt="연차" width={16} height={16} />
                                <span>+</span>
                                <Image src="/휴.svg" alt="추가휴무" width={16} height={16} />
                              </div>
                              <span className="text-xs">연차+추가휴무</span>
                            </button>
                            <button
                              onClick={() => handleLeaveSelection('mixed_extra_annual')}
                              disabled={loading || !hasAnnualLeave || !hasExtraLeave}
                              className={`flex flex-col justify-center items-center p-2 rounded-lg border transition-colors disabled:opacity-50 text-xs ${
                                (!hasAnnualLeave || !hasExtraLeave) ? 'bg-gray-100 cursor-not-allowed' : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center space-x-1">
                                <Image src="/휴.svg" alt="추가휴무" width={16} height={16} />
                                <span>+</span>
                                <Image src="/연.svg" alt="연차" width={16} height={16} />
                              </div>
                              <span className="text-xs">추가휴무+연차</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  
                  // 일반적인 경우의 기존 로직
                  if (pendingShiftType === 'annual') {
                    return (
                      <>
                        <button
                          onClick={() => handleLeaveSelection('annual')}
                          disabled={loading}
                          className="flex flex-col justify-center items-center p-3 rounded-lg border transition-colors hover:bg-gray-50 disabled:opacity-50"
                        >
                          <Image src="/연.svg" alt="연가" width={20} height={20} className="mb-1" />
                          <span className="text-xs font-medium">연가</span>
                        </button>
                        <button
                          onClick={() => handleLeaveSelection('annual_half')}
                          disabled={loading}
                          className="flex flex-col justify-center items-center p-3 rounded-lg border transition-colors hover:bg-gray-50 disabled:opacity-50"
                        >
                          <Image src="/반.svg" alt="연반차" width={20} height={20} className="mb-1" />
                          <span className="text-xs font-medium">연반차</span>
                        </button>
                      </>
                    )
                  }
                  
                  if (pendingShiftType === 'special') {
                    return (
                      <button
                        onClick={() => handleLeaveSelection('special')}
                        disabled={loading}
                        className="flex flex-col justify-center items-center p-3 rounded-lg border transition-colors hover:bg-gray-50 disabled:opacity-50"
                      >
                        <Image src="/특.svg" alt="특별휴가" width={20} height={20} className="mb-1" />
                        <span className="text-xs font-medium">특별휴가</span>
                      </button>
                    )
                  }
                  
                  if (pendingShiftType === 'sick') {
                    return (
                      <button
                        onClick={() => handleLeaveSelection('sick')}
                        disabled={loading}
                        className="flex flex-col justify-center items-center p-3 rounded-lg border transition-colors hover:bg-gray-50 disabled:opacity-50"
                      >
                        <Image src="/병.svg" alt="병가" width={20} height={20} className="mb-1" />
                        <span className="text-xs font-medium">병가</span>
                      </button>
                    )
                  }
                  
                  if (pendingShiftType === 'extra_half') {
                    return (
                      <>
                        <button
                          onClick={() => handleLeaveSelection('extra')}
                          disabled={loading || getAdditionalDaysOff() < 0.5}
                          className={`flex flex-col justify-center items-center p-3 rounded-lg border transition-colors disabled:opacity-50 ${
                            getAdditionalDaysOff() < 0.5 ? 'bg-gray-100 cursor-not-allowed' : 'hover:bg-gray-50'
                          }`}
                        >
                          <Image src="/휴.svg" alt="추반차" width={20} height={20} className="mb-1" />
                          <span className="text-xs font-medium">추반차</span>
                          {getAdditionalDaysOff() < 0.5 && (
                            <span className="mt-1 text-xs text-red-500">사용 불가</span>
                          )}
                        </button>
                        {getAdditionalDaysOff() < 0.5 && (
                          <div className="col-span-2 p-2 bg-red-50 rounded-lg border border-red-200">
                            <p className="text-xs text-center text-red-700">
                              추가휴무가 부족합니다. (사용 가능: {getAdditionalDaysOff()}개)
                            </p>
                          </div>
                        )}
                      </>
                    )
                  }
                  
                  return null
                })()}
              </div>
              
              <button
                onClick={() => setShowLeaveSelectionModal(false)}
                className="px-4 py-2 w-full font-medium text-gray-700 bg-gray-100 rounded-lg transition-colors hover:bg-gray-200"
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