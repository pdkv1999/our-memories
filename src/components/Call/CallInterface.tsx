import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone, Volume2, VolumeX, PhoneMissed } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { signalsApi, CallSignal } from '../../api/client'
import { CallType, CallRecord } from '../../types'

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'turn:openrelay.metered.ca:80',      username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443',     username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turns:openrelay.metered.ca:443',    username: 'openrelayproject', credential: 'openrelayproject' },
]

// ─── Incoming call banner ─────────────────────────────────────────────────

export function IncomingCallBanner({ signal, onAccept, onDecline }: {
  signal: CallSignal; onAccept: () => void; onDecline: () => void
}) {
  return (
    <motion.div
      initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -80, opacity: 0 }}
      className="fixed top-20 inset-x-0 z-[500] flex justify-center pointer-events-none px-4"
    >
      <div className="pointer-events-auto bg-white rounded-3xl shadow-2xl border border-gray-100 p-4 flex items-center gap-4 max-w-sm w-full">
        <div className="relative shrink-0">
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute inset-0 rounded-full bg-green-200"
          />
          <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
            {signal.from_user[0]}
          </div>
        </div>
        <div className="flex-1">
          <p className="font-bold text-gray-900">{signal.from_user}</p>
          <p className="text-sm text-gray-400">Incoming {signal.call_type === 'video' ? '📹 video' : '📞 voice'} call…</p>
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
  const [s, setS] = useState(0)
  useEffect(() => { const t = setInterval(() => setS(n => n + 1), 1000); return () => clearInterval(t) }, [])
  return <span className="text-white/70 text-sm tabular-nums">{Math.floor(s/60)}:{String(s%60).padStart(2,'0')}</span>
}

// ─── Active call screen ───────────────────────────────────────────────────

export function CallScreen({ signal, onEnd }: { signal: CallSignal; onEnd: (dur: number) => void }) {
  const { state } = useApp()

  const [connected,    setConnected]    = useState(false)
  const [isMuted,      setIsMuted]      = useState(false)
  const [isCameraOff,  setIsCameraOff]  = useState(false)
  const [speakerOff,   setSpeakerOff]   = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [statusText,   setStatusText]   = useState('Connecting…')

  // Use state for streams so effects re-run when they change
  const [localStream,  setLocalStream]  = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

  const localVideoRef  = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const pcRef          = useRef<RTCPeerConnection | null>(null)
  const startRef       = useRef(Date.now())
  const pollRef        = useRef<ReturnType<typeof setInterval>>()
  const doneRef        = useRef(false)
  const processedCallerIce = useRef(0)
  const processedCalleeIce = useRef(0)

  const isCallee  = signal.to_user === state.currentUser
  const myRole    = isCallee ? 'callee' : 'caller'
  const otherRole = isCallee ? 'caller' : 'callee'
  const otherName = isCallee ? signal.from_user : signal.to_user
  const isVideo   = signal.call_type === 'video'

  // ── Attach local stream to video element ─────────────────────────────
  useEffect(() => {
    if (!localStream || !localVideoRef.current) return
    localVideoRef.current.srcObject = localStream
    localVideoRef.current.play().catch(() => {})
  }, [localStream])

  // ── Attach remote stream to audio + video elements ───────────────────
  useEffect(() => {
    if (!remoteStream) return

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream
      remoteAudioRef.current.muted = speakerOff     // set via DOM property, not React prop
      remoteAudioRef.current.play().catch(() => {})
    }
    if (isVideo && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream
      remoteVideoRef.current.play().catch(() => {})
    }
  }, [remoteStream, isVideo])

  // ── Speaker toggle via DOM property ──────────────────────────────────
  useEffect(() => {
    if (remoteAudioRef.current) remoteAudioRef.current.muted = speakerOff
  }, [speakerOff])

  // ── WebRTC setup ──────────────────────────────────────────────────────
  useEffect(() => {
    setup()
    return () => {
      clearInterval(pollRef.current)
      pcRef.current?.close()
      localStream?.getTracks().forEach(t => t.stop())
    }
  }, [])

  async function setup() {
    // 1. Get media
    let stream: MediaStream | undefined
    try {
      stream = await navigator.mediaDevices.getUserMedia(
        isVideo ? { video: { facingMode: 'user', width: 1280 }, audio: true } : { audio: true }
      )
    } catch {
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }) } catch {}
    }
    if (stream) setLocalStream(stream)

    // 2. Peer connection
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    pcRef.current = pc

    stream?.getTracks().forEach(t => pc.addTrack(t, stream!))

    // Remote track arrives → set remote stream
    pc.ontrack = ({ streams }) => {
      setRemoteStream(streams[0])
      setConnected(true)
      setStatusText('')
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected')    { setConnected(true); setStatusText('') }
      if (pc.connectionState === 'disconnected') finish()
      if (pc.connectionState === 'failed')       setStatusText('Connection lost. Check your network.')
    }

    // Trickle ICE — send each candidate to DB as it arrives
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        signalsApi.addIce(signal.id, myRole, candidate.toJSON()).catch(() => {})
      }
    }

    if (!isCallee) {
      // ── CALLER ────────────────────────────────────────────────────────
      setStatusText(`Calling ${otherName}…`)
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      // Store offer immediately (don't wait for ICE — we do trickle)
      await signalsApi.update(signal.id, { sdpOffer: JSON.stringify(pc.localDescription) })

      // Poll for answer + callee ICE
      pollRef.current = setInterval(() => pollForAnswer(pc), 1000)

    } else {
      // ── CALLEE ────────────────────────────────────────────────────────
      setStatusText('Connecting…')
      // Poll for offer from caller
      pollRef.current = setInterval(() => pollForOffer(pc), 1000)
    }
  }

  async function pollForOffer(pc: RTCPeerConnection) {
    try {
      const latest = await signalsApi.getById(signal.id)
      if (!latest) return finish()
      if (latest.status === 'ended' || latest.status === 'declined' || latest.status === 'missed') return finish()

      // Got the offer — create answer
      if (latest.sdp_offer && pc.remoteDescription === null) {
        clearInterval(pollRef.current)
        await pc.setRemoteDescription(JSON.parse(latest.sdp_offer))

        // Apply any caller ICE already in DB
        for (const c of latest.caller_ice ?? []) {
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
        }
        processedCallerIce.current = (latest.caller_ice ?? []).length

        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        await signalsApi.update(signal.id, { sdpAnswer: JSON.stringify(pc.localDescription) })

        // Now poll for new caller ICE candidates
        pollRef.current = setInterval(() => pollIceCandidates(pc, latest), 1000)
      }
    } catch { /* ignore */ }
  }

  async function pollForAnswer(pc: RTCPeerConnection) {
    try {
      const latest = await signalsApi.getById(signal.id)
      if (!latest) return finish()
      if (latest.status === 'ended' || latest.status === 'declined' || latest.status === 'missed') return finish()

      // Got the answer
      if (latest.sdp_answer && pc.remoteDescription === null) {
        await pc.setRemoteDescription(JSON.parse(latest.sdp_answer))
      }

      // Apply new callee ICE candidates
      const calleeIce = latest.callee_ice ?? []
      for (let i = processedCalleeIce.current; i < calleeIce.length; i++) {
        await pc.addIceCandidate(new RTCIceCandidate(calleeIce[i])).catch(() => {})
      }
      processedCalleeIce.current = calleeIce.length
    } catch { /* ignore */ }
  }

  async function pollIceCandidates(pc: RTCPeerConnection, _initial: CallSignal) {
    try {
      const latest = await signalsApi.getById(signal.id)
      if (!latest) return finish()
      if (latest.status === 'ended' || latest.status === 'declined' || latest.status === 'missed') return finish()

      // Apply new caller ICE candidates
      const callerIce = latest.caller_ice ?? []
      for (let i = processedCallerIce.current; i < callerIce.length; i++) {
        await pc.addIceCandidate(new RTCIceCandidate(callerIce[i])).catch(() => {})
      }
      processedCallerIce.current = callerIce.length
    } catch { /* ignore */ }
  }

  function finish(dur?: number) {
    if (doneRef.current) return
    doneRef.current = true
    clearInterval(pollRef.current)
    pcRef.current?.close()
    onEnd(dur ?? Math.floor((Date.now() - startRef.current) / 1000))
  }

  async function handleEnd() {
    await signalsApi.update(signal.id, { status: 'ended' }).catch(() => {})
    finish()
  }

  // Auto-hide controls
  useEffect(() => {
    if (!connected || !showControls) return
    const t = setTimeout(() => setShowControls(false), 4000)
    return () => clearTimeout(t)
  }, [connected, showControls])

  // Auto-miss after 45 s unanswered
  useEffect(() => {
    if (connected) return
    const t = setTimeout(async () => {
      await signalsApi.update(signal.id, { status: 'missed' }).catch(() => {})
      finish(0)
    }, 45_000)
    return () => clearTimeout(t)
  }, [connected])

  function toggleMute() {
    localStream?.getAudioTracks().forEach(t => { t.enabled = isMuted })
    setIsMuted(m => !m)
  }
  function toggleCamera() {
    localStream?.getVideoTracks().forEach(t => { t.enabled = isCameraOff })
    setIsCameraOff(c => !c)
  }

  return (
    <div className="fixed inset-0 z-[600] bg-gray-950" onClick={() => connected && setShowControls(s => !s)}>

      {/* Remote audio — always in DOM, muted handled via DOM property */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Remote video (full screen background for video calls) */}
      <video
        ref={remoteVideoRef}
        autoPlay playsInline
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${connected && isVideo && remoteStream ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Avatar / status background */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-950 transition-opacity duration-500 ${connected && isVideo && remoteStream ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="relative">
          {!connected && [1,2,3].map(i => (
            <motion.div key={i}
              animate={{ scale: [1, 1 + i * 0.2], opacity: [0.3, 0] }}
              transition={{ repeat: Infinity, duration: 2, delay: i * 0.6 }}
              className="absolute inset-0 rounded-full bg-rose-500/20"
            />
          ))}
          <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-rose-400 to-violet-500 flex items-center justify-center text-white text-6xl font-bold shadow-2xl">
            {otherName[0]}
          </div>
        </div>
        <h2 className="text-white text-3xl font-bold mt-8">{otherName}</h2>
        {connected
          ? <CallTimer />
          : <motion.p animate={{ opacity: [0.4,1,0.4] }} transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-white/50 text-sm mt-3">{statusText}</motion.p>
        }
      </div>

      {/* Local video PIP */}
      {isVideo && (
        <div className="absolute top-20 right-4 w-28 h-44 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-10 bg-gray-900">
          <video ref={localVideoRef} autoPlay playsInline muted
            className={`w-full h-full object-cover scale-x-[-1] ${isCameraOff ? 'invisible' : ''}`}
          />
          {isCameraOff && <div className="absolute inset-0 flex items-center justify-center"><VideoOff size={22} className="text-white/40" /></div>}
        </div>
      )}

      {/* Connected timer over video */}
      {connected && isVideo && remoteStream && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-sm px-4 py-1.5 rounded-full">
          <CallTimer />
        </div>
      )}

      {/* Top info */}
      <AnimatePresence>
        {(showControls || !connected) && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/70 to-transparent pt-12 pb-12 px-5">
            <p className="text-white text-xl font-bold">{otherName}</p>
            <p className="text-white/60 text-sm mt-0.5">{connected ? '' : statusText}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <AnimatePresence>
        {(showControls || !connected) && (
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:20 }}
            className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-6 pt-20 pb-14"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-end justify-center gap-6">

              <div className="flex flex-col items-center gap-2">
                <button onClick={toggleMute}
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-all ${isMuted ? 'bg-red-500 scale-95' : 'bg-white/20 hover:bg-white/30'}`}>
                  {isMuted ? <MicOff size={22}/> : <Mic size={22}/>}
                </button>
                <span className="text-white/50 text-xs">{isMuted ? 'Unmute' : 'Mute'}</span>
              </div>

              {/* End call — centre, larger */}
              <div className="flex flex-col items-center gap-2">
                <button onClick={handleEnd}
                  className="w-18 h-18 w-[4.5rem] h-[4.5rem] rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-xl transition-all active:scale-95">
                  <PhoneOff size={28}/>
                </button>
                <span className="text-white/50 text-xs">End</span>
              </div>

              {isVideo ? (
                <div className="flex flex-col items-center gap-2">
                  <button onClick={toggleCamera}
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-all ${isCameraOff ? 'bg-gray-600' : 'bg-white/20 hover:bg-white/30'}`}>
                    {isCameraOff ? <VideoOff size={22}/> : <Video size={22}/>}
                  </button>
                  <span className="text-white/50 text-xs">Camera</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <button onClick={() => setSpeakerOff(s => !s)}
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-all ${speakerOff ? 'bg-gray-600' : 'bg-white/20 hover:bg-white/30'}`}>
                    {speakerOff ? <VolumeX size={22}/> : <Volume2 size={22}/>}
                  </button>
                  <span className="text-white/50 text-xs">Speaker</span>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Call history item ────────────────────────────────────────────────────

export function CallHistoryItem({ record }: { record: CallRecord }) {
  const missed = record.status === 'missed', declined = record.status === 'declined'
  const fmt = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s/60)}m ${s%60}s`
  return (
    <div className="flex items-center gap-3 py-2.5 px-1">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${missed||declined ? 'bg-red-50 text-red-400':'bg-green-50 text-green-500'}`}>
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
