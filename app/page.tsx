'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Trend = {
  id: string
  keyword: string
  description: string
  status: 'hot' | 'rising' | 'watch' | 'archive'
  platforms: string[]
  tags: string[]
  created_at: string
}

const COLUMNS = [
  { id: 'hot', label: '🔥 HOT', color: '#7ec8a0', desc: '현재 최고 반응' },
  { id: 'rising', label: '📈 RISING', color: '#d4b882', desc: '빠른 성장세' },
  { id: 'watch', label: '👀 WATCH', color: '#e8927c', desc: '초기 주목 필요' },
  { id: 'archive', label: '📁 ARCHIVE', color: '#888', desc: '지난 트렌드 보관' },
]

const PLATFORMS = ['인스타', '유튜브', 'X', '스레드']

const DAILY_PROMPT = `오늘 날짜 기준으로 대한민국 SNS(인스타그램, 유튜브, X, 스레드)에서
여행·숙박·숙소 관련 주목할 만한 트렌드 키워드 8개를 뽑아줘.

각 키워드마다 아래 형식으로 정리해줘:
- 키워드: #키워드명
- 플랫폼: 인스타/유튜브/X/스레드
- 상태: HOT 또는 RISING 또는 WATCH
- 설명: 2줄 이내로 왜 주목해야 하는지

스테이폴리오(국내 감성숙소 큐레이션 플랫폼) 콘텐츠 마케터 시각으로 분석해줘.`

function getWeekKey(dateStr: string) {
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const firstDay = new Date(year, d.getMonth(), 1)
  const firstWeekDay = firstDay.getDay() || 7
  const weekNum = Math.ceil((d.getDate() + firstWeekDay - 1) / 7)
  return `${year}년 ${month}월 ${weekNum}주차`
}

function isSameDay(a: string, b: Date) {
  const da = new Date(a)
  return da.getFullYear() === b.getFullYear() && da.getMonth() === b.getMonth() && da.getDate() === b.getDate()
}

export default function Home() {
  const [trends, setTrends] = useState<Trend[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [copied, setCopied] = useState(false)
  const [dateFilter, setDateFilter] = useState('today')
  const [openWeeks, setOpenWeeks] = useState<string[]>([])
  const [editTarget, setEditTarget] = useState<Trend | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [form, setForm] = useState({
    keyword: '',
    description: '',
    status: 'watch',
    platforms: [] as string[],
    tags: '',
  })

  useEffect(() => { fetchTrends() }, [])

  async function fetchTrends() {
    const { data } = await supabase
      .from('trends')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setTrends(data)
  }

  function openModal(col: string) {
    setEditTarget(null)
    setForm({ keyword: '', description: '', status: col, platforms: [], tags: '' })
    setShowModal(true)
  }

  function openEditModal(trend: Trend) {
    setEditTarget(trend)
    setForm({
      keyword: trend.keyword,
      description: trend.description || '',
      status: trend.status,
      platforms: trend.platforms || [],
      tags: trend.tags?.join(', ') || '',
    })
    setShowModal(true)
  }

  async function saveTrend() {
    if (!form.keyword.trim()) return alert('키워드를 입력하세요')
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    const payload = {
      keyword: form.keyword.startsWith('#') ? form.keyword : '#' + form.keyword,
      description: form.description,
      status: form.status,
      platforms: form.platforms,
      tags,
    }
    if (editTarget) {
      await supabase.from('trends').update(payload).eq('id', editTarget.id)
    } else {
      await supabase.from('trends').insert(payload)
    }
    setShowModal(false)
    setEditTarget(null)
    fetchTrends()
  }

  async function moveCard(id: string, status: string) {
    await supabase.from('trends').update({ status }).eq('id', id)
    fetchTrends()
  }

  async function deleteCard(id: string) {
    if (!confirm('삭제할까요?')) return
    await supabase.from('trends').delete().eq('id', id)
    fetchTrends()
  }

  function togglePlatform(p: string) {
    setForm(f => ({
      ...f,
      platforms: f.platforms.includes(p)
        ? f.platforms.filter(x => x !== p)
        : [...f.platforms, p]
    }))
  }

  function copyPrompt() {
    navigator.clipboard.writeText(DAILY_PROMPT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function toggleWeek(week: string) {
    setOpenWeeks(w => w.includes(week) ? w.filter(x => x !== week) : [...w, week])
  }

  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7)

  // 검색 자동완성 후보
  const searchSuggestions = searchQuery.trim().length > 0
    ? trends.filter(t =>
        t.keyword.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      ).slice(0, 6)
    : []

  // 검색어 적용된 트렌드
  const searchedTrends = searchQuery.trim().length > 0
    ? trends.filter(t =>
        t.keyword.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : null

  const filteredTrends = (searchedTrends ?? trends).filter(t => {
    if (dateFilter === 'today') return isSameDay(t.created_at, today)
    if (dateFilter === 'yesterday') return isSameDay(t.created_at, yesterday)
    if (dateFilter === 'week') return new Date(t.created_at) >= weekAgo
    return true
  })

  const weekGroups: { [week: string]: Trend[] } = {}
  trends.forEach(t => {
    const week = getWeekKey(t.created_at)
    if (!weekGroups[week]) weekGroups[week] = []
    weekGroups[week].push(t)
  })

  const DATE_FILTERS = [
    { id: 'today', label: '오늘' },
    { id: 'yesterday', label: '어제' },
    { id: 'week', label: '이번 주' },
    { id: 'all', label: '전체' },
  ]

  function highlightText(text: string, query: string) {
    if (!query.trim()) return text
    const idx = text.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) return text
    return (
      text.slice(0, idx) +
      '**' + text.slice(idx, idx + query.length) + '**' +
      text.slice(idx + query.length)
    )
  }

  return (
    <main style={{ padding: '20px', fontFamily: 'Noto Sans KR, sans-serif', background: '#f5f2ee', minHeight: '100vh' }}>

      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>🏨 스테이폴리오 트렌드 보드</h1>
          <p style={{ fontSize: '12px', color: '#888', margin: '4px 0 0' }}>
            {today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })} 기준
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowPrompt(!showPrompt)}
            style={{ padding: '8px 14px', background: showPrompt ? '#f0ece6' : 'white', border: '1px solid #e8e4de', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#6b6760' }}>
            {showPrompt ? '📋 닫기' : '📋 오늘의 프롬프트'}
          </button>
          <button onClick={() => openModal('hot')}
            style={{ padding: '8px 14px', background: '#d4523a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
            + 트렌드 추가
          </button>
        </div>
      </div>

      {/* 프롬프트 메모란 */}
      {showPrompt && (
        <div style={{ background: 'white', border: '1px solid #e8e4de', borderRadius: '12px', padding: '16px 18px', marginBottom: '16px', borderLeft: '3px solid #d4523a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700 }}>📋 매일 아침 Claude에 붙여넣을 프롬프트</span>
            <button onClick={copyPrompt}
              style={{ padding: '5px 12px', background: copied ? '#4a7c6b' : '#d4523a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>
              {copied ? '✓ 복사됨!' : '복사하기'}
            </button>
          </div>
          <pre style={{ margin: 0, fontSize: '12px', color: '#6b6760', lineHeight: 1.7, whiteSpace: 'pre-wrap', background: '#faf9f7', padding: '12px', borderRadius: '8px', border: '1px solid #f0ece6' }}>
            {DAILY_PROMPT}
          </pre>
          <p style={{ margin: '10px 0 0', fontSize: '11px', color: '#aaa' }}>
            💡 복사 후 claude.ai 채팅창에 붙여넣으면 트렌드 8개를 뽑아줘요
          </p>
        </div>
      )}

      {/* 날짜 필터 */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        {DATE_FILTERS.map(f => (
          <button key={f.id} onClick={() => setDateFilter(f.id)}
            style={{ padding: '6px 14px', borderRadius: '20px', border: '1px solid', fontSize: '12px', cursor: 'pointer', fontWeight: dateFilter === f.id ? 600 : 400,
              borderColor: dateFilter === f.id ? '#d4523a' : '#e8e4de',
              background: dateFilter === f.id ? '#d4523a' : 'white',
              color: dateFilter === f.id ? 'white' : '#6b6760' }}>
            {f.label}
            <span style={{ marginLeft: '5px', fontSize: '11px', opacity: 0.8 }}>
              {trends.filter(t => {
                if (f.id === 'today') return isSameDay(t.created_at, today)
                if (f.id === 'yesterday') return isSameDay(t.created_at, yesterday)
                if (f.id === 'week') return new Date(t.created_at) >= weekAgo
                return true
              }).length}
            </span>
          </button>
        ))}
      </div>

      {/* 주간 트렌드 아카이브 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', color: '#1a1814' }}>📅 주간 트렌드 아카이브</h2>
        {Object.keys(weekGroups).length === 0 && (
          <p style={{ fontSize: '12px', color: '#aaa', padding: '14px 0' }}>아직 아카이브된 트렌드가 없어요</p>
        )}
        {Object.entries(weekGroups).map(([week, items]) => {
          const isOpen = openWeeks.includes(week)
          const hotItems = items.filter(t => t.status === 'hot')
          const risingItems = items.filter(t => t.status === 'rising')
          return (
            <div key={week} style={{ background: 'white', border: '1px solid #e8e4de', borderRadius: '12px', marginBottom: '8px', overflow: 'hidden' }}>
              <button onClick={() => toggleWeek(week)}
                style={{ width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1a1814' }}>📅 {week}</span>
                  <span style={{ fontSize: '11px', color: '#aaa' }}>총 {items.length}개</span>
                  {hotItems.length > 0 && (
                    <span style={{ fontSize: '11px', background: '#edf7f2', color: '#7ec8a0', padding: '2px 8px', borderRadius: '10px', fontWeight: 500 }}>🔥 {hotItems.length}</span>
                  )}
                  {risingItems.length > 0 && (
                    <span style={{ fontSize: '11px', background: '#faf5eb', color: '#d4b882', padding: '2px 8px', borderRadius: '10px', fontWeight: 500 }}>📈 {risingItems.length}</span>
                  )}
                </div>
                <span style={{ fontSize: '13px', color: '#aaa' }}>{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <div style={{ padding: '0 16px 14px', borderTop: '1px solid #f0ece6' }}>
                  {COLUMNS.map(col => {
                    const colItems = items.filter(t => t.status === col.id)
                    if (colItems.length === 0) return null
                    return (
                      <div key={col.id} style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: col.color, marginBottom: '6px' }}>{col.label}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {colItems.map(t => (
                            <div key={t.id} style={{ background: '#faf9f7', border: '1px solid #e8e4de', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', borderLeft: `2px solid ${col.color}` }}>
                              <div style={{ fontWeight: 700, color: '#1a1814', marginBottom: '2px' }}>{t.keyword}</div>
                              {t.platforms?.length > 0 && (
                                <div style={{ fontSize: '10px', color: '#aaa' }}>{t.platforms.join(' · ')}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 검색 */}
      <div style={{ borderTop: '2px solid #e8e4de', paddingTop: '20px', marginBottom: '16px' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: `1px solid ${searchFocused ? '#d4523a' : '#e8e4de'}`, borderRadius: '10px', padding: '10px 14px', gap: '8px', transition: 'border-color 0.15s' }}>
            <span style={{ fontSize: '15px', color: '#aaa' }}>🔍</span>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              placeholder="키워드, 설명, 태그로 검색하세요"
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: '13px', color: '#1a1814', background: 'transparent', fontFamily: 'Noto Sans KR, sans-serif' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}
                style={{ border: 'none', background: '#f0ece6', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '11px', color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ✕
              </button>
            )}
          </div>

          {/* 자동완성 드롭다운 */}
          {searchFocused && searchSuggestions.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e8e4de', borderRadius: '10px', marginTop: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 50, overflow: 'hidden' }}>
              {searchSuggestions.map(t => {
                const col = COLUMNS.find(c => c.id === t.status)
                return (
                  <button key={t.id}
                    onMouseDown={() => setSearchQuery(t.keyword)}
                    style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left', borderBottom: '1px solid #f5f2ee' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontWeight: 500, background: col?.id === 'hot' ? '#edf7f2' : col?.id === 'rising' ? '#faf5eb' : col?.id === 'watch' ? '#fdf2ef' : '#f0f0f0', color: col?.color, flexShrink: 0 }}>
                      {col?.label.split(' ')[1]}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a1814' }}>{t.keyword}</div>
                      {t.description && (
                        <div style={{ fontSize: '11px', color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</div>
                      )}
                    </div>
                    {t.platforms?.length > 0 && (
                      <span style={{ fontSize: '10px', color: '#aaa', flexShrink: 0 }}>{t.platforms.join(' · ')}</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 검색 결과 요약 */}
        {searchQuery.trim() && (
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
            <span style={{ color: '#d4523a', fontWeight: 600 }}>"{searchQuery}"</span> 검색 결과 — 총 {searchedTrends?.length ?? 0}개
          </div>
        )}
      </div>

      {/* 칸반 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        {COLUMNS.map(col => {
          const cards = filteredTrends.filter(t => t.status === col.id)
          return (
            <div key={col.id} style={{ background: '#faf9f7', border: '1px solid #e8e4de', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid #f0ece6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '13px' }}>{col.label}</span>
                  <div style={{ fontSize: '10px', color: '#c0bdb8', marginTop: '2px' }}>{col.desc}</div>
                </div>
                <span style={{ fontSize: '11px', color: '#aaa', background: '#f0ece6', borderRadius: '10px', padding: '1px 8px' }}>{cards.length}</span>
              </div>
              <div style={{ padding: '10px' }}>
                {cards.length === 0 && (
                  <p style={{ fontSize: '12px', color: '#ccc', textAlign: 'center', padding: '20px 0' }}>
                    {searchQuery ? '검색 결과 없음' : '트렌드 없음'}
                  </p>
                )}
                {cards.map(trend => (
                  <div key={trend.id} style={{ background: 'white', border: '1px solid #e8e4de', borderRadius: '8px', padding: '11px 12px', marginBottom: '8px', borderLeft: `3px solid ${col.color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '5px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px' }}>{trend.keyword}</span>
                      <span style={{ fontSize: '10px', color: '#aaa' }}>{trend.platforms?.join(' · ')}</span>
                    </div>
                    {trend.description && (
                      <p style={{ fontSize: '12px', color: '#6b6760', margin: '0 0 7px', lineHeight: 1.6 }}>{trend.description}</p>
                    )}
                    {trend.tags?.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        {trend.tags.map(tag => (
                          <span key={tag} style={{ fontSize: '10px', padding: '2px 7px', background: '#f0ece6', borderRadius: '10px', color: '#6b6760' }}>{tag}</span>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {COLUMNS.filter(c => c.id !== col.id).map(c => (
                        <button key={c.id} onClick={() => moveCard(trend.id, c.id)}
                          style={{ fontSize: '10px', padding: '2px 7px', border: '1px solid #e8e4de', borderRadius: '4px', cursor: 'pointer', background: 'white', color: '#6b6760' }}>
                          → {c.label.split(' ')[1]}
                        </button>
                      ))}
                      <button onClick={() => openEditModal(trend)}
                        style={{ fontSize: '10px', padding: '2px 7px', border: '1px solid #d4e8e0', borderRadius: '4px', cursor: 'pointer', background: '#f0f8f5', color: '#4a7c6b' }}>
                        수정
                      </button>
                      <button onClick={() => deleteCard(trend.id)}
                        style={{ fontSize: '10px', padding: '2px 7px', border: '1px solid #fcc', borderRadius: '4px', cursor: 'pointer', background: '#fff5f5', color: '#c00', marginLeft: 'auto' }}>
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
                <button onClick={() => openModal(col.id)}
                  style={{ width: '100%', padding: '7px', background: 'transparent', border: '1px dashed #e8e4de', borderRadius: '8px', color: '#aaa', fontSize: '12px', cursor: 'pointer' }}>
                  + 추가
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* 모달 */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); setEditTarget(null) } }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '22px', width: '380px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700 }}>
              {editTarget ? '트렌드 카드 수정' : '트렌드 카드 추가'}
            </h3>

            <label style={{ fontSize: '11px', color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px' }}>키워드</label>
            <input value={form.keyword} onChange={e => setForm(f => ({ ...f, keyword: e.target.value }))}
              placeholder="#성수동숙소"
              style={{ width: '100%', border: '1px solid #e8e4de', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', marginTop: '4px', marginBottom: '12px', boxSizing: 'border-box', outline: 'none' }} />

            <label style={{ fontSize: '11px', color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px' }}>설명</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="트렌드 내용, 맥락 등을 입력하세요"
              style={{ width: '100%', border: '1px solid #e8e4de', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', marginTop: '4px', marginBottom: '12px', boxSizing: 'border-box', outline: 'none', resize: 'vertical', minHeight: '70px' }} />

            <label style={{ fontSize: '11px', color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px' }}>플랫폼</label>
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {PLATFORMS.map(p => (
                <button key={p} onClick={() => togglePlatform(p)}
                  style={{ padding: '5px 12px', borderRadius: '20px', border: '1px solid', fontSize: '12px', cursor: 'pointer',
                    borderColor: form.platforms.includes(p) ? '#d4523a' : '#e8e4de',
                    background: form.platforms.includes(p) ? '#fdf0ed' : 'white',
                    color: form.platforms.includes(p) ? '#d4523a' : '#6b6760' }}>
                  {p}
                </button>
              ))}
            </div>

            <label style={{ fontSize: '11px', color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px' }}>태그</label>
            <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              placeholder="바이럴, MZ, 시즌성 (쉼표로 구분)"
              style={{ width: '100%', border: '1px solid #e8e4de', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', marginTop: '4px', marginBottom: '12px', boxSizing: 'border-box', outline: 'none' }} />

            <label style={{ fontSize: '11px', color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px' }}>상태</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              style={{ width: '100%', border: '1px solid #e8e4de', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', marginTop: '4px', marginBottom: '16px', boxSizing: 'border-box', outline: 'none' }}>
              {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowModal(false); setEditTarget(null) }}
                style={{ padding: '8px 16px', border: '1px solid #e8e4de', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#6b6760' }}>
                취소
              </button>
              <button onClick={saveTrend}
                style={{ padding: '8px 16px', background: '#d4523a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
                {editTarget ? '수정 완료' : '추가하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}