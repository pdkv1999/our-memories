// Google OAuth + Calendar API to create a real Google Meet link
// and notify the other person via their Gmail.

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (cfg: {
            client_id: string
            scope: string
            callback: (resp: { access_token?: string; error?: string }) => void
          }) => { requestAccessToken: (opts?: { prompt: string }) => void }
        }
      }
    }
  }
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const SCOPE = 'https://www.googleapis.com/auth/calendar.events'

export function isGoogleConfigured(): boolean {
  return !!CLIENT_ID
}

// Opens the Google OAuth consent popup and returns a short-lived access token
export function requestGoogleToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!CLIENT_ID) {
      reject(new Error('VITE_GOOGLE_CLIENT_ID is not set. See setup instructions.'))
      return
    }
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services script not loaded yet. Try again in a moment.'))
      return
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error || !resp.access_token) reject(new Error(resp.error ?? 'No token'))
        else resolve(resp.access_token)
      },
    })
    // prompt: '' uses a cached token silently if already authorised
    client.requestAccessToken({ prompt: '' })
  })
}

// Creates a Google Calendar event with a Meet link and invites the callee by email.
// Returns the Meet URL (e.g. https://meet.google.com/abc-defg-xyz)
export async function createGoogleMeetEvent(
  accessToken: string,
  callerName: string,
  calleeEmail: string,
): Promise<string> {
  const now = new Date()
  const end = new Date(now.getTime() + 60 * 60_000) // 1-hour window

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events' +
    '?conferenceDataVersion=1&sendUpdates=all',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: `📞 ${callerName} is calling you`,
        description: 'Click the Google Meet link to join the call from Our Memories app 💕',
        start: { dateTime: now.toISOString() },
        end:   { dateTime: end.toISOString() },
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        // Adding callee as attendee triggers the email notification
        attendees: [{ email: calleeEmail, responseStatus: 'needsAction' }],
        reminders: { useDefault: false },
        guestsCanModifyEvent: false,
        guestsCanInviteOthers: false,
      }),
    },
  )

  const data = await res.json()

  if (!data.hangoutLink) {
    const msg = data.error?.message ?? JSON.stringify(data)
    throw new Error(`Google Calendar API error: ${msg}`)
  }

  return data.hangoutLink as string
}
