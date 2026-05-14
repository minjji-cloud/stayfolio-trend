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
  { id: 'hot', label: '🔥 HOT', color: '#d4523a' },
  { id: 'rising', label: '📈 RISING', color: '#4a7c6b' },
  { id: 'watch', label: '👀 WATCH', color: '#c48b3c' },
  { id: 'archive', label: '📁 ARCHIVE', color: '#888' },
]

const PLATFORMS = ['인스타', '유튜브', 'X']

export default function Home() {
  const [trends, setTrends] = useState<Trend[]>([])
  const [showModal, setShowModal] = useState(false)
  const [targetCol, setTargetCol] = useState('watch')
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
    setTargetCol(col)
    setForm({ keyword: '', description: '', status: col, platforms: [], tags: '' })
    setShowModal(true)
  }

  async function addTrend() {
    if (!form.keyword.trim()) return alert('키워드를 입력하세요')
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    await supabase.from('trends').insert({
      keyword: form.keyword.startsWith('#') ? form.keyword : '#' + form.keyword,
      description: form.description,
      status: form.status,
      platforms: form.platforms,
      tags,
    })
    setShowModal(false)
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

  return (
    <main style={{ padding: '20px', fontFamily: 'Noto Sans KR, sans-serif', background: '#f5f2ee', minHeight: '100vh' }}>

      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>🏨 스테이폴리오 트렌드 보드</h1>
          <p style={{ fontSize: '12px', color: '#888', margin: '4px 0 0' }}>
            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })} 기준
          </p>
        </div>
        <button onClick={() => openModal('hot')}
          style={{ padding: '8px 16px', background: '#d4523a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
          + 트렌드 추가
        </button>
      </div>

      {/* 칸반 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        {COLUMNS.map(col => {
          const cards = trends.filter(t => t.status === col.id)
          return (
            <div key={col.id} style={{ background: '#faf9f7', border: '1px solid #e8e4de', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid #f0ece6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '13px' }}>{col.label}</span>
                <span style={{ fontSize: '11px', color: '#aaa', background: '#f0ece6', borderRadius: '10px', padding: '1px 8px' }}>{cards.length}</span>
              </div>
              <div style={{ padding: '10px' }}>
                {cards.map(trend => (
                  <div key={trend.id} style={{ background: 'white', border: '1px solid #e8e4de', borderRadius: '8px', padding: '11px 12px', marginBottom: '8px', borderLeft: `3px solid ${col.color}` }}>

                    {/* 키워드 + 플랫폼 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '5px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px' }}>{trend.keyword}</span>
                      <span style={{ fontSize: '11px', color: '#aaa' }}>
                        {trend.platforms?.join(' · ')}
                      </span>
                    </div>

                    {/* 설명 */}
                    {trend.description && (
                      <p style={{ fontSize: '12px', color: '#6b6760', margin: '0 0 7px', lineHeight: 1.6 }}>{trend.description}</p>
                    )}

                    {/* 태그 */}
                    {trend.tags?.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        {trend.tags.map(tag => (
                          <span key={tag} style={{ fontSize: '10px', padding: '2px 7px', background: '#f0ece6', borderRadius: '10px', color: '#6b6760' }}>{tag}</span>
                        ))}
                      </div>
                    )}

                    {/* 이동 버튼 */}
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {COLUMNS.filter(c => c.id !== col.id).map(c => (
                        <button key={c.id} onClick={() => moveCard(trend.id, c.id)}
                          style={{ fontSize: '10px', padding: '2px 7px', border: '1px solid #e8e4de', borderRadius: '4px', cursor: 'pointer', background: 'white', color: '#6b6760' }}>
                          → {c.label.split(' ')[1]}
                        </button>
                      ))}
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
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '22px', width: '380px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700 }}>트렌드 카드 추가</h3>

            <label style={{ fontSize: '11px', color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px' }}>키워드</label>
            <input value={form.keyword} onChange={e => setForm(f => ({ ...f, keyword: e.target.value }))}
              placeholder="#성수동숙소"
              style={{ width: '100%', border: '1px solid #e8e4de', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', marginTop: '4px', marginBottom: '12px', boxSizing: 'border-box', outline: 'none' }} />

            <label style={{ fontSize: '11px', color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px' }}>설명</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="트렌드 내용, 맥락 등을 입력하세요"
              style={{ width: '100%', border: '1px solid #e8e4de', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', marginTop: '4px', marginBottom: '12px', boxSizing: 'border-box', outline: 'none', resize: 'vertical', minHeight: '70px' }} />

            <label style={{ fontSize: '11px', color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px' }}>플랫폼</label>
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px', marginBottom: '12px' }}>
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
              <button onClick={() => setShowModal(false)}
                style={{ padding: '8px 16px', border: '1px solid #e8e4de', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#6b6760' }}>
                취소
              </button>
              <button onClick={addTrend}
                style={{ padding: '8px 16px', background: '#d4523a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
                추가하기
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}