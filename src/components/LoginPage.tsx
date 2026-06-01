import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Mail, ArrowRight, Lock, AlertCircle } from 'lucide-react'
import { EMAIL_MAP } from '../constants'

interface Props {
  onLogin: (name: string, email: string) => void
}

export default function LoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState('')
  const [focused, setFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const trimmedEmail = email.trim().toLowerCase()
  const resolvedName = EMAIL_MAP[trimmedEmail] ?? null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!resolvedName) {
      setError('This space is private — only the two of us can enter.')
      return
    }
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 700))
    onLogin(resolvedName, trimmedEmail)
  }

  function handleChange(value: string) {
    setError('')
    setEmail(value)
  }

  const ready = resolvedName !== null

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-rose-50 via-pink-50 to-rose-100 relative overflow-hidden px-4">

      {/* Background blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-rose-200 rounded-full opacity-30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-pink-200 rounded-full opacity-30 blur-3xl pointer-events-none" />

      {/* Floating hearts */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-rose-200 select-none pointer-events-none"
          style={{ left: `${12 + i * 15}%`, top: `${10 + (i % 3) * 30}%`, fontSize: `${14 + (i % 3) * 8}px` }}
          animate={{ y: [0, -14, 0], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
        >
          ♥
        </motion.div>
      ))}

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative w-full max-w-md"
      >
        <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-rose-100 p-8 sm:p-10">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-lg mb-4"
            >
              <Heart size={32} className="text-white fill-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-gray-900 font-display">Our Memories</h1>
            <p className="text-sm text-gray-400 mt-1">A private space, just for us 💕</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">Email address</label>
              <div className={`flex items-center gap-3 bg-white border-2 rounded-2xl px-4 py-3.5 transition-all duration-200 ${
                error ? 'border-red-300' : focused ? 'border-rose-400 shadow-sm shadow-rose-100' : 'border-gray-100'
              }`}>
                <Mail size={17} className={error ? 'text-red-400' : focused ? 'text-rose-400' : 'text-gray-300'} />
                <input
                  type="email"
                  value={email}
                  onChange={e => handleChange(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="Enter your email"
                  className="flex-1 outline-none text-sm bg-transparent text-gray-800 placeholder-gray-300"
                  autoComplete="email"
                  autoFocus
                />
              </div>

              {/* Recognised name greeting */}
              <AnimatePresence>
                {resolvedName && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="flex items-center gap-2 mt-2 px-1"
                  >
                    <span className="text-sm text-rose-500 font-medium">
                      Welcome back, {resolvedName} 💕
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="flex items-start gap-2 mt-2 px-1"
                  >
                    <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-500">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={!ready || loading}
              whileTap={{ scale: 0.97 }}
              className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-semibold text-sm transition-all duration-300 mt-2 ${
                ready && !loading
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-200 hover:shadow-rose-300 hover:from-rose-600 hover:to-pink-600'
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                <>
                  Enter Our Space
                  <ArrowRight size={16} />
                </>
              )}
            </motion.button>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-center gap-2 mt-6 text-xs text-gray-400">
            <Lock size={11} />
            <span>Private &amp; only for the two of us</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
