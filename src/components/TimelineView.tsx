import React from 'react'
import { motion } from 'framer-motion'
import { MapPin, Heart, Clock } from 'lucide-react'
import { Photo } from '../types'
import { useApp } from '../context/AppContext'
import { groupPhotosByMonth, formatPhotoDate, parseMonthKey } from '../utils/dateUtils'
import { format } from 'date-fns'

interface Props {
  photos: Photo[]
}

export default function TimelineView({ photos }: Props) {
  const { dispatch, likePhoto } = useApp()
  const grouped = groupPhotosByMonth(photos)

  if (photos.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <Clock size={40} className="mx-auto mb-3 opacity-40" />
        <p>No photos to show in timeline.</p>
      </div>
    )
  }

  return (
    <div className="space-y-10 page-enter">
      {Array.from(grouped.entries()).map(([monthKey, monthPhotos], groupIdx) => {
        const monthDate = parseMonthKey(monthKey)
        const monthLabel = format(monthDate, 'MMMM')
        const yearLabel = format(monthDate, 'yyyy')

        return (
          <motion.section
            key={monthKey}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIdx * 0.05 }}
          >
            {/* Month header */}
            <div className="flex items-end gap-3 mb-4 sticky top-16 z-10 bg-rose-25/95 backdrop-blur-sm py-2">
              <div>
                <span className="text-3xl font-display font-bold text-gray-900">{monthLabel}</span>
                <span className="ml-2 text-xl text-gray-400 font-light">{yearLabel}</span>
              </div>
              <span className="mb-1 text-sm text-gray-400 font-medium">{monthPhotos.length} photos</span>
            </div>

            {/* Photos grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {monthPhotos.map((photo, idx) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.02 }}
                  className="relative group cursor-pointer rounded-xl overflow-hidden bg-gray-100 photo-card-hover shadow-sm"
                  onClick={() => dispatch({ type: 'OPEN_LIGHTBOX', photoId: photo.id })}
                >
                  <img
                    src={photo.thumbData}
                    alt={photo.caption || photo.filename}
                    className="w-full h-auto block"
                    style={{ aspectRatio: photo.aspectRatio > 1.2 ? '4/3' : photo.aspectRatio < 0.8 ? '3/4' : '1/1' }}
                    loading="lazy"
                  />
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col justify-end p-2">
                    <p className="text-white text-[10px]">{formatPhotoDate(photo.uploadedAt)}</p>
                    <div className="flex items-center justify-between mt-1">
                      {photo.location && (
                        <div className="flex items-center gap-0.5 text-white/70 text-[10px]">
                          <MapPin size={8} />
                          <span className="truncate max-w-[60px]">{photo.location}</span>
                        </div>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); likePhoto(photo.id) }}
                        className="ml-auto flex items-center gap-0.5"
                      >
                        <Heart
                          size={12}
                          className={photo.liked ? 'fill-rose-400 text-rose-400' : 'text-white'}
                        />
                        {photo.likes > 0 && <span className="text-white text-[10px]">{photo.likes}</span>}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )
      })}
    </div>
  )
}
