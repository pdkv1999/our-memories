import React, { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  Phone, Volume2, VolumeX, PhoneMissed
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { signalsApi, CallSignal } from '../../api/client'
import { CallType, CallRecord } from '../../types'

// Free STUN + public TURN (Open Relay) so it works across different networks
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
]

// Wait until ICE gathering finishes (or 6 s timeout) then return complete SDP
function gatherICE(pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
  return new Promise(resolve => {
    if (pc.iceGatheringState === 'complete') {
      resolve(pc.localDescription!)
      return
    }
    const done = () => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', done)
        resolve(pc.localDescription!)
      }
    }
    pc.addEventListener('icegatheringstatechange', done)
    setTimeout(() => resolve(pc.localDescription!), 6000)
  })
}

// ─── Incoming call banner ─────────────────────────────────────────────────

export function IncomingCallBanner({
  signal, onAccept, onDecline,
}: {
  signal: CallSignal
  onAccept: () => void
  onDecline: () => void
}) {
  return (
    <motion.div
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -80, opacity: 0 }}
      className="fixed top-20 inset-x-0 z-[500] flex justify-center pointer-events-none px-4"
    >
      <div className="pointer-events-auto bg-white rounded-3xl shadow-2xl border border-gray-100 p-4 flex items-center gap-4 max-w-sm w-full">
        <div className="relative shrink-0">
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute inset-0 rounded-full bg-green-200"
          />
          <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
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
          <button onClick={onDecline} className="w-11 h-11 rounded-full bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-200 transition-colors">
            <PhoneOff size={18} />
          </button>
          <button onClick={onAccept} className="w-11 h-11 rounded-full bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200 transition-colors">
            <Phone size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Call timer ───────────────────────────────────────────────────────────

function CallTimer() {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [])
  const m = Math.floor(elapsed / 60), s = elapsed % 60
  return <span className="text-white/70 text-sm tabular-nums">{m}:{String(s).padStart(2, '0')}</span>
}

// ─── Active call screen ───────────────────────────────────────────────────

export function CallScreen({
  signal, onEnd,
}: {
  signal: CallSignal
  onEnd: (duration: number) => void
}) {
  const { state } = useApp()

  const [status,       setStatus]       = useState<CallSignal['status']>(signal.status as CallSignal['status'])
  const [connected,    setConnected]     = useState(false)
  const [isMuted,      setIsMuted]       = useState(false)
  const [isCameraOff,  setIsCameraOff]   = useState(false)
  const [isSpeakerOff, setIsSpeakerOff]  = useState(false)
  const [showControls, setShowControls]  = useState(true)
  const [rtcError,     setRtcError]      = useState('')

  const localVideoRef  = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const pcRef          = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const startTimeRef   = useRef(Date.now())
  const pollRef        = useRef<ReturnType<typeof setInterval>>()
  const controlTimer   = useRef<ReturnType<typeof setTimeout>>()
  const endedRef       = useRef(false)

  const isCallee = signal.to_user === state.currentUser
  const otherName = isCallee ? signal.from_user : signal.to_user
  const isVideo = signal.call_type === 'video'

  // ── Cleanup helper ──────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    clearInterval(pollRef.current)
    pcRef.current?.close()
    pcRef.current = null
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
  }, [])

  const finish = useCallback((dur?: number) => {
    if (endedRef.current) return
    endedRef.current = true
    cleanup()
    onEnd(dur ?? Math.floor((Date.now() - startTimeRef.current) / 1000))
  }, [cleanup, onEnd])

  // ── WebRTC setup ────────────────────────────────────────────────────────
  useEffect(() => {
    startWebRTC()
    return cleanup
  }, [])

  async function startWebRTC() {
    // 1. Get local media
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia(
        isVideo ? { video: { facingMode: 'user' }, audio: true } : { audio: true }
      )
    } catch {
      // Fallback: audio only
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch {
        setRtcError('Microphone access denied. Please allow mic access and retry.')
        return
      }
    }
    localStreamRef.current = stream
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream
    }

    // 2. Create peer connection
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    pcRef.current = pc

    // Add local tracks
    stream.getTracks().forEach(t => pc.addTrack(t, stream))

    // Handle remote stream → attach to audio/video
    pc.ontrack = ({ streams }) => {
      const remoteStream = streams[0]
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream
      setConnected(true)
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected')   setConnected(true)
      if (pc.connectionState === 'failed')      setRtcError('Connection failed. Check your network.')
      if (pc.connectionState === 'disconnected') finish()
    }

    if (!isCallee) {
      // ── CALLER: create offer → store in DB → wait for answer ─────────
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      const sdp = await gatherICE(pc)

      await signalsApi.update(signal.id, { sdpOffer: JSON.stringify(sdp) })

      // Poll for callee's answer
      pollRef.current = setInterval(async () => {
        try {
          const latest = await signalsApi.getById(signal.id)
          if (!latest) { finish(); return }

          if (latest.status === 'ended' || latest.status === 'declined' || latest.status === 'missed') {
            finish(); return
          }
          setStatus(latest.status as CallSignal['status'])

          // Got answer — complete handshake
          if (latest.sdp_answer && pc.remoteDescription === null) {
            await pc.setRemoteDescription(JSON.parse(latest.sdp_answer))
          }
        } catch { /* ignore */ }
      }, 2000)

    } else {
      // ── CALLEE: wait for offer → create answer → store in DB ─────────
      // Poll until sdp_offer appears (caller may not have stored it yet)
      const getOffer = async (): Promise<string> => {
        for (let i = 0; i < 15; i++) {
          const latest = await signalsApi.getById(signal.id)
          if (latest?.sdp_offer) return latest.sdp_offer
          await new Promise(r => setTimeout(r, 1000))
        }
        throw new Error('Offer not received in time')
      }

      try {
        const offerJSON = await getOffer()
        await pc.setRemoteDescription(JSON.parse(offerJSON))

        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        const sdp = await gatherICE(pc)

        await signalsApi.update(signal.id, { sdpAnswer: JSON.stringify(sdp) })
      } catch (err) {
        setRtcError('Could not connect. The caller may have poor signal.')
        return
      }

      // Poll for status changes (ended by caller, etc.)
      pollRef.current = setInterval(async () => {
        try {
          const latest = await signalsApi.getById(signal.id)
          if (!latest) { finish(); return }
          const s = latest.status as CallSignal['status']
          setStatus(s)
          if (s === 'ended' || s === 'declined' || s === 'missed') finish()
        } catch { /* ignore */ }
      }, 2000)
    }
  }

  // Auto-hide controls when connected
  useEffect(() => {
    clearTimeout(controlTimer.current)
    if (connected && showControls) {
      controlTimer.current = setTimeout(() => setShowControls(false), 4000)
    }
    return () => clearTimeout(controlTimer.current)
  }, [connected, showControls])

  // Auto-end if nobody answers in 45 s
  useEffect(() => {
    if (connected) return
    const t = setTimeout(async () => {
      await signalsApi.update(signal.id, { status: 'missed' }).catch(() => {})
      finish(0)
    }, 45_000)
    return () => clearTimeout(t)
  }, [connected])

  async function handleEnd() {
    await signalsApi.update(signal.id, { status: 'ended' }).catch(() => {})
    finish()
  }

  function toggleMute() {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
    setIsMuted(m => !m)
  }
  function toggleCamera() {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
    setIsCameraOff(c => !c)
  }

  return (
    <div
      className="fixed inset-0 z-[600] bg-gray-950 flex flex-col"
      onClick={() => connected && setShowControls(s => !s)}
    >
      {/* Hidden audio element for remote audio (always needed) */}
      <audio ref={remoteAudioRef} autoPlay playsInline muted={isSpeakerOff} className="hidden" />

      {/* Remote video (video calls) */}
      {isVideo && (
        <video
          ref={remoteVideoRef}
          autoPlay playsInline
          className={`absolute inset-0 w-full h-full object-cover ${connected ? 'opacity-100' : 'opacity-0'}`}
        />
      )}

      {/* Background avatar (shown when not yet connected) */}
      {(!connected || !isVideo) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-950">
          <div className="relative">
            {!connected && [1, 2, 3].map(i => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1 + i * 0.18], opacity: [0.3, 0] }}
                transition={{ repeat: Infinity, duration: 2, delay: i * 0.5, ease: 'easeOut' }}
                className="absolute inset-0 rounded-full bg-rose-500/20"
              />
            ))}
            <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-rose-400 to-violet-500 flex items-center justify-center text-white text-5xl font-bold shadow-2xl">
              {otherName[0]}
            </div>
          </div>
          <h2 className="text-white text-2xl font-bold mt-6">{otherName}</h2>
          {connected
            ? <CallTimer />
            : rtcError
              ? <p className="text-red-400 text-sm mt-2 px-6 text-center">{rtcError}</p>
              : (
                <motion.p
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="text-white/50 text-sm mt-2"
                >
                  {isCallee ? 'Connecting…' : `Calling ${otherName}…`}
                </motion.p>
              )
          }
        </div>
      )}

      {/* Connected + video: show timer overlay */}
      {connected && isVideo && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2">
          <CallTimer />
        </div>
      )}

      {/* Local camera PIP */}
      {isVideo && (
        <div className="absolute top-16 right-4 w-28 h-40 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl z-10">
          <video
            ref={localVideoRef}
            autoPlay playsInline muted
            className={`w-full h-full object-cover scale-x-[-1] ${isCameraOff ? 'invisible' : ''}`}
          />
          {isCameraOff && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
              <VideoOff size={20} className="text-white/40" />
            </div>
          )}
        </div>
      )}

      {/* Top info overlay */}
      <AnimatePresence>
        {(showControls || !connected) && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/70 to-transparent pt-10 pb-10 px-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-white text-xl font-bold">{otherName}</h2>
                {connected
                  ? <CallTimer />
                  : <p className="text-white/60 text-sm">{isCallee ? 'Incoming call' : 'Calling…'}</p>
                }
              </div>
              <span className="text-white/40 text-xs">{isVideo ? '📹 Video' : '📞 Voice'}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <AnimatePresence>
        {(showControls || !connected) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-4 pt-16 pb-12"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-center gap-5">
              <div className="flex flex-col items-center gap-1">
                <button onClick={toggleMute} className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-colors ${isMuted ? 'bg-red-500' : 'bg-white/20 hover:bg-white/30'}`}>
                  {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                </button>
                <span className="text-white/50 text-xs">{isMuted ? 'Unmute' : 'Mute'}</span>
              </div>

              {isVideo && (
                <div className="flex flex-col items-center gap-1">
                  <button onClick={toggleCamera} className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-colors ${isCameraOff ? 'bg-gray-600' : 'bg-white/20 hover:bg-white/30'}`}>
                    {isCameraOff ? <VideoOff size={22} /> : <Video size={22} />}
                  </button>
                  <span className="text-white/50 text-xs">Camera</span>
                </div>
              )}

              <div className="flex flex-col items-center gap-1">
                <button onClick={() => setIsSpeakerOff(s => !s)} className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-colors ${isSpeakerOff ? 'bg-gray-600' : 'bg-white/20 hover:bg-white/30'}`}>
                  {isSpeakerOff ? <VolumeX size={22} /> : <Volume2 size={22} />}
                </button>
                <span className="text-white/50 text-xs">Speaker</span>
              </div>

              <div className="flex flex-col items-center gap-1">
                <button onClick={handleEnd} className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg transition-colors">
                  <PhoneOff size={26} />
                </button>
                <span className="text-white/50 text-xs">End</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Call history item ────────────────────────────────────────────────────

export function CallHistoryItem({ record }: { record: CallRecord }) {
  const isMissed = record.status === 'missed', isDeclined = record.status === 'declined'
  const fmt = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
  return (
    <div className="flex items-center gap-3 py-2.5 px-1">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isMissed || isDeclined ? 'bg-red-50 text-red-400' : 'bg-green-50 text-green-500'}`}>
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
