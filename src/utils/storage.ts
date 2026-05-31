import { AppState } from '../types'

const STORAGE_KEY = 'love-life-state'

export function saveState(state: Partial<AppState>): void {
  try {
    const existing = loadState()
    const merged = { ...existing, ...state }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  } catch (e) {
    console.warn('Storage save failed:', e)
  }
}

export function loadState(): Partial<AppState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Partial<AppState>
  } catch {
    return null
  }
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function getStorageUsage(): { used: number; total: number } {
  let used = 0
  try {
    for (const key of Object.keys(localStorage)) {
      used += (localStorage.getItem(key) || '').length * 2
    }
  } catch { /* ignore */ }
  return { used, total: 10 * 1024 * 1024 }
}
