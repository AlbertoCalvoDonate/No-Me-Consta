import type { GameState } from '../types'
import { cards } from '../data/cards'

// Guardado de la partida EN CURSO, para poder retomarla si se cierra la
// pestaña, se bloquea el móvil o se recarga sin querer. Es GameState (las
// reglas) más lo poco de GameStore que no vive en él: qué carta toca ahora y
// los flags que se han visto (los usan los logros al terminar).
//
// Se borra al terminar la partida y al empezar una nueva. NO guarda récords
// ni logros — de eso se encarga nomeconsta.logros (ver useLogros).

const KEY = 'nomeconsta.partida'
// Subir esto invalida los guardados viejos: hazlo si cambia la forma de
// GameState de manera que un guardado anterior ya no se pueda cargar.
const VERSION = 1

export interface PartidaGuardada {
  v: number
  estado: GameState
  currentCardId: string
  flagsVistos: string[]
  lastEpilogue?: string
}

export function guardarPartida(p: Omit<PartidaGuardada, 'v'>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: VERSION, ...p }))
  } catch {
    // Incógnito o almacenamiento lleno: se juega igual, solo que sin reanudar.
  }
}

export function borrarPartida() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* nada que borrar */
  }
}

// Devuelve el guardado SOLO si es retomable: versión correcta, partida sin
// terminar, y la carta que tocaba sigue existiendo en el mazo (entre
// despliegues el mazo puede cambiar y dejar ids colgando).
export function cargarPartida(): PartidaGuardada | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as PartidaGuardada
    if (
      !p ||
      p.v !== VERSION ||
      !p.estado ||
      p.estado.gameOver ||
      typeof p.estado.turn !== 'number' ||
      p.estado.turn < 1 ||
      !p.estado.stats ||
      !Array.isArray(p.flagsVistos) ||
      !cards.some((c) => c.id === p.currentCardId)
    ) {
      return null
    }
    return p
  } catch {
    return null
  }
}

// ¿Hay una partida a medias que ofrecer con un "Continuar"? (turn 1 = recién
// empezada, sin ninguna decisión tomada: no merece un botón aparte.)
export function hayPartidaEnCurso(): boolean {
  const p = cargarPartida()
  return !!p && p.estado.turn > 1
}
