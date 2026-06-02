import React, { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Download, Loader2, RefreshCw, AlertCircle, Image } from 'lucide-react'
import { requestPhotosToken, listGooglePhotos, downloadGPhoto, GPhoto } from '../utils/googlePhotos'
import { useApp } from '../context/AppContext'

interface Props {
  onClose: () => void
}

export default function GooglePhotosPicker({ onClose }: Props) {
  const { uploadFiles } = useApp()

  const [token,          setToken]          = useState<string | null>(null)
  const [photos,         setPhotos]         = useState<GPhoto[]>([])
  const [nextPageToken,  setNextPageToken]  = useState<string | undefined>()
  const [selected,       setSelected]       = useState<Set<string>>(new Set())
  const [loading,        setLoading]        = useState(true)
  const [loadingMore,    setLoadingMore]    = useState(false)
  const [importing,      setImporting]      = useState(false)
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })
  const [error,          setError]          = useState('')

  const bottomRef = useRef<HTMLDivElement>(null)

  // Authenticate + load first page
  useEffect(() => {
    auth()
  }, [])

  async function auth() {
    setLoading(true)
    setError('')
    try {
      const t = await requestPhotosToken()
      setToken(t)
      await load(t, undefined, [])
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  async function load(t: string, pageToken: string | undefined, existing: GPhoto[]) {
    try {
      const { photos: newPhotos, nextPageToken: next } = await listGooglePhotos(t, pageToken)
      setPhotos([...existing, ...newPhotos])
      setNextPageToken(next)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  async function loadMore() {
    if (!token || !nextPageToken || loadingMore) return
    setLoadingMore(true)
    await load(token, nextPageToken, photos)
  }

  // Infinite scroll
  useEffect(() => {
    const el = bottomRef.current
    if (!el) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore()
    }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [token, nextPageToken, photos, loadingMore])

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(photos.map(p => p.id)))
  }

  async function importSelected() {
    if (!selected.size) return
    const toImport = photos.filter(p => selected.has(p.id))
    setImporting(true)
    setImportProgress({ done: 0, total: toImport.length })

    const files: File[] = []
    for (const photo of toImport) {
      try {
        const file = await downloadGPhoto(photo)
        files.push(file)
      } catch { /* skip failed downloads */ }
      setImportProgress(p => ({ ...p, done: p.done + 1 }))
    }

    if (files.length) await uploadFiles(files)
    setImporting(false)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && !importing && onClose()}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        className="bg-white w-full sm:max-w-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        style={{ maxHeight: '92dvh' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
          {/* Google Photos logo colours */}
          <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
            <svg viewBox="0 0 192 192" className="w-full h-full">
              <path d="M96 0C43 0 0 43 0 96s43 96 96 96 96-43 96-96S149 0 96 0z" fill="#fff"/>
              <path d="M96 56c-22.1 0-40 17.9-40 40H16c0-44.2 35.8-80 80-80v80H56c0-22.1 17.9-40 40-40z" fill="#fbbc04"/>
              <path d="M176 96c0-22.1-17.9-40-40-40V16c44.2 0 80 35.8 80 80h-80c0 22.1-17.9 40-40 40z" fill="#0f9d58" transform="rotate(90 96 96)"/>
              <path d="M96 136c22.1 0 40-17.9 40-40h40c0 44.2-35.8 80-80 80v-80h40c0 22.1-17.9 40-40 40z" fill="#4285f4" transform="rotate(180 96 96)"/>
              <path d="M56 96c0 22.1 17.9 40 40 40v40c-44.2 0-80-35.8-80-80h80c0-22.1 17.9-40 40-40z" fill="#ea4335" transform="rotate(270 96 96)"/>
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-gray-900">Google Photos</h2>
            <p className="text-xs text-gray-400">
              {loading ? 'Loading your photos…' : `${photos.length} photos${nextPageToken ? '+' : ''} · ${selected.size} selected`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!loading && photos.length > 0 && (
              <button onClick={selectAll}
                className="text-xs font-medium text-rose-500 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors">
                Select all
              </button>
            )}
            <button onClick={onClose} disabled={importing}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Loading skeleton */}
          {loading && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1 p-2">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
              <AlertCircle size={40} className="text-red-300" />
              <div>
                <p className="font-semibold text-gray-700">Couldn't load photos</p>
                <p className="text-sm text-gray-400 mt-1 max-w-xs">{error}</p>
                {error.includes('VITE_GOOGLE_CLIENT_ID') && (
                  <p className="text-xs text-rose-500 mt-2">
                    Add VITE_GOOGLE_CLIENT_ID to your .env and Vercel env vars first.
                  </p>
                )}
              </div>
              <button onClick={auth}
                className="flex items-center gap-2 text-sm font-medium text-rose-500 hover:text-rose-600">
                <RefreshCw size={14} /> Try again
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && photos.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Image size={40} className="text-gray-200" strokeWidth={1} />
              <p className="text-gray-400 text-sm">No photos found in your Google Photos library.</p>
            </div>
          )}

          {/* Photo grid */}
          {!loading && photos.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1 p-2">
              {photos.map(photo => {
                const isSelected = selected.has(photo.id)
                return (
                  <button key={photo.id} onClick={() => toggleSelect(photo.id)}
                    className="relative aspect-square rounded-xl overflow-hidden group focus:outline-none">
                    <img
                      src={`${photo.baseUrl}=w400-h400-c`}
                      alt={photo.filename}
                      className={`w-full h-full object-cover transition-all duration-200 ${isSelected ? 'brightness-75' : 'group-hover:brightness-90'}`}
                      loading="lazy"
                    />
                    {/* Selection indicator */}
                    <div className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
                      isSelected
                        ? 'bg-rose-500 border-rose-500 scale-110'
                        : 'bg-white/70 border-white/90 scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100'
                    }`}>
                      {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                    </div>
                  </button>
                )
              })}

              {/* Infinite scroll sentinel */}
              <div ref={bottomRef} className="col-span-full h-4 flex items-center justify-center">
                {loadingMore && <Loader2 size={20} className="text-gray-300 animate-spin" />}
              </div>
            </div>
          )}
        </div>

        {/* Import bar */}
        <AnimatePresence>
          {(selected.size > 0 || importing) && (
            <motion.div
              initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
              className="border-t border-gray-100 px-5 py-4 bg-white shrink-0"
            >
              {importing ? (
                <div className="flex items-center gap-4">
                  <Loader2 size={20} className="text-rose-500 animate-spin shrink-0" />
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Importing photos…</span>
                      <span>{importProgress.done}/{importProgress.total}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-rose-500 rounded-full"
                        animate={{ width: `${(importProgress.done / importProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelected(new Set())}
                    className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                    Clear
                  </button>
                  <button onClick={importSelected}
                    className="flex-1 flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white font-semibold py-3 rounded-2xl transition-all shadow-sm shadow-rose-200">
                    <Download size={16} />
                    Import {selected.size} photo{selected.size !== 1 ? 's' : ''} into Our Memories
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
