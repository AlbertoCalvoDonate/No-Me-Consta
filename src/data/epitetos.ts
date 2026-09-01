// Cómo le recordarán los libros de texto, al estilo de los apodos que la
// historia les colgaba a los reyes (el Sabio, el Cruel, el Felón...).
//
// Es la única vez que la MORALIDAD se enseña: durante la partida es una
// variable oculta que se acumula con el campo `moralidad` de cada elección
// (ver GameState.moralidad), sin barra ni número en pantalla. Aquí tampoco se
// ve la cifra — solo el nombre que te has ganado, que es lo que se recuerda.
//
// Un epíteto por cada valor posible (0 a 10), así que dos partidas parecidas
// pero no iguales acaban con títulos distintos.

export interface Epiteto {
  nombre: string
  nota: string
}

const EPITETOS: Epiteto[] = [
  { nombre: 'El Saqueador', nota: 'No dejó ni los ceniceros.' },
  { nombre: 'El Felón', nota: 'Juró el cargo con los dedos cruzados.' },
  { nombre: 'El Trincón', nota: 'Nunca preguntó de dónde venía el sobre.' },
  { nombre: 'El Escurridizo', nota: 'Jamás le constó nada.' },
  { nombre: 'El Tibio', nota: 'Ni robó del todo ni dejó de robar.' },
  { nombre: 'El Equidistante', nota: 'Se pasó la legislatura entre dos aguas.' },
  { nombre: 'El Correcto', nota: 'Cumplió, sin más. Que ya es bastante.' },
  { nombre: 'El Prudente', nota: 'Supo cuándo no firmar.' },
  { nombre: 'El Íntegro', nota: 'Le pusieron el sobre delante y dijo que no.' },
  { nombre: 'El Sabio', nota: 'Gobernó como si fueran a auditarle mañana.' },
  { nombre: 'El Santo', nota: 'Nadie se lo creyó, pero era verdad.' },
]

export function epitetoDe(moralidad: number): Epiteto {
  const i = Math.max(0, Math.min(EPITETOS.length - 1, Math.round(moralidad)))
  return EPITETOS[i]
}
