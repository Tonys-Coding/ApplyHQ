/**
 * Shape of the Postgres schema, in the layout supabase-js expects.
 *
 * Hand-written to match supabase/migrations/*.sql so the client is typed before
 * the project exists. Once your Supabase project is live, replace this file
 * with the generated version and it will stay in sync automatically:
 *
 *   bunx supabase login
 *   bunx supabase gen types typescript --project-id <ref> > src/types/database.ts
 *
 * The JSONB columns are typed against src/types/domain.ts rather than `Json`,
 * which the generator will NOT do for you — reapply those four overrides after
 * regenerating.
 */

import type {
  ApplicationStage,
  EducationEntry,
  FormatSettings,
  TechnicalEntry,
  WorkEntry,
} from './domain'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          email: string | null
          phone: string | null
          location: string | null
          headline: string | null
          github_url: string | null
          linkedin_url: string | null
          portfolio_url: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          email?: string | null
          phone?: string | null
          location?: string | null
          headline?: string | null
          github_url?: string | null
          linkedin_url?: string | null
          portfolio_url?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }

      resumes: {
        Row: {
          id: string
          user_id: string
          version_name: string
          education: EducationEntry[]
          technical_projects_and_experience: TechnicalEntry[]
          other_work_history: WorkEntry[]
          skills_and_keywords: string[]
          format_settings: FormatSettings
          pdf_storage_path: string | null
          is_master: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          version_name: string
          education?: EducationEntry[]
          technical_projects_and_experience?: TechnicalEntry[]
          other_work_history?: WorkEntry[]
          skills_and_keywords?: string[]
          format_settings?: FormatSettings
          pdf_storage_path?: string | null
          is_master?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['resumes']['Insert']>
        Relationships: []
      }

      job_applications: {
        Row: {
          id: string
          user_id: string
          company_name: string
          company_logo: string | null
          role_title: string
          stage: ApplicationStage
          salary_or_hourly_rate: string | null
          job_location: string | null
          job_description_text: string | null
          application_url: string | null
          notes: string | null
          resume_id: string | null
          board_position: number
          applied_at: string | null
          created_at: string
          last_updated_at: string
          stage_changed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_name: string
          company_logo?: string | null
          role_title: string
          stage?: ApplicationStage
          salary_or_hourly_rate?: string | null
          job_location?: string | null
          job_description_text?: string | null
          application_url?: string | null
          notes?: string | null
          resume_id?: string | null
          board_position?: number
          applied_at?: string | null
          created_at?: string
          // last_updated_at / stage_changed_at are trigger-owned — never send them.
        }
        Update: Partial<Database['public']['Tables']['job_applications']['Insert']>
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: {
      application_stage: ApplicationStage
    }
    CompositeTypes: Record<never, never>
  }
}

// Convenience aliases — import these, not the deep index chains.
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Resume = Database['public']['Tables']['resumes']['Row']
export type JobApplication = Database['public']['Tables']['job_applications']['Row']

export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ResumeInsert = Database['public']['Tables']['resumes']['Insert']
export type JobApplicationInsert =
  Database['public']['Tables']['job_applications']['Insert']

export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type ResumeUpdate = Database['public']['Tables']['resumes']['Update']
export type JobApplicationUpdate =
  Database['public']['Tables']['job_applications']['Update']
