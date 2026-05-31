import React, { useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Upload, Image, CheckCircle2, AlertCircle, Loader2, UploadCloud } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatFileSize } from '../utils/compression'
import { motion, AnimatePresence } from 'framer-motion'

export default function UploadModal() {
  const { state, dispatch, uploadFiles } = useApp()

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    await uploadFiles(acceptedFiles)
  }, [uploadFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
      'image/heic': ['.heic'],
    },
    multiple: true,
  })

  const allDone = state.uploadQueue.length > 0 && state.uploadQueue.every(u => u.status === 'done' || u.status === 'error')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dispatch({ type: 'CLOSE_UPLOAD' })
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [dispatch])

  const statusIcon = (status: string) => {
    if (status === 'done') return <CheckCircle2 size={16} className="text-green-500" />
    if (status === 'error') return <AlertCircle size={16} className="text-red-400" />
    if (status === 'compressing') return <Loader2 size={16} className="text-rose-500 animate-spin" />
    return <div className="w-4 h-4 rounded-full bg-gray-200" />
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => dispatch({ type: 'CLOSE_UPLOAD' })}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Upload Photos</h2>
            <p className="text-sm text-gray-500 mt-0.5">Uploading as <span className="text-rose-500 font-medium">{state.currentUser}</span></p>
          </div>
          <button
            onClick={() => dispatch({ type: 'CLOSE_UPLOAD' })}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Drop zone */}
        <div className="p-6 flex-1 overflow-y-auto">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
              isDragActive
                ? 'border-rose-400 bg-rose-50 upload-zone-active'
                : 'border-gray-200 hover:border-rose-300 hover:bg-rose-50/50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
                isDragActive ? 'bg-rose-100' : 'bg-gray-100'
              }`}>
                {isDragActive
                  ? <UploadCloud size={28} className="text-rose-500" />
                  : <Upload size={28} className="text-gray-400" />
                }
              </div>
              <div>
                <p className="font-semibold text-gray-800">
                  {isDragActive ? 'Drop photos here!' : 'Drag & drop photos'}
                </p>
                <p className="text-sm text-gray-500 mt-1">or click to browse files</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {['JPG', 'PNG', 'WebP', 'GIF', 'HEIC'].map(fmt => (
                  <span key={fmt} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{fmt}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Upload queue */}
          <AnimatePresence>
            {state.uploadQueue.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">
                    {state.uploadQueue.filter(u => u.status === 'done').length} / {state.uploadQueue.length} processed
                  </p>
                  {allDone && (
                    <button
                      onClick={() => dispatch({ type: 'CLOSE_UPLOAD' })}
                      className="text-sm text-rose-500 font-medium hover:text-rose-600"
                    >
                      Done
                    </button>
                  )}
                </div>
                {state.uploadQueue.map(item => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 bg-gray-50 rounded-xl p-3"
                  >
                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden shrink-0">
                      {item.thumbData && (
                        <img src={item.thumbData} alt="" className="w-full h-full object-cover" />
                      )}
                      {!item.thumbData && (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image size={18} className="text-gray-400" />
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.filename}</p>
                      <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-400 rounded-full transition-all duration-500"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      {item.error && <p className="text-xs text-red-400 mt-1">{item.error}</p>}
                    </div>
                    {statusIcon(item.status)}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer hint */}
        <div className="px-6 py-4 bg-rose-50 border-t border-rose-100">
          <p className="text-xs text-rose-400 text-center">
            Photos are stored privately in your browser. Only you and your partner can see them.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
