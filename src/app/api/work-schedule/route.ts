import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { Session } from 'next-auth'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions) as Session | null
  
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month')
  
  if (!month) {
    return NextResponse.json({ error: '월 정보가 필요합니다.' }, { status: 400 })
  }

  try {
    const monthDate = parseISO(`${month}-01`)
    const startDate = startOfMonth(monthDate)
    const endDate = endOfMonth(monthDate)

    const workSchedules = await prisma.workSchedule.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    })

    return NextResponse.json(workSchedules)
  } catch (error) {
    console.error('Error fetching work schedules:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions) as Session | null
  
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 })
  }

  try {
    const { date, shiftType } = await request.json()
    
    if (!date || !shiftType) {
      return NextResponse.json({ error: '날짜와 근무 형태가 필요합니다.' }, { status: 400 })
    }

    const workSchedule = await prisma.workSchedule.upsert({
      where: {
        userId_date: {
          userId: session.user.id,
          date: new Date(date),
        },
      },
      update: {
        shiftType,
      },
      create: {
        userId: session.user.id,
        date: new Date(date),
        shiftType,
      },
    })

    return NextResponse.json(workSchedule)
  } catch (error) {
    console.error('Error updating work schedule:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions) as Session | null
  
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    
    if (!date) {
      return NextResponse.json({ error: '날짜 정보가 필요합니다.' }, { status: 400 })
    }

    await prisma.workSchedule.delete({
      where: {
        userId_date: {
          userId: session.user.id,
          date: new Date(date),
        },
      },
    })

    return NextResponse.json({ message: '근무 일정이 삭제되었습니다.' })
  } catch (error) {
    console.error('Error deleting work schedule:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
} 