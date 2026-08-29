// Modos de dificultad. La diferencia está en cuánto te perdona el juego los
// errores, no en el contenido: el mazo es el mismo en los dos.
//
// El "desgaste" es lo que hacía que morir fuese casi imposible: cada X turnos,
// toda barra alejada del centro volvía sola un punto hacia él, así que no
// compensar salía gratis. Jugando bien se moría en el 1% de las partidas.

export type ModeId = 'mayoria' | 'minoria'

export interface ModeConfig {
  id: ModeId
  label: string
  tagline: string
  // Cada cuántos turnos una barra desviada vuelve 1 punto hacia el centro.
  // 0 = nunca (las barras solo se mueven por tus decisiones, como en Reigns).
  driftEvery: number
  // Si es true, el desgaste se va desvaneciendo: el intervalo se duplica en la
  // segunda legislatura y desaparece en la tercera. Curva de dificultad en vez
  // de muro: la primera legislatura hace de tutorial.
  driftFades: boolean
  // Margen en el que los empujes pierden fuerza al acercarse a un extremo.
  // Más bajo = los golpes cerca del borde pegan casi enteros.
  dampZone: number
}

export const MODES: Record<ModeId, ModeConfig> = {
  // Medido jugando de forma competente: muere el 67%, mediana 109 meses.
  mayoria: {
    id: 'mayoria',
    label: 'Con mayoría absoluta',
    tagline: 'Le perdonan casi todo. Al principio.',
    driftEvery: 3,
    driftFades: true,
    dampZone: 2,
  },
  // Medido igual: muere el 86%, mediana 48 meses (una legislatura justa).
  minoria: {
    id: 'minoria',
    label: 'Gobierno en minoría',
    tagline: 'Cada voto cuenta. Un error y a la calle.',
    driftEvery: 0,
    driftFades: false,
    dampZone: 2,
  },
}

export const DEFAULT_MODE: ModeId = 'minoria'
