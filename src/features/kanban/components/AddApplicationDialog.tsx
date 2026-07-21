import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useJobStore } from '@/stores/useJobStore'
import { STAGES, STAGE_LABELS } from '@/features/kanban/lib/stages'
import type { ApplicationStage } from '@/types/domain'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function AddApplicationDialog() {
  const createApplication = useJobStore((s) => s.createApplication)
  const [open, setOpen] = useState(false)
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [location, setLocation] = useState('')
  const [salary, setSalary] = useState('')
  const [stage, setStage] = useState<ApplicationStage>('submitted')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!company.trim() || !role.trim()) return
    setBusy(true)
    await createApplication({
      company_name: company.trim(),
      role_title: role.trim(),
      job_location: location.trim() || null,
      salary_or_hourly_rate: salary.trim() || null,
      stage,
    })
    setBusy(false)
    setCompany('')
    setRole('')
    setLocation('')
    setSalary('')
    setStage('submitted')
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Add application
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Track a new application</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="role">Role</Label>
              <Input id="role" value={role} onChange={(e) => setRole(e.target.value)} required />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="salary">Salary / rate</Label>
              <Input id="salary" value={salary} onChange={(e) => setSalary(e.target.value)} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>Stage</Label>
              <Select value={stage} onValueChange={(v) => setStage(v as ApplicationStage)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STAGE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy || !company.trim() || !role.trim()}>
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
