// Los 4 indicadores del juego. Ajusta nombres/temática cuando definas
// las stats definitivas — esto es la prueba de concepto.
export interface Stats {
  medios: number   // Prensa / opinión pública
  partido: number  // Aparato del partido / lealtad interna
  votantes: number // Calle / electorado
  caja: number      // Caja b / finanzas opacas
}

export type StatKey = keyof Stats

// Efecto de una decisión: cuánto sube o baja cada stat (-3 a +3 aprox)
export type StatEffects = Partial<Record<StatKey, number>>

export interface CardChoice {
  text: string          // Texto que se ve al deslizar hacia ese lado
  effects: StatEffects
  // Efecto oculto sobre la moralidad (0-10, no se ve en pantalla). Positivo
  // = elección honesta/transparente, negativo = elección corrupta/turbia.
  // No aparece en ninguna barra — solo se nota en el final. Omite el campo
  // si la elección es moralmente neutra (la mayoría de cartas "meme_").
  moralidad?: number
  nextCardId?: string   // Fuerza la siguiente carta (para mini-arcos narrativos)
  epilogueText?: string // Si esta elección termina la partida, texto de cierre
}

// Fases narrativas de la legislatura, de menos a más gravedad.
// No representan fechas reales — son escalones de intensidad dramática.
export type Phase = 1 | 2 | 3 | 4
// 1 = Luna de miel      (anecdótico, favores pequeños)
// 2 = Desgaste           (empiezan las grietas, prensa tira del hilo)
// 3 = Crisis              (UCO, jueces, fiscal general, filtraciones gordas)
// 4 = Vísperas electorales (todo puede estallar: indultos, moción de censura)

export const PHASE_MIN_TURN: Record<Phase, number> = {
  1: 1,
  2: 9,
  3: 21,
  4: 36,
}

export interface Card {
  id: string
  character: string   // Quién "habla" (ej: "El Jefe de Comunicación", "El Juez")
  // Retrato opcional del personaje. Nombre de archivo dentro de
  // public/characters/ (ej. 'presi.png'), sin barra inicial. Si se omite,
  // la carta se ve como hasta ahora (solo el nombre en texto).
  characterImage?: string
  text: string         // Texto de la carta
  left: CardChoice
  right: CardChoice
  // Condición opcional para que la carta solo aparezca en cierto rango de
  // stats (y, opcionalmente, de moralidad — sobre todo para finales que
  // combinan "qué stat tocó fondo/techo" con "cómo se llegó hasta ahí").
  condition?: (stats: Stats, moralidad: number) => boolean
  weight?: number       // Prioridad de aparición (default 1)
  isEnding?: boolean    // Carta especial de final de partida
  // Carta del evento de elecciones (cada 4 años de gobierno). No sale nunca
  // por sorteo: useGameStore la fuerza al llegar el turno, eligiendo entre
  // las que cumplen su `condition`. Ver ELECTION_INTERVAL en cards.ts.
  isElection?: boolean
  phase: Phase          // Fase de gravedad narrativa a la que pertenece
  minTurn?: number      // Turno mínimo explícito (si no, se usa PHASE_MIN_TURN[phase])
  maxTurn?: number      // Turno máximo explícito, opcional (para cartas "de una época")
}

export interface GameState {
  stats: Stats
  // Turnos seguidos con alguna stat en un extremo (0 o el máximo). Tocar el
  // extremo NO mata al instante: da un turno de margen para rectificar, y
  // solo si sigues ahí al turno siguiente cae el final. Ver useGameStore.
  extremeStreak: number
  // Moralidad oculta (0-10, empieza en 5). No es una stat visible: no tiene
  // barra ni se muestra en pantalla, solo influye en qué variante de final
  // sale al tocar fondo o techo con alguna stat (ver cards.ts). Se acumula
  // con el campo `moralidad` de cada CardChoice elegida.
  moralidad: number
  turn: number
  history: string[]   // ids de cartas ya vistas, para evitar repeticiones
  gameOver: boolean
  deathReason?: string
}
