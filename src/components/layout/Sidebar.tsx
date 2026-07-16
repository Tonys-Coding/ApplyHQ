import { NavLink } from 'react-router-dom'
import { Briefcase, Compass, FileText, Ghost } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useJobStore, selectGhostedCount } from '@/stores/useJobStore'
import { Badge } from '@/components/ui/badge'

const NAV = [
  { to: '/board', label: 'Tracker', icon: Briefcase },
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/workspace', label: 'Resume', icon: FileText },
] as const

export function Sidebar() {
  const applications = useJobStore((s) => s.applications)
  const ghosted = selectGhostedCount(applications)

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r bg-sidebar">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
          <Briefcase className="size-4" />
        </div>
        <span className="font-semibold tracking-tight">ApplyHQ</span>
      </div>

      <nav className="flex flex-col gap-1 p-2">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                isActive && 'bg-accent text-accent-foreground',
              )
            }
          >
            <Icon className="size-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {ghosted > 0 && (
        <div className="mx-2 mt-auto mb-2 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
          <Ghost className="size-4 shrink-0 text-amber-600 dark:text-amber-500" />
          <span className="text-muted-foreground">Going quiet</span>
          <Badge variant="secondary" className="ml-auto tabular-nums">
            {ghosted}
          </Badge>
        </div>
      )}
    </aside>
  )
}
