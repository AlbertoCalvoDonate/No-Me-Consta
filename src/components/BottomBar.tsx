import { SoundButton } from './SoundButton'
import { ELECTION_INTERVAL, ELECTION_MAX_TERMS } from '../data/cards'

// Meses que faltan para la proxima noche electoral, o undefined si ya no
// quedan (la ultima convocatoria cierra la partida).
function mesesParaUrnas(turn: number): number | undefined {
  const ultima = ELECTION_INTERVAL * ELECTION_MAX_TERMS
  if (turn >= ultima) return undefined
  return ELECTION_INTERVAL - (turn % ELECTION_INTERVAL)
}

export function BottomBar({ turn }: { turn: number }) {
  const faltan = mesesParaUrnas(turn)
  // Solo se avisa en el ultimo año: antes seria ruido en pantalla todo el
  // rato, y en el ultimo año es cuando de verdad cambia como juegas.
  const avisar = faltan !== undefined && faltan <= 12
  return (
    <div
      style={{
        flexShrink: 0,
        background: '#111113',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '8px 12px 8px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        fontFamily: 'var(--font-pixel)',
        fontSize: 20,
        fontWeight: 500,
        color: '#a89f8c',
      }}
    >
      <span style={{ color: '#e0b84d', whiteSpace: 'nowrap' }}>Presidente</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span style={{ whiteSpace: 'nowrap' }}>
          {turn} mes{turn === 1 ? '' : 'es'}
        </span>
        {avisar && (
          <span
            style={{
              whiteSpace: 'nowrap',
              fontSize: 14,
              color: faltan <= 3 ? '#e07a4d' : '#7d7768',
            }}
          >
            urnas en {faltan}
          </span>
        )}
        <SoundButton />
      </div>
    </div>
  )
}
