import React, { useState } from 'react'
import { X, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { useApp } from '../context/AppContext'

interface Props {
  onClose: () => void
  onCreated?: (albumId: string) => void
}

const PRESET_ALBUMS = [
  { name: 'First Date', icon: '🌹', color: '#f43f5e' },
  { name: 'Vacations', icon: '✈️', color: '#06b6d4' },
  { name: 'Anniversaries', icon: '💍', color: '#f59e0b' },
  { name: 'Birthdays', icon: '🎂', color: '#8b5cf6' },
  { name: 'Special Moments', icon: '⭐', color: '#10b981' },
  { name: 'Everyday Life', icon: '☀️', color: '#f97316' },
  { name: 'Adventures', icon: '🏔️', color: '#3b82f6' },
  { name: 'Home & Family', icon: '🏠', color: '#84cc16' },
]

const ICONS = ['📸', '❤️', '🌹', '✈️', '💍', '🎂', '⭐', '🌊', '🏔️', '🎉', '🌙', '🌸']
const COLORS = ['#f43f5e', '#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#f97316', '#3b82f6', '#84cc16', '#6366f1']

export default function CreateAlbumModal({ onClose, onCreated }: Props) {
  const { createAlbum } = useApp()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('📸')
  const [color, setColor] = useState('#f43f5e')
  const [step, setStep] = useState<'preset' | 'custom'>('preset')

  function handlePreset(preset: typeof PRESET_ALBUMS[0]) {
    setName(preset.name)
    setIcon(preset.icon)
    setColor(preset.color)
    setStep('custom')
  }

  async function handleCreate() {
    if (!name.trim()) return
    const album = await createAlbum(name.trim(), description.trim(), icon, color)
    onCreated?.(album.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {step === 'preset' ? 'Choose Album Type' : 'Create Album'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {step === 'preset' ? (
            <>
              <p className="text-sm text-gray-500">Choose a preset or start from scratch</p>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_ALBUMS.map(preset => (
                  <button
                    key={preset.name}
                    onClick={() => handlePreset(preset)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-rose-200 hover:bg-rose-50 transition-all text-left group"
                  >
                    <span className="text-2xl">{preset.icon}</span>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-rose-600">{preset.name}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep('custom')}
                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-rose-300 hover:text-rose-500 transition-all"
              >
                + Custom Album
              </button>
            </>
          ) : (
            <>
              {/* Preview */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm"
                  style={{ backgroundColor: color + '20', border: `2px solid ${color}40` }}
                >
                  {icon}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{name || 'Album name'}</p>
                  <p className="text-sm text-gray-400">{description || 'Description'}</p>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Name *</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Album name…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rose-300 transition-colors"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Description</label>
                <input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Optional description…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rose-300 transition-colors"
                />
              </div>

              {/* Icon picker */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Icon</label>
                <div className="flex flex-wrap gap-1.5">
                  {ICONS.map(ic => (
                    <button
                      key={ic}
                      onClick={() => setIcon(ic)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all ${
                        icon === ic ? 'ring-2 ring-rose-500 ring-offset-1 bg-rose-50' : 'hover:bg-gray-100'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color picker */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                      style={{ backgroundColor: c, outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
                    >
                      {color === c && <Check size={14} className="text-white mx-auto" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep('preset')} className="btn-secondary flex-1">Back</button>
                <button onClick={handleCreate} disabled={!name.trim()} className="btn-primary flex-1 disabled:opacity-50">
                  Create Album
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
