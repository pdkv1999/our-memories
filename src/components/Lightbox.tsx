import React, { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ChevronLeft, ChevronRight, Heart, Download, Info, Play, Pause,
  ZoomIn, ZoomOut, MessageCircle, Send, Trash2, MapPin, Tag, Edit2, Check
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatPhotoDate, formatRelative } from '../utils/dateUtils'

export default function Lightbox() {
  const { state, dispatch, likePhoto, addComment, deleteComment, navigatePhoto, deletePhotos } = useApp()
  const [showInfo, setShowInfo] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [commentText, setCommentText] = useState('')
  const [editCaption, setEditCaption] = useState(false)
  const [captionText, setCaptionText] = useState('')
  const [editLocation, setEditLocation] = useState(false)
  const [locationText, setLocationText] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  const slideshowRef = useRef<ReturnType<typeof setInterval>>()
  const commentRef = useRef<HTMLInputElement>(null)

  const photoId = state.lightboxPhotoId
  const photo = photoId ? state.photos.find(p => p.id === photoId) : null

  const navigate = useCallback((dir: 'prev' | 'next') => {
    setDirection(dir)
    setZoom(1)
    navigatePhoto(dir)
  }, [navigatePhoto])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!photoId) return
      if (e.key === 'Escape') dispatch({ type: 'CLOSE_LIGHTBOX' })
      if (e.key === 'ArrowRight') navigate('next')
      if (e.key === 'ArrowLeft') navigate('prev')
      if (e.key === 'l' || e.key === 'L') photo && likePhoto(photo.id)
      if (e.key === 'i' || e.key === 'I') setShowInfo(s => !s)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [photoId, photo, dispatch, navigate, likePhoto])

  // Slideshow
  useEffect(() => {
    if (state.slideshowActive) {
      slideshowRef.current = setInterval(() => navigate('next'), state.slideshowInterval)
    } else {
      clearInterval(slideshowRef.current)
    }
    return () => clearInterval(slideshowRef.current)
  }, [state.slideshowActive, state.slideshowInterval, navigate])

  // Sync caption/location edit state
  useEffect(() => {
    if (photo) {
      setCaptionText(photo.caption)
      setLocationText(photo.location)
    }
  }, [photo?.id])

  // Touch swipe
  const touchStartX = useRef(0)
  function handleTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX }
  function handleTouchEnd(e: React.TouchEvent) {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) navigate(diff > 0 ? 'next' : 'prev')
  }

  function handleDownload() {
    if (!photo) return
    const a = document.createElement('a')
    a.href = photo.fullData
    a.download = photo.filename
    a.click()
  }

  function handleSaveCaption() {
    if (!photo) return
    dispatch({ type: 'UPDATE_PHOTO', id: photo.id, updates: { caption: captionText } })
    setEditCaption(false)
  }

  function handleSaveLocation() {
    if (!photo) return
    dispatch({ type: 'UPDATE_PHOTO', id: photo.id, updates: { location: locationText } })
    setEditLocation(false)
  }

  function handleAddTag() {
    if (!photo || !tagInput.trim()) return
    const tag = tagInput.trim().toLowerCase()
    if (!photo.tags.includes(tag)) {
      dispatch({ type: 'UPDATE_PHOTO', id: photo.id, updates: { tags: [...photo.tags, tag] } })
    }
    setTagInput('')
  }

  function handleRemoveTag(tag: string) {
    if (!photo) return
    dispatch({ type: 'UPDATE_PHOTO', id: photo.id, updates: { tags: photo.tags.filter(t => t !== tag) } })
  }

  function handleComment() {
    if (!photo || !commentText.trim()) return
    addComment(photo.id, commentText.trim())
    setCommentText('')
  }

  function handleDelete() {
    if (!photo) return
    if (confirm('Delete this photo?')) {
      deletePhotos([photo.id])
      dispatch({ type: 'CLOSE_LIGHTBOX' })
    }
  }

  if (!photo) return null

  const animClass = direction === 'next' ? 'slideshow-next' : 'slideshow-prev'

  return (
    <div className="lightbox-overlay flex">
      {/* Backdrop close */}
      <div className="absolute inset-0" onClick={() => dispatch({ type: 'CLOSE_LIGHTBOX' })} />

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${
            photo.uploadedBy === 'Dileep' ? 'bg-rose-400' : 'bg-violet-400'
          }`}>
            {photo.uploadedBy[0]}
          </div>
          <div>
            <p className="text-white text-sm font-medium leading-none">{photo.uploadedBy}</p>
            <p className="text-white/60 text-xs">{formatRelative(photo.uploadedAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Slideshow */}
          <button
            onClick={() => dispatch({ type: 'TOGGLE_SLIDESHOW' })}
            title={state.slideshowActive ? 'Stop slideshow' : 'Start slideshow'}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            {state.slideshowActive ? <Pause size={16} /> : <Play size={16} />}
          </button>
          {/* Zoom */}
          <button
            onClick={() => setZoom(z => z >= 2 ? 1 : z + 0.5)}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            {zoom > 1 ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
          </button>
          {/* Info */}
          <button
            onClick={() => setShowInfo(s => !s)}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition-colors ${showInfo ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'}`}
          >
            <Info size={16} />
          </button>
          {/* Download */}
          <button
            onClick={handleDownload}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <Download size={16} />
          </button>
          {/* Delete */}
          <button
            onClick={handleDelete}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-red-500/60 flex items-center justify-center text-white transition-colors"
          >
            <Trash2 size={16} />
          </button>
          {/* Close */}
          <button
            onClick={() => dispatch({ type: 'CLOSE_LIGHTBOX' })}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main image area */}
      <div
        className="flex-1 flex items-center justify-center relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Prev button */}
        <button
          onClick={() => navigate('prev')}
          className="absolute left-3 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
        >
          <ChevronLeft size={22} />
        </button>

        {/* Photo */}
        <div
          key={photo.id}
          className={animClass}
          style={{ maxWidth: showInfo ? 'calc(100vw - 360px)' : '100%', transition: 'max-width 0.3s ease' }}
        >
          <img
            src={photo.fullData}
            alt={photo.caption || photo.filename}
            style={{
              maxHeight: '90vh',
              maxWidth: '100%',
              objectFit: 'contain',
              transform: `scale(${zoom})`,
              transition: 'transform 0.3s ease',
              cursor: zoom > 1 ? 'grab' : 'default',
            }}
            draggable={false}
          />
        </div>

        {/* Next button */}
        <button
          onClick={() => navigate('next')}
          className="absolute right-3 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
        >
          <ChevronRight size={22} />
        </button>

        {/* Bottom like bar */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/40 backdrop-blur-md rounded-full px-5 py-2.5 z-10">
          <button onClick={() => likePhoto(photo.id)} className="heart-btn flex items-center gap-1.5">
            <Heart
              size={20}
              className={`transition-all duration-200 ${photo.liked ? 'fill-rose-400 text-rose-400 scale-110' : 'text-white'}`}
            />
            <span className="text-white text-sm font-medium">{photo.likes}</span>
          </button>
          <button
            onClick={() => { setShowInfo(true); setTimeout(() => commentRef.current?.focus(), 200) }}
            className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors"
          >
            <MessageCircle size={18} />
            <span className="text-sm">{photo.comments.length}</span>
          </button>
        </div>
      </div>

      {/* Info panel */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ x: 360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 360, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-80 bg-white h-full overflow-y-auto flex flex-col shrink-0 z-10"
            onClick={e => e.stopPropagation()}
          >
            {/* Caption */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Caption</span>
                <button onClick={() => setEditCaption(e => !e)} className="text-rose-400 hover:text-rose-500">
                  {editCaption ? <X size={14} /> : <Edit2 size={14} />}
                </button>
              </div>
              {editCaption ? (
                <div className="flex gap-2">
                  <textarea
                    value={captionText}
                    onChange={e => setCaptionText(e.target.value)}
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none outline-none focus:border-rose-300"
                    rows={3}
                    placeholder="Add a caption…"
                  />
                  <button onClick={handleSaveCaption} className="text-green-500 hover:text-green-600 self-end">
                    <Check size={18} />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-700">{photo.caption || <span className="text-gray-300 italic">No caption</span>}</p>
              )}
            </div>

            {/* Location */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-gray-400" />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Location</span>
                </div>
                <button onClick={() => setEditLocation(e => !e)} className="text-rose-400 hover:text-rose-500">
                  {editLocation ? <X size={14} /> : <Edit2 size={14} />}
                </button>
              </div>
              {editLocation ? (
                <div className="flex gap-2">
                  <input
                    value={locationText}
                    onChange={e => setLocationText(e.target.value)}
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-rose-300"
                    placeholder="Add location…"
                    onKeyDown={e => e.key === 'Enter' && handleSaveLocation()}
                  />
                  <button onClick={handleSaveLocation} className="text-green-500 hover:text-green-600">
                    <Check size={18} />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-700">{photo.location || <span className="text-gray-300 italic">No location</span>}</p>
              )}
            </div>

            {/* Tags */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-1.5 mb-2">
                <Tag size={13} className="text-gray-400" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tags</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {photo.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 bg-rose-50 text-rose-600 text-xs px-2 py-0.5 rounded-full">
                    #{tag}
                    <button onClick={() => handleRemoveTag(tag)} className="hover:text-rose-800">
                      <X size={10} />
                    </button>
                  </span>
                ))}
                {photo.tags.length === 0 && <p className="text-xs text-gray-300 italic">No tags</p>}
              </div>
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                  placeholder="Add tag…"
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-rose-300"
                />
                <button onClick={handleAddTag} className="text-rose-400 hover:text-rose-500 px-2">Add</button>
              </div>
            </div>

            {/* Details */}
            <div className="p-4 border-b border-gray-100 space-y-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Details</span>
              <div className="text-xs text-gray-600 space-y-1">
                <p><span className="text-gray-400">Date:</span> {formatPhotoDate(photo.uploadedAt)}</p>
                <p><span className="text-gray-400">Uploaded by:</span> {photo.uploadedBy}</p>
                <p><span className="text-gray-400">File:</span> {photo.filename}</p>
                <p><span className="text-gray-400">Size:</span> {photo.width} × {photo.height}px</p>
              </div>
            </div>

            {/* Comments */}
            <div className="p-4 flex-1 flex flex-col">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-3">
                Comments ({photo.comments.length})
              </span>
              <div className="flex-1 space-y-3 mb-4 overflow-y-auto">
                {photo.comments.length === 0 && (
                  <p className="text-xs text-gray-300 italic">Be the first to comment!</p>
                )}
                {photo.comments.map(comment => (
                  <div key={comment.id} className="flex gap-2.5 group">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                      comment.author === 'Dileep' ? 'bg-rose-400' : 'bg-violet-400'
                    }`}>
                      {comment.author[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-gray-700">{comment.author}</span>
                        <button
                          onClick={() => deleteComment(photo.id, comment.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              {/* Comment input */}
              <div className="flex gap-2 items-center border border-gray-200 rounded-xl px-3 py-2 focus-within:border-rose-300 transition-colors">
                <input
                  ref={commentRef}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleComment()}
                  placeholder="Add a comment…"
                  className="flex-1 text-sm outline-none bg-transparent"
                />
                <button onClick={handleComment} className="text-rose-400 hover:text-rose-500 disabled:opacity-30" disabled={!commentText.trim()}>
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
