import { olvidarEnfriamiento } from './useGameStore'

// TODO LO QUE EL JUEGO GUARDA, EN UN SOLO SITIO.
//
// Existe por un fallo que se vio jugando: "Borrar mi progreso" borraba los
// logros y nada más, así que la HERENCIA del gobierno anterior sobrevivía al
// borrado. El jugador empezaba de cero y la primera carta que veía era "al
// anterior lo tumbaron las portadas, y esa redacción sigue ahí" — hablándole
// de una partida que, hasta donde él sabía, no había jugado nunca.
//
// Y la peor forma de que esto se repita es que cada módulo se borre solo y
// alguien añada una clave nueva sin acordarse. Así que las claves están aquí
// enumeradas, con lo que es cada una y si se va o se queda.
//
// LO QUE SE QUEDA Y POR QUÉ: el volumen no es progreso, es una preferencia.
// Quien baja el sonido porque está en el metro no quiere que se le suba al
// empezar de cero.

const PROGRESO = [
  // Logros conseguidos y todos los contadores: partidas, récord, epítetos
  // vistos y la colección de cartas descubiertas.
  'nomeconsta.logros',
  // La partida a medias, para poder seguirla donde se dejó.
  'nomeconsta.partida',
  // Lo que dejó el gobierno anterior. Es lo único pensado para sobrevivir a
  // una derrota, y justo por eso hay que acordarse de ella al borrar.
  'nomeconsta.herencia',
  // Qué cartas salieron hace poco, para no repetirlas entre partidas.
  'nomeconsta.enfriamiento',
  // Con qué carta se abrió la última, para no abrir igual dos veces.
  'nomeconsta.apertura',
] as const

// Preferencias, no progreso. Se quedan.
export const NO_ES_PROGRESO = ['nomeconsta.volumen'] as const

export function borrarTodoElProgreso() {
  for (const k of PROGRESO) {
    try {
      localStorage.removeItem(k)
    } catch {
      // Modo incógnito o almacenamiento bloqueado: no había nada que borrar.
    }
  }
  // Y lo que además vive en memoria. El enfriamiento se lee al cargar el
  // módulo y se reescribe solo, así que borrarlo del disco sin vaciarlo aquí
  // no sirve de nada hasta que se recargue la página.
  olvidarEnfriamiento()
}

// Para el test: que no se cuele una clave nueva sin pasar por la lista.
export const CLAVES_DE_PROGRESO: readonly string[] = PROGRESO
