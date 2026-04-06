import { useState, useEffect, useMemo, useCallback } from 'react'
import { sb } from './lib/supabase'
import { t, getLangConfig } from './i18n'

// --- Constants ---
const COLORS = ['emerald', 'violet', 'amber', 'blue', 'rose', 'cyan', 'pink', 'indigo']
const COLOR_CLASSES = {
  emerald: 'bg-emerald-100 text-emerald-700 ring-emerald-300',
  violet: 'bg-violet-100 text-violet-700 ring-violet-300',
  amber: 'bg-amber-100 text-amber-700 ring-amber-300',
  blue: 'bg-blue-100 text-blue-700 ring-blue-300',
  rose: 'bg-rose-100 text-rose-700 ring-rose-300',
  cyan: 'bg-cyan-100 text-cyan-700 ring-cyan-300',
  pink: 'bg-pink-100 text-pink-700 ring-pink-300',
  indigo: 'bg-indigo-100 text-indigo-700 ring-indigo-300',
  gray: 'bg-gray-100 text-gray-600 ring-gray-300',
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

// ========== LOBBY SCREEN ==========

function Lobby({ onJoined }) {
  // Check URL for invite code
  const urlCode = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    const c = params.get('code')?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || ''
    if (c) window.history.replaceState({}, '', window.location.pathname)
    return c
  }, [])

  const [mode, setMode] = useState(urlCode ? 'join' : null)
  const [name, setName] = useState('')
  const [code, setCode] = useState(urlCode)
  const [lang, setLang] = useState('he')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Lobby always shows both languages, so we use a simple helper
  const lobbyLang = mode === 'join' ? 'he' : lang // join screen: we don't know room lang yet

  const handleCreate = async () => {
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const sessionCode = generateCode()
      const { data: session, error: err } = await sb
        .from('sessions').insert({ code: sessionCode, lang }).select().single()
      if (err) throw err

      const { data: participant, error: pErr } = await sb
        .from('participants').insert({
          session_id: session.id,
          name: name.trim(),
          color: COLORS[0],
        }).select().single()
      if (pErr) throw pErr

      const data = {
        sessionId: session.id,
        participantId: participant.id,
        sessionCode: session.code,
        participantName: name.trim(),
        lang: session.lang || 'he',
      }
      sessionStorage.setItem('splitit_session', JSON.stringify(data))
      onJoined(data)
    } catch (e) {
      console.error(e)
      setError(t(lang, 'errorCreate'))
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!name.trim() || code.length < 4) return
    setLoading(true)
    setError('')
    try {
      const { data: session, error: err } = await sb
        .from('sessions').select().eq('code', code.toUpperCase().trim()).single()
      if (err || !session) {
        setError(t('he', 'errorCodeNotFound'))
        setLoading(false)
        return
      }

      const { count } = await sb
        .from('participants')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', session.id)

      const { data: participant, error: pErr } = await sb
        .from('participants').insert({
          session_id: session.id,
          name: name.trim(),
          color: COLORS[(count || 0) % COLORS.length],
        }).select().single()
      if (pErr) throw pErr

      const data = {
        sessionId: session.id,
        participantId: participant.id,
        sessionCode: session.code,
        participantName: name.trim(),
        lang: session.lang || 'he',
      }
      sessionStorage.setItem('splitit_session', JSON.stringify(data))
      onJoined(data)
    } catch (e) {
      console.error(e)
      setError(t('he', 'errorJoin'))
      setLoading(false)
    }
  }

  if (!mode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div>
            <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900">Split It</h1>
            <p className="text-gray-500 mt-1">חלוקת חשבון חכמה בין חברים</p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => setMode('create')}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/25 text-lg"
            >
              צור חדר חדש
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full bg-white hover:bg-gray-50 text-gray-700 font-bold py-4 rounded-2xl transition-all active:scale-[0.98] shadow-sm border border-gray-200 text-lg"
            >
              הצטרף לחדר קיים
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-5">
        <button
          onClick={() => { setMode(null); setError(''); setCode('') }}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm font-medium"
        >
          <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          חזרה
        </button>
        <h2 className="text-2xl font-bold text-gray-900">
          {mode === 'create' ? 'צור חדר חדש' : 'הצטרף לחדר'}
        </h2>
        <div className="space-y-3">
          {mode === 'create' && (
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setLang('he')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  lang === 'he' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                🇮🇱 עברית
              </button>
              <button
                onClick={() => setLang('en')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  lang === 'en' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                🇺🇸 English
              </button>
            </div>
          )}
          {mode === 'join' && (
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="קוד חדר (6 תווים)"
              autoFocus
              className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-center text-2xl font-mono font-bold tracking-[0.3em] placeholder:text-base placeholder:tracking-normal placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
              dir="ltr"
            />
          )}
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={mode === 'create' ? t(lang, 'namePlaceholder') : 'השם שלך'}
            autoFocus={mode === 'create'}
            className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            onClick={mode === 'create' ? handleCreate : handleJoin}
            disabled={loading || !name.trim() || (mode === 'join' && code.length < 4)}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3.5 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/25 text-lg disabled:shadow-none"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                {t(lang, 'loading')}
              </span>
            ) : (
              mode === 'create' ? t(lang, 'letsGo') : 'הצטרף'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ========== SHARED UI COMPONENTS ==========

function Header({ sessionCode, onShare, onLeave, lang }) {
  return (
    <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-200">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onLeave} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Split It</h1>
            <p className="text-xs text-gray-500">{t(lang, 'headerSubtitle')}</p>
          </div>
        </div>
        <button
          onClick={onShare}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-full transition-all active:scale-95 shadow-md shadow-emerald-500/25"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          {t(lang, 'shareCode')}
        </button>
      </div>
    </div>
  )
}

function ShareToast({ code, visible, lang }) {
  return (
    <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
      <div className="bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
        <span className="text-sm">{t(lang, 'codeCopied')}</span>
        <span className="font-mono font-bold text-lg tracking-widest text-emerald-400">{code}</span>
      </div>
    </div>
  )
}

function ItemCard({ item, currentUser, participants, onToggleClaim, onUpdatePrice, onRemove, lang }) {
  const [editingPrice, setEditingPrice] = useState(false)
  const [priceInput, setPriceInput] = useState(String(item.price))
  const isClaimed = item.claimedBy.includes(currentUser)
  const totalSharers = item.claimedBy.length
  const price = Number(item.price)
  const myShare = isClaimed && totalSharers > 0 ? price / totalSharers : 0
  const currency = t(lang, 'currency')
  const otherClaimers = item.claimedBy
    .filter(id => id !== currentUser)
    .map(id => participants.find(p => p.id === id))
    .filter(Boolean)

  const handlePriceSave = () => {
    const val = parseFloat(priceInput)
    if (val > 0) onUpdatePrice(item.id, val)
    setEditingPrice(false)
  }

  return (
    <div className={`relative bg-white rounded-2xl p-4 shadow-sm transition-all duration-200 border-2 ${isClaimed ? 'border-emerald-400 shadow-emerald-100 shadow-md' : 'border-transparent'}`}>
      <button
        onClick={() => onRemove(item.id)}
        className={`absolute top-2 ${lang === 'he' ? 'left-2' : 'right-2'} w-6 h-6 rounded-full bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-base truncate">{item.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            {editingPrice ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  autoFocus
                  value={priceInput}
                  onChange={e => setPriceInput(e.target.value)}
                  onBlur={handlePriceSave}
                  onKeyDown={e => e.key === 'Enter' && handlePriceSave()}
                  className="w-20 text-lg font-bold text-gray-800 bg-gray-50 border border-emerald-300 rounded-lg px-2 py-0.5 text-center focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <span className="text-lg font-bold text-gray-800">{currency}</span>
              </div>
            ) : (
              <button onClick={() => { setPriceInput(String(price)); setEditingPrice(true) }} className="text-lg font-bold text-gray-800 hover:text-emerald-600 transition-colors border-b border-dashed border-gray-300">
                {lang === 'en' ? `${currency}${price}` : `${price} ${currency}`}
              </button>
            )}
          </div>
          {otherClaimers.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              {otherClaimers.map(p => (
                <span key={p.id} className={`text-xs px-2 py-0.5 rounded-full font-medium ${COLOR_CLASSES[p.color] || COLOR_CLASSES.gray}`}>
                  {p.name}
                </span>
              ))}
            </div>
          )}
          {isClaimed && totalSharers > 0 && (
            <div className="mt-1 text-sm text-emerald-600 font-medium">
              {t(lang, 'myShare')} {lang === 'en' ? `${currency}${myShare.toFixed(myShare % 1 === 0 ? 0 : 2)}` : `${myShare.toFixed(myShare % 1 === 0 ? 0 : 2)} ${currency}`}
            </div>
          )}
        </div>
        <button
          onClick={() => onToggleClaim(item.id)}
          className={`shrink-0 ${lang === 'en' ? 'w-28' : 'w-24'} h-10 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 ${
            isClaimed
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {isClaimed ? t(lang, 'claimed') : t(lang, 'claimIt')}
        </button>
      </div>
    </div>
  )
}

function TipSection({ tip, onTipChange, lang }) {
  const currency = t(lang, 'currency')
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-3">{t(lang, 'tip')}</h3>
      <div className="flex items-center gap-2">
        <div className="flex bg-gray-100 rounded-xl p-1 shrink-0">
          <button
            onClick={() => onTipChange({ ...tip, type: 'percent' })}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tip.type === 'percent' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            %
          </button>
          <button
            onClick={() => onTipChange({ ...tip, type: 'fixed' })}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tip.type === 'fixed' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            {currency}
          </button>
        </div>
        {tip.type === 'percent' ? (
          <div className="flex gap-1.5 flex-1">
            {[10, 12, 15].map(pct => (
              <button
                key={pct}
                onClick={() => onTipChange({ ...tip, value: pct })}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  tip.value === pct && tip.type === 'percent'
                    ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
        ) : (
          <div className="flex gap-1.5 flex-1">
            {[10, 20, 30].map(amount => (
              <button
                key={amount}
                onClick={() => onTipChange({ ...tip, value: amount })}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  tip.value === amount && tip.type === 'fixed'
                    ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {amount}{currency}
              </button>
            ))}
          </div>
        )}
        <div className="relative shrink-0 w-20">
          <input
            type="number"
            min="0"
            value={tip.value || ''}
            onChange={e => onTipChange({ ...tip, value: parseFloat(e.target.value) || 0 })}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
            placeholder={t(lang, 'tipAmount')}
          />
        </div>
      </div>
    </div>
  )
}

function AddDishForm({ onAdd, lang }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')

  const handleSubmit = () => {
    const p = parseFloat(price)
    if (name.trim() && p > 0) {
      onAdd(name.trim(), p)
      setName('')
      setPrice('')
      setOpen(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-white rounded-2xl p-3 shadow-sm border-2 border-dashed border-gray-300 text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-all flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="font-medium">{t(lang, 'addDish')}</span>
      </button>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border-2 border-emerald-300">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-semibold text-gray-900 text-sm flex-1">{t(lang, 'newDish')}</h3>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t(lang, 'dishName')}
          className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
        />
        <input
          type="number"
          value={price}
          onChange={e => setPrice(e.target.value)}
          placeholder={t(lang, 'price')}
          className="w-20 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={!name.trim() || !parseFloat(price)}
        className="w-full mt-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-2 rounded-xl transition-all active:scale-95"
      >
        {t(lang, 'add')}
      </button>
    </div>
  )
}

function ScanPreview({ scannedDishes, onConfirm, onCancel, onRemoveItem, onUpdateItem, lang }) {
  const currency = t(lang, 'currency')
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border-2 border-blue-300">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-semibold text-gray-900 text-sm flex-1">
          {t(lang, 'scanPreviewTitle')} ({scannedDishes.length})
        </h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {scannedDishes.map((dish, i) => (
          <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
            <input
              type="text"
              value={dish.name}
              onChange={e => onUpdateItem(i, { ...dish, name: e.target.value })}
              className="flex-1 bg-transparent text-sm font-medium text-gray-800 focus:outline-none"
            />
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={dish.price}
                onChange={e => onUpdateItem(i, { ...dish, price: parseFloat(e.target.value) || 0 })}
                className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <span className="text-xs text-gray-500">{currency}</span>
            </div>
            <button
              onClick={() => onRemoveItem(i)}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={onCancel}
          className="flex-1 bg-gray-100 text-gray-600 font-semibold py-2 rounded-xl transition-all active:scale-95"
        >
          {t(lang, 'scanCancel')}
        </button>
        <button
          onClick={onConfirm}
          disabled={scannedDishes.length === 0}
          className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-2 rounded-xl transition-all active:scale-95 shadow-md shadow-blue-500/25"
        >
          {t(lang, 'scanAddAll')}
        </button>
      </div>
    </div>
  )
}

function TotalSummary({ subtotal, tipAmount, total, lang }) {
  const roundedTotal = Math.round(total)
  const currency = t(lang, 'currency')
  const fmtPrice = (val) => lang === 'en' ? `${currency}${val}` : `${val} ${currency}`
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm mt-2 mb-4">
      <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
        <span>{t(lang, 'totalDishes')}</span>
        <span>{fmtPrice(subtotal.toFixed(2))}</span>
      </div>
      {tipAmount > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <span>{t(lang, 'tipLabel')}</span>
          <span>+{fmtPrice(tipAmount.toFixed(2))}</span>
        </div>
      )}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <span className="text-lg font-bold text-gray-900">{t(lang, 'toPay')}</span>
        <span className="text-3xl font-extrabold text-emerald-600">{fmtPrice(roundedTotal)}</span>
      </div>
    </div>
  )
}

// ========== BILL SCREEN (Real-time Supabase) ==========

function BillScreen({ sessionId, participantId, sessionCode, lang, onLeave }) {
  const [dishes, setDishes] = useState([])
  const [participants, setParticipants] = useState([])
  const [claims, setClaims] = useState([])
  const [tip, setTip] = useState({ type: 'percent', value: 10 })
  const [loading, setLoading] = useState(true)
  const [showToast, setShowToast] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const [scannedDishes, setScannedDishes] = useState(null) // null = not scanning, [] = no results

  const { dir } = getLangConfig(lang)

  const fetchDishes = useCallback(async () => {
    const { data } = await sb.from('dishes').select('*').eq('session_id', sessionId).order('sort_order')
    if (data) setDishes(data)
  }, [sessionId])

  const fetchParticipants = useCallback(async () => {
    const { data } = await sb.from('participants').select('*').eq('session_id', sessionId).order('created_at')
    if (data) setParticipants(data)
  }, [sessionId])

  const fetchClaims = useCallback(async () => {
    const { data } = await sb.from('claims').select('*').eq('session_id', sessionId)
    if (data) setClaims(data)
  }, [sessionId])

  useEffect(() => {
    async function init() {
      await Promise.all([fetchDishes(), fetchParticipants(), fetchClaims()])
      setLoading(false)
    }
    init()

    // Real-time subscriptions with polling fallback
    let pollInterval = null

    const channel = sb.channel(`room:${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dishes', filter: `session_id=eq.${sessionId}` }, () => fetchDishes())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `session_id=eq.${sessionId}` }, () => fetchParticipants())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'claims', filter: `session_id=eq.${sessionId}` }, () => fetchClaims())
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (pollInterval) { clearInterval(pollInterval); pollInterval = null }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          if (!pollInterval) {
            pollInterval = setInterval(() => {
              fetchDishes(); fetchParticipants(); fetchClaims()
            }, 3000)
          }
        }
      })

    const safetyPoll = setInterval(() => {
      fetchDishes(); fetchParticipants(); fetchClaims()
    }, 5000)

    return () => {
      sb.removeChannel(channel)
      if (pollInterval) clearInterval(pollInterval)
      clearInterval(safetyPoll)
    }
  }, [sessionId, fetchDishes, fetchParticipants, fetchClaims])

  const items = useMemo(() => {
    return dishes.map(dish => ({
      ...dish,
      claimedBy: claims.filter(c => c.dish_id === dish.id).map(c => c.participant_id),
    }))
  }, [dishes, claims])

  const { subtotal, tipAmount, total } = useMemo(() => {
    const sub = items.reduce((sum, item) => {
      if (!item.claimedBy.includes(participantId)) return sum
      return sum + Number(item.price) / item.claimedBy.length
    }, 0)
    const tipAmt = tip.type === 'percent' ? sub * (tip.value / 100) : tip.value
    return { subtotal: sub, tipAmount: tipAmt, total: sub + tipAmt }
  }, [items, participantId, tip])

  const handleToggleClaim = useCallback(async (dishId) => {
    const existing = claims.find(c => c.dish_id === dishId && c.participant_id === participantId)
    if (existing) {
      setClaims(prev => prev.filter(c => c.id !== existing.id))
      await sb.from('claims').delete().eq('id', existing.id)
    } else {
      const tempClaim = { id: crypto.randomUUID(), dish_id: dishId, participant_id: participantId, session_id: sessionId }
      setClaims(prev => [...prev, tempClaim])
      await sb.from('claims').insert({ dish_id: dishId, participant_id: participantId, session_id: sessionId })
    }
  }, [claims, participantId, sessionId])

  const handleAddDish = useCallback(async (name, price) => {
    const tempDish = { id: crypto.randomUUID(), session_id: sessionId, name, price, sort_order: dishes.length }
    setDishes(prev => [...prev, tempDish])
    await sb.from('dishes').insert({ session_id: sessionId, name, price, sort_order: dishes.length })
  }, [sessionId, dishes.length])

  const handleRemoveDish = useCallback(async (dishId) => {
    setDishes(prev => prev.filter(d => d.id !== dishId))
    setClaims(prev => prev.filter(c => c.dish_id !== dishId))
    await sb.from('dishes').delete().eq('id', dishId)
  }, [])

  const handleUpdatePrice = useCallback(async (dishId, newPrice) => {
    setDishes(prev => prev.map(d => d.id === dishId ? { ...d, price: newPrice } : d))
    await sb.from('dishes').update({ price: newPrice }).eq('id', dishId)
  }, [])

  const handleShare = useCallback(async () => {
    const shareUrl = `${window.location.origin}?code=${sessionCode}`
    if (navigator.share) {
      try { await navigator.share({ title: 'Split It', text: `${t(lang, 'shareText')}\n${shareUrl}` }) } catch (e) {}
    } else {
      try { await navigator.clipboard.writeText(shareUrl) } catch (e) {}
    }
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }, [sessionCode, lang])

  const handleScanReceipt = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setScanning(true)
    setScanError('')
    setScannedDishes(null)

    try {
      // Compress image to fit Vercel's 4.5MB body limit
      const base64 = await new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const MAX = 1500 // max dimension in pixels
          let { width, height } = img
          if (width > MAX || height > MAX) {
            if (width > height) { height = Math.round(height * MAX / width); width = MAX }
            else { width = Math.round(width * MAX / height); height = MAX }
          }
          canvas.width = width
          canvas.height = height
          canvas.getContext('2d').drawImage(img, 0, 0, width, height)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
          resolve(dataUrl.split(',')[1])
        }
        img.onerror = reject
        img.src = URL.createObjectURL(file)
      })

      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, lang }),
      })

      const data = await res.json()

      if (!res.ok) {
        setScanError(t(lang, 'scanError'))
      } else if (!data.dishes || data.dishes.length === 0) {
        setScanError(data.rawText ? `${t(lang, 'scanEmpty')}\n\nOCR: "${data.rawText}"` : t(lang, 'scanEmpty'))
      } else {
        setScannedDishes(data.dishes)
      }
    } catch (err) {
      console.error('Scan error:', err)
      setScanError(t(lang, 'scanError'))
    } finally {
      setScanning(false)
      // Reset the file input so the same file can be re-selected
      e.target.value = ''
    }
  }, [lang])

  const handleConfirmScan = useCallback(async () => {
    if (!scannedDishes || scannedDishes.length === 0) return
    // Add all scanned dishes to the session
    const startOrder = dishes.length
    const newDishes = scannedDishes.map((d, i) => ({
      session_id: sessionId,
      name: d.name,
      price: d.price,
      sort_order: startOrder + i,
    }))

    // Optimistic update
    const tempDishes = newDishes.map(d => ({ ...d, id: crypto.randomUUID() }))
    setDishes(prev => [...prev, ...tempDishes])
    setScannedDishes(null)

    // Insert to Supabase
    await sb.from('dishes').insert(newDishes)
  }, [scannedDishes, dishes.length, sessionId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">{t(lang, 'loadingRoom')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6" dir={dir}>
      <Header sessionCode={sessionCode} onShare={handleShare} onLeave={onLeave} lang={lang} />
      <ShareToast code={sessionCode} visible={showToast} lang={lang} />

      <div className="max-w-md mx-auto px-4 py-4 space-y-3">
        <div className={`bg-gradient-to-${lang === 'he' ? 'l' : 'r'} from-emerald-500 to-teal-600 rounded-2xl p-4 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">{t(lang, 'roomCode')}</p>
              <p className="text-2xl font-mono font-bold tracking-widest" dir="ltr">{sessionCode}</p>
            </div>
            <div className={lang === 'he' ? 'text-left' : 'text-right'}>
              <p className="text-sm opacity-80">{t(lang, 'items')}</p>
              <p className="text-2xl font-bold">{items.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3 shadow-sm">
          <p className="text-xs text-gray-500 mb-2">{t(lang, 'participants')} ({participants.length})</p>
          <div className="flex gap-2 flex-wrap">
            {participants.map(p => {
              const cls = COLOR_CLASSES[p.color] || COLOR_CLASSES.gray
              const isMe = p.id === participantId
              return (
                <div key={p.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${cls} ${isMe ? 'ring-2' : ''}`}>
                  <span>{p.name}</span>
                  {isMe && <span className="text-xs opacity-60">{t(lang, 'me')}</span>}
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-2">
          {items.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400 text-lg mb-1">{t(lang, 'noDishes')}</p>
              <p className="text-gray-300 text-sm">{t(lang, 'noDishesHint')}</p>
            </div>
          )}
          {items.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              currentUser={participantId}
              participants={participants}
              onToggleClaim={handleToggleClaim}
              onUpdatePrice={handleUpdatePrice}
              onRemove={handleRemoveDish}
              lang={lang}
            />
          ))}
          <AddDishForm onAdd={handleAddDish} lang={lang} />

          {/* Scan Receipt Button */}
          <label className={`w-full bg-blue-500 hover:bg-blue-600 text-white rounded-2xl p-3 shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer ${scanning ? 'opacity-60 pointer-events-none' : ''}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-medium">
              {scanning ? t(lang, 'scanning') : t(lang, 'scanReceipt')}
            </span>
            {scanning && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleScanReceipt}
              className="hidden"
              disabled={scanning}
            />
          </label>

          {scanError && (
            <p className="text-red-500 text-sm text-center whitespace-pre-wrap break-words">{scanError}</p>
          )}

          {scannedDishes && scannedDishes.length > 0 && (
            <ScanPreview
              scannedDishes={scannedDishes}
              onConfirm={handleConfirmScan}
              onCancel={() => setScannedDishes(null)}
              onRemoveItem={(i) => setScannedDishes(prev => prev.filter((_, idx) => idx !== i))}
              onUpdateItem={(i, updated) => setScannedDishes(prev => prev.map((d, idx) => idx === i ? updated : d))}
              lang={lang}
            />
          )}
        </div>

        <TipSection tip={tip} onTipChange={setTip} lang={lang} />
        <TotalSummary subtotal={subtotal} tipAmount={tipAmount} total={total} lang={lang} />
      </div>
    </div>
  )
}

// ========== ROOT APP ==========

export default function App() {
  const [screen, setScreen] = useState('loading')
  const [sessionData, setSessionData] = useState(null)

  useEffect(() => {
    const saved = sessionStorage.getItem('splitit_session')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        sb.from('sessions').select('id, lang').eq('id', data.sessionId).single().then(({ data: session, error }) => {
          if (session && !error) {
            setSessionData({ ...data, lang: session.lang || data.lang || 'he' })
            setScreen('bill')
          } else {
            sessionStorage.removeItem('splitit_session')
            setScreen('lobby')
          }
        })
      } catch {
        sessionStorage.removeItem('splitit_session')
        setScreen('lobby')
      }
    } else {
      setScreen('lobby')
    }
  }, [])

  const handleJoined = (data) => {
    setSessionData(data)
    setScreen('bill')
  }

  const handleLeave = () => {
    sessionStorage.removeItem('splitit_session')
    setSessionData(null)
    setScreen('lobby')
  }

  if (screen === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (screen === 'lobby') {
    return <Lobby onJoined={handleJoined} />
  }

  return (
    <BillScreen
      sessionId={sessionData.sessionId}
      participantId={sessionData.participantId}
      sessionCode={sessionData.sessionCode}
      lang={sessionData.lang || 'he'}
      onLeave={handleLeave}
    />
  )
}
