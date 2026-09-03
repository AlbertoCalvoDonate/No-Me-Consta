import { useRef, useState } from 'react'
import type { Stats } from '../types'
import { StatIcon } from './StatIcon'

const TUTORIAL_STATS: (keyof Stats)[] = ['medios', 'gobierno', 'calle', 'caja']

// Reset oculto para pruebas: 10 toques seguidos en el número de build borran
// TODO lo guardado de logros (conseguidos y los contadores acumulados). Los
// toques tienen que ir rápidos: si pasan más de 800 ms sin tocar, se
// reinicia la cuenta, así un toque suelto por error no suma.
const RESET_KEY = 'nomeconsta.logros'
const TOQUES_RESET = 10
const VENTANA_MS = 800

// Fecha de build formateada una sola vez (no cambia durante la sesión).
const buildDate = new Date(__BUILD_DATE__).toLocaleString('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function StartScreen({
  onStart,
  onVerLogros,
}: {
  onStart: () => void
  onVerLogros: () => void
}) {
  const toques = useRef(0)
  const ultimoToque = useRef(0)
  const [reseteado, setReseteado] = useState(false)

  const tocarBuild = () => {
    const ahora = Date.now()
    toques.current = ahora - ultimoToque.current < VENTANA_MS ? toques.current + 1 : 1
    ultimoToque.current = ahora
    if (toques.current >= TOQUES_RESET) {
      toques.current = 0
      try {
        localStorage.removeItem(RESET_KEY)
      } catch {
        /* modo incógnito: no había nada que borrar de todos modos */
      }
      setReseteado(true)
      window.setTimeout(() => setReseteado(false), 2500)
    }
  }

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

      <button
        onClick={onStart}
        style={{
          background: '#e0b84d',
          border: 'none',
          borderRadius: 10,
          padding: '14px 30px',
          fontFamily: 'var(--font-pixel)',
          fontWeight: 400,
          fontSize: 24,
          cursor: 'pointer',
        }}
      >
        Empezar legislatura
      </button>

      <button
        onClick={onVerLogros}
        style={{
          background: 'transparent',
          border: '2px solid rgba(224,184,77,0.55)',
          borderRadius: 10,
          padding: '9px 22px',
          marginTop: -4,
          fontFamily: 'var(--font-pixel)',
          fontWeight: 400,
          fontSize: 16,
          color: '#e0b84d',
          cursor: 'pointer',
        }}
      >
        Logros
      </button>


      <div
        onClick={tocarBuild}
        style={{
          position: 'absolute',
          bottom: 10,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: 'var(--font-pixel)',
          fontWeight: 500,
          fontSize: 14,
          color: reseteado ? '#e0b84d' : '#5a5650',
          // Zona de toque cómoda para el reset oculto, sin cambiar el aspecto.
          padding: '8px 0',
          cursor: 'default',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {reseteado ? 'Logros borrados' : `v${__APP_VERSION__} · ${buildDate}`}
      </div>
    </div>
  )
}
