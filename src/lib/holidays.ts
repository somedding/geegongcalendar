import { format, getDay, addDays } from 'date-fns'

export interface Holiday {
  date: Date
  name: string
}

// 대한민국 법정공휴일 계산
export function getKoreanHolidays(year: number): Holiday[] {
  const holidays: Holiday[] = []

  // 고정 공휴일
  holidays.push({ date: new Date(year, 0, 1), name: '신정' })
  holidays.push({ date: new Date(year, 2, 1), name: '삼일절' })
  holidays.push({ date: new Date(year, 4, 5), name: '어린이날' })
  holidays.push({ date: new Date(year, 5, 6), name: '현충일' })
  holidays.push({ date: new Date(year, 7, 15), name: '광복절' })
  holidays.push({ date: new Date(year, 9, 3), name: '개천절' })
  holidays.push({ date: new Date(year, 9, 9), name: '한글날' })
  holidays.push({ date: new Date(year, 11, 25), name: '크리스마스' })

  // 음력 공휴일 (근사치 계산)
  const lunarHolidays = getLunarHolidays(year)
  holidays.push(...lunarHolidays)

  // 대체공휴일 처리
  const holidaysWithSubstitutes = addSubstituteHolidays(holidays)

  return holidaysWithSubstitutes.sort((a, b) => a.date.getTime() - b.date.getTime())
}

// 음력 공휴일 근사치 계산 (실제로는 더 정확한 음력 변환이 필요)
function getLunarHolidays(year: number): Holiday[] {
  // 간단한 음력 공휴일 근사치 (실제로는 천문학적 계산 필요)
  const lunarHolidays: Holiday[] = []

  // 년도별 음력 공휴일 데이터 (근사치)
  const lunarData: { [key: number]: { seollal: Date[], chuseok: Date[], buddhasBirthday: Date } } = {
    2024: {
      seollal: [new Date(2024, 1, 9), new Date(2024, 1, 10), new Date(2024, 1, 11), new Date(2024, 1, 12)], // 설날 연휴
      chuseok: [new Date(2024, 8, 16), new Date(2024, 8, 17), new Date(2024, 8, 18)], // 추석 연휴
      buddhasBirthday: new Date(2024, 4, 15) // 부처님오신날
    },
    2025: {
      seollal: [new Date(2025, 0, 28), new Date(2025, 0, 29), new Date(2025, 0, 30)], // 설날 연휴
      chuseok: [new Date(2025, 9, 5), new Date(2025, 9, 6), new Date(2025, 9, 7)], // 추석 연휴
      buddhasBirthday: new Date(2025, 4, 5) // 부처님오신날
    }
  }

  if (lunarData[year]) {
    // 설날 연휴
    lunarData[year].seollal.forEach((date, index) => {
      if (index === 0) {
        lunarHolidays.push({ date, name: '설날 연휴 (설날 전날)' })
      } else if (index === 1) {
        lunarHolidays.push({ date, name: '설날' })
      } else if (index === 2) {
        lunarHolidays.push({ date, name: '설날 연휴 (설날 다음날)' })
      } else {
        lunarHolidays.push({ date, name: '설날 대체공휴일' })
      }
    })
    
    // 추석 연휴
    lunarData[year].chuseok.forEach((date, index) => {
      if (index === 0) {
        lunarHolidays.push({ date, name: '추석 연휴 (추석 전날)' })
      } else if (index === 1) {
        lunarHolidays.push({ date, name: '추석' })
      } else if (index === 2) {
        lunarHolidays.push({ date, name: '추석 연휴 (추석 다음날)' })
      }
    })
    
    // 부처님오신날
    lunarHolidays.push({ date: lunarData[year].buddhasBirthday, name: '부처님오신날' })
  }

  return lunarHolidays
}

// 대체공휴일 처리
function addSubstituteHolidays(holidays: Holiday[]): Holiday[] {
  const result = [...holidays]

  holidays.forEach(holiday => {
    const dayOfWeek = getDay(holiday.date) // 0: 일요일, 6: 토요일
    
    // 일요일인 공휴일은 다음 월요일이 대체공휴일
    if (dayOfWeek === 0) {
      const substitute = addDays(holiday.date, 1)
      // 월요일이 이미 공휴일이 아닌 경우에만 추가
      if (!isHoliday(substitute, holidays.map(h => h.date))) {
        result.push({ date: substitute, name: `${holiday.name} 대체공휴일` })
      }
    }
    
    // 토요일인 공휴일은 다음 월요일이 대체공휴일
    if (dayOfWeek === 6) {
      const substitute = addDays(holiday.date, 2)
      // 월요일이 이미 공휴일이 아닌 경우에만 추가
      if (!isHoliday(substitute, holidays.map(h => h.date))) {
        result.push({ date: substitute, name: `${holiday.name} 대체공휴일` })
      }
    }
  })

  return result
}

// 특정 날짜가 공휴일인지 확인
function isHoliday(date: Date, holidays: Date[]): boolean {
  return holidays.some(holiday => 
    format(holiday, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
  )
}

// 특정 월의 공휴일 개수 구하기
export function getMonthlyHolidayCount(year: number, month: number): number {
  const holidays = getKoreanHolidays(year)
  return holidays.filter(holiday => holiday.date.getFullYear() === year && holiday.date.getMonth() === month).length
}

// 특정 날짜가 공휴일인지 확인하는 공개 함수
export function isKoreanHoliday(date: Date): boolean {
  const holidays = getKoreanHolidays(date.getFullYear())
  return holidays.some(holiday => 
    format(holiday.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
  )
}

// 특정 날짜의 공휴일명 가져오기
export function getHolidayName(date: Date): string | null {
  const holidays = getKoreanHolidays(date.getFullYear())
  const holiday = holidays.find(holiday => 
    format(holiday.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
  )
  return holiday ? holiday.name : null
} 