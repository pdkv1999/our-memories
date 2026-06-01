import React, { useState } from 'react'
import { Heart, GalleryHorizontal, BookMarked, Sparkles, Upload, Search, X, Menu, LogOut, MessageCircleHeart } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Page } from '../types'

function avatarColor(name: string) {
  const palette = ['bg-rose-400', 'bg-violet-400', 'bg-sky-400', 'bg-amber-400', 'bg-emerald-400']
  return palette[name.charCodeAt(0) % palette.length]
}

export default function Navbar() {
  const { state, dispatch, logout, apiAvailable } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const navItems: { page: Page; label: string; icon: React.ReactNode; badge?: number }[] = [
    { page: 'gallery',  label: 'Gallery',  icon: <GalleryHorizontal size={18} /> },
    { page: 'albums',   label: 'Albums',   icon: <BookMarked size={18} /> },
    { page: 'memories', label: 'Memories', icon: <Sparkles size={18} /> },
    { page: 'chat',     label: 'Chat',     icon: <MessageCircleHeart size={18} />, badge: state.unreadCount },
  ]

  const isChat = state.currentPage === 'chat'

  return (
    <nav className={`fixed top-0 inset-x-0 z-50 glass border-b border-rose-100 ${isChat ? 'hidden' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">

        {/* Logo */}
        <button
          onClick={() => dispatch({ type: 'SET_PAGE', page: 'gallery' })}
          className="flex items-center gap-2 font-display text-rose-500 font-semibold text-lg shrink-0"
        >
          <Heart size={22} className="fill-rose-500 text-rose-500" />
          <span className="hidden sm:block">Our Memories</span>
        </button>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1 ml-4">
          {navItems.map(item => (
            <button
              key={item.page}
              onClick={() => dispatch({ type: 'SET_PAGE', page: item.page })}
              className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                state.currentPage === item.page
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-rose-50 hover:text-rose-600'
              }`}
            >
              {item.icon}
              {item.label}
              {item.badge && item.badge > 0 ? (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative hidden sm:block">
          {searchOpen ? (
            <div className="flex items-center gap-2 bg-white border border-rose-200 rounded-xl px-3 py-2 w-64 shadow-sm">
              <Search size={16} className="text-gray-400 shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Search photos, tags, places…"
                value={state.searchQuery}
                onChange={e => dispatch({ type: 'SET_SEARCH', query: e.target.value })}
                className="flex-1 text-sm outline-none bg-transparent"
              />
              <button onClick={() => { setSearchOpen(false); dispatch({ type: 'SET_SEARCH', query: '' }) }}>
                <X size={14} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>
          ) : (
            <button onClick={() => setSearchOpen(true)} className="btn-ghost">
              <Search size={18} />
            </button>
          )}
        </div>

        {/* DB status dot */}
        <div
          title={apiAvailable ? 'Database connected' : 'Offline — changes saved locally'}
          className={`w-2.5 h-2.5 rounded-full shrink-0 hidden sm:block ${apiAvailable ? 'bg-green-400' : 'bg-amber-400'}`}
        />

        {/* Upload button */}
        <button
          onClick={() => dispatch({ type: 'TOGGLE_UPLOAD' })}
          className="btn-primary"
        >
          <Upload size={16} />
          <span className="hidden sm:block">Upload</span>
        </button>

        {/* User avatar + logout */}
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${avatarColor(state.currentUser)}`}>
            {state.currentUser[0]?.toUpperCase()}
          </div>
          <span className="hidden sm:block text-sm font-medium text-gray-700">{state.currentUser}</span>
          <button
            onClick={logout}
            title="Sign out"
            className="w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors"
          >
            <LogOut size={15} />
          </button>
        </div>

        {/* Mobile menu toggle */}
        <button onClick={() => setMenuOpen(o => !o)} className="md:hidden btn-ghost p-2">
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <div className="md:hidden border-t border-rose-100 bg-white/95 backdrop-blur-xl">
          <div className="flex">
            {navItems.map(item => (
              <button
                key={item.page}
                onClick={() => { dispatch({ type: 'SET_PAGE', page: item.page }); setMenuOpen(false) }}
                className={`relative flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                  state.currentPage === item.page ? 'text-rose-500' : 'text-gray-500'
                }`}
              >
                {item.icon}
                {item.label}
                {item.badge && item.badge > 0 ? (
                  <span className="absolute top-1.5 right-1/4 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search…"
                value={state.searchQuery}
                onChange={e => dispatch({ type: 'SET_SEARCH', query: e.target.value })}
                className="flex-1 text-sm outline-none bg-transparent"
              />
            </div>
          </div>
        </div>
      )}

      {menuOpen && <div className="fixed inset-0 z-[-1]" onClick={() => setMenuOpen(false)} />}
    </nav>
  )
}
