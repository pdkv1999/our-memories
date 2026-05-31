import React, { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Phone,
  RotateCcw, Volume2, VolumeX, Maximize2, ChevronDown,
  PhoneIncoming, PhoneMissed
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useWebRTC } from '../../hooks/useWebRTC'
import { ActiveCall, CallType } from '../../types'

// ── Incoming call overlay ─────────────────────────────────────────────────────

export function IncomingCallBanner({
  callerName,
  callType,
  onAccept,
  onDecline,
}: {
  callerName: string
  callType: CallType
  onAccept: () => void
  onDecline: () => void
}) {
  const [ringing, setRinging] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setRinging(false), 45_000)
    return () => clearTimeout(t)
  }, [])

  if (!ringing) return null

  return (
    <motion.div
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -80, opacity: 0 }}
      className="fixed top-20 inset-x-0 z-[500] flex justify-center pointer-events-none px-4"
    >
      <div className="pointer-events-auto bg-white rounded-3xl shadow-2xl border border-gray-100 p-4 flex items-center gap-4 max-w-sm w-full">
        {/* Animated ring */}
        <div className="relative shrink-0">
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute inset-0 rounded-full bg-green-100"
          />
          <div className="relative w-12 h-12 rounded-full bg-green-400 flex items-center justify-center text-white font-bold text-lg">
            {callerName[0]}
          </div>
        </div>
        <div className="flex-1">
          <p className="font-bold text-gray-900">{callerName}</p>
          <p className="text-sm text-gray-400">
            Incoming {callType === 'video' ? '📹 video' : '📞 voice'} call…
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onDecline}
            className="w-11 h-11 rounded-full bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-200 transition-colors"
          >
            <PhoneOff size={18} />
          </button>
          <button
            onClick={onAccept}
            className="w-11 h-11 rounded-full bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200 transition-colors"
          >
            <Phone size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Active call screen ────────────────────────────────────────────────────────

interface CallScreenProps {
  call: ActiveCall
  incomingOffer?: RTCSessionDescriptionInit
  onEnd: () => void
}

function CallTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)), 1000)
    return () => clearInterval(t)
  }, [startedAt])
  const m = Math.floor(elapsed / 60)
  const s = elapsed % 60
  return <span className="text-white/70 text-sm tabular-nums">{m}:{String(s).padStart(2, '0')}</span>
}

export function CallScreen({ call, incomingOffer, onEnd }: CallScreenProps) {
  const { state } = useApp()
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const [isSpeakerOff, setIsSpeakerOff] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [callConnected, setCallConnected] = useState(call.status === 'connected')
  const controlTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const [localPreview, setLocalPreview] = useState(false)

  const isCallee = call.initiator !== state.currentUser

  const { localStream, remoteStream, isMuted, isCameraOff,
    startCall, acceptCall, declineCall, endCall, toggleMute, toggleCamera
  } = useWebRTC({
    callId: call.id,
    localUser: state.currentUser,
    remoteUser: state.currentUser === 'You' ? 'Partner' : 'You',
    callType: call.type,
    onRemoteStream: () => setCallConnected(true),
    onCallEnded: onEnd,
  })

  // Attach streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
    if (remoteStream) setCallConnected(true)
  }, [remoteStream])

  // Initiate or accept call on mount
  useEffect(() => {
    if (isCallee && incomingOffer) {
      acceptCall(incomingOffer)
    } else if (!isCallee) {
      startCall()
    }
  }, [])

  // Auto-hide controls
  useEffect(() => {
    if (!callConnected) return
    clearTimeout(controlTimerRef.current)
    if (showControls) {
      controlTimerRef.current = setTimeout(() => setShowControls(false), 4000)
    }
    return () => clearTimeout(controlTimerRef.current)
  }, [showControls, callConnected])

  function handleEndCall() {
    endCall()
    onEnd()
  }

  const otherUser = state.currentUser === 'You' ? 'Partner' : 'You'
  const isVideo = call.type === 'video'

  return (
    <div
      className="fixed inset-0 z-[600] bg-gray-950 flex flex-col"
      onClick={() => callConnected && setShowControls(s => !s)}
    >
      {/* Remote video / avatar background */}
      {isVideo && remoteStream ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          muted={false}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-950">
          {/* Pulsing avatar */}
          <div className="relative">
            {[1, 2, 3].map(i => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1 + i * 0.15], opacity: [0.3, 0] }}
                transition={{ repeat: Infinity, duration: 2, delay: i * 0.5, ease: 'easeOut' }}
                className="absolute inset-0 rounded-full"
                style={{ background: 'rgba(244,63,94,0.2)' }}
              />
            ))}
            <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-rose-400 to-violet-500 flex items-center justify-center text-white text-5xl font-bold shadow-2xl">
              {otherUser[0]}
            </div>
          </div>
          <h2 className="text-white text-2xl font-bold mt-6">{otherUser}</h2>
          {!callConnected ? (
            <motion.p
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-white/50 text-sm mt-2"
            >
              {call.status === 'ringing' ? 'Ringing…' : call.status === 'calling' ? 'Connecting…' : 'Waiting…'}
            </motion.p>
          ) : (
            <CallTimer startedAt={call.startedAt!} />
          )}
        </div>
      )}

      {/* Top info overlay */}
      <AnimatePresence>
        {(showControls || !callConnected) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/70 to-transparent pt-safe px-4 pt-10 pb-10"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-white text-xl font-bold">{otherUser}</h2>
                {callConnected && call.startedAt
                  ? <CallTimer startedAt={call.startedAt} />
                  : <p className="text-white/60 text-sm capitalize">{call.status}…</p>
                }
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/50 text-xs">
                  {isVideo ? '📹' : '📞'} {call.type}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Local camera PIP */}
      {isVideo && localStream && (
        <div className="absolute top-20 right-4 w-28 h-40 rounded-2xl overflow-hidden border-2 border-white/30 shadow-xl z-10">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover scale-x-[-1] ${isCameraOff ? 'invisible' : ''}`}
          />
          {isCameraOff && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
              <VideoOff size={20} className="text-white/40" />
            </div>
          )}
        </div>
      )}

      {/* Voice-only: show local mute status */}
      {!isVideo && localStream && (
        <div className="absolute top-20 right-4 bg-white/10 rounded-2xl px-3 py-2 backdrop-blur-sm">
          {isMuted ? <MicOff size={16} className="text-red-400" /> : <Mic size={16} className="text-green-400" />}
        </div>
      )}

      {/* Controls */}
      <AnimatePresence>
        {(showControls || !callConnected) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent pb-safe px-4 pt-16 pb-10"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-center gap-4">
              {/* Mute */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={toggleMute}
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-colors ${
                    isMuted ? 'bg-red-500' : 'bg-white/20 hover:bg-white/30'
                  }`}
                >
                  {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                </button>
                <span className="text-white/60 text-xs">{isMuted ? 'Unmute' : 'Mute'}</span>
              </div>

              {/* Camera (video calls only) */}
              {isVideo && (
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={toggleCamera}
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-colors ${
                      isCameraOff ? 'bg-gray-600' : 'bg-white/20 hover:bg-white/30'
                    }`}
                  >
                    {isCameraOff ? <VideoOff size={22} /> : <Video size={22} />}
                  </button>
                  <span className="text-white/60 text-xs">Camera</span>
                </div>
              )}

              {/* Speaker */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => setIsSpeakerOff(s => !s)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-colors ${
                    isSpeakerOff ? 'bg-gray-600' : 'bg-white/20 hover:bg-white/30'
                  }`}
                >
                  {isSpeakerOff ? <VolumeX size={22} /> : <Volume2 size={22} />}
                </button>
                <span className="text-white/60 text-xs">Speaker</span>
              </div>

              {/* End call */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={handleEndCall}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg transition-colors"
                >
                  <PhoneOff size={26} />
                </button>
                <span className="text-white/60 text-xs">End</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Call History item ─────────────────────────────────────────────────────────

export function CallHistoryItem({ record }: { record: { id: string; initiator: string; type: CallType; status: string; startedAt: string; duration: number } }) {
  const isMissed = record.status === 'missed'
  const isDeclined = record.status === 'declined'
  const fmt = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`

  return (
    <div className="flex items-center gap-3 py-2.5 px-1">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
        isMissed || isDeclined ? 'bg-red-50 text-red-400' : 'bg-green-50 text-green-500'
      }`}>
        {record.type === 'video' ? <Video size={18} /> : <Phone size={18} />}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-800 capitalize">
          {record.type} call {isMissed ? '(missed)' : isDeclined ? '(declined)' : ''}
        </p>
        <p className="text-xs text-gray-400">
          {new Date(record.startedAt).toLocaleDateString()} · {record.initiator}
          {record.duration > 0 && ` · ${fmt(record.duration)}`}
        </p>
      </div>
      {(isMissed || isDeclined) && <PhoneMissed size={16} className="text-red-300" />}
    </div>
  )
}
