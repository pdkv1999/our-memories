import { format, formatDistanceToNow, isSameDay, isSameMonth, isSameYear, subYears, parseISO, startOfMonth, getDaysInMonth } from 'date-fns'
import { Photo } from '../types'

export function formatPhotoDate(isoStr: string): string {
  try {
    return format(parseISO(isoStr), 'MMMM d, yyyy')
  } catch {
    return ''
  }
}

export function formatMonthYear(isoStr: string): string {
  try {
    return format(parseISO(isoStr), 'MMMM yyyy')
  } catch {
    return ''
  }
}

export function formatRelative(isoStr: string): string {
  try {
    return formatDistanceToNow(parseISO(isoStr), { addSuffix: true })
  } catch {
    return ''
  }
}

export function groupPhotosByMonth(photos: Photo[]): Map<string, Photo[]> {
  const map = new Map<string, Photo[]>()
  const sorted = [...photos].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
  for (const photo of sorted) {
    const key = photo.uploadedAt.slice(0, 7) // YYYY-MM
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(photo)
  }
  return map
}

export function groupPhotosByDay(photos: Photo[]): Map<string, Photo[]> {
  const map = new Map<string, Photo[]>()
  for (const photo of photos) {
    const key = photo.uploadedAt.slice(0, 10) // YYYY-MM-DD
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(photo)
  }
  return map
}

export function getOnThisDay(photos: Photo[]): Photo[] {
  const today = new Date()
  return photos.filter(p => {
    try {
      const d = parseISO(p.uploadedAt)
      return (
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate() &&
        !isSameYear(d, today)
      )
    } catch {
      return false
    }
  })
}

export function getYearsAgo(isoStr: string): number {
  try {
    const then = parseISO(isoStr)
    const now = new Date()
    return now.getFullYear() - then.getFullYear()
  } catch {
    return 0
  }
}

export function getMonthlyRecap(photos: Photo[]): Photo[] {
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return photos
    .filter(p => {
      try {
        const d = parseISO(p.uploadedAt)
        return isSameMonth(d, lastMonth) && isSameYear(d, lastMonth)
      } catch { return false }
    })
    .sort((a, b) => b.likes - a.likes)
}

export function getMonthCalendarDays(year: number, month: number): (string | null)[] {
  const firstDay = startOfMonth(new Date(year, month, 1)).getDay()
  const days = getDaysInMonth(new Date(year, month, 1))
  const result: (string | null)[] = Array(firstDay).fill(null)
  for (let d = 1; d <= days; d++) {
    result.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  return result
}

export function parseMonthKey(key: string): Date {
  return parseISO(key + '-01')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export { isSameDay, isSameMonth, isSameYear, subYears, format, parseISO }
