import { create } from 'zustand'
import type { Card, CardContext, GameState, Stats, StatEffects, StatKey } from '../types'
import { PHASE_MIN_TURN } from '../types'
import {
  cards,
  STAT_START,
  STAT_MAX,
  ELECTION_INTERVAL,
  ELECTION_MAX_TERMS,
  RECAP_EVERY,
} from '../data/cards'

function cardMinTurn(c: Card): number {
  return c.minTurn ?? PHASE_MIN_TURN[c.phase]
}

function isInTurnWindow(c: Card, turn: number): boolean {
  const min = cardMinTurn(c)
  const max = c.maxTurn ?? Infinity
  return turn >= min && turn <= max
}

// Las cuatro barras, en el orden en que se ven en pantalla.
const STAT_KEYS = ['medios', 'gobierno', 'calle', 'caja'] as const

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
// 4 a 5). Cuanto más bajo, más pegan los golpes cerca del borde.
//
// Hubo un segundo mecanismo, el "desgaste": cada X turnos las barras
// alejadas del centro volvían solas hacia él. Se quitó porque era justo lo
// que hacía imposible morir — no compensar salía gratis y, jugando bien, se
// moría en el 1% de las partidas. Y con él se fueron los dos modos de
// dificultad: medidos, los dos mataban a más del 79% y lo único que
// cambiaba de verdad era cuánto duraba la partida, no el reto. Está en el
// historial de git si alguna vez hace falta recuperarlo.
const DAMP_ZONE = 2

// Meses que tarda en estallar una bomba de relojería si la carta no dice
// otra cosa (ver CardChoice.scheduleIn).
const SCHEDULE_DEFAULT = 8

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
  for (const key of ['medios', 'gobierno', 'calle', 'caja'] as const) {
    next[key] = clamp(stats[key] + damp(stats[key], jitter(effects[key] ?? 0)))
  }
  return next
}

// Cuanto hay que alejarse del centro para que el comodin de vacaciones te
// devuelva un punto (con STAT_START = 5, esto son las barras a 7 o mas y a
// 3 o menos).
const REBALANCE_DISTANCE = 2

// Comodin de `CardChoice.rebalance`: acerca cada barra un punto al centro,
// solo si esta lo bastante lejos. Sin jitter ni amortiguacion, a proposito:
// es un respiro y tiene que ser fiable.
function applyRebalance(stats: Stats): Stats {
  const next = { ...stats }
  for (const key of STAT_KEYS) {
    const d = next[key] - STAT_START
    if (Math.abs(d) >= REBALANCE_DISTANCE) next[key] = clamp(next[key] - Math.sign(d))
  }
  return next
}

// Contexto que ven `condition` y `weight` de cada carta.
function contextOf(state: GameState): CardContext {
  return {
    flags: new Set(state.flags),
    anger: state.anger,
    turn: state.turn,
    flagAge: (f) => (state.flagTurn[f] === undefined ? -1 : state.turn - state.flagTurn[f]),
  }
}

function cardAllowed(c: Card, state: GameState, ctx: CardContext): boolean {
  return !c.condition || c.condition(state.stats, state.moralidad, ctx)
}

// Peso de una carta en la "bolsa" del sorteo. Puede ser un número fijo o una
// función del estado: así una trama puede volverse más frecuente mientras
// está viva y apagarse sola (peso 0) cuando deja de tener sentido.
function cardWeight(c: Card, state: GameState, ctx: CardContext): number {
  const w = typeof c.weight === 'function' ? c.weight(state.stats, state.moralidad, ctx) : c.weight
  return Math.max(0, Math.round(w ?? 1))
}

function pickNextCard(state: GameState, forcedId?: string): Card {
  if (forcedId) {
    const forced = cards.find((c) => c.id === forcedId)
    if (forced) return forced
  }
  const ctx = contextOf(state)

  // BOMBAS DE RELOJERIA: cartas que se dejaron programadas hace meses y a las
  // que ya les toca. Van antes que nada (salvo una cadena forzada en curso):
  // si se dejaran al sorteo se perderian, y la gracia de la bomba es que
  // llega justo cuando ya no te acordabas.
  const debida = state.scheduled.filter((s) => state.turn >= s.turn)
  if (debida.length > 0) {
    const c = cards.find((x) => x.id === debida[0].id)
    if (c) return c
  }

  // ELECCIONES: cada ELECTION_INTERVAL turnos (4 años de gobierno) toca
  // renovar legislatura, pase lo que pase. Es el hito de la partida: según
  // cómo lleguen las stats sale una carta u otra (derrota, apretada,
  // triunfo), y en la tercera convocatoria el juego termina sí o sí.
  // Va ANTES de los finales por stat: si justo ese turno además tocabas
  // fondo, manda la noche electoral, que es mejor final.
  if (state.turn > 0 && state.turn % ELECTION_INTERVAL === 0) {
    const electionCards = cards.filter((c) => c.isElection && cardAllowed(c, state, ctx))
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

  // BALANCE DE FIN DE ANO: cada RECAP_EVERY turnos toca parar, mirar atras y
  // decidir el tono del ano que viene. Va DESPUES de las elecciones (si el
  // turno cae en las dos cosas, manda la noche electoral, que es mas gorda) y
  // ANTES de todo lo demas, para que no se lo coma un final por barra.
  if (state.turn > 0 && state.turn % RECAP_EVERY === 0) {
    const recaps = cards.filter((c) => c.isRecap && cardAllowed(c, state, ctx))
    if (recaps.length > 0) {
      return recaps[Math.floor(Math.random() * recaps.length)]
    }
  }

  // MUERTES POR EVENTO: no dependen de las barras, sino de lo que has ido
  // haciendo (tramas abiertas, gente harta de ti). Se comprueban en todos los
  // turnos, no solo al tocar un extremo. Reigns tiene 29 muertes distintas y
  // muchas son así: situaciones concretas que ves venir y puedes esquivar.
  const eventEndings = cards.filter(
    (c) =>
      c.isEnding &&
      c.byEvent &&
      (c.minTurn === undefined || state.turn >= c.minTurn) &&
      c.condition?.(state.stats, state.moralidad, ctx)
  )
  if (eventEndings.length > 0) {
    return eventEndings[Math.floor(Math.random() * eventEndings.length)]
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
      !c.byEvent &&
      (c.minTurn === undefined || state.turn >= c.minTurn) &&
      c.condition?.(state.stats, state.moralidad, ctx)
  )
  if (validEndings.length > 0) {
    return validEndings[Math.floor(Math.random() * validEndings.length)]
  }

  return pickRegularCard(state)
}

// Sorteo de carta normal (ni final ni elecciones). Es la "bolsa" de Reigns:
// se quitan las que no encajan con el estado y las recién vistas, al resto se
// le da un tamaño (peso, que puede depender del estado) y se saca una.
function pickRegularCard(state: GameState): Card {
  const ctx = contextOf(state)
  // Cartas normales candidatas: no vistas recientemente, no son finales,
  // dentro de su ventana de turno/fase, y cumplen su condición si la tienen.
  const recent = new Set(state.history.slice(-5))
  const base = (c: Card) =>
    !c.isEnding &&
    !c.isElection &&
    !c.isRecap &&
    !recent.has(c.id) &&
    cardAllowed(c, state, ctx) &&
    cardWeight(c, state, ctx) > 0

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

  const weighted = candidates.flatMap((c) => Array(cardWeight(c, state, ctx)).fill(c))
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
  return { medios: STAT_START, gobierno: STAT_START, calle: STAT_START, caja: STAT_START }
}

// Qué indicador está roto (a 0 o al máximo). Se guarda al terminar para poder
// decirlo en la pantalla de fin: en Reigns la muerte siempre te dice qué pilar
// falló, y eso es lo que te enseña a jugar mejor la siguiente.
function brokenStat(stats: Stats): StatKey | undefined {
  return STAT_KEYS.find((k) => stats[k] <= 0 || stats[k] >= STAT_MAX)
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
  flags: [],
  flagTurn: {},
  scheduled: [],
  anger: {},
  currentCard: firstCard,
  lastEpilogue: undefined,

  choose: (side) => {
    const state = get()
    const card = state.currentCard
    const choice = card[side]
    const afterEffects = applyEffects(state.stats, choice.effects)
    const newStats = choice.rebalance ? applyRebalance(afterEffects) : afterEffects
    const newMoralidad = applyMoralidad(state.moralidad, choice.moralidad)

    // Estado narrativo: la elección puede encender o apagar flags.
    const flagSet = new Set(state.flags)
    const newFlagTurn = { ...state.flagTurn }
    choice.addFlags?.forEach((f) => {
      // Solo se apunta la primera vez: si se vuelve a encender un flag que ya
      // estaba, su antiguedad no se reinicia.
      if (!flagSet.has(f)) newFlagTurn[f] = state.turn
      flagSet.add(f)
    })
    choice.removeFlags?.forEach((f) => {
      flagSet.delete(f)
      delete newFlagTurn[f]
    })
    const newFlags = [...flagSet]

    // Bomba de relojeria: se apunta para dentro de unos meses.
    const newScheduled = state.scheduled.filter((s) => s.id !== state.currentCard.id)
    if (choice.scheduleCardId) {
      newScheduled.push({
        id: choice.scheduleCardId,
        turn: state.turn + (choice.scheduleIn ?? SCHEDULE_DEFAULT),
      })
    }

    // Enfado: si la carta marca qué lado le da la razón al personaje y has
    // elegido el contrario, se lo apunta. Contentarle rebaja el enfado.
    const newAnger = { ...state.anger }
    if (card.pleases) {
      const current = newAnger[card.character] ?? 0
      newAnger[card.character] = side === card.pleases ? Math.max(0, current - 1) : current + 1
    }

    if (choice.epilogueText) {
      set({
        stats: newStats,
        moralidad: newMoralidad,
        flags: newFlags,
        flagTurn: newFlagTurn,
        scheduled: newScheduled,
        anger: newAnger,
        gameOver: true,
        deathReason: choice.epilogueText,
        // En una muerte por evento la causa es la situación, no una barra:
        // señalar un indicador ahí despista (te caes por la moción y te dice
        // "Medios por los suelos"). Solo se marca en las muertes por barra.
        deathStat: card.byEvent ? undefined : brokenStat(state.stats),
        lastEpilogue: choice.epilogueText,
      })
      return
    }

    const nextTurn = state.turn + 1
    const atExtreme = (['medios', 'gobierno', 'calle', 'caja'] as const).some(
      (k) => newStats[k] <= 0 || newStats[k] >= STAT_MAX
    )
    const nextState: GameState = {
      stats: newStats,
      extremeStreak: atExtreme ? state.extremeStreak + 1 : 0,
      moralidad: newMoralidad,
      turn: nextTurn,
      history: [...state.history, state.currentCard.id],
      gameOver: false,
      flags: newFlags,
      flagTurn: newFlagTurn,
      scheduled: newScheduled,
      anger: newAnger,
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
      flags: [],
      flagTurn: {},
      scheduled: [],
      anger: {},
      deathReason: undefined,
      deathStat: undefined,
      lastEpilogue: undefined,
      currentCard: intro,
    })
  },
}))
