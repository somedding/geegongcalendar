import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다' }, { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    // 사용자 정보 업데이트
    const updatedUser = await prisma.user.update({
      where: {
        email: session.user.email
      },
      data: {
        name: name || session.user.name
      }
    })

    return NextResponse.json({
      message: '프로필이 성공적으로 업데이트되었습니다',
      user: updatedUser
    })
  } catch (error) {
    console.error('프로필 업데이트 오류:', error)
    return NextResponse.json({ error: '프로필 업데이트 중 오류가 발생했습니다' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email
      }
    })

    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('프로필 조회 오류:', error)
    return NextResponse.json({ error: '프로필 조회 중 오류가 발생했습니다' }, { status: 500 })
  }
} 