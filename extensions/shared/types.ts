/** A single video progress entry sent from the extension to the API. */
export interface ProgressEntry {
  url: string
  title?: string
  progressSeconds: number
  durationSeconds?: number
  isCompleted: boolean
}

/** Video progress record returned from the API. */
export interface VideoProgress {
  url: string
  title?: string
  progressSeconds: number
  durationSeconds?: number
  isCompleted: boolean
  lastWatchedAt?: string
}

/** Union of all messages sent from popup / content scripts → background SW. */
export type BgMessage =
  | { type: 'LOGIN' }
  | { type: 'LOGOUT' }
  | { type: 'REGISTER'; username: string; email: string; password: string }
  | { type: 'FORGOT_PASSWORD'; email: string }
  | { type: 'GET_STATUS' }
  | { type: 'PROGRESS_UPDATE'; entry: ProgressEntry }
  | { type: 'QUERY_PROGRESS'; urls: string[] }
  | { type: 'DELETE_ACCOUNT' }
  | { type: 'TRIGGER_SYNC' }

export interface StatusResponse {
  isLoggedIn: boolean
  username?: string
  email?: string
}

export interface OkResponse {
  ok: boolean
  error?: string
}

export interface ProgressQueryResponse {
  progress: VideoProgress[]
}
