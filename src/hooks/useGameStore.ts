import { create } from 'zustand'
import type { Card, GameState, Stats, StatEffects } from '../types'
import { PHASE_MIN_TURN } from '../types'
import { cards, STAT_START, STAT_MAX, ELECTION_INTERVAL, ELECTION_MAX_TERMS } from '../data/cards'

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

// Amortiguación en los extremos: un empujón hacia un extremo pierde fuerza
// cuando ya estás cerca de él (llevar los medios de 8 a 9 cuesta más que de
// 4 a 5). Sin esto, la partida media duraba 12 turnos —un año de gobierno— y
// el 90% de las partidas no llegaba nunca a la fase 4 del mazo; además morir
// por TECHO (una stat a 10) era lo más común jugando honesto, que se leía
// como un castigo absurdo. Con la amortiguación hay que insistir de verdad
// para reventar por arriba o por abajo, y la partida respira.
// El margen se mide contra el extremo al que empuja el efecto.
const DAMP_ZONE = 4

// Desgaste del poder: cada DRIFT_EVERY turnos, toda stat que se haya alejado
// del centro vuelve 1 punto hacia él. La luna de miel se pasa y los enfados
// también. Sin esto, el mazo (que empuja mucho hacia arriba en votantes y
// medios) hacía que jugar honesto reventara por TECHO en 9 turnos — morir por
// "gustar demasiado" era el final más común y se leía como un castigo
// absurdo. Con el desgaste, honesto y corrupto duran casi lo mismo y hay que
// sostener una tendencia para romper por cualquiera de los dos lados.
const DRIFT_EVERY = 3
const DRIFT_MIN_DISTANCE = 3

function applyDrift(stats: Stats, turn: number): Stats {
  if (turn % DRIFT_EVERY !== 0) return stats
  const next = { ...stats }
  for (const key of ['medios', 'partido', 'votantes', 'caja'] as const) {
    const d = next[key] - STAT_START
    if (Math.abs(d) >= DRIFT_MIN_DISTANCE) next[key] -= Math.sign(d)
  }
  return next
}

function damp(current: number, delta: number): number {
  if (delta === 0) return 0
  const headroom = delta > 0 ? STAT_MAX - current : current
  const factor = Math.min(1, headroom / DAMP_ZONE)
  const scaled = delta * factor
  // Redondeo hacia el entero, conservando al menos 1 de empuje mientras
  // quede margen: así nunca se queda "atascada" sin poder llegar al extremo.
  const out = delta > 0 ? Math.floor(scaled) : Math.ceil(scaled)
  if (out === 0 && headroom > 0) return delta > 0 ? 1 : -1
  return out
}

function applyEffects(stats: Stats, effects: StatEffects): Stats {
  const next = {} as Stats
  for (const key of ['medios', 'partido', 'votantes', 'caja'] as const) {
    next[key] = clamp(stats[key] + damp(stats[key], jitter(effects[key] ?? 0)))
  }
  return next
}

function pickNextCard(state: GameState, forcedId?: string): Card {
  if (forcedId) {
    const forced = cards.find((c) => c.id === forcedId)
    if (forced) return forced
  }

  // ELECCIONES: cada ELECTION_INTERVAL turnos (4 años de gobierno) toca
  // renovar legislatura, pase lo que pase. Es el hito de la partida: según
  // cómo lleguen las stats sale una carta u otra (derrota, apretada,
  // triunfo), y en la tercera convocatoria el juego termina sí o sí.
  // Va ANTES de los finales por stat: si justo ese turno además tocabas
  // fondo, manda la noche electoral, que es mejor final.
  if (state.turn > 0 && state.turn % ELECTION_INTERVAL === 0) {
    const electionCards = cards.filter(
      (c) => c.isElection && (!c.condition || c.condition(state.stats, state.moralidad))
    )
    if (electionCards.length > 0) {
      // La última convocatoria tiene sus propias cartas (`_final`): si hay
      // alguna válida, tiene prioridad sobre las normales.
      const isLast = state.turn >= ELECTION_INTERVAL * ELECTION_MAX_TERMS
      const pool = isLast
        ? electionCards.filter((c) => c.id.endsWith('_final'))
        : electionCards.filter((c) => !c.id.endsWith('_final'))
      const chosen = pool.length > 0 ? pool : electionCards
      return chosen[Math.floor(Math.random() * chosen.length)]
    }
  }

  // Turno de gracia: tocar 0 o el máximo NO mata al instante. El icono se
  // pone rojo, sale una carta normal y tienes ese turno para rectificar; solo
  // si sigues en el extremo al turno siguiente cae el final. Sin esto, un
  // pico de mala suerte te mataba sin margen (y morir por TECHO, jugando
  // limpio, era el final más común).
  if (state.extremeStreak < 2) {
    return pickRegularCard(state)
  }

  // ¿Algún stat ha tocado fondo (o se ha alcanzado un final especial)?
  // Si hay varios finales válidos a la vez, elige uno al azar entre ellos
  // para que no salga siempre el mismo texto.
  // Los finales con `minTurn` (ej. la reelección) solo pueden dispararse a
  // partir de ese turno — así no se gana "por accidente" a los 5 minutos
  // solo por tener las 4 stats altas de rebote. Los finales de stat a 0 no
  // llevan minTurn, así que siguen disparándose en cuanto ocurre el crash.
  // `!c.isElection`: las cartas de la última convocatoria son isEnding Y
  // isElection a la vez. Sin excluirlas aquí, se colaban como final normal en
  // cualquier turno (se vio una noche electoral de "Doce años" en el mes 50).
  // Solo deben salir por la rama de elecciones de arriba.
  const validEndings = cards.filter(
    (c) =>
      c.isEnding &&
      !c.isElection &&
      (c.minTurn === undefined || state.turn >= c.minTurn) &&
      c.condition?.(state.stats, state.moralidad)
  )
  if (validEndings.length > 0) {
    return validEndings[Math.floor(Math.random() * validEndings.length)]
  }

  return pickRegularCard(state)
}

// Sorteo de carta normal (ni final ni elecciones).
function pickRegularCard(state: GameState): Card {
  // Cartas normales candidatas: no vistas recientemente, no son finales,
  // dentro de su ventana de turno/fase, y cumplen su condición si la tienen.
  const recent = new Set(state.history.slice(-5))
  const base = (c: Card) =>
    !c.isEnding &&
    !c.isElection &&
    !recent.has(c.id) &&
    (!c.condition || c.condition(state.stats, state.moralidad))

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
    cards.filter((c) => !c.isEnding && !c.isElection && otherChar(c))

  const weighted = candidates.flatMap((c) => Array(c.weight ?? 1).fill(c))
  return (
    weighted[Math.floor(Math.random() * weighted.length)] ??
    cards.find((c) => !c.isEnding && !c.isElection)!
  )
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
const INTRO_IDS = [
  'presi_intro', 'presi_intro_b', 'presi_intro_c', 'presi_intro_d',
  'presi_intro_e', 'presi_intro_f', 'presi_intro_g', 'presi_intro_h',
]
function pickIntro(): Card {
  const id = INTRO_IDS[Math.floor(Math.random() * INTRO_IDS.length)]
  return cards.find((c) => c.id === id) ?? cards.find((c) => c.id === 'presi_intro')!
}

const firstCard = pickIntro()

export const useGameStore = create<GameStore>((set, get) => ({
  stats: initialStats(),
  extremeStreak: 0,
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

    const nextTurn = state.turn + 1
    const driftedStats = applyDrift(newStats, nextTurn)
    const atExtreme = (['medios', 'partido', 'votantes', 'caja'] as const).some(
      (k) => driftedStats[k] <= 0 || driftedStats[k] >= STAT_MAX
    )
    const nextState: GameState = {
      stats: driftedStats,
      extremeStreak: atExtreme ? state.extremeStreak + 1 : 0,
      moralidad: newMoralidad,
      turn: nextTurn,
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
      extremeStreak: 0,
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
