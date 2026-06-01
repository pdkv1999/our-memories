import React, { useEffect, useRef, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Send, Smile, Mic, MicOff, Phone, Video,
  X, Image as ImageIcon, ChevronDown, Search, Heart, ArrowLeft, Info
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import MessageBubble from './MessageBubble'
import { Message } from '../../types'
import { format, isToday, isYesterday, parseISO, isSameDay } from 'date-fns'

// ── Emoji Picker ─────────────────────────────────────────────────────────────

const EMOJI_GROUPS = [
  { label: 'Love', emojis: ['❤️', '🥰', '😍', '😘', '💕', '💖', '💗', '💓', '💞', '💘', '💟', '🌹', '💍', '💋', '🫦', '🥂'] },
  { label: 'Faces', emojis: ['😊', '😂', '🤣', '😭', '😩', '🥺', '😅', '😉', '🤔', '🤭', '🥳', '😎', '🤩', '😴', '😋', '🤗'] },
  { label: 'Hands', emojis: ['🙏', '👏', '💪', '🫂', '🤝', '✌️', '🤞', '🤙', '👍', '👎', '🫶', '🫁', '✋', '🤚', '👋', '🤜'] },
  { label: 'Nature', emojis: ['🌸', '🌺', '🌻', '🌈', '🦋', '🐱', '🐶', '🦊', '🐼', '🌙', '⭐', '🌟', '💫', '🌊', '🍀', '🌷'] },
  { label: 'Fun', emojis: ['🎉', '🎊', '🔥', '✨', '💯', '🎁', '🎈', '🍕', '☕', '🍷', '🍦', '🎵', '🎶', '🏆', '🎯', '🪄'] },
]

function EmojiPicker({ onPick, onClose }: { onPick: (e: string) => void; onClose: () => void }) {
  const [tab, setTab] = useState(0)
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      className="absolute bottom-full mb-2 left-0 bg-white rounded-2xl shadow-2xl border border-gray-100 w-72 overflow-hidden z-30"
    >
      {/* Tabs */}
      <div className="flex border-b border-gray-100 px-2 pt-2">
        {EMOJI_GROUPS.map((g, i) => (
          <button
            key={g.label}
            onClick={() => setTab(i)}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-t-lg transition-colors ${tab === i ? 'bg-rose-50 text-rose-500' : 'text-gray-400 hover:text-gray-600'}`}
          >
            {g.label}
          </button>
        ))}
        <button onClick={onClose} className="ml-auto text-gray-300 hover:text-gray-500 p-1.5">
          <X size={14} />
        </button>
      </div>
      <div className="p-3 grid grid-cols-8 gap-1 h-36 overflow-y-auto">
        {EMOJI_GROUPS[tab].emojis.map(e => (
          <button key={e} onClick={() => onPick(e)} className="text-xl hover:bg-gray-100 rounded-lg p-1 transition-colors">
            {e}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

// ── Gallery Picker ────────────────────────────────────────────────────────────

function GalleryPicker({ onPick, onClose }: { onPick: (photoId: string, thumb: string) => void; onClose: () => void }) {
  const { state } = useApp()
  const [search, setSearch] = useState('')
  const filtered = state.photos.filter(p =>
    !search || p.caption.toLowerCase().includes(search) || p.filename.toLowerCase().includes(search)
  ).slice(0, 60)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="absolute bottom-full mb-2 left-0 bg-white rounded-2xl shadow-2xl border border-gray-100 w-80 overflow-hidden z-30"
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="font-semibold text-gray-900 text-sm">Send a Photo</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
      </div>
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-1.5">
          <Search size={13} className="text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search photos…"
            className="flex-1 text-xs outline-none bg-transparent"
          />
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="p-6 text-center text-sm text-gray-400">
          <ImageIcon size={24} className="mx-auto mb-2 opacity-40" />
          No photos yet
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-1 p-2 max-h-56 overflow-y-auto">
          {filtered.map(p => (
            <button
              key={p.id}
              onClick={() => { onPick(p.id, p.thumbData); onClose() }}
              className="aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-rose-400 transition-all"
            >
              <img src={p.thumbData} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ── Main ChatPage ─────────────────────────────────────────────────────────────

export default function ChatPage({ onStartCall, onBack }: { onStartCall: (type: 'video' | 'voice') => void; onBack?: () => void }) {
  const { state, sendMessage, dispatch } = useApp()

  const [text, setText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const [replyToId, setReplyToId] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [showScrollBtn, setShowScrollBtn] = useState(false)

  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordTimerRef = useRef<ReturnType<typeof setInterval>>()
  const recordStartRef = useRef(0)

  const otherUser = state.messages.find(m => m.sender !== state.currentUser)?.sender ?? 'Your partner'

  // Auto-scroll to bottom on new message
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distFromBottom < 120) {
      el.scrollTop = el.scrollHeight
    } else {
      setShowScrollBtn(true)
    }
  }, [state.messages.length])

  // Track scroll for scroll-to-bottom button
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    function onScroll() {
      const dist = el!.scrollHeight - el!.scrollTop - el!.clientHeight
      setShowScrollBtn(dist > 150)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // Initial scroll to bottom
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [])

  function scrollToBottom() {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
    setShowScrollBtn(false)
  }

  async function handleSend() {
    const trimmed = text.trim()
    if (!trimmed) return
    setText('')
    setReplyToId(null)
    await sendMessage(trimmed, 'text', undefined, undefined, undefined, replyToId ?? undefined)
    setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }), 50)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleEmojiPick(emoji: string) {
    setText(t => t + emoji)
    inputRef.current?.focus()
    setShowEmoji(false)
  }

  async function handlePhotoPick(photoId: string, photoThumb: string) {
    setReplyToId(null)
    await sendMessage(photoThumb, 'photo', photoId, photoThumb, undefined, replyToId ?? undefined)
    setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }), 50)
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = e => chunksRef.current.push(e.data)
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const duration = Math.round((Date.now() - recordStartRef.current) / 1000)
        const reader = new FileReader()
        reader.onload = () => {
          sendMessage(reader.result as string, 'audio', undefined, undefined, duration, replyToId ?? undefined)
          setReplyToId(null)
        }
        reader.readAsDataURL(blob)
        clearInterval(recordTimerRef.current)
        setRecordingTime(0)
      }
      mediaRecorderRef.current = mr
      mr.start()
      recordStartRef.current = Date.now()
      setIsRecording(true)
      recordTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    } catch {
      alert('Microphone access denied.')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
    setIsRecording(false)
  }

  // Group messages by date for date separators
  const groupedMessages = state.messages.reduce<{ date: string; msgs: Message[] }[]>((acc, msg) => {
    const d = msg.timestamp.slice(0, 10)
    const last = acc[acc.length - 1]
    if (!last || last.date !== d) acc.push({ date: d, msgs: [msg] })
    else last.msgs.push(msg)
    return acc
  }, [])

  function formatDateSep(dateStr: string) {
    const d = parseISO(dateStr)
    if (isToday(d)) return 'Today'
    if (isYesterday(d)) return 'Yesterday'
    return format(d, 'MMMM d, yyyy')
  }

  const replyMessage = replyToId ? state.messages.find(m => m.id === replyToId) : undefined

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="flex flex-col h-dvh bg-rose-25 page-enter">
      {/* Header */}
      <div className="glass border-b border-rose-100 px-4 py-3 flex items-center gap-3 shrink-0 pt-safe">
        {onBack && (
          <button onClick={onBack} className="w-8 h-8 rounded-full hover:bg-rose-50 flex items-center justify-center text-gray-500 hover:text-rose-500 transition-colors">
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-violet-400 flex items-center justify-center text-white font-bold">
            {otherUser[0]}
          </div>
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900">{otherUser}</p>
          <p className="text-xs text-green-500">Online · tap to call</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onStartCall('voice')}
            className="w-9 h-9 rounded-full hover:bg-rose-50 flex items-center justify-center text-gray-600 hover:text-rose-500 transition-colors"
            title="Voice call"
          >
            <Phone size={18} />
          </button>
          <button
            onClick={() => onStartCall('video')}
            className="w-9 h-9 rounded-full hover:bg-rose-50 flex items-center justify-center text-gray-600 hover:text-rose-500 transition-colors"
            title="Video call"
          >
            <Video size={18} />
          </button>
        </div>
      </div>

      {/* Decorative background */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1 relative"
        ref={listRef}
        style={{
          backgroundImage: `radial-gradient(circle at 20% 80%, rgba(244,63,94,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(244,63,94,0.04) 0%, transparent 50%)`,
        }}
      >
        {state.messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-60">
            <div className="text-5xl">💬</div>
            <div className="text-center">
              <p className="font-semibold text-gray-700">Start your conversation</p>
              <p className="text-sm text-gray-400 mt-1">Send a message, photo, or voice note</p>
            </div>
            <Heart size={20} className="text-rose-300 fill-rose-200" />
          </div>
        )}

        {/* Message groups with date separators */}
        <AnimatePresence initial={false}>
          {groupedMessages.map(({ date, msgs }) => (
            <React.Fragment key={date}>
              {/* Date separator */}
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-rose-100" />
                <span className="text-xs text-gray-400 font-medium bg-rose-25 px-2">{formatDateSep(date)}</span>
                <div className="flex-1 h-px bg-rose-100" />
              </div>

              {msgs.map(msg => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.sender === state.currentUser}
                  replyMessage={msg.replyToId ? state.messages.find(m => m.id === msg.replyToId) : undefined}
                  onReply={setReplyToId}
                />
              ))}
            </React.Fragment>
          ))}
        </AnimatePresence>

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToBottom}
              className="fixed bottom-28 right-6 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-100 flex items-center justify-center text-gray-500 hover:text-rose-500 hover:border-rose-200 transition-colors z-10"
            >
              <ChevronDown size={18} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Reply preview */}
      <AnimatePresence>
        {replyToId && replyMessage && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center gap-3 px-4 py-2 bg-rose-50 border-t border-rose-100"
          >
            <div className="w-1 h-8 bg-rose-400 rounded-full shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-rose-500">{replyMessage.sender}</p>
              <p className="text-xs text-gray-600 truncate">
                {replyMessage.type === 'audio' ? '🎤 Voice message' :
                 replyMessage.type === 'photo' ? '📸 Photo' :
                 replyMessage.content.slice(0, 60)}
              </p>
            </div>
            <button onClick={() => setReplyToId(null)} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="glass border-t border-rose-100 px-3 py-3 shrink-0 relative">
        {/* Emoji picker */}
        <AnimatePresence>
          {showEmoji && <EmojiPicker onPick={handleEmojiPick} onClose={() => setShowEmoji(false)} />}
        </AnimatePresence>

        {/* Gallery picker */}
        <AnimatePresence>
          {showGallery && <GalleryPicker onPick={handlePhotoPick} onClose={() => setShowGallery(false)} />}
        </AnimatePresence>

        {isRecording ? (
          /* Recording UI */
          <div className="flex items-center gap-3 h-12">
            <button onClick={stopRecording} className="w-10 h-10 rounded-full bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-200 transition-colors">
              <MicOff size={18} />
            </button>
            <div className="flex-1 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <div className="flex-1 h-1.5 bg-red-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-red-400 rounded-full"
                  animate={{ width: ['0%', '100%'] }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              </div>
              <span className="text-sm font-medium text-red-500 tabular-nums">{fmt(recordingTime)}</span>
            </div>
            <button
              onClick={stopRecording}
              className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-sm"
            >
              <Send size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            {/* Emoji */}
            <button
              onClick={() => { setShowEmoji(e => !e); setShowGallery(false) }}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0 ${showEmoji ? 'bg-rose-100 text-rose-500' : 'text-gray-400 hover:text-rose-400 hover:bg-rose-50'}`}
            >
              <Smile size={20} />
            </button>

            {/* Gallery */}
            <button
              onClick={() => { setShowGallery(g => !g); setShowEmoji(false) }}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0 ${showGallery ? 'bg-rose-100 text-rose-500' : 'text-gray-400 hover:text-rose-400 hover:bg-rose-50'}`}
            >
              <ImageIcon size={20} />
            </button>

            {/* Text input */}
            <div className="flex-1 bg-white border border-gray-200 rounded-2xl px-4 py-2.5 focus-within:border-rose-300 transition-colors">
              <textarea
                ref={inputRef}
                value={text}
                onChange={e => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
                onKeyDown={handleKeyDown}
                placeholder="Send a message…"
                rows={1}
                className="w-full text-sm outline-none bg-transparent resize-none leading-relaxed max-h-32 overflow-y-auto"
                style={{ height: '24px' }}
              />
            </div>

            {/* Send or mic */}
            {text.trim() ? (
              <button
                onClick={handleSend}
                className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-sm hover:bg-rose-600 active:scale-95 transition-all shrink-0"
              >
                <Send size={16} />
              </button>
            ) : (
              <button
                onMouseDown={startRecording}
                onTouchStart={startRecording}
                className="w-10 h-10 rounded-full bg-rose-50 text-rose-400 hover:bg-rose-100 flex items-center justify-center transition-colors shrink-0"
                title="Hold to record"
              >
                <Mic size={20} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
