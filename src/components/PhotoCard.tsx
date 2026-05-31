import React, { useState } from 'react'
import { Heart, MapPin, MessageCircle, MoreHorizontal, CheckCircle2, BookMarked, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Photo } from '../types'
import { useApp } from '../context/AppContext'
import { formatPhotoDate } from '../utils/dateUtils'

interface Props {
  photo: Photo
  showUploader?: boolean
}

export default function PhotoCard({ photo, showUploader = true }: Props) {
  const { state, dispatch, likePhoto, deletePhotos } = useApp()
  const [imgLoaded, setImgLoaded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const isSelected = state.selectedPhotoIds.includes(photo.id)

  function handleClick(e: React.MouseEvent) {
    if (state.isSelecting) {
      e.preventDefault()
      dispatch({ type: 'TOGGLE_SELECT', photoId: photo.id })
    } else {
      dispatch({ type: 'OPEN_LIGHTBOX', photoId: photo.id })
    }
  }

  function handleLike(e: React.MouseEvent) {
    e.stopPropagation()
    likePhoto(photo.id)
  }

  function handleMenuClick(e: React.MouseEvent) {
    e.stopPropagation()
    setMenuOpen(o => !o)
  }

  function handleLongPress() {
    if (!state.isSelecting) {
      dispatch({ type: 'SET_SELECTING', value: true })
      dispatch({ type: 'TOGGLE_SELECT', photoId: photo.id })
    }
  }

  let pressTimer: ReturnType<typeof setTimeout>

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.25 }}
      className={`photo-card photo-card-hover relative cursor-pointer rounded-2xl overflow-hidden bg-gray-100 group shadow-sm ${
        isSelected ? 'ring-2 ring-rose-500 ring-offset-2 selected' : ''
      }`}
      onClick={handleClick}
      onMouseDown={() => { pressTimer = setTimeout(handleLongPress, 500) }}
      onMouseUp={() => clearTimeout(pressTimer)}
      onTouchStart={() => { pressTimer = setTimeout(handleLongPress, 500) }}
      onTouchEnd={() => clearTimeout(pressTimer)}
    >
      {/* Image */}
      <img
        src={photo.thumbData}
        alt={photo.caption || photo.filename}
        className={`w-full h-auto block transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ aspectRatio: photo.aspectRatio }}
        loading="lazy"
        onLoad={() => setImgLoaded(true)}
      />

      {/* Skeleton while loading */}
      {!imgLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" style={{ paddingBottom: `${(1 / photo.aspectRatio) * 100}%` }} />
      )}

      {/* Select checkbox */}
      <div className={`photo-select-overlay absolute top-2 left-2 ${isSelected ? 'opacity-100' : ''}`}>
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
          isSelected ? 'bg-rose-500 border-rose-500' : 'bg-white/80 border-white'
        }`}>
          {isSelected && <CheckCircle2 size={14} className="text-white fill-white" />}
        </div>
      </div>

      {/* Uploader badge */}
      {showUploader && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-bold shadow-sm ${
            photo.uploadedBy === 'You' ? 'bg-rose-400' : 'bg-violet-400'
          }`}>
            {photo.uploadedBy[0]}
          </div>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-3">
        <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
          {photo.caption && (
            <p className="text-white text-xs font-medium mb-1 line-clamp-2 leading-relaxed">{photo.caption}</p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-white/80 text-xs">
              <span>{formatPhotoDate(photo.uploadedAt)}</span>
              {photo.location && (
                <>
                  <span>·</span>
                  <MapPin size={10} />
                  <span className="max-w-[80px] truncate">{photo.location}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {photo.comments.length > 0 && (
                <div className="flex items-center gap-0.5 text-white/80 text-xs">
                  <MessageCircle size={12} />
                  <span>{photo.comments.length}</span>
                </div>
              )}
              <button
                onClick={handleLike}
                className="flex items-center gap-0.5 heart-btn"
              >
                <Heart
                  size={16}
                  className={`transition-all ${photo.liked ? 'fill-rose-400 text-rose-400' : 'text-white'}`}
                />
                {photo.likes > 0 && <span className="text-white text-xs">{photo.likes}</span>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Context menu */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" onClick={e => e.stopPropagation()}>
        <button
          onClick={handleMenuClick}
          className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
        >
          <MoreHorizontal size={14} />
        </button>
        <AnimatePresence>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-[1]" onClick={() => setMenuOpen(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute bottom-8 right-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1 w-40 z-[2]"
              >
                <button
                  onClick={() => { dispatch({ type: 'OPEN_LIGHTBOX', photoId: photo.id }); setMenuOpen(false) }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <BookMarked size={14} />View
                </button>
                <button
                  onClick={() => { dispatch({ type: 'SET_SELECTING', value: true }); dispatch({ type: 'TOGGLE_SELECT', photoId: photo.id }); setMenuOpen(false) }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <CheckCircle2 size={14} />Select
                </button>
                <div className="h-px bg-gray-100 my-1" />
                <button
                  onClick={() => { deletePhotos([photo.id]); setMenuOpen(false) }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50"
                >
                  <Trash2 size={14} />Delete
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
