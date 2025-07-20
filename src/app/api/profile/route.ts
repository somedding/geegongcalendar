import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { Session } from 'next-auth'

const prisma = new PrismaClient()

export async function GET() {
  const session = await getServerSession(authOptions) as Session | null
  
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { profile: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 프로필이 없으면 기본 프로필 생성
    if (!user.profile) {
      const profile = await prisma.userProfile.create({
        data: {
          userId: user.id,
          stationName: '역 이름',
          teamName: 'A조',
          totalAnnualLeave: 15,
          usedAnnualLeave: 0,
          totalSickLeave: 30,
          usedSickLeave: 0,
          totalSpecialLeave: 5,
          usedSpecialLeave: 0,
          usedExtraDaysOff: 0
        }
      })
      
      return NextResponse.json({
        ...user,
        profile
      })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions) as Session | null
  
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { stationName, teamName, totalAnnualLeave, usedAnnualLeave, totalSickLeave, usedSickLeave, totalSpecialLeave, usedSpecialLeave, usedExtraDaysOff } = body

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const profile = await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: {
        stationName,
        teamName,
        totalAnnualLeave,
        usedAnnualLeave,
        totalSickLeave,
        usedSickLeave,
        totalSpecialLeave,
        usedSpecialLeave,
        usedExtraDaysOff
      },
      create: {
        userId: user.id,
        stationName: stationName || '역 이름',
        teamName: teamName || 'A조',
        totalAnnualLeave: totalAnnualLeave || 15,
        usedAnnualLeave: usedAnnualLeave || 0,
        totalSickLeave: totalSickLeave || 30,
        usedSickLeave: usedSickLeave || 0,
        totalSpecialLeave: totalSpecialLeave || 5,
        usedSpecialLeave: usedSpecialLeave || 0,
        usedExtraDaysOff: usedExtraDaysOff || 0
      }
    })

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 