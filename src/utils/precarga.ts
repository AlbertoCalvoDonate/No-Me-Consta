import { CARTAS_POR_PERSONAJE, REPARTO } from '../data/reparto'

// Los retratos pesan 2,4 MB entre todos y hasta ahora cada uno se descargaba
// en el momento en que su personaje salía por primera vez, con la carta ya en
// pantalla. Medido en 3G lento (400 kbps, 300 ms de latencia): hasta 2,8
// segundos mirando una carta sin cara, que es justo lo que da valor a la carta.
//
// Se traen de fondo, DE UNO EN UNO y en los huecos libres del navegador
// (requestIdleCallback), para no competir con la imagen que el jugador está
// esperando ahora mismo. Si el navegador está ocupado decidiendo la partida,
// la precarga espera; no hay prisa.
//
// El orden no es el del reparto: van primero los personajes con más cartas,
// que son los que van a salir antes. El Ministro Caído tiene 53 y Mopongo 10,
// así que empezar por el primero acierta más veces.

let arrancada = false

// En una conexion mala la precarga hace MAS dano que bien: se come el ancho de
// banda y la carta que el jugador esta mirando se queda sin cara mas tiempo.
// Medido en 3G lento, precargando todo: nueve de cada diez cartas salian al
// instante pero una se iba a 3,5 s, peor que los 2,8 s de no precargar nada.
// Asi que en 2G, o con el ahorro de datos puesto, no se precarga: cada retrato
// se pide cuando toca y no compite con nada.
function redDecente() {
  const c = (navigator as Navigator & {
    connection?: { effectiveType?: string; saveData?: boolean }
  }).connection
  if (!c) return true // sin informacion, se asume que si
  if (c.saveData) return false
  return c.effectiveType !== 'slow-2g' && c.effectiveType !== '2g'
}

function enHueco(fn: () => void) {
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number
  }
  if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout: 2000 })
  else window.setTimeout(fn, 200)
}

export function precargarRetratos(extra: string[] = []) {
  if (arrancada || typeof window === 'undefined') return
  arrancada = true
  if (!redDecente()) return

  const cola = [
    ...[...REPARTO]
      .sort(
        (a, b) =>
          (CARTAS_POR_PERSONAJE[b.nombre]?.length ?? 0) -
          (CARTAS_POR_PERSONAJE[a.nombre]?.length ?? 0)
      )
      .map((p) => p.imagen),
    // Las ilustraciones de final van al final de la cola: hasta que la partida
    // no acaba no hacen falta, y para entonces ha habido minutos de sobra.
    ...extra,
  ]

  let i = 0
  const siguiente = () => {
    if (i >= cola.length) return
    const img = new Image()
    // Baja prioridad donde se soporte: esto nunca debe adelantar a la imagen
    // de la carta que se está viendo.
    ;(img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = 'low'
    img.onload = img.onerror = () => enHueco(siguiente)
    img.src = '/characters/' + cola[i++]
  }
  enHueco(siguiente)
}
