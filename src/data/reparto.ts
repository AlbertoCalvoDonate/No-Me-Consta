import type { StatKey } from '../types'
import { cards } from './cards'

// QUIEN ES QUIEN. Con 23 personajes y una partida mediana de ~40 cartas, un
// personaje concreto te sale unas 6 veces: no da tiempo a aprenderse el
// reparto jugando, y saber quien mueve que ES la habilidad central de un
// Reigns (ves quien habla y ya sabes que te juegas).
//
// Hasta ahora esta informacion vivia solo en comentarios sueltos (types.ts,
// StatBars.tsx y el README), que ademas se quedaron desactualizados cuando se
// renombraron personajes. Aqui esta una sola vez y como DATO, no como prosa.

export interface Personaje {
  nombre: string
  imagen: string
  // El indicador que encarna: sus cartas lo tocan casi siempre.
  // `undefined` = no encarna ninguno en concreto (voces de cierre, el propio
  // presidente, un aliado generico).
  dueno?: StatKey
  // Una linea de quien es. Sin destripar tramas.
  quien: string
}

export const REPARTO: Personaje[] = [
  { nombre: 'El Presidente', imagen: 'presi.webp', quien: 'Usted. Las cartas en las que se mira al espejo.' },

  // MEDIOS — el relato, lo que se publica y lo que se calla
  { nombre: 'El Periodista', imagen: 'periodista.webp', dueno: 'medios', quien: 'Pregunta lo que nadie quiere que se pregunte.' },
  { nombre: 'El Jefe de Comunicación', imagen: 'jefecomunicacion.webp', dueno: 'medios', quien: 'Escribe lo que usted dice. Y lo que no dice.' },
  { nombre: 'El Escudero', imagen: 'ministrolameculos.webp', dueno: 'medios', quien: 'Sale a defender lo indefendible cada mañana.' },
  { nombre: 'El Juez', imagen: 'juez.webp', dueno: 'medios', quien: 'Instruye. Obstruirle sale caro, y tarde.' },

  // GOBIERNO — que la coalicion no se rompa
  { nombre: 'La Vicepresidenta', imagen: 'vicepresi.webp', dueno: 'gobierno', quien: 'Su socia de gobierno. Y su rival por el mismo hueco.' },
  { nombre: 'La Socia Incómoda', imagen: 'sociaincomoda.webp', dueno: 'gobierno', quien: 'Le sostiene la mayoría y se lo recuerda a diario.' },
  { nombre: 'El Exiliado', imagen: 'exiliadopesado.webp', dueno: 'gobierno', quien: 'Negocia desde fuera y exige como si estuviera dentro.' },
  { nombre: 'El Independentista', imagen: 'independentista.webp', dueno: 'gobierno', quien: 'Su voto decide. Se lo lee todo antes de darlo.' },
  { nombre: 'El Expresidente', imagen: 'expresidentecompetente.webp', dueno: 'gobierno', quien: 'Ya estuvo ahí y no piensa dejar de contárselo.' },
  { nombre: 'La Ministra', imagen: 'ministraincompetente.webp', dueno: 'gobierno', quien: 'Le toca aplicar lo que usted firma sin leer.' },
  { nombre: 'La Ministra de Igualdad', imagen: 'feminista.webp', dueno: 'gobierno', quien: 'Hace mucho ruido y no piensa bajar el volumen.' },

  // CALLE — lo que piensa la gente
  { nombre: 'El Encuestador', imagen: 'encuestador.webp', dueno: 'calle', quien: 'Trae el dato. Le guste o no le guste.' },
  { nombre: 'El Cruzado', imagen: 'cruzado.webp', dueno: 'calle', quien: 'Convierte cualquier asunto en una cruzada.' },
  { nombre: 'La Presidenta Regional', imagen: 'presidentaregional.webp', dueno: 'calle', quien: 'Gobierna su región y le hace oposición desde ella.' },
  { nombre: 'La Oposición', imagen: 'oposicionsuave.webp', dueno: 'calle', quien: 'Cuenta los votos de la moción. Tres veces.' },

  // CAJA B — el dinero opaco
  { nombre: 'El Ministro Caído', imagen: 'ministrocorrupto.webp', dueno: 'caja', quien: 'Cayó, pero sigue sabiendo dónde está todo.' },
  { nombre: 'El Hermano', imagen: 'hermano.webp', dueno: 'caja', quien: 'Su familia. Siempre con un plan y una servilleta.' },
  { nombre: 'El Gurú', imagen: 'guru.webp', dueno: 'caja', quien: 'El faro moral que acabó montando una fundación.' },
  { nombre: 'La Primera Dama', imagen: 'primeradama.webp', dueno: 'caja', quien: 'Su casa. Y una cátedra que apareció sola.' },

  // Sin indicador propio
  { nombre: 'El Fiscal', imagen: 'fiscal.webp', quien: 'Le debe el puesto. Eso es exactamente el problema.' },
  { nombre: 'Mopongo', imagen: 'mopongo.webp', quien: 'Nadie la toma en serio. Ese es su superpoder.' },
]

// Cuantas cartas tiene cada personaje en el mazo. Se calcula del propio mazo,
// asi que nunca se desactualiza al anadir cartas.
export const CARTAS_POR_PERSONAJE: Record<string, string[]> = (() => {
  const mapa: Record<string, string[]> = {}
  for (const c of cards) {
    if (c.isEnding || c.isElection || c.isRecap) continue
    ;(mapa[c.character] ??= []).push(c.id)
  }
  return mapa
})()

export const ETIQUETA_INDICADOR: Record<StatKey, string> = {
  medios: 'Medios',
  gobierno: 'Gobierno',
  calle: 'Calle',
  caja: 'Caja B',
}
