import { create } from 'zustand'
import type { Card, GameState, Stats, StatEffects } from '../types'
import { PHASE_MIN_TURN } from '../types'
import { cards, STAT_START, STAT_MAX } from '../data/cards'

function cardMinTurn(c: Card): number {
  return c.minTurn ?? PHASE_MIN_TURN[c.phase]
}

function isInTurnWindow(c: Card, turn: number): boolean {
  const min = cardMinTurn(c)
  const max = c.maxTurn ?? Infinity
  return turn >= min && turn <= max
}

function clamp(n: number) {
  return Math.max(0, Math.min(STAT_MAX, n))
}

// Un poco de suerte en cada efecto no nulo (±1, con un 20% de probabilidad
// cada lado — un 60% de las veces sale tal cual). Centrado en 0, así que no
// cambia el balance medio del mazo, pero evita que la partida se pueda
// "resolver" con una estrategia perfecta: en una simulación jugando siempre
// a la opción más segura, sin esto se ganaba en ~el 75% de las partidas
// (y de forma predecible); con esto, gana en torno al 35-40%, y ninguna
// partida se alarga de forma indefinida. Las flechas de arriba siguen
// mostrando el efecto "de catálogo" tal cual está escrito en la carta — el
// jitter es la parte de suerte que no se anuncia por adelantado.
function jitter(base: number): number {
  if (base === 0) return 0
  const r = Math.random()
  if (r < 0.2) return base - 1
  if (r > 0.8) return base + 1
  return base
}

function applyEffects(stats: Stats, effects: StatEffects): Stats {
  return {
    medios: clamp(stats.medios + jitter(effects.medios ?? 0)),
    partido: clamp(stats.partido + jitter(effects.partido ?? 0)),
    votantes: clamp(stats.votantes + jitter(effects.votantes ?? 0)),
    caja: clamp(stats.caja + jitter(effects.caja ?? 0)),
  }
}

function pickNextCard(state: GameState, forcedId?: string): Card {
  if (forcedId) {
    const forced = cards.find((c) => c.id === forcedId)
    if (forced) return forced
  }

  // ¿Algún stat ha tocado fondo (o se ha alcanzado un final especial)?
  // Si hay varios finales válidos a la vez, elige uno al azar entre ellos
  // para que no salga siempre el mismo texto.
  // Los finales con `minTurn` (ej. la reelección) solo pueden dispararse a
  // partir de ese turno — así no se gana "por accidente" a los 5 minutos
  // solo por tener las 4 stats altas de rebote. Los finales de stat a 0 no
  // llevan minTurn, así que siguen disparándose en cuanto ocurre el crash.
  const validEndings = cards.filter(
    (c) => c.isEnding && (c.minTurn === undefined || state.turn >= c.minTurn) && c.condition?.(state.stats)
  )
  if (validEndings.length > 0) {
    return validEndings[Math.floor(Math.random() * validEndings.length)]
  }

  // Cartas normales candidatas: no vistas recientemente, no son finales,
  // dentro de su ventana de turno/fase, y cumplen su condición si la tienen.
  const recent = new Set(state.history.slice(-5))
  const base = (c: Card) =>
    !c.isEnding && !recent.has(c.id) && (!c.condition || c.condition(state.stats))

  // 1) Intento estricto: respetando también la ventana de turno/fase
  let candidates = cards.filter((c) => base(c) && isInTurnWindow(c, state.turn))

  // 2) Si no hay nada en esta fase todavía (partida muy temprana o mazo corto),
  //    relaja la ventana de turno pero mantiene el resto de filtros.
  if (candidates.length === 0) {
    candidates = cards.filter(base)
  }

  // 3) Último recurso: cualquier carta no-final, ignorando repetición reciente.
  if (candidates.length === 0) {
    candidates = cards.filter((c) => !c.isEnding)
  }

  const weighted = candidates.flatMap((c) => Array(c.weight ?? 1).fill(c))
  return weighted[Math.floor(Math.random() * weighted.length)]
}

interface GameStore extends GameState {
  currentCard: Card
  lastEpilogue?: string
  choose: (side: 'left' | 'right') => void
  restart: () => void
}

function initialStats(): Stats {
  return { medios: STAT_START, partido: STAT_START, votantes: STAT_START, caja: STAT_START }
}

export const useGameStore = create<GameStore>((set, get) => ({
  stats: initialStats(),
  turn: 1,
  history: ['presi_intro'],
  gameOver: false,
  currentCard: cards.find((c) => c.id === 'presi_intro')!,
  lastEpilogue: undefined,

  choose: (side) => {
    const state = get()
    const choice = state.currentCard[side]
    const newStats = applyEffects(state.stats, choice.effects)

    if (choice.epilogueText) {
      set({
        stats: newStats,
        gameOver: true,
        deathReason: choice.epilogueText,
        lastEpilogue: choice.epilogueText,
      })
      return
    }

    const nextState: GameState = {
      stats: newStats,
      turn: state.turn + 1,
      history: [...state.history, state.currentCard.id],
      gameOver: false,
    }
    const nextCard = pickNextCard(nextState, choice.nextCardId)

    set({
      ...nextState,
      currentCard: nextCard,
    })
  },

  restart: () => {
    set({
      stats: initialStats(),
      turn: 1,
      history: ['presi_intro'],
      gameOver: false,
      deathReason: undefined,
      lastEpilogue: undefined,
      currentCard: cards.find((c) => c.id === 'presi_intro')!,
    })
  },
}))
