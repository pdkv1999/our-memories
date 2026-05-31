import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, ChevronRight, Trash2, EyeOff, ArrowLeft, MoreVertical } from 'lucide-react'
import { useApp } from '../context/AppContext'
import MasonryGrid from './MasonryGrid'
import CreateAlbumModal from './CreateAlbumModal'
import { formatPhotoDate } from '../utils/dateUtils'
import { Album } from '../types'

export default function AlbumsPage() {
  const { state, dispatch, getAlbumPhotos } = useApp()
  const [showCreate, setShowCreate] = useState(false)
  const [menuAlbumId, setMenuAlbumId] = useState<string | null>(null)

  const activeAlbum = state.activeAlbumId ? state.albums.find(a => a.id === state.activeAlbumId) : null
  const activePhotos = activeAlbum ? getAlbumPhotos(activeAlbum.id) : []

  const visibleAlbums = state.albums.filter(a => !a.isHidden)

  function getCoverPhoto(album: Album) {
    if (album.coverPhotoId) {
      const p = state.photos.find(ph => ph.id === album.coverPhotoId)
      if (p) return p.thumbData
    }
    const firstPhoto = state.photos.find(ph => album.photoIds.includes(ph.id))
    return firstPhoto?.thumbData ?? null
  }

  function handleDeleteAlbum(albumId: string) {
    if (confirm('Delete this album? Photos will not be deleted.')) {
      dispatch({ type: 'DELETE_ALBUM', id: albumId })
      setMenuAlbumId(null)
    }
  }

  function handleToggleHide(album: Album) {
    dispatch({ type: 'UPDATE_ALBUM', id: album.id, updates: { isHidden: !album.isHidden } })
    setMenuAlbumId(null)
  }

  // Album detail view
  if (activeAlbum) {
    return (
      <div className="page-enter space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => dispatch({ type: 'SET_ACTIVE_ALBUM', id: null })}
            className="btn-ghost p-2"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ backgroundColor: activeAlbum.color + '20' }}
            >
              {activeAlbum.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{activeAlbum.name}</h2>
              {activeAlbum.description && (
                <p className="text-sm text-gray-500">{activeAlbum.description}</p>
              )}
            </div>
          </div>
          <span className="ml-auto text-sm text-gray-400">{activePhotos.length} photos</span>
        </div>

        {/* Photos */}
        {activePhotos.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="text-5xl">{activeAlbum.icon}</div>
            <div>
              <p className="text-gray-600 font-medium">This album is empty</p>
              <p className="text-sm text-gray-400">Long-press photos in your gallery to add them here</p>
            </div>
          </div>
        ) : (
          <MasonryGrid photos={activePhotos} showControls={false} />
        )}
      </div>
    )
  }

  // Albums grid view
  return (
    <div className="page-enter space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Albums</h2>
          <p className="text-sm text-gray-500">{state.albums.length} albums · {state.photos.length} photos</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16} /> New Album
        </button>
      </div>

      {/* All Photos card */}
      <div
        onClick={() => {
          dispatch({ type: 'SET_PAGE', page: 'gallery' })
        }}
        className="relative overflow-hidden rounded-3xl cursor-pointer group shadow-md hover:shadow-xl transition-all duration-300 h-40 bg-gradient-to-br from-rose-400 to-pink-500"
      >
        <div className="absolute inset-0 grid grid-cols-4 gap-0.5 opacity-30">
          {state.photos.slice(0, 8).map(p => (
            <img key={p.id} src={p.thumbData} alt="" className="w-full h-full object-cover" />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/80 to-transparent flex flex-col justify-end p-5">
          <p className="text-white font-bold text-xl">All Photos</p>
          <p className="text-rose-100 text-sm">{state.photos.length} memories</p>
        </div>
        <ChevronRight size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-white opacity-70" />
      </div>

      {/* Custom albums */}
      {visibleAlbums.length === 0 && (
        <div className="text-center py-12 space-y-4">
          <div className="text-5xl">📁</div>
          <div>
            <p className="text-gray-600 font-medium">No albums yet</p>
            <p className="text-sm text-gray-400">Create albums to organize your memories</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} /> Create First Album
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {visibleAlbums.map((album, idx) => {
            const cover = getCoverPhoto(album)
            const photoCount = album.photoIds.filter(id => state.photos.find(p => p.id === id)).length

            return (
              <motion.div
                key={album.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: idx * 0.03 }}
                className="group relative cursor-pointer"
              >
                <div
                  onClick={() => dispatch({ type: 'SET_ACTIVE_ALBUM', id: album.id })}
                  className="rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 bg-white"
                >
                  {/* Cover */}
                  <div
                    className="h-36 flex items-center justify-center relative overflow-hidden"
                    style={{ backgroundColor: album.color + '15' }}
                  >
                    {cover ? (
                      <img src={cover} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <span className="text-4xl">{album.icon}</span>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    {/* Icon overlay */}
                    {cover && (
                      <div
                        className="absolute top-2 left-2 w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                        style={{ backgroundColor: album.color + '40', backdropFilter: 'blur(4px)' }}
                      >
                        {album.icon}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <p className="font-semibold text-gray-900 text-sm truncate">{album.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{photoCount} photos</p>
                  </div>
                </div>

                {/* Menu */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setMenuAlbumId(menuAlbumId === album.id ? null : album.id)}
                    className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white"
                  >
                    <MoreVertical size={14} />
                  </button>
                  <AnimatePresence>
                    {menuAlbumId === album.id && (
                      <>
                        <div className="fixed inset-0 z-[1]" onClick={() => setMenuAlbumId(null)} />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="absolute top-8 right-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1 w-40 z-[2]"
                        >
                          <button
                            onClick={() => handleToggleHide(album)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <EyeOff size={14} />
                            {album.isHidden ? 'Show' : 'Hide'} Album
                          </button>
                          <div className="h-px bg-gray-100 my-1" />
                          <button
                            onClick={() => handleDeleteAlbum(album.id)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50"
                          >
                            <Trash2 size={14} />Delete Album
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Hidden albums count */}
      {state.albums.length > visibleAlbums.length && (
        <button
          onClick={() => {/* toggle show hidden */}}
          className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1.5 mx-auto"
        >
          <EyeOff size={14} />
          {state.albums.length - visibleAlbums.length} hidden album(s)
        </button>
      )}

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && <CreateAlbumModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>
    </div>
  )
}
