import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PhoneOff, Phone, PhoneMissed, Video } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { signalsApi, CallSignal } from '../../api/client'
import { CallType, CallRecord } from '../../types'

// ─── Incoming call banner ─────────────────────────────────────────────────

export function IncomingCallBanner({ signal, onAccept, onDecline }: {
  signal: CallSignal; onAccept: () => void; onDecline: () => void
}) {
  return (
    <motion.div
      initial={{ y: -90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -90, opacity: 0 }}
      className="fixed top-20 inset-x-0 z-[500] flex justify-center pointer-events-none px-4"
    >
      <div className="pointer-events-auto bg-white rounded-3xl shadow-2xl border border-gray-100 p-4 flex items-center gap-4 max-w-sm w-full">
        <div className="relative shrink-0">
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute inset-0 rounded-full bg-green-200"
          />
          <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-bold text-xl">
            {signal.from_user[0]}
          </div>
        </div>
        <div className="flex-1">
          <p className="font-bold text-gray-900">{signal.from_user}</p>
          <p className="text-sm text-gray-400">
            Incoming {signal.call_type === 'video' ? '📹 video' : '📞 voice'} call…
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onDecline}
            className="w-11 h-11 rounded-full bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-200 transition-colors">
            <PhoneOff size={18} />
          </button>
          <button onClick={onAccept}
            className="w-11 h-11 rounded-full bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200 transition-colors">
            <Phone size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Active call screen (Jitsi-powered) ──────────────────────────────────

export function CallScreen({ signal, onEnd }: {
  signal: CallSignal; onEnd: (dur: number) => void
}) {
  const { state } = useApp()
  const startRef  = useRef(Date.now())
  const pollRef   = useRef<ReturnType<typeof setInterval>>()
  const doneRef   = useRef(false)

  const isCallee  = signal.to_user === state.currentUser
  const otherName = isCallee ? signal.from_user : signal.to_user
  const isVideo   = signal.call_type === 'video'

  // Build Jitsi URL — no prejoin, display name pre-filled, toolbar minimal
  const jitsiUrl = [
    `https://meet.jit.si/${encodeURIComponent(signal.room_name)}`,
    `#config.prejoinPageEnabled=false`,
    `&config.startWithAudioMuted=false`,
    `&config.startWithVideoMuted=${isVideo ? 'false' : 'true'}`,
    `&config.disableDeepLinking=true`,
    `&config.enableWelcomePage=false`,
    `&config.toolbarButtons=${encodeURIComponent(JSON.stringify(
      isVideo
        ? ['microphone','camera','hangup','tileview','fullscreen']
        : ['microphone','hangup','fullscreen']
    ))}`,
    `&config.hideConferenceSubject=true`,
    `&config.requireDisplayName=false`,
    `&userInfo.displayName=${encodeURIComponent(state.currentUser)}`,
  ].join('')

  function finish() {
    if (doneRef.current) return
    doneRef.current = true
    clearInterval(pollRef.current)
    onEnd(Math.floor((Date.now() - startRef.current) / 1000))
  }

  async function handleEnd() {
    await signalsApi.update(signal.id, 'ended').catch(() => {})
    finish()
  }

  // Poll for remote party ending the call
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const latest = await signalsApi.getById(signal.id)
        if (!latest) { finish(); return }
        const s = latest.status
        if (s === 'ended' || s === 'declined' || s === 'missed') finish()
      } catch { /* ignore */ }
    }, 2000)

    // Auto-miss after 45 s if other side never joined
    const missTimer = setTimeout(async () => {
      const latest = await signalsApi.getById(signal.id).catch(() => null)
      if (latest?.status === 'calling') {
        await signalsApi.update(signal.id, 'missed').catch(() => {})
        finish()
      }
    }, 45_000)

    return () => { clearInterval(pollRef.current); clearTimeout(missTimer) }
  }, [])

  return (
    <div className="fixed inset-0 z-[600] bg-gray-950 flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 pt-12 pb-3 bg-black/60 backdrop-blur-sm shrink-0">
        <div>
          <p className="text-white font-semibold text-lg">{otherName}</p>
          <p className="text-white/50 text-xs">{isVideo ? '📹 Video call' : '📞 Voice call'}</p>
        </div>
        <button
          onClick={handleEnd}
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 active:scale-95 transition-all text-white font-semibold text-sm px-5 py-2.5 rounded-full shadow-lg"
        >
          <PhoneOff size={16} />
          End call
        </button>
      </div>

      {/* Jitsi iframe — handles ALL audio, video, controls */}
      <iframe
        src={jitsiUrl}
        allow="camera; microphone; fullscreen; display-capture; autoplay; speaker-selection"
        className="flex-1 w-full border-0 bg-gray-900"
        title="Call"
      />
    </div>
  )
}

// ─── Call history item ────────────────────────────────────────────────────

export function CallHistoryItem({ record }: { record: CallRecord }) {
  const missed   = record.status === 'missed'
  const declined = record.status === 'declined'
  const fmt = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s/60)}m ${s%60}s`
  return (
    <div className="flex items-center gap-3 py-2.5 px-1">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${missed||declined ? 'bg-red-50 text-red-400' : 'bg-green-50 text-green-500'}`}>
        {record.type === 'video' ? <Video size={18}/> : <Phone size={18}/>}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-800 capitalize">
          {record.type} call {missed ? '(missed)' : declined ? '(declined)' : ''}
        </p>
        <p className="text-xs text-gray-400">
          {new Date(record.startedAt).toLocaleDateString()} · {record.initiator}
          {record.duration > 0 && ` · ${fmt(record.duration)}`}
        </p>
      </div>
      {(missed||declined) && <PhoneMissed size={16} className="text-red-300"/>}
    </div>
  )
}
