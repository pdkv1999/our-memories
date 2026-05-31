import React, { useCallback, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { AppProvider, useApp } from './context/AppContext'
import Navbar from './components/Navbar'
import MasonryGrid from './components/MasonryGrid'
import AlbumsPage from './components/AlbumsPage'
import MemoriesPage from './components/MemoriesPage'
import Lightbox from './components/Lightbox'
import UploadModal from './components/UploadModal'
import ChatPage from './components/Chat/ChatPage'
import { CallScreen, IncomingCallBanner } from './components/Call/CallInterface'
import { useIncomingCallSignal } from './hooks/useWebRTC'
import { ActiveCall, CallType } from './types'

function GalleryPage() {
  const { state } = useApp()
  return (
    <div className="page-enter">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Our Gallery</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {state.photos.length} memories shared together
        </p>
      </div>
      <MasonryGrid />
    </div>
  )
}

function AppContent() {
  const { state, dispatch, saveCallRecord } = useApp()
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null)
  const [incomingCallOffer, setIncomingCallOffer] = useState<{ offer: RTCSessionDescriptionInit; callId: string; callType: CallType } | null>(null)

  // Listen for incoming calls from other tab
  useIncomingCallSignal(state.currentUser, useCallback((signal) => {
    // Only react if there's no active call and no already-incoming call
    if (!activeCall && !incomingCallOffer) {
      setIncomingCallOffer({
        offer: signal.sdp,
        callId: signal.callId,
        callType: signal.callType as CallType,
      })
    }
  }, [activeCall, incomingCallOffer]))

  function startCall(type: CallType) {
    const call: ActiveCall = {
      id: crypto.randomUUID(),
      type,
      status: 'calling',
      initiator: state.currentUser,
      startedAt: new Date().toISOString(),
    }
    setActiveCall(call)
    dispatch({ type: 'SET_ACTIVE_CALL', call })
  }

  function acceptIncoming() {
    if (!incomingCallOffer) return
    const otherUser = state.currentUser === 'Dileep' ? 'Siri' : 'Dileep'
    const call: ActiveCall = {
      id: incomingCallOffer.callId,
      type: incomingCallOffer.callType,
      status: 'connected',
      initiator: otherUser,
      startedAt: new Date().toISOString(),
    }
    setActiveCall(call)
    dispatch({ type: 'SET_ACTIVE_CALL', call })
    setIncomingCallOffer(null)
  }

  function declineIncoming() {
    setIncomingCallOffer(null)
  }

  function endCall() {
    if (activeCall) {
      saveCallRecord({
        id: activeCall.id,
        initiator: activeCall.initiator,
        type: activeCall.type,
        status: activeCall.status === 'connected' ? 'completed' : 'missed',
        startedAt: activeCall.startedAt ?? new Date().toISOString(),
        duration: activeCall.startedAt
          ? Math.floor((Date.now() - new Date(activeCall.startedAt).getTime()) / 1000)
          : 0,
      })
    }
    setActiveCall(null)
    dispatch({ type: 'SET_ACTIVE_CALL', call: null })
  }

  const isChat = state.currentPage === 'chat'

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar />

      {/* Page content */}
      {isChat ? (
        <ChatPage
          onStartCall={startCall}
          onBack={() => dispatch({ type: 'SET_PAGE', page: 'gallery' })}
        />
      ) : (
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 pt-24 pb-10">
          <AnimatePresence mode="wait">
            {state.currentPage === 'gallery' && <GalleryPage key="gallery" />}
            {state.currentPage === 'albums' && <AlbumsPage key="albums" />}
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
        {incomingCallOffer && !activeCall && (
          <IncomingCallBanner
            key="incoming"
            callerName={state.currentUser === 'Dileep' ? 'Siri' : 'Dileep'}
            callType={incomingCallOffer.callType}
            onAccept={acceptIncoming}
            onDecline={declineIncoming}
          />
        )}
      </AnimatePresence>

      {/* Active call screen */}
      <AnimatePresence>
        {activeCall && (
          <CallScreen
            key={activeCall.id}
            call={activeCall}
            incomingOffer={activeCall.initiator !== state.currentUser && incomingCallOffer ? incomingCallOffer.offer : undefined}
            onEnd={endCall}
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
