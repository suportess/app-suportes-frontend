'use client'

import { useState } from 'react'
import { PlayCircle, X, HelpCircle, ChevronDown } from 'lucide-react'

const VIDEOS = [
  {
    id:       'fTPJ8tM52k4',
    titulo:   'Modelo Misto',
    descricao: 'Importação com múltiplos tipos de movimento',
  },
  {
    id:       'BClmt1h6lgI',
    titulo:   'Modelo Devolução',
    descricao: 'Como utilizar o modelo de devolução de saldo',
  },
  {
    id:       'D6dra6MLmuQ',
    titulo:   'Modelo Entrada',
    descricao: 'Como utilizar o modelo de entrada de saldo',
  },
  {
    id:       '0xozckV0FCc',
    titulo:   'Vídeo Demonstrativo',
    descricao: 'Demonstração completa do sistema de importação',
  },
]

export function VideosTutorialFab() {
  const [open,       setOpen]       = useState(false)
  const [hidden,     setHidden]     = useState(false)
  const [videoAtivo, setVideoAtivo] = useState<typeof VIDEOS[number] | null>(null)

  if (hidden) return null

  return (
    <>
      {/* ── Modal de vídeo ──────────────────────────────────────────────── */}
      {videoAtivo && (
        <div
          onClick={() => setVideoAtivo(null)}
          style={{
            position:       'fixed',
            inset:          0,
            background:     'rgba(0,0,0,0.75)',
            zIndex:         10000,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            padding:        24,
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background:    '#000',
              borderRadius:  12,
              overflow:      'hidden',
              width:         '100%',
              maxWidth:      900,
              boxShadow:     '0 24px 80px rgba(0,0,0,0.6)',
              display:       'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header do modal */}
            <div
              style={{
                display:       'flex',
                alignItems:    'center',
                gap:           10,
                padding:       '12px 16px',
                background:    'linear-gradient(135deg, #1e40af, #3b82f6)',
                color:         '#fff',
                flexShrink:    0,
              }}
            >
              <PlayCircle size={15} />
              <span style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>{videoAtivo.titulo}</span>
              <button
                onClick={() => setVideoAtivo(null)}
                style={{
                  background:   'rgba(255,255,255,0.18)',
                  border:       'none',
                  borderRadius: 6,
                  color:        '#fff',
                  cursor:       'pointer',
                  display:      'flex',
                  padding:      4,
                  lineHeight:   0,
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Player 16:9 */}
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
              <iframe
                src={`https://www.youtube.com/embed/${videoAtivo.id}?autoplay=1&rel=0`}
                title={videoAtivo.titulo}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{
                  position: 'absolute',
                  inset:    0,
                  width:    '100%',
                  height:   '100%',
                  border:   'none',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── FAB flutuante ───────────────────────────────────────────────── */}
      <div
        style={{
          position:      'fixed',
          bottom:        24,
          right:         24,
          zIndex:        9000,
          display:       'flex',
          flexDirection: 'column',
          alignItems:    'flex-end',
          gap:           12,
          pointerEvents: 'none',
        }}
      >
        {/* Painel de lista */}
        {open && (
          <div
            style={{
              pointerEvents: 'auto',
              background:    '#ffffff',
              borderRadius:  14,
              boxShadow:     '0 8px 40px rgba(0,0,0,0.22)',
              width:         300,
              overflow:      'hidden',
              border:        '1px solid #e5e7eb',
              animation:     'fabPanelIn 0.18s ease',
            }}
          >
            {/* Header */}
            <div
              style={{
                display:    'flex',
                alignItems: 'center',
                gap:        8,
                padding:    '12px 14px',
                background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                color:      '#fff',
              }}
            >
              <PlayCircle size={15} />
              <span style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>Tutoriais em Vídeo</span>
              <button
                onClick={() => setOpen(false)}
                title="Minimizar"
                style={{
                  background:   'rgba(255,255,255,0.18)',
                  border:       'none',
                  borderRadius: 6,
                  color:        '#fff',
                  cursor:       'pointer',
                  display:      'flex',
                  padding:      4,
                  lineHeight:   0,
                }}
              >
                <ChevronDown size={14} />
              </button>
            </div>

            {/* Lista */}
            <div style={{ padding: '6px 0 8px' }}>
              {VIDEOS.map(v => (
                <button
                  key={v.id}
                  onClick={() => { setVideoAtivo(v); setOpen(false) }}
                  style={{
                    display:        'flex',
                    alignItems:     'center',
                    gap:            10,
                    padding:        '8px 14px',
                    width:          '100%',
                    background:     'transparent',
                    border:         'none',
                    cursor:         'pointer',
                    textAlign:      'left',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Thumbnail */}
                  <div
                    style={{
                      position:     'relative',
                      flexShrink:   0,
                      width:        72,
                      height:       48,
                      borderRadius: 6,
                      overflow:     'hidden',
                      background:   '#e5e7eb',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://img.youtube.com/vi/${v.id}/mqdefault.jpg`}
                      alt={v.titulo}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    <div
                      style={{
                        position:       'absolute',
                        inset:          0,
                        display:        'flex',
                        alignItems:     'center',
                        justifyContent: 'center',
                        background:     'rgba(0,0,0,0.32)',
                      }}
                    >
                      <PlayCircle size={20} style={{ color: '#fff', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))' }} />
                    </div>
                  </div>

                  {/* Texto */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 12, color: '#111827', lineHeight: 1.3 }}>
                      {v.titulo}
                    </div>
                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2, lineHeight: 1.3 }}>
                      {v.descricao}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* FAB + fechar */}
        <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => { setOpen(false); setHidden(true) }}
            title="Ocultar tutoriais"
            style={{
              width:          26,
              height:         26,
              borderRadius:   '50%',
              background:     'rgba(229,231,235,0.95)',
              border:         '1px solid #d1d5db',
              cursor:         'pointer',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              color:          '#6b7280',
              boxShadow:      '0 2px 6px rgba(0,0,0,0.1)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#e5e7eb')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(229,231,235,0.95)')}
          >
            <X size={12} />
          </button>

          <button
            onClick={() => setOpen(v => !v)}
            title={open ? 'Fechar tutoriais' : 'Abrir tutoriais em vídeo'}
            style={{
              width:          52,
              height:         52,
              borderRadius:   '50%',
              background:     open
                ? 'linear-gradient(135deg, #1e3a8a, #1d4ed8)'
                : 'linear-gradient(135deg, #1e40af, #3b82f6)',
              border:         'none',
              cursor:         'pointer',
              boxShadow:      '0 4px 20px rgba(59,130,246,0.5)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              color:          '#fff',
              transition:     'transform 0.2s, box-shadow 0.2s, background 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.08)'
              e.currentTarget.style.boxShadow = '0 6px 28px rgba(59,130,246,0.65)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(59,130,246,0.5)'
            }}
          >
            {open ? <ChevronDown size={22} /> : <HelpCircle size={24} />}
          </button>
        </div>

        <style>{`
          @keyframes fabPanelIn {
            from { opacity: 0; transform: translateY(10px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0)    scale(1);    }
          }
        `}</style>
      </div>
    </>
  )
}
