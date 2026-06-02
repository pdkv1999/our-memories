import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../context/AppContext'

// ── Floating particle ────────────────────────────────────────────────────────

function Particle({ emoji, x, delay, duration, size }: {
  emoji: string; x: number; delay: number; duration: number; size: number
}) {
  return (
    <motion.span
      className="absolute pointer-events-none select-none"
      style={{ left: `${x}%`, bottom: '-10%', fontSize: size }}
      animate={{ y: [0, -420], opacity: [0, 1, 1, 0], rotate: [-10, 10, -5, 8] }}
      transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
    >
      {emoji}
    </motion.span>
  )
}

// ── Mountain silhouette SVG ──────────────────────────────────────────────────

function Mountains({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 1440 180" className="absolute bottom-0 left-0 w-full" preserveAspectRatio="none">
      <path d="M0,180 L0,120 L120,60 L240,110 L360,40 L480,90 L600,20 L720,80 L840,30 L960,100 L1080,50 L1200,90 L1320,45 L1440,80 L1440,180 Z"
        fill={color} opacity="0.3" />
      <path d="M0,180 L0,140 L180,90 L300,130 L420,70 L540,120 L660,60 L780,110 L900,70 L1020,130 L1140,80 L1260,120 L1380,85 L1440,100 L1440,180 Z"
        fill={color} opacity="0.5" />
      <path d="M0,180 L0,160 L240,110 L480,150 L720,100 L960,145 L1200,110 L1440,140 L1440,180 Z"
        fill={color} opacity="0.7" />
    </svg>
  )
}

// ── Stars ────────────────────────────────────────────────────────────────────

function Stars({ count = 30, color = '#fff' }: { count?: number; color?: string }) {
  const stars = Array.from({ length: count }, (_, i) => ({
    x: (i * 37 + 11) % 100,
    y: (i * 53 + 7) % 70,
    size: Math.random() * 2 + 1,
    delay: Math.random() * 3,
  }))
  return (
    <>
      {stars.map((s, i) => (
        <motion.div key={i} className="absolute rounded-full"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, background: color }}
          animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 2 + s.delay, repeat: Infinity, delay: s.delay }}
        />
      ))}
    </>
  )
}

// ── Dileep's banner — Meet My Wifey ─────────────────────────────────────────

function DileepBanner() {
  const particles = [
    { emoji: '🌹', x: 5,  delay: 0,   dur: 7,  size: 20 },
    { emoji: '💍', x: 15, delay: 1.5, dur: 9,  size: 22 },
    { emoji: '✨', x: 25, delay: 0.5, dur: 6,  size: 16 },
    { emoji: '🌸', x: 35, delay: 2,   dur: 8,  size: 18 },
    { emoji: '💖', x: 45, delay: 0.8, dur: 7,  size: 22 },
    { emoji: '🦋', x: 55, delay: 1.2, dur: 9,  size: 20 },
    { emoji: '🌺', x: 65, delay: 0.3, dur: 8,  size: 18 },
    { emoji: '⭐', x: 75, delay: 1.8, dur: 6,  size: 16 },
    { emoji: '💐', x: 85, delay: 0.6, dur: 7,  size: 20 },
    { emoji: '🌙', x: 92, delay: 2.2, dur: 10, size: 20 },
  ]

  return (
    <div className="relative w-full overflow-hidden rounded-3xl mb-8" style={{ minHeight: 280 }}>
      {/* Sky gradient — deep romantic dusk */}
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(160deg, #0f0c29 0%, #302b63 40%, #24243e 70%, #8e2de2 100%)' }} />

      {/* Stars in the sky */}
      <Stars count={40} color="#ffffff" />

      {/* Aurora shimmer */}
      <motion.div className="absolute inset-0 opacity-20"
        style={{ background: 'radial-gradient(ellipse at 60% 30%, #a855f7 0%, transparent 60%)' }}
        animate={{ opacity: [0.15, 0.35, 0.15] }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((p, i) => <Particle key={i} {...p} duration={p.dur} />)}
      </div>

      {/* Mountain silhouette */}
      <Mountains color="#1a1035" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center py-12 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Crown / decorative top */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-2xl">💜</span>
            <span className="text-yellow-300 text-xs font-semibold tracking-[0.3em] uppercase opacity-80">
              Dileep's Gallery
            </span>
            <span className="text-2xl">💜</span>
          </div>

          {/* Main headline */}
          <motion.h1
            className="text-white font-display leading-tight mb-2"
            style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)', textShadow: '0 0 40px rgba(168,85,247,0.8)' }}
            animate={{ textShadow: ['0 0 20px rgba(168,85,247,0.4)', '0 0 60px rgba(168,85,247,0.9)', '0 0 20px rgba(168,85,247,0.4)'] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            Meet My Wifey 💍
          </motion.h1>

          {/* Sub text */}
          <motion.p
            className="text-purple-200 text-sm sm:text-base font-medium opacity-90 max-w-sm mx-auto"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          >
            She is my moon, my stars, my everything ✨
          </motion.p>

          {/* Decorative hearts row */}
          <div className="flex items-center justify-center gap-3 mt-4">
            {['🌹','💜','🌟','💜','🌹'].map((e, i) => (
              <motion.span key={i} className="text-lg"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
              >{e}</motion.span>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// ── Siri's banner — Meet My Hubby ───────────────────────────────────────────

function SiriBanner() {
  const particles = [
    { emoji: '🌸', x: 5,  delay: 0,   dur: 8,  size: 20 },
    { emoji: '💕', x: 14, delay: 1.2, dur: 7,  size: 22 },
    { emoji: '🌺', x: 24, delay: 0.4, dur: 9,  size: 18 },
    { emoji: '✨', x: 34, delay: 2,   dur: 6,  size: 16 },
    { emoji: '🦋', x: 44, delay: 0.7, dur: 8,  size: 20 },
    { emoji: '🌼', x: 54, delay: 1.5, dur: 7,  size: 18 },
    { emoji: '💗', x: 64, delay: 0.2, dur: 9,  size: 22 },
    { emoji: '🍀', x: 74, delay: 1,   dur: 8,  size: 18 },
    { emoji: '🌷', x: 84, delay: 0.8, dur: 7,  size: 20 },
    { emoji: '⭐', x: 93, delay: 2.5, dur: 6,  size: 16 },
  ]

  return (
    <div className="relative w-full overflow-hidden rounded-3xl mb-8" style={{ minHeight: 280 }}>
      {/* Golden hour sunset gradient */}
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(160deg, #fc5c7d 0%, #6a3093 35%, #ee9ca7 65%, #ffdde1 100%)' }} />

      {/* Soft glow */}
      <motion.div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 40% 40%, rgba(255,200,150,0.4) 0%, transparent 65%)' }}
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3.5, repeat: Infinity }}
      />

      {/* Bokeh circles */}
      {[...Array(12)].map((_, i) => (
        <motion.div key={i} className="absolute rounded-full"
          style={{
            left: `${(i * 41 + 13) % 95}%`,
            top:  `${(i * 37 + 9) % 80}%`,
            width:  `${12 + (i % 4) * 8}px`,
            height: `${12 + (i % 4) * 8}px`,
            background: `rgba(255,255,255,${0.05 + (i % 3) * 0.05})`,
          }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 3 + (i % 3), repeat: Infinity, delay: i * 0.3 }}
        />
      ))}

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((p, i) => <Particle key={i} {...p} duration={p.dur} />)}
      </div>

      {/* Rolling hills silhouette */}
      <svg viewBox="0 0 1440 180" className="absolute bottom-0 left-0 w-full" preserveAspectRatio="none">
        <path d="M0,180 L0,130 Q180,60 360,120 Q540,180 720,100 Q900,20 1080,100 Q1260,180 1440,120 L1440,180 Z"
          fill="rgba(252,92,125,0.3)" />
        <path d="M0,180 L0,155 Q240,100 480,150 Q720,200 960,140 Q1200,80 1440,145 L1440,180 Z"
          fill="rgba(252,92,125,0.5)" />
      </svg>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center py-12 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-2xl">🌸</span>
            <span className="text-pink-100 text-xs font-semibold tracking-[0.3em] uppercase opacity-90">
              Siri's Gallery
            </span>
            <span className="text-2xl">🌸</span>
          </div>

          <motion.h1
            className="text-white font-display leading-tight mb-2"
            style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)', textShadow: '0 0 40px rgba(252,92,125,0.8)' }}
            animate={{ textShadow: ['0 0 20px rgba(255,150,180,0.5)', '0 0 60px rgba(255,100,150,0.9)', '0 0 20px rgba(255,150,180,0.5)'] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            Meet My Hubby 💑
          </motion.h1>

          <motion.p
            className="text-pink-100 text-sm sm:text-base font-medium opacity-90 max-w-sm mx-auto"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          >
            He is my sunshine, my safe place, my forever 💕
          </motion.p>

          <div className="flex items-center justify-center gap-3 mt-4">
            {['🌷','💗','🌸','💗','🌷'].map((e, i) => (
              <motion.span key={i} className="text-lg"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
              >{e}</motion.span>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function HeroBanner() {
  const { state } = useApp()
  if (state.currentUser === 'Dileep') return <DileepBanner />
  if (state.currentUser === 'Siri')   return <SiriBanner />
  return null
}
