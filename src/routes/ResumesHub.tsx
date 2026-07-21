import { useEffect, useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useResumeHubStore } from '@/stores/useResumeHubStore'
import { ResumeCard } from '@/components/ResumeCard'
import { CreateResumeModal } from '@/components/CreateResumeModal'
import { ResumeUpload } from '@/components/ResumeUpload'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type SortKey = 'edited' | 'title'

export function ResumesHub() {
  const resumes = useResumeHubStore((s) => s.resumes)
  const loading = useResumeHubStore((s) => s.loading)
  const fetchResumes = useResumeHubStore((s) => s.fetchResumes)

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('edited')
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    void fetchResumes()
  }, [fetchResumes])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? resumes.filter(
          (r) =>
            r.version_name.toLowerCase().includes(q) ||
            (r.format_settings?.header?.full_name ?? '').toLowerCase().includes(q),
        )
      : resumes
    return [...filtered].sort((a, b) =>
      sort === 'title'
        ? a.version_name.localeCompare(b.version_name)
        : +new Date(b.updated_at) - +new Date(a.updated_at),
    )
  }, [resumes, query, sort])

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-8">
        <PageHeader title="Resumes" subtitle="Create and manage your resumes.">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search resumes…"
              className="w-44 pl-9 sm:w-56"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="edited">Last edited</SelectItem>
              <SelectItem value="title">Title</SelectItem>
            </SelectContent>
          </Select>
        </PageHeader>

        {loading && resumes.length === 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="rounded-xl" style={{ aspectRatio: '8.5 / 12' }} />
            ))}
          </div>
        ) : resumes.length === 0 ? (
          <ResumeUpload onComplete={() => void fetchResumes()} />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-foreground"
              style={{ aspectRatio: '8.5 / 12' }}
            >
              <span className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_15px_rgba(225,29,72,0.35)]">
                <Plus className="size-6" />
              </span>
              <span className="text-sm font-semibold">Create a new resume</span>
            </button>

            {visible.map((resume) => (
              <ResumeCard key={resume.id} resume={resume} />
            ))}
          </div>
        )}
      </div>

      <CreateResumeModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
