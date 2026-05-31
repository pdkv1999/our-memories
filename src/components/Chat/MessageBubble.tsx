import React, { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Reply, Play, Pause, Check, CheckCheck } from 'lucide-react'
import { Message } from '../../types'
import { useApp } from '../../context/AppContext'

const QUICK_EMOJIS = ['❤️', '😍', '😂', '😭', '🥺', '🔥', '👏', '😘']

interface Props {
  message: Message
  isOwn: boolean
  replyMessage?: Message
  onReply: (id: string) => void
}

function AudioPlayer({ src, duration }: { src: string; duration?: number }) {
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(duration ?? 0)
  const audioRef = useRef<HTMLAudioElement>(null)

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      audio.play()
    }
    setPlaying(!playing)
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0

  return (
    <div className="flex items-center gap-2 min-w-[160px]">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setTotalDuration(audioRef.current?.duration ?? duration ?? 0)}
        onEnded={() => { setPlaying(false); setCurrentTime(0) }}
      />
      <button onClick={togglePlay} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <div className="flex-1 space-y-1">
        <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-between text-[10px] opacity-70">
          <span>{fmt(currentTime)}</span>
          <span>{fmt(totalDuration)}</span>
        </div>
      </div>
    </div>
  )
}

export default function MessageBubble({ message, isOwn, replyMessage, onReply }: Props) {
  const { state, dispatch, reactToMessage } = useApp()
  const [showReactions, setShowReactions] = useState(false)
  const longPressRef = useRef<ReturnType<typeof setTimeout>>()

  const reactionCounts = message.reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] ?? 0) + 1
    return acc
  }, {})

  function handleLongPress() {
    setShowReactions(true)
  }

  const otherUser = state.currentUser === 'You' ? 'Partner' : 'You'
  const isEmojiOnly = message.type === 'text' && /^(\p{Emoji}\s*)+$/u.test(message.content.trim()) && message.content.length <= 8

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`flex items-end gap-2 group ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      {!isOwn && (
        <div className="w-7 h-7 rounded-full bg-violet-400 flex items-center justify-center text-white text-xs font-bold shrink-0 mb-1">
          {message.sender[0]}
        </div>
      )}

      <div className={`flex flex-col gap-1 max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Reply preview */}
        {replyMessage && (
          <div className={`text-xs px-3 py-1.5 rounded-xl border-l-2 border-rose-400 bg-rose-50/80 max-w-full truncate ${isOwn ? 'self-end' : ''}`}>
            <span className="text-rose-500 font-medium">{replyMessage.sender} · </span>
            <span className="text-gray-600">
              {replyMessage.type === 'audio' ? '🎤 Voice message' :
               replyMessage.type === 'photo' ? '📸 Photo' :
               replyMessage.content.slice(0, 40)}
            </span>
          </div>
        )}

        {/* Bubble */}
        <div className="relative">
          <div
            onMouseDown={() => { longPressRef.current = setTimeout(handleLongPress, 500) }}
            onMouseUp={() => clearTimeout(longPressRef.current)}
            onTouchStart={() => { longPressRef.current = setTimeout(handleLongPress, 500) }}
            onTouchEnd={() => { clearTimeout(longPressRef.current) }}
            className={`relative rounded-2xl px-4 py-2.5 cursor-default select-none transition-transform active:scale-95 ${
              isEmojiOnly ? 'bg-transparent px-0 py-0' : isOwn
                ? 'bg-gradient-to-br from-rose-500 to-rose-600 text-white rounded-br-md'
                : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md'
            }`}
          >
            {message.type === 'text' && (
              isEmojiOnly
                ? <span className="text-4xl leading-none">{message.content}</span>
                : <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{message.content}</p>
            )}

            {message.type === 'photo' && message.photoThumb && (
              <div
                onClick={() => message.photoId && dispatch({ type: 'OPEN_LIGHTBOX', photoId: message.photoId })}
                className="cursor-pointer rounded-xl overflow-hidden -mx-1 -my-1"
              >
                <img src={message.photoThumb} alt="Shared photo" className="max-w-[240px] max-h-[240px] object-cover rounded-xl" />
              </div>
            )}

            {message.type === 'audio' && (
              <AudioPlayer src={message.content} duration={message.audioDuration} />
            )}
          </div>

          {/* Reaction emoji picker popover */}
          <AnimatePresence>
            {showReactions && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowReactions(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`absolute bottom-full mb-2 z-20 bg-white rounded-2xl shadow-xl border border-gray-100 px-3 py-2 flex items-center gap-1 ${isOwn ? 'right-0' : 'left-0'}`}
                >
                  {QUICK_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => { reactToMessage(message.id, emoji); setShowReactions(false) }}
                      className="text-xl hover:scale-125 transition-transform p-0.5"
                    >
                      {emoji}
                    </button>
                  ))}
                  <div className="w-px h-5 bg-gray-200 mx-1" />
                  <button
                    onClick={() => { onReply(message.id); setShowReactions(false) }}
                    className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700"
                  >
                    <Reply size={14} />
                  </button>
                  {isOwn && (
                    <button
                      onClick={() => { dispatch({ type: 'DELETE_MESSAGE', id: message.id }); setShowReactions(false) }}
                      className="p-1 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Reaction bubbles */}
        {Object.entries(reactionCounts).length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => reactToMessage(message.id, emoji)}
                className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-full px-2 py-0.5 text-xs shadow-sm hover:bg-rose-50 hover:border-rose-200 transition-colors"
              >
                <span>{emoji}</span>
                {count > 1 && <span className="text-gray-500">{count}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Timestamp + read */}
        <div className={`flex items-center gap-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-gray-400">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isOwn && (
            message.read
              ? <CheckCheck size={12} className="text-rose-400" />
              : <Check size={12} className="text-gray-300" />
          )}
        </div>

        {/* Quick action on hover */}
        <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => onReply(message.id)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <Reply size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
