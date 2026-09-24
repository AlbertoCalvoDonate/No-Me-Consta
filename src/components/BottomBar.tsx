import { SoundButton } from './SoundButton'
import { ELECTION_INTERVAL, ELECTION_MAX_TERMS } from '../data/cards'
import { COLOR, pixel } from '../utils/estilo'

// Meses que faltan para la proxima noche electoral, o undefined si ya no
// quedan (la ultima convocatoria cierra la partida).
function mesesParaUrnas(turn: number): number | undefined {
  const ultima = ELECTION_INTERVAL * ELECTION_MAX_TERMS
  if (turn >= ultima) return undefined
  return ELECTION_INTERVAL - (turn % ELECTION_INTERVAL)
}

export function BottomBar({ turn }: { turn: number }) {
  const faltan = mesesParaUrnas(turn)
  const meses = Math.max(0, turn - 1)
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
        ...pixel,
        fontSize: 20,
        fontWeight: 500,
        color: '#a89f8c',
      }}
    >
      <span style={{ color: COLOR.oro, whiteSpace: 'nowrap' }}>Presidente</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {/* Meses CUMPLIDOS (turn - 1), que es lo que cuentan la pantalla de
            fin, el record, los logros y el texto de compartir. Antes aqui se
            pintaba `turn` crudo: el jugador miraba este numero toda la partida
            y al terminar le decian uno menos en la misma pantalla. */}
        <span style={{ whiteSpace: 'nowrap' }}>
          {/* El primer mes aun no se ha cumplido, asi que el contador vale 0 y
              ahi parece un dato sin cargar. Se dice con palabras y a partir del
              mes 1 ya va el numero, que es el mismo que dira la pantalla de
              fin. */}
          {meses === 0 ? 'recién llegado' : meses + ' mes' + (meses === 1 ? '' : 'es')}
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
