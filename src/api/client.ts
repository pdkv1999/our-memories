/**
 * Typed API client — thin fetch wrapper for all backend endpoints.
 * All functions throw on non-2xx responses so callers can catch errors.
 */

import { Photo, Album, Message, CallRecord } from '../types'

const BASE = '/api'

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

const get  = <T>(path: string)              => req<T>('GET',    path)
const post = <T>(path: string, body: unknown) => req<T>('POST',   path, body)
const patch = <T>(path: string, body: unknown) => req<T>('PATCH',  path, body)
const del  = <T>(path: string, body?: unknown) => req<T>('DELETE', path, body)

// ─── Photos ────────────────────────────────────────────────────────────────

export const photosApi = {
  list: ()                  => get<Photo[]>('/photos'),
  create: (p: Partial<Photo>) => post<Photo>('/photos', p),
  update: (id: string, p: Partial<Photo>) => patch<{ ok: boolean }>(`/photos/${id}`, p),
  remove: (ids: string[])   => del<{ ok: boolean }>('/photos', { ids }),
  like:   (id: string)      => post<{ liked: boolean; likes: number }>(`/photos/${id}/like`, {}),
  addComment: (photoId: string, text: string, author: string) =>
    post<{ id: string; text: string; author: string; createdAt: string; photoId: string }>(
      `/photos/${photoId}/comments`, { text, author }
    ),
  deleteComment: (photoId: string, commentId: string) =>
    del<{ ok: boolean }>(`/photos/${photoId}/comments/${commentId}`),
}

// ─── Albums ────────────────────────────────────────────────────────────────

export const albumsApi = {
  list: () => get<Album[]>('/albums'),
  create: (a: Partial<Album>) => post<Album>('/albums', a),
  update: (id: string, a: Partial<Album>) => patch<{ ok: boolean }>(`/albums/${id}`, a),
  remove: (id: string) => del<{ ok: boolean }>(`/albums/${id}`),
  addPhoto:    (albumId: string, photoId: string) => post<{ ok: boolean }>(`/albums/${albumId}/photos`, { photoId }),
  removePhoto: (albumId: string, photoId: string) => del<{ ok: boolean }>(`/albums/${albumId}/photos/${photoId}`),
}

// ─── Messages ──────────────────────────────────────────────────────────────

export const messagesApi = {
  list: () => get<Message[]>('/messages'),
  send: (m: Partial<Message>) => post<Message>('/messages', m),
  remove: (id: string) => del<{ ok: boolean }>(`/messages/${id}`),
  react: (id: string, emoji: string, by: string) =>
    post<{ reactions: { emoji: string; by: string }[] }>(`/messages/${id}/react`, { emoji, by }),
  markRead: (currentUser: string) =>
    patch<{ ok: boolean }>('/messages/read', { currentUser }),
}

// ─── Calls ─────────────────────────────────────────────────────────────────

export const callsApi = {
  list: () => get<CallRecord[]>('/calls'),
  save: (c: Partial<CallRecord>) => post<CallRecord>('/calls', c),
}

// ─── Call Signals ──────────────────────────────────────────────────────────

export interface CallSignal {
  id: string
  from_user: string
  to_user: string
  call_type: string
  status: 'calling' | 'accepted' | 'declined' | 'ended' | 'missed'
  created_at: string
  updated_at: string
}

export const signalsApi = {
  get:    (user: string)                    => get<CallSignal | null>(`/signals?user=${encodeURIComponent(user)}`),
  start:  (fromUser: string, toUser: string, callType: string) =>
    post<CallSignal>('/signals', { fromUser, toUser, callType }),
  update: (id: string, status: string)     => patch<CallSignal>(`/signals/${id}`, { status }),
}

// ─── Health ────────────────────────────────────────────────────────────────

export async function checkHealth(): Promise<boolean> {
  try {
    await get('/health')
    return true
  } catch {
    return false
  }
}
