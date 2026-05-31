export interface Comment {
  id: string
  text: string
  author: string
  createdAt: string
}

export interface Photo {
  id: string
  filename: string
  fullData: string
  thumbData: string
  width: number
  height: number
  aspectRatio: number
  size: number
  mimeType: string
  uploadedBy: string
  uploadedAt: string
  caption: string
  location: string
  tags: string[]
  albumIds: string[]
  likes: number
  liked: boolean
  comments: Comment[]
}

export interface Album {
  id: string
  name: string
  description: string
  type: 'auto' | 'custom'
  coverPhotoId: string
  photoIds: string[]
  createdAt: string
  isHidden: boolean
  isLocked: boolean
  passcode: string
  icon: string
  color: string
}

export interface UploadItem {
  id: string
  filename: string
  progress: number
  status: 'pending' | 'compressing' | 'done' | 'error'
  error?: string
  thumbData?: string
}

// ─── Chat ──────────────────────────────────────────────────────────────────

export interface MessageReaction {
  emoji: string
  by: string
}

export interface Message {
  id: string
  sender: string            // currentUser name
  content: string           // text for 'text'; data URL for 'audio'
  type: 'text' | 'photo' | 'audio'
  photoId?: string          // reference to a Photo in the gallery
  photoThumb?: string       // thumb snapshot at send time
  audioDuration?: number    // seconds
  timestamp: string
  read: boolean
  reactions: MessageReaction[]
  replyToId?: string        // id of a message being replied to
}

// ─── Calls ─────────────────────────────────────────────────────────────────

export type CallType = 'video' | 'voice'
export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended' | 'declined' | 'missed'

export interface CallRecord {
  id: string
  initiator: string
  type: CallType
  status: 'completed' | 'missed' | 'declined'
  startedAt: string
  duration: number          // seconds
}

export interface ActiveCall {
  id: string
  type: CallType
  status: CallStatus
  initiator: string
  startedAt: string | null
}

// ─── App ───────────────────────────────────────────────────────────────────

export type ViewMode = 'masonry' | 'grid' | 'timeline' | 'album' | 'calendar'
export type Page = 'gallery' | 'albums' | 'memories' | 'chat'
export type SortOrder = 'newest' | 'oldest' | 'most-liked'

export interface AppState {
  photos: Photo[]
  albums: Album[]
  messages: Message[]
  callRecords: CallRecord[]
  activeCall: ActiveCall | null
  currentPage: Page
  viewMode: ViewMode
  activeAlbumId: string | null
  lightboxPhotoId: string | null
  isUploadOpen: boolean
  currentUser: string
  searchQuery: string
  sortOrder: SortOrder
  selectedPhotoIds: string[]
  isSelecting: boolean
  uploadQueue: UploadItem[]
  slideshowActive: boolean
  slideshowInterval: number
  unreadCount: number
}
