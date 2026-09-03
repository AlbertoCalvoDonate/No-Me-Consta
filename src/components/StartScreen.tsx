import { useRef, useState, type CSSProperties } from 'react'
import type { Stats } from '../types'
import { StatIcon } from './StatIcon'
import { epitetoDe } from '../data/epitetos'
import { useLogrosEstado } from '../hooks/useLogros'

const STATS: { key: keyof Stats; label: string }[] = [
  { key: 'medios', label: 'Medios' },
  { key: 'gobierno', label: 'Gobierno' },
  { key: 'calle', label: 'Calle' },
  { key: 'caja', label: 'Caja B' },
]

const TOTAL_EPITETOS = 11

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

const pixel = { fontFamily: 'var(--font-pixel)' } as const

export function StartScreen({
  onStart,
  onContinuar,
  mesEnCurso,
  onVerLogros,
}: {
  onStart: () => void
  // Si hay una partida a medias que retomar. Ausente = no la hay.
  onContinuar?: () => void
  // El mes que muestra la barra de abajo (turn crudo), para que "Continuar"
  // coincida con lo último que vio el jugador.
  mesEnCurso: number
  onVerLogros: () => void
}) {
  const { partidas, mesesRecord, epitetoRecord, epitetosVistos, hechos, total } = useLogrosEstado()

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
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        color: '#f2f2f2',
      }}
    >
      {/* `margin: auto` centra el bloque cuando cabe; cuando no (móviles muy
          pequeños, 320px), el contenedor de arriba hace scroll. */}
      <div
        style={{
          margin: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '24px 26px',
          gap: 16,
        }}
      >
      <div>
        <h1
          style={{
            ...pixel,
            margin: 0,
            fontWeight: 400,
            fontSize: 46,
            color: '#e0b84d',
            lineHeight: 1.05,
          }}
        >
          No Me Consta
        </h1>
        <p style={{ ...pixel, margin: '8px 0 0', fontWeight: 500, fontSize: 17, color: '#a89f8c' }}>
          Gobierna el país y vive para contarlo.
        </p>
      </div>

      {/* Tutorial: instrucciones claras, tono seco. */}
      <div
        style={{
          background: '#1c1c1e',
          borderRadius: 14,
          padding: '16px 18px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            ...pixel,
            fontWeight: 500,
            fontSize: 13,
            letterSpacing: 0.8,
            color: '#8a8272',
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          Cómo se gobierna
        </div>

        <p style={{ ...pixel, margin: 0, fontWeight: 500, fontSize: 17, lineHeight: 1.45, color: '#e8e2d4' }}>
          Desliza cada carta a un lado o al otro para decidir.
          <br />
          Rara vez hay una opción buena. Esa es la gracia.
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-around', gap: 4, margin: '14px 0 10px' }}>
          {STATS.map(({ key, label }) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <StatIcon statKey={key} value={5} critical={false} size={38} />
              <span style={{ ...pixel, fontWeight: 500, fontSize: 12, color: '#a8a08c' }}>{label}</span>
            </div>
          ))}
        </div>

        <p style={{ ...pixel, margin: 0, fontWeight: 500, fontSize: 16, lineHeight: 1.4, color: '#b7b1a3' }}>
          Si una llega a 0 o al máximo, cae el gobierno. El tuyo.
        </p>
      </div>

      {/* Marca personal: como en Reigns, cuánto aguantaste y qué has coleccionado
          — no una puntuación, un historial. Solo si ya has jugado. */}
      {partidas > 0 && (
        <div style={{ ...pixel, fontWeight: 500, fontSize: 14, lineHeight: 1.6, color: '#7d7768' }}>
          <div>
            Tu récord: <span style={{ color: '#c9a24a' }}>{mesesRecord} {mesesRecord === 1 ? 'mes' : 'meses'}</span>
            {epitetoRecord >= 0 && `, ${epitetoDe(epitetoRecord).nombre}`}
          </div>
          <div>
            {epitetosVistos}/{TOTAL_EPITETOS} epítetos · {hechos}/{total} logros
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 2 }}>
        {onContinuar ? (
          <>
            <button onClick={onContinuar} style={botonPrimario}>
              Continuar · mes {Math.max(1, mesEnCurso)}
            </button>
            <button onClick={onStart} style={botonSecundario}>
              Empezar de cero
            </button>
          </>
        ) : (
          <button onClick={onStart} style={botonPrimario}>
            Empezar legislatura
          </button>
        )}

        <button onClick={onVerLogros} style={botonSecundario}>
          Logros
        </button>
      </div>

      <div
        onClick={tocarBuild}
        style={{
          ...pixel,
          marginTop: 4,
          textAlign: 'center',
          fontWeight: 500,
          fontSize: 13,
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
    </div>
  )
}

const botonPrimario: CSSProperties = {
  ...pixel,
  background: '#e0b84d',
  border: 'none',
  borderRadius: 10,
  padding: '13px 30px',
  fontWeight: 400,
  fontSize: 23,
  cursor: 'pointer',
}

// Mismo aspecto que los botones secundarios de la pantalla de fin
// (compartir / logros), por consistencia.
const botonSecundario: CSSProperties = {
  ...pixel,
  background: 'transparent',
  border: '2px solid rgba(224,184,77,0.45)',
  borderRadius: 8,
  padding: '7px 18px',
  fontWeight: 400,
  fontSize: 16,
  color: '#e0b84d',
  cursor: 'pointer',
}
