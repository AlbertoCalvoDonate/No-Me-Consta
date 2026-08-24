import { STAT_ICONS } from '../statIcons'

// Fecha de build formateada una sola vez (no cambia durante la sesión).
const buildDate = new Date(__BUILD_DATE__).toLocaleString('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function StartScreen({ onStart }: { onStart: () => void }) {
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
            fontWeight: 700,
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
        <p style={{ margin: 0 }}>
          {STAT_ICONS.medios} {STAT_ICONS.partido} {STAT_ICONS.votantes} {STAT_ICONS.caja} Vigile las 4 barras: si
          alguna llega a 0 o al máximo, se acaba el reinado.
        </p>
      </div>

      <button
        onClick={onStart}
        style={{
          background: '#e0b84d',
          border: 'none',
          borderRadius: 8,
          padding: '14px 28px',
          fontFamily: 'var(--font-pixel)',
          fontWeight: 700,
          fontSize: 24,
          cursor: 'pointer',
        }}
      >
        Empezar legislatura
      </button>

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
