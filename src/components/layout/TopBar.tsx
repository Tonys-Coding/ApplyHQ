import { LogOut, User as UserIcon } from 'lucide-react'
import { useSessionStore } from '@/stores/useSessionStore'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface TopBarProps {
  title: string
  children?: React.ReactNode
}

export function TopBar({ title, children }: TopBarProps) {
  const user = useSessionStore((s) => s.user)
  const signOut = useSessionStore((s) => s.signOut)

  const name = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? ''
  const avatar = user?.user_metadata?.avatar_url as string | undefined

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
      <h1 className="text-sm font-semibold tracking-tight">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        {children}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 rounded-full">
              <Avatar className="size-8">
                {avatar && <AvatarImage src={avatar} alt={name} />}
                <AvatarFallback className="text-xs">
                  {name ? name.slice(0, 2).toUpperCase() : <UserIcon className="size-4" />}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
              {user?.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
