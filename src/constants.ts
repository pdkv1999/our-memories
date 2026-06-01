// Single source of truth for the two users
export const EMAIL_MAP: Record<string, string> = {
  'pdkv1999@gmail.com':               'Dileep',
  'potturibhavanisireesha@gmail.com':  'Siri',
}

// Given one person's name, return the other's
export function getPartnerName(currentUser: string): string {
  const names = Object.values(EMAIL_MAP)
  return names.find(n => n !== currentUser) ?? 'Partner'
}
