import type { Stats } from '../types'

// EL LOG DE PRUEBAS. TEMPORAL: ESTO NO ES PARTE DEL JUEGO.
//
// Sirve para una cosa concreta y por poco tiempo: que los testers puedan
// mandar lo que han jugado. Hasta ahora todo lo que sabemos del balance sale
// de simuladores que juegan con heurísticas, no con intuición, y un número en
// banda no garantiza que la partida se sienta bien. Esto es lo único que puede
// decirlo.
//
// PARA QUITARLO cuando ya no haga falta: poner LOG_DE_PRUEBAS en false y el
// botón desaparece. Para borrarlo del todo, este archivo y sus tres usos
// (useGameStore lo alimenta, App pinta el botón, y ya está).
//
// Por eso el botón va en ROJO y descolocado del resto: tiene que cantar que no
// pertenece al diseño, para que nadie se acostumbre a verlo ahí.
export const LOG_DE_PRUEBAS = true

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
  if (!LOG_DE_PRUEBAS) return
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

// El texto que se copia. Dos partes: un encabezado que se lee de un vistazo
// (para poder decir "esta es la que te conté") y el detalle turno a turno, que
// es lo que sirve para analizar.
export function textoLog(opciones: {
  finalId: string
  meses: number
  moralidad: number
  stats: Stats
  version: string
}): string {
  const { finalId, meses, moralidad, stats, version } = opciones
  const b = (s: Stats) => `M${s.medios} G${s.gobierno} C${s.calle} B${s.caja}`
  const cab = [
    `NMC ${version} · ${new Date().toLocaleString('es-ES')}`,
    `final: ${finalId}`,
    `meses: ${meses} · moral: ${moralidad} · ${b(stats)}`,
    `cartas: ${pasos.length}`,
    '--',
  ]
  const cuerpo = pasos.map(
    (p) => `${p.turno} ${p.carta} ${p.lado === 'left' ? 'I' : 'D'} ${b(p.stats)} m${p.moralidad}`
  )
  return [...cab, ...cuerpo].join('\n')
}

// Se manda por el compartir del movil, que es lo que abre WhatsApp y Telegram
// con el texto ya puesto. Es la diferencia entre que el tester te lo envie o
// no: copiar al portapapeles obliga a abrir la app, buscar el chat y pegar, y
// en ese camino se pierde la mitad de la gente.
//
// Si no hay compartir nativo -escritorio, sobre todo- cae al portapapeles, que
// alli si es lo natural.
export type ResultadoLog = 'enviado' | 'copiado' | 'error'

export async function mandarLog(texto: string): Promise<ResultadoLog> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ text: texto })
      return 'enviado'
    } catch (e) {
      // Cancelar el dialogo no es un fallo que haya que ensenar.
      if (e instanceof DOMException && e.name === 'AbortError') return 'enviado'
      // Cualquier otro problema: se intenta con el portapapeles.
    }
  }
  try {
    await navigator.clipboard.writeText(texto)
    return 'copiado'
  } catch {
    return 'error'
  }
}
