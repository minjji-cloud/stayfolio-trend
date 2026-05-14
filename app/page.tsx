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
  { id: 'hot', label: '🔥 HOT' },
  { id: 'rising', label: '📈 RISING' },
  { id: 'watch', label: '👀 WATCH' },
  { id: 'archive', label: '📁 ARCHIVE' },
]

export default function Home() {
  const [trends, setTrends] = useState<Trend[]>([])

  useEffect(() => {
    fetchTrends()
  }, [])

  async function fetchTrends() {
    const { data, error } = await supabase
      .from('trends')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setTrends(data)
  }

  async function addTrend() {
    const keyword = prompt('키워드를 입력하세요 (예: #성수동숙소)')
    if (!keyword) return
    const { error } = await supabase
      .from('trends')
      .insert({ keyword, status: 'watch', platforms: [], tags: [] })
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

  return (
    <main style={{ padding: '20px', fontFamily: 'sans-serif', background: '#f5f2ee', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700 }}>🏨 스테이폴리오 트렌드 보드</h1>
        <button onClick={addTrend} style={{ padding: '8px 16px', background: '#d4523a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          + 트렌드 추가
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        {COLUMNS.map(col => (
          <div key={col.id} style={{ background: '#faf9f7', border: '1px solid #e8e4de', borderRadius: '12px', padding: '12px' }}>
            <div style={{ fontWeight: 700, marginBottom: '10px' }}>{col.label}</div>
            {trends.filter(t => t.status === col.id).map(trend => (
              <div key={trend.id} style={{ background: 'white', border: '1px solid #e8e4de', borderRadius: '8px', padding: '10px', marginBottom: '8px' }}>
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>{trend.keyword}</div>
                <div style={{ fontSize: '12px', color: '#6b6760', marginBottom: '8px' }}>{trend.description}</div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {COLUMNS.filter(c => c.id !== col.id).map(c => (
                    <button key={c.id} onClick={() => moveCard(trend.id, c.id)}
                      style={{ fontSize: '11px', padding: '2px 6px', border: '1px solid #e8e4de', borderRadius: '4px', cursor: 'pointer', background: 'white' }}>
                      → {c.label}
                    </button>
                  ))}
                  <button onClick={() => deleteCard(trend.id)}
                    style={{ fontSize: '11px', padding: '2px 6px', border: '1px solid #fcc', borderRadius: '4px', cursor: 'pointer', background: '#fff5f5', color: '#c00' }}>
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </main>
  )
}