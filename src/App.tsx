import React, { useCallback, useState, useEffect, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { AppProvider, useApp } from './context/AppContext'
import Navbar from './components/Navbar'
import LoginPage from './components/LoginPage'
import MasonryGrid from './components/MasonryGrid'
import AlbumsPage from './components/AlbumsPage'
import MemoriesPage from './components/MemoriesPage'
import Lightbox from './components/Lightbox'
import UploadModal from './components/UploadModal'
import ChatPage from './components/Chat/ChatPage'
import { CallScreen, IncomingCallBanner } from './components/Call/CallInterface'
import { signalsApi, CallSignal } from './api/client'
import { CallType } from './types'
import { requestGoogleToken, createGoogleMeetEvent, isGoogleConfigured } from './utils/googleMeet'
import { getEmailByName } from './constants'

function GalleryPage() {
  const { state } = useApp()
  return (
    <div className="page-enter">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Our Gallery</h1>
        <p className="text-sm text-gray-500 mt-0.5">{state.photos.length} memories shared together</p>
      </div>
      <MasonryGrid />
    </div>
  )
}

function AppContent() {
  const { state, dispatch, login, saveCallRecord, partnerName, apiAvailable } = useApp()

  const [activeSignal,   setActiveSignal]   = useState<CallSignal | null>(null)
  const [incomingSignal, setIncomingSignal] = useState<CallSignal | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval>>()

  // Poll for incoming calls every 3 s
  useEffect(() => {
    if (!state.isLoggedIn || !apiAvailable) return

    async function poll() {
      try {
        const signal = await signalsApi.get(state.currentUser)
        if (!signal) {
          // No active signal — clear any stale incoming banner
          setIncomingSignal(null)
          return
        }
        // Show incoming banner if someone else is calling us and we haven't acted yet
        if (signal.to_user === state.currentUser && signal.status === 'calling' && !activeSignal) {
          setIncomingSignal(signal)
        }
        // If we initiated and status changed to ended/declined externally, clean up
        if (signal.from_user === state.currentUser &&
            (signal.status === 'ended' || signal.status === 'declined' || signal.status === 'missed')) {
          setActiveSignal(null)
        }
      } catch { /* ignore */ }
    }

    pollRef.current = setInterval(poll, 3000)
    return () => clearInterval(pollRef.current)
  }, [state.isLoggedIn, apiAvailable, state.currentUser, activeSignal])

  async function startCall(type: CallType) {
    try {
      let roomName: string

      if (isGoogleConfigured()) {
        // OAuth → Calendar API → real Google Meet link + email notification to partner
        const calleeEmail = getEmailByName(partnerName)
        const token = await requestGoogleToken()
        const meetUrl = await createGoogleMeetEvent(token, state.currentUser, calleeEmail)
        // meetUrl looks like https://meet.google.com/abc-defg-xyz — extract the code
        roomName = meetUrl.replace('https://meet.google.com/', '')
      } else {
        // Fallback: generate a random Meet-format code (no email notification)
        const letters = 'abcdefghijklmnopqrstuvwxyz'
        const r = (n: number) => Array.from({ length: n }, () => letters[Math.floor(Math.random() * letters.length)]).join('')
        roomName = `${r(3)}-${r(4)}-${r(3)}`
      }

      const signal = await signalsApi.start(state.currentUser, partnerName, type, roomName)
      setActiveSignal(signal)
      setIncomingSignal(null)
    } catch (err: any) {
      console.error('Failed to start call:', err)
      alert(`Could not start call: ${err.message}`)
    }
  }

  async function acceptIncoming() {
    if (!incomingSignal) return
    await signalsApi.update(incomingSignal.id, 'accepted').catch(() => {})
    setActiveSignal({ ...incomingSignal, status: 'accepted' })
    setIncomingSignal(null)
  }

  async function declineIncoming() {
    if (!incomingSignal) return
    await signalsApi.update(incomingSignal.id, 'declined').catch(() => {})
    setIncomingSignal(null)
  }

  function handleCallEnd(duration: number) {
    if (activeSignal) {
      saveCallRecord({
        id: activeSignal.id,
        initiator: activeSignal.from_user,
        type: activeSignal.call_type as CallType,
        status: activeSignal.status === 'accepted' || duration > 0 ? 'completed' : 'missed',
        startedAt: activeSignal.created_at,
        duration,
      })
    }
    setActiveSignal(null)
    setIncomingSignal(null)
  }

  if (!state.isLoggedIn) return <LoginPage onLogin={login} />

  const isChat = state.currentPage === 'chat'

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />

      {isChat ? (
        <div>
          <ChatPage
            onStartCall={startCall}
            onBack={() => dispatch({ type: 'SET_PAGE', page: 'gallery' })}
          />
        </div>
      ) : (
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 pt-24 pb-10">
          <AnimatePresence mode="wait">
            {state.currentPage === 'gallery'  && <GalleryPage key="gallery" />}
            {state.currentPage === 'albums'   && <AlbumsPage  key="albums"  />}
            {state.currentPage === 'memories' && <MemoriesPage key="memories" />}
          </AnimatePresence>
        </main>
      )}


      {/* Lightbox */}
      <AnimatePresence>
        {state.lightboxPhotoId && <Lightbox key="lightbox" />}
      </AnimatePresence>

      {/* Upload modal */}
      <AnimatePresence>
        {state.isUploadOpen && <UploadModal key="upload" />}
      </AnimatePresence>

      {/* Incoming call banner */}
      <AnimatePresence>
        {incomingSignal && !activeSignal && (
          <IncomingCallBanner
            key="incoming"
            signal={incomingSignal}
            onAccept={acceptIncoming}
            onDecline={declineIncoming}
          />
        )}
      </AnimatePresence>

      {/* Active call screen */}
      <AnimatePresence>
        {activeSignal && (
          <CallScreen
            key={activeSignal.id}
            signal={activeSignal}
            onEnd={handleCallEnd}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
