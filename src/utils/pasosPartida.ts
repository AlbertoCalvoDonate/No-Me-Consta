import type { Stats } from '../types'

// LO QUE SE VA APUNTANDO DURANTE LA PARTIDA.
//
// Una linea por decision: que carta era, que lado se eligio y como quedaron
// las barras. Al terminar, esto es lo que se manda (ver utils/enviarPartida) y
// lo que luego se puede preguntar en SQL.
//
// Nacio como un apaño temporal: un boton rojo al final de la partida que abria
// el compartir del movil para que un tester pegara el texto en un chat. Eso
// funcionaba para las partidas de uno y no para las de nadie mas, que son las
// que hacen falta. El boton se ha quitado; lo que queda es esto, que es la
// mitad util.

export interface PasoPartida {
  turno: number
  carta: string
  lado: 'left' | 'right'
  stats: Stats
  moralidad: number
}

// Se guarda en memoria, no en localStorage: si el jugador recarga a mitad de
// partida se pierde, y es aceptable. Guardarlo en disco obligaría a pensar en
// cuánto ocupa, cuándo se borra y qué pasa si alguien lo abre, y esto tiene que
// ser una herramienta de dos semanas, no una funcionalidad.
let pasos: PasoPartida[] = []

export function apuntarPaso(p: PasoPartida) {
  pasos.push(p)
}

export function limpiarLog() {
  pasos = []
}

// Lo apuntado hasta ahora. Lo necesita el envio automatico (utils/enviarPartida),
// que manda lo mismo que este fichero escribe en texto, pero como datos.
export function pasosDeLaPartida(): PasoPartida[] {
  return pasos
}


