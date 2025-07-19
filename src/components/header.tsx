'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { User, LogOut, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

export default function Header() {
  const { data: session } = useSession()
  const router = useRouter()

  const handleProfileClick = () => {
    router.push('/profile')
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' })
  }

  if (!session) return null

  return (
    <header className="w-full bg-white shadow-sm border-b border-gray-200 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
            <span className="text-white font-semibold text-sm">📅</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">교대 근무 달력</h1>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2">
            <span className="text-sm text-gray-600">안녕하세요,</span>
            <span className="text-sm font-medium text-gray-900">
              {session.user?.name}님
            </span>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={session.user?.image || ''} alt="Profile" />
                  <AvatarFallback className="bg-blue-600 text-white">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent className="w-48" align="end" forceMount>
              <DropdownMenuItem onClick={handleProfileClick}>
                <Settings className="mr-2 h-4 w-4" />
                <span>프로필 수정</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>로그아웃</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
} 