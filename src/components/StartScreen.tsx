import type { Stats } from '../types'
import { StatIcon } from './StatIcon'
import { MODES, type ModeId } from '../data/modes'

const TUTORIAL_STATS: (keyof Stats)[] = ['medios', 'gobierno', 'calle', 'caja']

// Fecha de build formateada una sola vez (no cambia durante la sesión).
const buildDate = new Date(__BUILD_DATE__).toLocaleString('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function StartScreen({ onStart }: { onStart: (mode: ModeId) => void }) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '32px 28px',
        gap: 22,
        color: '#f2f2f2',
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-pixel)',
            fontWeight: 400,
            fontSize: 46,
            color: '#e0b84d',
            lineHeight: 1.1,
          }}
        >
          No Me Consta
        </h1>
        <p
          style={{
            margin: '8px 0 0',
            fontFamily: 'var(--font-pixel)',
            fontWeight: 500,
            fontSize: 18,
            color: '#a89f8c',
          }}
        >
          Sobreviva una legislatura entera. O no.
        </p>
      </div>

      <div
        style={{
          background: '#1c1c1e',
          borderRadius: 14,
          padding: '18px 20px',
          fontFamily: 'var(--font-pixel)',
          fontWeight: 500,
          fontSize: 19,
          lineHeight: 1.5,
          color: '#e8e2d4',
        }}
      >
        <p style={{ margin: '0 0 10px' }}>👉 👈 Deslice cada carta a un lado u otro para decidir.</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '0 0 8px' }}>
          {TUTORIAL_STATS.map((key) => (
            <StatIcon key={key} statKey={key} value={5} critical={false} />
          ))}
        </div>
        <p style={{ margin: 0 }}>Vigile estas 4 barras: si alguna llega a 0 o al máximo, se acaba el gobierno.</p>
      </div>

      {/* Dos modos. La diferencia es cuánto te perdona el juego no compensar
          los excesos, no el contenido: el mazo es el mismo. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 320 }}>
        {(['minoria', 'mayoria'] as ModeId[]).map((id, i) => {
          const mode = MODES[id]
          const principal = i === 0
          return (
            <button
              key={id}
              onClick={() => onStart(id)}
              style={{
                background: principal ? '#e0b84d' : 'transparent',
                color: principal ? '#1a1a1a' : '#e0b84d',
                border: principal ? 'none' : '2px solid rgba(224,184,77,0.55)',
                borderRadius: 10,
                padding: '12px 18px',
                fontFamily: 'var(--font-pixel)',
                fontWeight: 400,
                cursor: 'pointer',
                textAlign: 'center',
                lineHeight: 1.2,
              }}
            >
              <div style={{ fontSize: 23 }}>{mode.label}</div>
              <div style={{ fontSize: 15, opacity: 0.75, marginTop: 3 }}>{mode.tagline}</div>
            </button>
          )
        })}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: 'var(--font-pixel)',
          fontWeight: 500,
          fontSize: 14,
          color: '#5a5650',
        }}
      >
        v{__APP_VERSION__} · {buildDate}
      </div>
    </div>
  )
}
