import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Clock, Star, TrendingUp, Calendar, Shuffle, Heart } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Photo } from '../types'
import {
  getOnThisDay, getMonthlyRecap, groupPhotosByMonth,
  formatMonthYear, getYearsAgo, formatPhotoDate, parseMonthKey
} from '../utils/dateUtils'
import { format } from 'date-fns'

function PhotoStrip({ photos, title, subtitle, icon, accent }: {
  photos: Photo[], title: string, subtitle: string,
  icon: React.ReactNode, accent: string
}) {
  const { dispatch } = useApp()

  if (photos.length === 0) return null

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100"
    >
      <div className="flex items-center justify-between p-5 pb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${accent}`}>
            {icon}
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-400">{subtitle}</p>
          </div>
        </div>
        <span className="text-sm text-gray-400">{photos.length} photos</span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4 px-5 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
        {photos.slice(0, 20).map((photo, i) => (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => dispatch({ type: 'OPEN_LIGHTBOX', photoId: photo.id })}
            className="shrink-0 cursor-pointer rounded-xl overflow-hidden group relative photo-card-hover shadow-sm"
            style={{ width: 140, height: 140 }}
          >
            <img src={photo.thumbData} alt={photo.caption} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-xl" />
            {photo.likes > 0 && (
              <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 bg-black/50 rounded-full px-1.5 py-0.5">
                <Heart size={10} className="fill-rose-400 text-rose-400" />
                <span className="text-white text-[10px]">{photo.likes}</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.section>
  )
}

function CollageGrid({ photos, title }: { photos: Photo[], title: string }) {
  const { dispatch } = useApp()
  if (photos.length < 4) return null

  const featured = photos.slice(0, 9)

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100"
    >
      <div className="p-5 pb-3">
        <h3 className="font-bold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-400">Memory collage</p>
      </div>
      <div className="grid grid-cols-3 gap-1 px-4 pb-4">
        {featured.map((photo, i) => (
          <div
            key={photo.id}
            onClick={() => dispatch({ type: 'OPEN_LIGHTBOX', photoId: photo.id })}
            className={`cursor-pointer rounded-xl overflow-hidden photo-card-hover ${
              i === 0 ? 'col-span-2 row-span-2' : ''
            }`}
            style={{ height: i === 0 ? 200 : 96 }}
          >
            <img src={photo.thumbData} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    </motion.section>
  )
}

export default function MemoriesPage() {
  const { state } = useApp()
  const [randomSeed, setRandomSeed] = useState(0)

  const onThisDay = useMemo(() => getOnThisDay(state.photos), [state.photos])
  const monthlyRecap = useMemo(() => getMonthlyRecap(state.photos), [state.photos])
  const topLiked = useMemo(
    () => [...state.photos].filter(p => p.likes > 0).sort((a, b) => b.likes - a.likes).slice(0, 20),
    [state.photos]
  )
  const grouped = useMemo(() => groupPhotosByMonth(state.photos), [state.photos])
  const randomMemory = useMemo(() => {
    if (state.photos.length === 0) return null
    const idx = Math.floor(Math.random() * state.photos.length)
    return state.photos[idx]
  }, [state.photos, randomSeed])

  // Year in review
  const thisYear = new Date().getFullYear()
  const yearPhotos = useMemo(
    () => state.photos.filter(p => new Date(p.uploadedAt).getFullYear() === thisYear),
    [state.photos]
  )

  // "Time capsule" - oldest photos
  const oldest = useMemo(
    () => [...state.photos].sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt)).slice(0, 10),
    [state.photos]
  )

  const { dispatch } = useApp()

  if (state.photos.length === 0) {
    return (
      <div className="text-center py-20 space-y-4 page-enter">
        <div className="text-6xl">✨</div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No memories yet</h3>
          <p className="text-gray-500 max-w-xs mx-auto">Upload some photos to start discovering your special moments and memories.</p>
        </div>
        <button onClick={() => dispatch({ type: 'TOGGLE_UPLOAD' })} className="btn-primary">
          <Sparkles size={16} /> Upload Memories
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Memories</h2>
          <p className="text-sm text-gray-500">Relive your beautiful journey together</p>
        </div>
        <Sparkles size={24} className="text-rose-400" />
      </div>

      {/* Random memory card */}
      {randomMemory && (
        <motion.div
          key={randomSeed}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative h-64 rounded-3xl overflow-hidden shadow-lg cursor-pointer group"
          onClick={() => dispatch({ type: 'OPEN_LIGHTBOX', photoId: randomMemory.id })}
        >
          <img src={randomMemory.fullData || randomMemory.thumbData} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute bottom-0 inset-x-0 p-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">✨ Random Memory</p>
                <p className="text-white font-bold text-lg">{formatPhotoDate(randomMemory.uploadedAt)}</p>
                {randomMemory.caption && (
                  <p className="text-white/80 text-sm mt-0.5">{randomMemory.caption}</p>
                )}
              </div>
              <button
                onClick={e => { e.stopPropagation(); setRandomSeed(s => s + 1) }}
                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white backdrop-blur-sm transition-colors"
                title="Show another"
              >
                <Shuffle size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* On This Day */}
      {onThisDay.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-3xl overflow-hidden border border-rose-100 shadow-sm"
        >
          <div className="p-5 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center">
              <Calendar size={20} className="text-rose-500" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">On This Day</h3>
              <p className="text-xs text-rose-400">Memories from {format(new Date(), 'MMMM d')} in past years</p>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-4 px-5" style={{ scrollbarWidth: 'none' }}>
            {onThisDay.map((photo, i) => {
              const yearsAgo = getYearsAgo(photo.uploadedAt)
              return (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => dispatch({ type: 'OPEN_LIGHTBOX', photoId: photo.id })}
                  className="shrink-0 cursor-pointer group"
                >
                  <div className="w-44 h-44 rounded-2xl overflow-hidden photo-card-hover shadow-sm relative">
                    <img src={photo.thumbData} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                      <div>
                        <p className="text-white font-bold text-sm">
                          {yearsAgo} {yearsAgo === 1 ? 'year' : 'years'} ago
                        </p>
                        {photo.caption && <p className="text-white/70 text-xs truncate">{photo.caption}</p>}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.section>
      )}

      {/* Monthly recap */}
      <PhotoStrip
        photos={monthlyRecap}
        title="Last Month's Highlights"
        subtitle={`${monthlyRecap.length} top photos`}
        icon={<Star size={20} className="text-amber-500" />}
        accent="bg-amber-50"
      />

      {/* Most liked */}
      <PhotoStrip
        photos={topLiked}
        title="Favorite Moments"
        subtitle="Most loved photos"
        icon={<Heart size={20} className="text-rose-500" />}
        accent="bg-rose-50"
      />

      {/* Year in review collage */}
      {yearPhotos.length >= 4 && (
        <CollageGrid
          photos={[...yearPhotos].sort((a, b) => b.likes - a.likes)}
          title={`${thisYear} Year in Review`}
        />
      )}

      {/* This year's stats */}
      {yearPhotos.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-3xl p-5 border border-violet-100"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-violet-100 flex items-center justify-center">
              <TrendingUp size={20} className="text-violet-500" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{thisYear} Stats</h3>
              <p className="text-xs text-violet-400">Your year in numbers</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Photos', value: yearPhotos.length },
              { label: 'Likes', value: yearPhotos.reduce((s, p) => s + p.likes, 0) },
              { label: 'Comments', value: yearPhotos.reduce((s, p) => s + p.comments.length, 0) },
            ].map(stat => (
              <div key={stat.label} className="bg-white/60 rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold text-violet-600">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Time capsule */}
      <PhotoStrip
        photos={oldest}
        title="Time Capsule"
        subtitle="Your earliest memories"
        icon={<Clock size={20} className="text-blue-500" />}
        accent="bg-blue-50"
      />

      {/* Monthly archives */}
      {grouped.size > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100"
        >
          <div className="p-5 pb-3">
            <h3 className="font-bold text-gray-900">Monthly Archives</h3>
            <p className="text-xs text-gray-400">Browse by month</p>
          </div>
          <div className="divide-y divide-gray-50 pb-2">
            {Array.from(grouped.entries()).map(([key, photos]) => {
              const cover = photos[0]
              return (
                <div
                  key={key}
                  onClick={() => {
                    dispatch({ type: 'SET_PAGE', page: 'gallery' })
                    dispatch({ type: 'SET_VIEW_MODE', mode: 'timeline' })
                  }}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
                    <img src={cover.thumbData} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">{format(parseMonthKey(key), 'MMMM yyyy')}</p>
                    <p className="text-xs text-gray-400">{photos.length} photos</p>
                  </div>
                  <div className="flex -space-x-1">
                    {photos.slice(0, 3).map(p => (
                      <div key={p.id} className="w-6 h-6 rounded-full overflow-hidden border border-white">
                        <img src={p.thumbData} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </motion.section>
      )}
    </div>
  )
}
