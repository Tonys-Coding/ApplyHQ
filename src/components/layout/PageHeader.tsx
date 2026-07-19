import { cn } from '@/lib/utils'

/**
 * Slim in-content page heading. The global TopNav owns navigation and account;
 * this just titles the page and hosts page-scoped actions (filters, quota pill).
 */
export function PageHeader({
  title,
  subtitle,
  children,
  className,
}: {
  title: string
  subtitle?: string
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="min-w-0">
        <h1 className="font-heading text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
    </div>
  )
}
