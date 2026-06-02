import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { PhoneOff, Phone, PhoneMissed, Video, ExternalLink } from 'lucide-react'
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
            Incoming {signal.call_type === 'video' ? '📹 video' : '📞 voice'} call via Google Meet
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

// ─── Call timer ───────────────────────────────────────────────────────────

function CallTimer() {
  const [s, setS] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setS(n => n + 1), 1000)
    return () => clearInterval(t)
  }, [])
  return <span className="tabular-nums">{Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}</span>
}

// ─── Active call screen ───────────────────────────────────────────────────

export function CallScreen({ signal, onEnd }: {
  signal: CallSignal; onEnd: (dur: number) => void
}) {
  const { state, partnerName } = useApp()
  const [joined,  setJoined]  = useState(false)
  const startRef  = useRef(Date.now())
  const pollRef   = useRef<ReturnType<typeof setInterval>>()
  const doneRef   = useRef(false)

  const isCallee  = signal.to_user === state.currentUser
  const otherName = isCallee ? signal.from_user : signal.to_user
  const isVideo   = signal.call_type === 'video'
  const meetUrl   = signal.room_name  // always a real Google Meet URL

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

  function joinMeet() {
    window.open(meetUrl, '_blank', 'noopener,noreferrer')
    setJoined(true)
  }

  // Poll for the other side ending the call
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const latest = await signalsApi.getById(signal.id)
        if (!latest || ['ended', 'declined', 'missed'].includes(latest.status)) finish()
      } catch { /* ignore */ }
    }, 2000)

    // Auto-miss after 45 s if nobody joined
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
    <div className="fixed inset-0 z-[600] flex flex-col items-center justify-between py-20 px-6"
      style={{ background: 'linear-gradient(160deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>

      {/* Subtle animated rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        {[1, 2, 3, 4].map(i => (
          <motion.div key={i} className="absolute rounded-full border border-white/5"
            animate={{ scale: [1, 2.5], opacity: [0.3, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.7, ease: 'easeOut' }}
            style={{ width: 120, height: 120 }}
          />
        ))}
      </div>

      {/* Partner info */}
      <div className="relative flex flex-col items-center gap-5 z-10">
        <div className="relative">
          {!joined && [1, 2, 3].map(i => (
            <motion.div key={i} className="absolute inset-0 rounded-full bg-rose-500/20"
              animate={{ scale: [1, 1 + i * 0.25], opacity: [0.4, 0] }}
              transition={{ repeat: Infinity, duration: 2.5, delay: i * 0.6, ease: 'easeOut' }}
            />
          ))}
          <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-rose-400 to-violet-500 flex items-center justify-center text-white text-6xl font-bold shadow-2xl ring-4 ring-white/10">
            {otherName[0]}
          </div>
          {/* Google Meet badge */}
          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg p-1.5">
            <svg viewBox="0 0 192 192" className="w-full h-full">
              <path d="M96 56c-22.1 0-40 17.9-40 40H16c0-44.2 35.8-80 80-80v80H56c0-22.1 17.9-40 40-40z" fill="#fbbc04"/>
              <path d="M136 96c0-22.1-17.9-40-40-40V16c44.2 0 80 35.8 80 80h-80c0 22.1-17.9 40-40 40z" fill="#0f9d58" transform="rotate(90 96 96)"/>
              <path d="M96 136c22.1 0 40-17.9 40-40h40c0 44.2-35.8 80-80 80v-80h40c0 22.1-17.9 40-40 40z" fill="#4285f4" transform="rotate(180 96 96)"/>
              <path d="M56 96c0 22.1 17.9 40 40 40v40c-44.2 0-80-35.8-80-80h80c0-22.1 17.9-40 40-40z" fill="#ea4335" transform="rotate(270 96 96)"/>
            </svg>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-white text-3xl font-bold tracking-tight">{otherName}</h2>
          <p className="mt-2 text-sm">
            {joined ? (
              <span className="flex items-center justify-center gap-2 text-green-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                In call · <CallTimer />
              </span>
            ) : (
              <span className="text-white/40">
                {isCallee ? `${signal.from_user} is calling you…` : `Calling ${otherName}…`}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Join button */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }} className="w-full max-w-xs z-10">
        <button onClick={joinMeet}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 active:scale-95 text-gray-900 font-bold py-4 rounded-2xl shadow-xl transition-all text-base">
          <ExternalLink size={18} className="text-[#4285f4]" />
          {joined ? 'Rejoin on Google Meet' : `${isVideo ? 'Start Video' : 'Start Voice'} on Google Meet`}
        </button>
        {!joined && (
          <p className="text-center text-white/30 text-xs mt-3">
            Opens Google Meet · {isCallee ? `${signal.from_user} invited you` : `${partnerName} was notified by email`}
          </p>
        )}
      </motion.div>

      {/* End call */}
      <div className="flex flex-col items-center gap-3 z-10">
        <button onClick={handleEnd}
          className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 flex items-center justify-center text-white shadow-xl transition-all">
          <PhoneOff size={26} />
        </button>
        <span className="text-white/40 text-xs">End call</span>
      </div>
    </div>
  )
}

// ─── Call history item ────────────────────────────────────────────────────

export function CallHistoryItem({ record }: { record: CallRecord }) {
  const missed = record.status === 'missed', declined = record.status === 'declined'
  const fmt = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
  return (
    <div className="flex items-center gap-3 py-2.5 px-1">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${missed || declined ? 'bg-red-50 text-red-400' : 'bg-green-50 text-green-500'}`}>
        {record.type === 'video' ? <Video size={18} /> : <Phone size={18} />}
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
      {(missed || declined) && <PhoneMissed size={16} className="text-red-300" />}
    </div>
  )
}
