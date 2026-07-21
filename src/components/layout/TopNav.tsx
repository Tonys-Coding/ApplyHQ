import { NavLink, useLocation } from 'react-router-dom'
import { LogOut, User as UserIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LogoWordmark } from '@/components/brand/Logo'
import { useSessionStore } from '@/stores/useSessionStore'
import { useJobStore, selectGhostedCount } from '@/stores/useJobStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const NAV = [
  { to: '/board', label: 'Tracker' },
  { to: '/discover', label: 'Discover' },
  { to: '/resumes', label: 'Resumes' },
] as const

/**
 * Global top navigation — modeled on the TalentPulse reference: fixed bar, a
 * brand-red hairline underneath, logo left, links with a brand-red active
 * underline, account menu right.
 */
export function TopNav() {
  const user = useSessionStore((s) => s.user)
  const signOut = useSessionStore((s) => s.signOut)
  const applications = useJobStore((s) => s.applications)
  const ghosted = selectGhostedCount(applications)
  /* The editor lives under /workspace/:id but belongs to the Resumes tab. */
  const inWorkspace = useLocation().pathname.startsWith('/workspace')

  const name = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? ''
  const avatar = user?.user_metadata?.avatar_url as string | undefined

  return (
    <nav className="sticky top-0 z-50 border-b border-b-primary/70 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-8 px-4 md:px-8">
        <NavLink to="/board" className="shrink-0">
          <LogoWordmark />
        </NavLink>

        <div className="flex items-center gap-1 overflow-x-auto md:gap-4">
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'relative whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive || (to === '/resumes' && inWorkspace)
                    ? 'text-primary'
                    : 'text-muted-foreground hover:bg-primary/10 hover:text-primary',
                )
              }
            >
              {({ isActive }) => (
                <span className="inline-flex items-center gap-2">
                  {label}
                  {label === 'Tracker' && ghosted > 0 && (
                    <Badge
                      variant="secondary"
                      className="h-4 min-w-4 justify-center px-1 text-[10px] tabular-nums"
                    >
                      {ghosted}
                    </Badge>
                  )}
                  {isActive && (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
                  )}
                </span>
              )}
            </NavLink>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-9 rounded-full">
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
      </div>
    </nav>
  )
}
