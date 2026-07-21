/*
 * Router state handed to /workspace/:id by the creation wizard. When
 * autoTailor is set the workspace fires one tailoring pass on arrival, using
 * jobContext as the target description; the state is cleared afterwards so a
 * refresh never re-runs (and re-bills) the model.
 */
export interface WorkspaceInitState {
  jobContext?: string
  applicationId?: string | null
  autoTailor?: boolean
  jobTitle?: string
  company?: string
}
