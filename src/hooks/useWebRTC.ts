import { useEffect, useRef, useState, useCallback } from 'react'

const SIGNAL_KEY = 'love-life-rtc-signal'

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

export type RTCSignalEvent =
  | { event: 'incoming-call'; from: string; callId: string; callType: string; sdp: RTCSessionDescriptionInit }
  | { event: 'call-accepted'; from: string; callId: string; sdp: RTCSessionDescriptionInit }
  | { event: 'call-declined'; from: string; callId: string }
  | { event: 'call-ended'; from: string; callId: string }
  | { event: 'ice-candidate'; from: string; callId: string; candidate: RTCIceCandidateInit }

function writeSignal(signal: RTCSignalEvent & { ts: number }) {
  localStorage.setItem(SIGNAL_KEY, JSON.stringify(signal))
}

export interface UseWebRTCOptions {
  callId: string
  localUser: string
  remoteUser: string
  callType: 'video' | 'voice'
  onRemoteStream?: (stream: MediaStream) => void
  onCallEnded?: () => void
  onIncoming?: (signal: Extract<RTCSignalEvent, { event: 'incoming-call' }>) => void
}

export function useWebRTC({
  callId, localUser, remoteUser, callType,
  onRemoteStream, onCallEnded,
}: Omit<UseWebRTCOptions, 'onIncoming'>) {
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([])

  const cleanup = useCallback(() => {
    pcRef.current?.close()
    pcRef.current = null
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    setLocalStream(null)
    setRemoteStream(null)
  }, [])

  const createPC = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        writeSignal({ event: 'ice-candidate', from: localUser, callId, candidate: candidate.toJSON(), ts: Date.now() })
      }
    }

    pc.ontrack = ({ streams }) => {
      const stream = streams[0]
      setRemoteStream(stream)
      onRemoteStream?.(stream)
    }

    pcRef.current = pc
    return pc
  }, [callId, localUser, onRemoteStream])

  async function getMedia() {
    try {
      const constraints = callType === 'video'
        ? { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true }
        : { audio: true }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      localStreamRef.current = stream
      setLocalStream(stream)
      return stream
    } catch (err) {
      console.warn('Media access error:', err)
      // Return silent/empty stream so call can proceed
      const empty = new MediaStream()
      localStreamRef.current = empty
      setLocalStream(empty)
      return empty
    }
  }

  // Caller initiates
  const startCall = useCallback(async () => {
    const stream = await getMedia()
    const pc = createPC()
    stream.getTracks().forEach(t => pc.addTrack(t, stream))

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    writeSignal({ event: 'incoming-call', from: localUser, callId, callType, sdp: offer, ts: Date.now() })
  }, [callId, callType, localUser, createPC])

  // Callee accepts
  const acceptCall = useCallback(async (offer: RTCSessionDescriptionInit) => {
    const stream = await getMedia()
    const pc = createPC()
    stream.getTracks().forEach(t => pc.addTrack(t, stream))

    await pc.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    // Apply pending candidates
    for (const c of pendingCandidates.current) {
      await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
    }
    pendingCandidates.current = []

    writeSignal({ event: 'call-accepted', from: localUser, callId, sdp: answer, ts: Date.now() })
  }, [callId, localUser, createPC])

  const declineCall = useCallback(() => {
    writeSignal({ event: 'call-declined', from: localUser, callId, ts: Date.now() })
  }, [callId, localUser])

  const endCall = useCallback(() => {
    writeSignal({ event: 'call-ended', from: localUser, callId, ts: Date.now() })
    cleanup()
    onCallEnded?.()
  }, [callId, localUser, cleanup, onCallEnded])

  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
    setIsMuted(m => !m)
  }, [])

  const toggleCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
    setIsCameraOff(c => !c)
  }, [])

  // Listen to signals from the other tab
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key !== SIGNAL_KEY || !e.newValue) return
      try {
        const signal: RTCSignalEvent & { ts: number } = JSON.parse(e.newValue)
        if (signal.callId !== callId) return
        if (signal.from === localUser) return // ignore own signals

        if (signal.event === 'call-accepted') {
          pcRef.current?.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(async () => {
            for (const c of pendingCandidates.current) {
              await pcRef.current?.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
            }
            pendingCandidates.current = []
          })
        }

        if (signal.event === 'ice-candidate') {
          const pc = pcRef.current
          if (pc && pc.remoteDescription) {
            pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {})
          } else {
            pendingCandidates.current.push(signal.candidate)
          }
        }

        if (signal.event === 'call-ended' || signal.event === 'call-declined') {
          cleanup()
          onCallEnded?.()
        }
      } catch { /* ignore */ }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [callId, localUser, cleanup, onCallEnded])

  useEffect(() => () => cleanup(), [])

  return {
    localStream, remoteStream,
    isMuted, isCameraOff,
    startCall, acceptCall, declineCall, endCall,
    toggleMute, toggleCamera,
  }
}

// Standalone signal listener for detecting incoming calls
export function useIncomingCallSignal(
  localUser: string,
  onIncoming: (signal: Extract<RTCSignalEvent, { event: 'incoming-call' }>) => void
) {
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key !== SIGNAL_KEY || !e.newValue) return
      try {
        const signal: RTCSignalEvent & { ts: number } = JSON.parse(e.newValue)
        if (signal.event !== 'incoming-call') return
        if (signal.from === localUser) return
        if (Date.now() - signal.ts > 60_000) return // ignore stale signals
        onIncoming(signal as Extract<RTCSignalEvent, { event: 'incoming-call' }>)
      } catch { /* ignore */ }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [localUser, onIncoming])
}
