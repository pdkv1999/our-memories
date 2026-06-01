import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef, useState } from 'react'
import {
  AppState, Photo, Album, Comment, UploadItem, ViewMode, Page, SortOrder,
  Message, MessageReaction, CallRecord, ActiveCall, CallType, UserSession
} from '../types'
import { compressImage, isSupported } from '../utils/compression'
import { saveState, loadState } from '../utils/storage'
import { photosApi, albumsApi, messagesApi, callsApi, checkHealth } from '../api/client'

type Action =
  | { type: 'SET_PHOTOS'; photos: Photo[] }
  | { type: 'ADD_PHOTO'; photo: Photo }
  | { type: 'UPDATE_PHOTO'; id: string; updates: Partial<Photo> }
  | { type: 'DELETE_PHOTOS'; ids: string[] }
  | { type: 'LIKE_PHOTO'; id: string }
  | { type: 'ADD_COMMENT'; photoId: string; comment: Comment }
  | { type: 'DELETE_COMMENT'; photoId: string; commentId: string }
  | { type: 'ADD_ALBUM'; album: Album }
  | { type: 'UPDATE_ALBUM'; id: string; updates: Partial<Album> }
  | { type: 'DELETE_ALBUM'; id: string }
  | { type: 'ADD_PHOTO_TO_ALBUM'; photoId: string; albumId: string }
  | { type: 'REMOVE_PHOTO_FROM_ALBUM'; photoId: string; albumId: string }
  | { type: 'SET_ALBUM_COVER'; albumId: string; photoId: string }
  | { type: 'SET_PAGE'; page: Page }
  | { type: 'SET_VIEW_MODE'; mode: ViewMode }
  | { type: 'SET_ACTIVE_ALBUM'; id: string | null }
  | { type: 'OPEN_LIGHTBOX'; photoId: string }
  | { type: 'CLOSE_LIGHTBOX' }
  | { type: 'TOGGLE_UPLOAD' }
  | { type: 'CLOSE_UPLOAD' }
  | { type: 'SET_USER'; user: string }
  | { type: 'SET_SEARCH'; query: string }
  | { type: 'SET_SORT'; order: SortOrder }
  | { type: 'TOGGLE_SELECT'; photoId: string }
  | { type: 'SET_SELECTING'; value: boolean }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SELECT_ALL'; ids: string[] }
  | { type: 'SET_UPLOAD_QUEUE'; queue: UploadItem[] }
  | { type: 'UPDATE_UPLOAD_ITEM'; id: string; updates: Partial<UploadItem> }
  | { type: 'TOGGLE_SLIDESHOW' }
  | { type: 'SET_SLIDESHOW_INTERVAL'; interval: number }
  | { type: 'LOAD_STATE'; state: Partial<AppState> }
  // Chat
  | { type: 'SEND_MESSAGE'; message: Message }
  | { type: 'DELETE_MESSAGE'; id: string }
  | { type: 'REACT_MESSAGE'; messageId: string; reaction: MessageReaction }
  | { type: 'MARK_READ' }
  | { type: 'SET_UNREAD'; count: number }
  // Calls
  | { type: 'SET_ACTIVE_CALL'; call: ActiveCall | null }
  | { type: 'UPDATE_CALL_STATUS'; status: ActiveCall['status'] }
  | { type: 'ADD_CALL_RECORD'; record: CallRecord }
  | { type: 'LOGIN'; name: string; email: string }
  | { type: 'LOGOUT' }

const SESSION_KEY = 'love-life-session'

function loadSession(): UserSession | null {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') } catch { return null }
}
function saveSession(s: UserSession) { localStorage.setItem(SESSION_KEY, JSON.stringify(s)) }
function clearSession() { localStorage.removeItem(SESSION_KEY) }

const defaultState: AppState = {
  photos: [],
  albums: [],
  messages: [],
  callRecords: [],
  activeCall: null,
  currentPage: 'gallery',
  viewMode: 'masonry',
  activeAlbumId: null,
  lightboxPhotoId: null,
  isUploadOpen: false,
  currentUser: '',
  userEmail: '',
  isLoggedIn: false,
  searchQuery: '',
  sortOrder: 'newest',
  selectedPhotoIds: [],
  isSelecting: false,
  uploadQueue: [],
  slideshowActive: false,
  slideshowInterval: 3000,
  unreadCount: 0,
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...state, ...action.state }

    case 'ADD_PHOTO':
      return { ...state, photos: [action.photo, ...state.photos] }

    case 'SET_PHOTOS':
      return { ...state, photos: action.photos }

    case 'UPDATE_PHOTO':
      return {
        ...state,
        photos: state.photos.map(p => p.id === action.id ? { ...p, ...action.updates } : p),
      }

    case 'DELETE_PHOTOS': {
      const ids = new Set(action.ids)
      return {
        ...state,
        photos: state.photos.filter(p => !ids.has(p.id)),
        albums: state.albums.map(a => ({ ...a, photoIds: a.photoIds.filter(id => !ids.has(id)) })),
        selectedPhotoIds: [],
        isSelecting: false,
        lightboxPhotoId: ids.has(state.lightboxPhotoId ?? '') ? null : state.lightboxPhotoId,
      }
    }

    case 'LIKE_PHOTO':
      return {
        ...state,
        photos: state.photos.map(p =>
          p.id === action.id
            ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
            : p
        ),
      }

    case 'ADD_COMMENT':
      return {
        ...state,
        photos: state.photos.map(p =>
          p.id === action.photoId
            ? { ...p, comments: [...p.comments, action.comment] }
            : p
        ),
      }

    case 'DELETE_COMMENT':
      return {
        ...state,
        photos: state.photos.map(p =>
          p.id === action.photoId
            ? { ...p, comments: p.comments.filter(c => c.id !== action.commentId) }
            : p
        ),
      }

    case 'ADD_ALBUM':
      return { ...state, albums: [action.album, ...state.albums] }

    case 'UPDATE_ALBUM':
      return {
        ...state,
        albums: state.albums.map(a => a.id === action.id ? { ...a, ...action.updates } : a),
      }

    case 'DELETE_ALBUM': {
      const album = state.albums.find(a => a.id === action.id)
      return {
        ...state,
        albums: state.albums.filter(a => a.id !== action.id),
        photos: album ? state.photos.map(p => ({
          ...p, albumIds: p.albumIds.filter(id => id !== action.id)
        })) : state.photos,
        activeAlbumId: state.activeAlbumId === action.id ? null : state.activeAlbumId,
      }
    }

    case 'ADD_PHOTO_TO_ALBUM':
      return {
        ...state,
        photos: state.photos.map(p =>
          p.id === action.photoId && !p.albumIds.includes(action.albumId)
            ? { ...p, albumIds: [...p.albumIds, action.albumId] }
            : p
        ),
        albums: state.albums.map(a =>
          a.id === action.albumId && !a.photoIds.includes(action.photoId)
            ? { ...a, photoIds: [...a.photoIds, action.photoId] }
            : a
        ),
      }

    case 'REMOVE_PHOTO_FROM_ALBUM':
      return {
        ...state,
        photos: state.photos.map(p =>
          p.id === action.photoId
            ? { ...p, albumIds: p.albumIds.filter(id => id !== action.albumId) }
            : p
        ),
        albums: state.albums.map(a =>
          a.id === action.albumId
            ? { ...a, photoIds: a.photoIds.filter(id => id !== action.photoId) }
            : a
        ),
      }

    case 'SET_ALBUM_COVER':
      return {
        ...state,
        albums: state.albums.map(a =>
          a.id === action.albumId ? { ...a, coverPhotoId: action.photoId } : a
        ),
      }

    case 'SET_PAGE':
      return { ...state, currentPage: action.page, activeAlbumId: null }

    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.mode }

    case 'SET_ACTIVE_ALBUM':
      return { ...state, activeAlbumId: action.id, currentPage: 'albums' }

    case 'OPEN_LIGHTBOX':
      return { ...state, lightboxPhotoId: action.photoId }

    case 'CLOSE_LIGHTBOX':
      return { ...state, lightboxPhotoId: null, slideshowActive: false }

    case 'TOGGLE_UPLOAD':
      return { ...state, isUploadOpen: !state.isUploadOpen }

    case 'CLOSE_UPLOAD':
      return { ...state, isUploadOpen: false, uploadQueue: [] }

    case 'SET_USER':
      return { ...state, currentUser: action.user }

    case 'SET_SEARCH':
      return { ...state, searchQuery: action.query }

    case 'SET_SORT':
      return { ...state, sortOrder: action.order }

    case 'TOGGLE_SELECT':
      return {
        ...state,
        selectedPhotoIds: state.selectedPhotoIds.includes(action.photoId)
          ? state.selectedPhotoIds.filter(id => id !== action.photoId)
          : [...state.selectedPhotoIds, action.photoId],
      }

    case 'SET_SELECTING':
      return { ...state, isSelecting: action.value, selectedPhotoIds: action.value ? state.selectedPhotoIds : [] }

    case 'CLEAR_SELECTION':
      return { ...state, selectedPhotoIds: [], isSelecting: false }

    case 'SELECT_ALL':
      return { ...state, selectedPhotoIds: action.ids }

    case 'SET_UPLOAD_QUEUE':
      return { ...state, uploadQueue: action.queue }

    case 'UPDATE_UPLOAD_ITEM':
      return {
        ...state,
        uploadQueue: state.uploadQueue.map(u => u.id === action.id ? { ...u, ...action.updates } : u),
      }

    case 'TOGGLE_SLIDESHOW':
      return { ...state, slideshowActive: !state.slideshowActive }

    case 'SET_SLIDESHOW_INTERVAL':
      return { ...state, slideshowInterval: action.interval }

    // Chat
    case 'SEND_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.message],
        unreadCount: action.message.sender !== state.currentUser && state.currentPage !== 'chat'
          ? state.unreadCount + 1
          : state.unreadCount,
      }

    case 'DELETE_MESSAGE':
      return { ...state, messages: state.messages.filter(m => m.id !== action.id) }

    case 'REACT_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(m => {
          if (m.id !== action.messageId) return m
          const existing = m.reactions.findIndex(r => r.by === action.reaction.by && r.emoji === action.reaction.emoji)
          if (existing >= 0) {
            return { ...m, reactions: m.reactions.filter((_, i) => i !== existing) }
          }
          // Replace any reaction from same user with different emoji
          const filtered = m.reactions.filter(r => r.by !== action.reaction.by)
          return { ...m, reactions: [...filtered, action.reaction] }
        }),
      }

    case 'MARK_READ':
      return {
        ...state,
        messages: state.messages.map(m =>
          m.sender !== state.currentUser ? { ...m, read: true } : m
        ),
        unreadCount: 0,
      }

    case 'SET_UNREAD':
      return { ...state, unreadCount: action.count }

    // Calls
    case 'SET_ACTIVE_CALL':
      return { ...state, activeCall: action.call }

    case 'UPDATE_CALL_STATUS':
      return {
        ...state,
        activeCall: state.activeCall ? { ...state.activeCall, status: action.status } : null,
      }

    case 'ADD_CALL_RECORD':
      return { ...state, callRecords: [action.record, ...state.callRecords] }

    case 'LOGIN':
      return { ...state, currentUser: action.name, userEmail: action.email, isLoggedIn: true }

    case 'LOGOUT':
      return { ...defaultState, isLoggedIn: false }

    default:
      return state
  }
}

interface AppContextValue {
  state: AppState
  dispatch: React.Dispatch<Action>
  apiAvailable: boolean
  login: (name: string, email: string) => void
  logout: () => void
  uploadFiles: (files: File[]) => Promise<void>
  deletePhotos: (ids: string[]) => void
  likePhoto: (id: string) => void
  addComment: (photoId: string, text: string) => void
  deleteComment: (photoId: string, commentId: string) => void
  createAlbum: (name: string, description: string, icon: string, color: string) => Promise<Album>
  getFilteredPhotos: () => Photo[]
  getAlbumPhotos: (albumId: string) => Photo[]
  navigatePhoto: (direction: 'prev' | 'next') => void
  sendMessage: (content: string, type: Message['type'], photoId?: string, photoThumb?: string, audioDuration?: number, replyToId?: string) => Promise<void>
  reactToMessage: (messageId: string, emoji: string) => void
  saveCallRecord: (record: CallRecord) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, defaultState)
  const [apiAvailable, setApiAvailable] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>()

  // ── Bootstrap: restore session + load data ───────────────────────────────
  useEffect(() => {
    async function boot() {
      // Restore login session before loading data
      const session = loadSession()
      if (session) {
        dispatch({ type: 'LOGIN', name: session.name, email: session.email })
      }

      const ok = await checkHealth()
      setApiAvailable(ok)

      if (ok) {
        try {
          const [photos, albums, messages, calls] = await Promise.all([
            photosApi.list(),
            albumsApi.list(),
            messagesApi.list(),
            callsApi.list(),
          ])
          const normalised = photos.map((p: any) => ({
            ...p, comments: p.comments ?? [], albumIds: p.albumIds ?? [],
          }))
          const savedSort = loadState()?.sortOrder ?? 'newest'
          dispatch({
            type: 'LOAD_STATE', state: {
              photos: normalised,
              albums: albums.map((a: any) => ({ ...a, photoIds: a.photoIds ?? [] })),
              messages: messages.map((m: any) => ({ ...m, read: m.isRead, reactions: m.reactions ?? [] })),
              callRecords: calls,
              sortOrder: savedSort,
            },
          })
          return
        } catch (e) {
          console.warn('API load failed, falling back to localStorage:', e)
        }
      }

      // localStorage fallback
      const saved = loadState()
      if (saved) {
        dispatch({
          type: 'LOAD_STATE', state: {
            photos:      saved.photos ?? [],
            albums:      saved.albums ?? [],
            messages:    saved.messages ?? [],
            callRecords: saved.callRecords ?? [],
            sortOrder:   saved.sortOrder ?? 'newest',
          },
        })
      }
    }
    boot()
  }, [])

  // ── Persist preferences (not photos/messages — those go to API) ───────────
  useEffect(() => {
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveState({ currentUser: state.currentUser, sortOrder: state.sortOrder })
      // When API is unavailable, also persist data locally
      if (!apiAvailable) {
        saveState({
          photos: state.photos,
          albums: state.albums,
          messages: state.messages,
          callRecords: state.callRecords,
        })
      }
    }, 500)
    return () => clearTimeout(saveTimerRef.current)
  }, [state.currentUser, state.sortOrder, state.photos, state.albums, state.messages, state.callRecords, apiAvailable])

  // Body scroll lock
  useEffect(() => {
    const locked = state.lightboxPhotoId !== null || state.isUploadOpen
    document.body.classList.toggle('modal-open', locked)
  }, [state.lightboxPhotoId, state.isUploadOpen])

  // Mark messages read when navigating to chat
  useEffect(() => {
    if (state.currentPage === 'chat') {
      dispatch({ type: 'MARK_READ' })
      if (apiAvailable) {
        messagesApi.markRead(state.currentUser).catch(() => {})
      }
    }
  }, [state.currentPage, state.messages.length, apiAvailable, state.currentUser])

  // ── Actions ───────────────────────────────────────────────────────────────

  const uploadFiles = useCallback(async (files: File[]) => {
    const validFiles = files.filter(isSupported)
    if (!validFiles.length) return

    const queue: UploadItem[] = validFiles.map(f => ({
      id: crypto.randomUUID(),
      filename: f.name,
      progress: 0,
      status: 'pending',
    }))
    dispatch({ type: 'SET_UPLOAD_QUEUE', queue })

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]
      const item = queue[i]
      dispatch({ type: 'UPDATE_UPLOAD_ITEM', id: item.id, updates: { status: 'compressing', progress: 30 } })
      try {
        const compressed = await compressImage(file)
        dispatch({ type: 'UPDATE_UPLOAD_ITEM', id: item.id, updates: { progress: 80, thumbData: compressed.thumbData } })

        const photoPayload = {
          filename:    file.name,
          fullData:    compressed.fullData,
          thumbData:   compressed.thumbData,
          width:       compressed.width,
          height:      compressed.height,
          aspectRatio: compressed.width / compressed.height,
          size:        file.size,
          mimeType:    file.type,
          uploadedBy:  state.currentUser,
        }

        let photo: Photo
        if (apiAvailable) {
          const created = await photosApi.create(photoPayload)
          photo = { ...created, comments: [], albumIds: [] }
        } else {
          photo = {
            id: crypto.randomUUID(),
            ...photoPayload,
            uploadedAt: new Date().toISOString(),
            caption: '', location: '', tags: [], albumIds: [],
            likes: 0, liked: false, comments: [],
          }
        }

        dispatch({ type: 'ADD_PHOTO', photo })
        dispatch({ type: 'UPDATE_UPLOAD_ITEM', id: item.id, updates: { status: 'done', progress: 100 } })
      } catch (err) {
        console.error('Upload failed:', err)
        dispatch({ type: 'UPDATE_UPLOAD_ITEM', id: item.id, updates: { status: 'error', error: 'Failed to process image' } })
      }
    }
  }, [state.currentUser, apiAvailable])

  const deletePhotos = useCallback((ids: string[]) => {
    dispatch({ type: 'DELETE_PHOTOS', ids })
    if (apiAvailable) photosApi.remove(ids).catch(console.error)
  }, [apiAvailable])

  const likePhoto = useCallback((id: string) => {
    dispatch({ type: 'LIKE_PHOTO', id })
    if (apiAvailable) photosApi.like(id).catch(console.error)
  }, [apiAvailable])

  const addComment = useCallback((photoId: string, text: string) => {
    if (apiAvailable) {
      photosApi.addComment(photoId, text, state.currentUser).then(comment => {
        const c: Comment = { id: comment.id, text: comment.text, author: comment.author, createdAt: comment.createdAt }
        dispatch({ type: 'ADD_COMMENT', photoId, comment: c })
      }).catch(console.error)
    } else {
      const comment: Comment = {
        id: crypto.randomUUID(), text,
        author: state.currentUser,
        createdAt: new Date().toISOString(),
      }
      dispatch({ type: 'ADD_COMMENT', photoId, comment })
    }
  }, [state.currentUser, apiAvailable])

  const deleteComment = useCallback((photoId: string, commentId: string) => {
    dispatch({ type: 'DELETE_COMMENT', photoId, commentId })
    if (apiAvailable) photosApi.deleteComment(photoId, commentId).catch(console.error)
  }, [apiAvailable])

  const createAlbum = useCallback(async (name: string, description: string, icon: string, color: string): Promise<Album> => {
    if (apiAvailable) {
      const created = await albumsApi.create({ name, description, icon, color })
      const album: Album = { ...created, photoIds: created.photoIds ?? [] }
      dispatch({ type: 'ADD_ALBUM', album })
      return album
    }
    const album: Album = {
      id: crypto.randomUUID(), name, description, type: 'custom',
      coverPhotoId: '', photoIds: [], createdAt: new Date().toISOString(),
      isHidden: false, isLocked: false, passcode: '', icon, color,
    }
    dispatch({ type: 'ADD_ALBUM', album })
    return album
  }, [apiAvailable])

  const getFilteredPhotos = useCallback((): Photo[] => {
    let photos = [...state.photos]
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase()
      photos = photos.filter(p =>
        p.filename.toLowerCase().includes(q) ||
        p.caption.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      )
    }
    switch (state.sortOrder) {
      case 'oldest': return photos.sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt))
      case 'most-liked': return photos.sort((a, b) => b.likes - a.likes)
      default: return photos.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
    }
  }, [state.photos, state.searchQuery, state.sortOrder])

  const getAlbumPhotos = useCallback((albumId: string): Photo[] => {
    const album = state.albums.find(a => a.id === albumId)
    if (!album) return []
    const idSet = new Set(album.photoIds)
    return state.photos.filter(p => idSet.has(p.id))
  }, [state.albums, state.photos])

  const navigatePhoto = useCallback((direction: 'prev' | 'next') => {
    if (!state.lightboxPhotoId) return
    const photos = getFilteredPhotos()
    const idx = photos.findIndex(p => p.id === state.lightboxPhotoId)
    if (idx === -1) return
    const next = direction === 'next' ? (idx + 1) % photos.length : (idx - 1 + photos.length) % photos.length
    dispatch({ type: 'OPEN_LIGHTBOX', photoId: photos[next].id })
  }, [state.lightboxPhotoId, getFilteredPhotos])

  const sendMessage = useCallback(async (
    content: string, type: Message['type'],
    photoId?: string, photoThumb?: string,
    audioDuration?: number, replyToId?: string,
  ) => {
    if (apiAvailable) {
      const created = await messagesApi.send({
        sender: state.currentUser, content, type,
        photoId, photoThumb, audioDuration, replyToId,
      })
      const msg: Message = {
        ...created,
        read: (created as any).isRead ?? false,
        reactions: (created as any).reactions ?? [],
        timestamp: created.timestamp ?? new Date().toISOString(),
      }
      dispatch({ type: 'SEND_MESSAGE', message: msg })
    } else {
      const msg: Message = {
        id: crypto.randomUUID(),
        sender: state.currentUser,
        content, type, photoId, photoThumb, audioDuration, replyToId,
        timestamp: new Date().toISOString(),
        read: false, reactions: [],
      }
      dispatch({ type: 'SEND_MESSAGE', message: msg })
    }
  }, [state.currentUser, apiAvailable])

  const reactToMessage = useCallback((messageId: string, emoji: string) => {
    dispatch({ type: 'REACT_MESSAGE', messageId, reaction: { emoji, by: state.currentUser } })
    if (apiAvailable) {
      messagesApi.react(messageId, emoji, state.currentUser).catch(console.error)
    }
  }, [state.currentUser, apiAvailable])

  const login = useCallback((name: string, email: string) => {
    saveSession({ name, email })
    dispatch({ type: 'LOGIN', name, email })
  }, [])

  const logout = useCallback(() => {
    clearSession()
    dispatch({ type: 'LOGOUT' })
  }, [])

  const saveCallRecord = useCallback(async (record: CallRecord) => {
    dispatch({ type: 'ADD_CALL_RECORD', record })
    if (apiAvailable) {
      callsApi.save(record).catch(console.error)
    }
  }, [apiAvailable])

  return (
    <AppContext.Provider value={{
      state, dispatch, apiAvailable, login, logout,
      uploadFiles, deletePhotos, likePhoto,
      addComment, deleteComment, createAlbum, getFilteredPhotos,
      getAlbumPhotos, navigatePhoto, sendMessage, reactToMessage, saveCallRecord,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
