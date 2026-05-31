import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Photo } from '../types'
import { useApp } from '../context/AppContext'
import { groupPhotosByDay, getMonthCalendarDays } from '../utils/dateUtils'
import { format, addMonths, subMonths, parseISO } from 'date-fns'

interface Props {
  photos: Photo[]
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarView({ photos }: Props) {
  const { dispatch } = useApp()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const byDay = groupPhotosByDay(photos)
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const days = getMonthCalendarDays(year, month)

  const selectedPhotos = selectedDay ? (byDay.get(selectedDay) ?? []) : []

  return (
    <div className="page-enter space-y-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="btn-ghost p-2">
          <ChevronLeft size={18} />
        </button>
        <h2 className="text-xl font-display font-bold text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="btn-ghost p-2">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DAYS.map(d => (
            <div key={d} className="py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {days.map((dayStr, idx) => {
            if (!dayStr) {
              return <div key={`empty-${idx}`} className="h-20 border-b border-r border-gray-50" />
            }

            const dayPhotos = byDay.get(dayStr) ?? []
            const hasPhotos = dayPhotos.length > 0
            const isToday = dayStr === format(new Date(), 'yyyy-MM-dd')
            const isSelected = dayStr === selectedDay
            const dayNum = parseInt(dayStr.split('-')[2])

            return (
              <div
                key={dayStr}
                onClick={() => hasPhotos && setSelectedDay(isSelected ? null : dayStr)}
                className={`h-20 border-b border-r border-gray-50 p-1.5 relative flex flex-col transition-colors ${
                  hasPhotos ? 'cursor-pointer hover:bg-rose-50' : ''
                } ${isSelected ? 'bg-rose-50 ring-2 ring-inset ring-rose-300' : ''}`}
              >
                {/* Day number */}
                <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-rose-500 text-white' : hasPhotos ? 'text-rose-500 font-bold' : 'text-gray-400'
                }`}>
                  {dayNum}
                </span>

                {/* Photo thumbnails */}
                {hasPhotos && (
                  <div className="flex-1 relative mt-0.5">
                    {dayPhotos.slice(0, 4).map((p, i) => (
                      <div
                        key={p.id}
                        className="absolute rounded-sm overflow-hidden border border-white"
                        style={{
                          width: dayPhotos.length === 1 ? '100%' : '45%',
                          height: dayPhotos.length === 1 ? '100%' : '45%',
                          top: i > 1 ? '52%' : '0',
                          left: i % 2 === 0 ? '0' : '52%',
                        }}
                      >
                        <img src={p.thumbData} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {dayPhotos.length > 4 && (
                      <div className="absolute bottom-0 right-0 w-5 h-5 bg-black/50 rounded-sm flex items-center justify-center">
                        <span className="text-white text-[8px] font-bold">+{dayPhotos.length - 4}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected day photos */}
      <AnimatePresence>
        {selectedDay && selectedPhotos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-rose-400" />
              <h3 className="font-semibold text-gray-900">
                {format(parseISO(selectedDay), 'MMMM d, yyyy')}
              </h3>
              <span className="text-sm text-gray-400">{selectedPhotos.length} photos</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {selectedPhotos.map(photo => (
                <div
                  key={photo.id}
                  onClick={() => dispatch({ type: 'OPEN_LIGHTBOX', photoId: photo.id })}
                  className="cursor-pointer rounded-xl overflow-hidden photo-card-hover shadow-sm"
                >
                  <img
                    src={photo.thumbData}
                    alt={photo.caption}
                    className="w-full aspect-square object-cover"
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {photos.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Calendar size={40} className="mx-auto mb-3 opacity-40" />
          <p>No photos to show in calendar.</p>
        </div>
      )}
    </div>
  )
}
