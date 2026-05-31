import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { LayoutGrid, Columns, AlignLeft, Calendar, BookMarked, Upload, X, Trash2, FolderPlus, SortAsc } from 'lucide-react'
import PhotoCard from './PhotoCard'
import { useApp } from '../context/AppContext'
import { Photo, ViewMode, SortOrder } from '../types'
import TimelineView from './TimelineView'
import CalendarView from './CalendarView'

const PAGE_SIZE = 40

interface Props {
  photos?: Photo[]
  showControls?: boolean
}

export default function MasonryGrid({ photos: photoProp, showControls = true }: Props) {
  const { state, dispatch, deletePhotos, getFilteredPhotos } = useApp()
  const [page, setPage] = useState(1)
  const loaderRef = useRef<HTMLDivElement>(null)

  const allPhotos = photoProp ?? getFilteredPhotos()
  const visible = allPhotos.slice(0, page * PAGE_SIZE)
  const hasMore = visible.length < allPhotos.length

  // Infinite scroll
  useEffect(() => {
    if (!hasMore) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setPage(p => p + 1)
    }, { threshold: 0.1 })
    if (loaderRef.current) obs.observe(loaderRef.current)
    return () => obs.disconnect()
  }, [hasMore])

  // Reset page on filter change
  useEffect(() => {
    setPage(1)
  }, [state.searchQuery, state.sortOrder, state.viewMode])

  const viewModes: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'masonry', icon: <Columns size={16} />, label: 'Masonry' },
    { mode: 'grid', icon: <LayoutGrid size={16} />, label: 'Grid' },
    { mode: 'timeline', icon: <AlignLeft size={16} />, label: 'Timeline' },
    { mode: 'album', icon: <BookMarked size={16} />, label: 'Albums' },
    { mode: 'calendar', icon: <Calendar size={16} />, label: 'Calendar' },
  ]

  const sortOptions: { order: SortOrder; label: string }[] = [
    { order: 'newest', label: 'Newest first' },
    { order: 'oldest', label: 'Oldest first' },
    { order: 'most-liked', label: 'Most liked' },
  ]

  function handleBulkDelete() {
    if (state.selectedPhotoIds.length > 0 && confirm(`Delete ${state.selectedPhotoIds.length} photo(s)?`)) {
      deletePhotos(state.selectedPhotoIds)
    }
  }

  // Redirect to albums page when album view mode is selected
  useEffect(() => {
    if (state.viewMode === 'album') {
      dispatch({ type: 'SET_PAGE', page: 'albums' })
    }
  }, [state.viewMode])

  if (state.viewMode === 'timeline') return <TimelineView photos={allPhotos} />
  if (state.viewMode === 'calendar') return <CalendarView photos={allPhotos} />
  if (state.viewMode === 'album') return null

  const isGrid = state.viewMode === 'grid'

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      {showControls && (
        <div className="flex items-center gap-3 flex-wrap">
          {/* Selection mode controls */}
          {state.isSelecting ? (
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <span className="text-sm font-medium text-gray-700">
                {state.selectedPhotoIds.length} selected
              </span>
              <button onClick={() => dispatch({ type: 'SELECT_ALL', ids: allPhotos.map(p => p.id) })}
                className="text-sm text-rose-500 hover:text-rose-600 font-medium">
                Select all
              </button>
              <button onClick={handleBulkDelete}
                className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 font-medium">
                <Trash2 size={14} /> Delete
              </button>
              {state.selectedPhotoIds.length > 0 && (
                <button
                  onClick={() => {
                    dispatch({ type: 'SET_PAGE', page: 'albums' })
                  }}
                  className="flex items-center gap-1.5 text-sm text-rose-500 hover:text-rose-600 font-medium"
                >
                  <FolderPlus size={14} /> Add to album
                </button>
              )}
              <button onClick={() => dispatch({ type: 'CLEAR_SELECTION' })}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 ml-auto font-medium">
                <X size={14} /> Cancel
              </button>
            </div>
          ) : (
            <>
              <span className="text-sm text-gray-500">{allPhotos.length} photos</span>

              {/* Sort */}
              <div className="relative group">
                <button className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors">
                  <SortAsc size={14} />
                  {sortOptions.find(s => s.order === state.sortOrder)?.label}
                </button>
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg py-1 w-36 z-10 hidden group-hover:block">
                  {sortOptions.map(opt => (
                    <button
                      key={opt.order}
                      onClick={() => dispatch({ type: 'SET_SORT', order: opt.order })}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        state.sortOrder === opt.order ? 'text-rose-500 bg-rose-50 font-medium' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* View toggles */}
              <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 ml-auto">
                {viewModes.map(vm => (
                  <button
                    key={vm.mode}
                    onClick={() => dispatch({ type: 'SET_VIEW_MODE', mode: vm.mode })}
                    title={vm.label}
                    className={`p-1.5 rounded-lg transition-all duration-150 ${
                      state.viewMode === vm.mode
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    {vm.icon}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Empty state */}
      {allPhotos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-6">
          <div className="w-24 h-24 rounded-3xl bg-rose-50 flex items-center justify-center">
            <Upload size={36} className="text-rose-300" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No photos yet</h3>
            <p className="text-gray-500 max-w-xs">
              {state.searchQuery ? 'No photos match your search.' : 'Upload your first memory and start building your shared story together.'}
            </p>
          </div>
          {!state.searchQuery && (
            <button onClick={() => dispatch({ type: 'TOGGLE_UPLOAD' })} className="btn-primary">
              <Upload size={16} /> Upload Photos
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {allPhotos.length > 0 && (
        <>
          {isGrid ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
              <AnimatePresence mode="popLayout">
                {visible.map(photo => (
                  <PhotoCard key={photo.id} photo={photo} />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="masonry-grid">
              <AnimatePresence mode="popLayout">
                {visible.map(photo => (
                  <div key={photo.id} className="masonry-item">
                    <PhotoCard photo={photo} />
                  </div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Infinite scroll trigger */}
          {hasMore && (
            <div ref={loaderRef} className="h-12 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
            </div>
          )}
        </>
      )}
    </div>
  )
}
