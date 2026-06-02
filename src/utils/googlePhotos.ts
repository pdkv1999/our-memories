const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

const PHOTOS_SCOPE = 'https://www.googleapis.com/auth/photoslibrary.readonly'

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (cfg: {
            client_id: string
            scope: string
            callback: (r: { access_token?: string; error?: string }) => void
          }) => { requestAccessToken: (o?: { prompt: string }) => void }
        }
      }
    }
  }
}

export interface GPhoto {
  id: string
  filename: string
  baseUrl: string        // temporary URL — append =w800-h800 or =d to use
  mimeType: string
  width: number
  height: number
  creationTime: string
  description?: string
}

// Request a short-lived OAuth token for Google Photos
export function requestPhotosToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!CLIENT_ID) { reject(new Error('VITE_GOOGLE_CLIENT_ID not configured.')); return }
    if (!window.google?.accounts?.oauth2) { reject(new Error('Google script not loaded yet.')); return }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: PHOTOS_SCOPE,
      callback: (r) => r.access_token ? resolve(r.access_token) : reject(new Error(r.error ?? 'Auth failed')),
    })
    client.requestAccessToken({ prompt: '' })
  })
}

// Fetch one page of media items from Google Photos
export async function listGooglePhotos(
  token: string,
  pageToken?: string,
): Promise<{ photos: GPhoto[]; nextPageToken?: string }> {
  const url = new URL('https://photoslibrary.googleapis.com/v1/mediaItems')
  url.searchParams.set('pageSize', '60')
  if (pageToken) url.searchParams.set('pageToken', pageToken)

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `HTTP ${res.status}`)
  }

  const data = await res.json()
  const photos: GPhoto[] = (data.mediaItems ?? [])
    .filter((m: any) => m.mimeType?.startsWith('image/'))
    .map((m: any) => ({
      id: m.id,
      filename: m.filename,
      baseUrl: m.baseUrl,
      mimeType: m.mimeType,
      width:  Number(m.mediaMetadata?.width  ?? 0),
      height: Number(m.mediaMetadata?.height ?? 0),
      creationTime: m.mediaMetadata?.creationTime ?? new Date().toISOString(),
      description: m.description,
    }))

  return { photos, nextPageToken: data.nextPageToken }
}

// Download a Google Photo as a File object (for our compression pipeline)
export async function downloadGPhoto(photo: GPhoto): Promise<File> {
  // =w1600 gives a max-1600px resized version — plenty for display
  const res = await fetch(`${photo.baseUrl}=w1600`, { mode: 'cors' })
  if (!res.ok) throw new Error(`Failed to download ${photo.filename}`)
  const blob = await res.blob()
  return new File([blob], photo.filename, { type: photo.mimeType, lastModified: new Date(photo.creationTime).getTime() })
}
