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

// Moralidad: se acumula tal cual, sin el jitter de las stats visibles (ver
// más abajo) — es un contador narrativo de fondo, no algo que el jugador
// esté intentando optimizar turno a turno, así que no necesita el
// componente de suerte.
function applyMoralidad(current: number, delta: number | undefined): number {
  return clamp(current + (delta ?? 0))
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
    (c) =>
      c.isEnding &&
      (c.minTurn === undefined || state.turn >= c.minTurn) &&
      c.condition?.(state.stats, state.moralidad)
  )
  if (validEndings.length > 0) {
    return validEndings[Math.floor(Math.random() * validEndings.length)]
  }

  // Cartas normales candidatas: no vistas recientemente, no son finales,
  // dentro de su ventana de turno/fase, y cumplen su condición si la tienen.
  const recent = new Set(state.history.slice(-5))
  const base = (c: Card) =>
    !c.isEnding && !recent.has(c.id) && (!c.condition || c.condition(state.stats, state.moralidad))

  // No repetir el personaje de la carta anterior: dos cartas seguidas del
  // mismo personaje se leen como un bug. Las cadenas narrativas (nextCardId)
  // sí pueden repetirlo — salen antes, por la rama `forcedId` de arriba.
  const lastId = state.history[state.history.length - 1]
  const lastChar = lastId ? cards.find((c) => c.id === lastId)?.character : undefined
  const otherChar = (c: Card) => c.character !== lastChar

  const inWindow = cards.filter((c) => base(c) && isInTurnWindow(c, state.turn))
  const anyBase = cards.filter(base)

  // Preferencia: en ventana y otro personaje > en ventana > base y otro
  // personaje > base > (último recurso) cualquier carta no-final.
  const candidates =
    inWindow.filter(otherChar).length ? inWindow.filter(otherChar) :
    inWindow.length ? inWindow :
    anyBase.filter(otherChar).length ? anyBase.filter(otherChar) :
    anyBase.length ? anyBase :
    cards.filter((c) => !c.isEnding && otherChar(c))

  const weighted = candidates.flatMap((c) => Array(c.weight ?? 1).fill(c))
  return weighted[Math.floor(Math.random() * weighted.length)] ?? cards.find((c) => !c.isEnding)!
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

const MORALIDAD_START = 5

// Cartas de arranque (ver cards.content.ts). Se elige una al azar al empezar
// y al reiniciar, así la primera decisión de la partida no es siempre la misma.
const INTRO_IDS = ['presi_intro', 'presi_intro_b', 'presi_intro_c', 'presi_intro_d']
function pickIntro(): Card {
  const id = INTRO_IDS[Math.floor(Math.random() * INTRO_IDS.length)]
  return cards.find((c) => c.id === id) ?? cards.find((c) => c.id === 'presi_intro')!
}

const firstCard = pickIntro()

export const useGameStore = create<GameStore>((set, get) => ({
  stats: initialStats(),
  moralidad: MORALIDAD_START,
  turn: 1,
  history: [firstCard.id],
  gameOver: false,
  currentCard: firstCard,
  lastEpilogue: undefined,

  choose: (side) => {
    const state = get()
    const choice = state.currentCard[side]
    const newStats = applyEffects(state.stats, choice.effects)
    const newMoralidad = applyMoralidad(state.moralidad, choice.moralidad)

    if (choice.epilogueText) {
      set({
        stats: newStats,
        moralidad: newMoralidad,
        gameOver: true,
        deathReason: choice.epilogueText,
        lastEpilogue: choice.epilogueText,
      })
      return
    }

    const nextState: GameState = {
      stats: newStats,
      moralidad: newMoralidad,
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
    const intro = pickIntro()
    set({
      stats: initialStats(),
      moralidad: MORALIDAD_START,
      turn: 1,
      history: [intro.id],
      gameOver: false,
      deathReason: undefined,
      lastEpilogue: undefined,
      currentCard: intro,
    })
  },
}))
