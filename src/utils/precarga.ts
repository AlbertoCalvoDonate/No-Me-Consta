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

// EN VUELO A LA VEZ. De una en una tardaba demasiado en calentar: entre el
// hueco que hay que esperar y la descarga, los veintidos retratos podian
// llevar mas de veinte segundos, y el jugador ya iba por la sexta carta.
// Dos a la vez lo parte casi por la mitad y sigue siendo trafico de baja
// prioridad, que es lo que importaba: no adelantar nunca a la imagen que se
// esta mirando.
const A_LA_VEZ = 2

let cola: string[] = []
let enMarcha = 0

// `respetarRed`: en el MENU se baja siempre, aunque la conexion sea mala,
// porque ahi no hay ninguna carta esperando su imagen y todo el ancho de
// banda esta libre. La comprobacion de la red solo tiene sentido con la
// partida ya empezada, que es cuando la precarga puede robarle el sitio a la
// imagen que el jugador esta mirando.
//
// Esto importa mas de lo que parece: con la red clasificada como 2g -y Chrome
// la clasifica asi con menos de lo que uno cree- no se precargaba NADA, ni en
// el menu ni jugando, y cada personaje se descargaba con su carta ya en
// pantalla. Era justo el "las cartas tardan en cargar" del que se quejaba.
export function precargarRetratos(extra: string[] = [], respetarRed = true) {
  if (typeof window === 'undefined') return
  if (respetarRed && !redDecente()) return
  // Se puede llamar varias veces: al abrir el juego con el reparto, y mas
  // tarde con las ilustraciones de final. La segunda llamada no reinicia
  // nada, solo anade a la cola lo que falte.
  if (arrancada) {
    const nuevos = extra.filter((x) => !cola.includes(x))
    if (nuevos.length === 0) return
    cola.push(...nuevos)
    tirar()
    return
  }
  arrancada = true

  cola = [
    ...[...REPARTO]
      .sort(
        (a, b) =>
          (CARTAS_POR_PERSONAJE[b.nombre]?.length ?? 0) -
          (CARTAS_POR_PERSONAJE[a.nombre]?.length ?? 0)
      )
      .map((p) => p.imagen)
      .filter((i): i is string => Boolean(i)),
    // Las ilustraciones de final van al final de la cola: hasta que la partida
    // no acaba no hacen falta, y para entonces ha habido minutos de sobra.
    ...extra,
  ]

  tirar()
}

let i = 0
function tirar() {
  while (enMarcha < A_LA_VEZ && i < cola.length) {
    enMarcha++
    const cual = cola[i++]
    enHueco(() => {
      const img = new Image()
      // Baja prioridad donde se soporte: esto nunca debe adelantar a la imagen
      // de la carta que se está viendo.
      ;(img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = 'low'
      img.onload = img.onerror = () => {
        enMarcha--
        tirar()
      }
      img.src = '/characters/' + cual
    })
  }
}
