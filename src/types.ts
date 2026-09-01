// Los 4 indicadores del juego. Cada uno tiene DUEÑOS: personajes que lo
// encarnan y cuyas cartas siempre lo tocan. Es lo que hace Reigns (el
// cardenal es la iglesia, el general el ejército) y es lo que permite que,
// viendo quién habla, ya sepas qué te estás jugando.
//
//   MEDIOS    el relato, lo que se publica
//             → El Periodista, El Jefe de Comunicación, El Escudero
//   GOBIERNO  que la coalición no se rompa y te sigan sosteniendo
//             → La Vicepresidenta, La Comunista Woke, El Exiliado,
//               El Independentista, El Expresidente, La Ministra
//   CALLE     lo que piensa la gente de a pie
//             → El Encuestador, La Ultraderecha, La Presidenta Regional,
//               La Oposición
//   CAJA B    el dinero opaco
//             → El Ministro Caído, El Hermano, El Gurú, La Primera Dama
//
// Antes "gobierno" se llamaba "partido" y hacía de dos cosas a la vez (tu
// aparato interno Y tus socios de coalición), que son opuestas: ceder al
// Exiliado subía "partido" cuando en realidad cabrea a los tuyos. Por eso no
// se entendía. Ahora GOBIERNO es "¿aguanta la coalición?", que es una sola
// pregunta y se lee sola.
export interface Stats {
  medios: number    // Prensa y relato
  gobierno: number  // Coalición: socios y aparato que te sostienen
  calle: number     // Opinión pública / la gente
  caja: number      // Caja B / finanzas opacas
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
  // Comodin: en vez de sumar y restar cantidades fijas, acerca TODAS las
  // barras al centro (lo que este muy alto baja 1, lo que este muy bajo
  // sube 1, y lo que ande cerca del centro se queda). Se aplica despues de
  // `effects` y sin suerte ni amortiguacion de por medio: es un respiro
  // deliberado, no un empujon mas.
  rebalance?: boolean
  nextCardId?: string   // Fuerza la siguiente carta (para mini-arcos narrativos)
  // BOMBA DE RELOJERIA: deja una carta pendiente que saldra dentro de
  // `scheduleIn` turnos, no al turno siguiente. Es la diferencia entre
  // "aceptas el sobre y te pillan acto seguido" y "aceptas el sobre y
  // ocho meses despues, cuando ya no te acuerdas, aparece el periodista".
  // A diferencia de dejarlo al sorteo, esto SI llega: la trama no se
  // queda a medias por mala suerte.
  scheduleCardId?: string
  scheduleIn?: number   // turnos de espera (por defecto SCHEDULE_DEFAULT)
  epilogueText?: string // Si esta elección termina la partida, texto de cierre
  // Estado narrativo que enciende o apaga esta elección. Los flags son texto
  // libre ('guerra_abierta', 'hermano_imputado'...) y las cartas los consultan
  // desde `condition` para aparecer o no. Es como lo hace Reigns: las cartas
  // de guerra entran en la baraja cuando empieza la guerra y salen al acabar.
  addFlags?: string[]
  removeFlags?: string[]
}

// Contexto de la partida que ven `condition` y `weight`, más allá de las
// stats: el estado narrativo (flags) y el enfado acumulado por personaje.
export interface CardContext {
  flags: ReadonlySet<string>
  // Cuantos turnos lleva encendido un flag (-1 si no lo esta). Es lo que
  // permite las BOMBAS DE RELOJERIA: aceptas el favor hoy y la carta que te
  // lo hace pagar espera meses antes de poder salir, en vez de encadenarse
  // al turno siguiente. Ej: (s, m, ctx) => ctx.flagAge('sobre_hermano') >= 10
  flagAge: (flag: string) => number
  // Cuántas veces se ha desairado a cada personaje (por nombre). Sube cuando
  // eliges la opción contraria a lo que pide, si la carta marca `pleases`.
  anger: Readonly<Record<string, number>>
  turn: number
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
  // El tercer parámetro trae el estado narrativo (flags, enfados, turno).
  condition?: (stats: Stats, moralidad: number, ctx: CardContext) => boolean
  // Prioridad de aparición (default 1). Puede ser una función para que el
  // peso cambie con la partida, que es la clave de la narrativa adaptativa de
  // Reigns: una carta se vuelve más frecuente mientras su trama está viva y
  // se apaga (peso 0) cuando deja de tener sentido.
  weight?: number | ((stats: Stats, moralidad: number, ctx: CardContext) => number)
  // Qué lado le da la razón al personaje. Si se indica, elegir el contrario
  // le suma enfado (ver CardContext.anger), que otras cartas pueden usar
  // como condición para saltar ("te has cansado de decirle que no").
  pleases?: 'left' | 'right'
  isEnding?: boolean    // Carta especial de final de partida
  // Final que NO se dispara por una barra en el extremo, sino por una
  // situación concreta (una trama que ha llegado demasiado lejos, media
  // bancada harta de ti...). Se comprueba en todos los turnos. Su `condition`
  // debe ser exigente: si es fácil de cumplir, corta partidas sin avisar.
  byEvent?: boolean
  // Balance de fin de año: se fuerza una cada RECAP_EVERY turnos (12 = 1 año),
  // salvo que ese turno toque ya la noche electoral. Nunca sale por sorteo.
  // Sirve para hacer una parada, mirar atras y decidir el tono del ano que
  // viene: una legislatura son 48 turnos y sin esto se hace muy plana.
  isRecap?: boolean
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
  // Qué indicador provocó el final, para poder decirlo en la pantalla de fin
  // (en Reigns la pantalla de muerte te dice siempre qué pilar te mató).
  deathStat?: StatKey
  // Estado narrativo de la partida (ver CardChoice.addFlags).
  flags: string[]
  // Turno en que se encendio cada flag, para poder saber cuanto lleva activo
  // (ver CardContext.flagAge).
  flagTurn: Record<string, number>
  // Cartas pendientes de salir y a partir de que turno (ver
  // CardChoice.scheduleCardId).
  scheduled: { id: string; turn: number }[]
  // Enfado acumulado por personaje (ver CardContext.anger).
  anger: Record<string, number>
}
