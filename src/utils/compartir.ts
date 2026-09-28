import { epitetoDe } from '../data/epitetos'
import { STAT_MAX } from '../data/cards'
import type { Stats } from '../types'

// Compartir el resultado de una partida. A propósito NO hay "puntuación": como
// en Reigns, lo que se cuenta es cuánto aguantaste, cómo te recordarán y qué
// te tumbó. Nada más.
//
// Y se DIBUJA con cómo llegaste. Un resultado contado solo con palabras se lee
// y se olvida; el mismo resultado con las cuatro barras pintadas se reconoce de
// un vistazo, invita a comparar con el del otro y es lo que hace que un mensaje
// se reenvíe. Es lo que hizo el Wordle con su cuadrícula, y aquí las barras ya
// existen: solo había que sacarlas por la puerta.
//
// Las barras van al PRINCIPIO de cada línea y la etiqueta detrás. Es a
// propósito: en WhatsApp y en Twitter la letra no es de ancho fijo, así que con
// la etiqueta delante cada barra empezaría en un sitio distinto y el dibujo se
// desmontaría. Empezando todas en el margen, quedan alineadas escriba donde
// escriba quien lo pegue.
const LLENO = '█'
const VACIO = '░'
const ETIQUETAS: [keyof Stats, string][] = [
  ['medios', 'Medios'],
  ['gobierno', 'Gobierno'],
  ['calle', 'Calle'],
  ['caja', 'Caja B'],
]

function barra(v: number): string {
  const n = Math.max(0, Math.min(STAT_MAX, Math.round(v)))
  return LLENO.repeat(n) + VACIO.repeat(STAT_MAX - n)
}

export function textoResultado(
  meses: number,
  moralidad: number,
  causa: string,
  stats?: Stats
): string {
  const ep = epitetoDe(moralidad)
  const lineas = [`No Me Consta · ${meses} ${meses === 1 ? 'mes' : 'meses'} en el cargo`]
  if (stats) {
    lineas.push('')
    for (const [k, nombre] of ETIQUETAS) lineas.push(`${barra(stats[k])} ${nombre}`)
  }
  lineas.push('')
  if (causa) lineas.push(causa)
  lineas.push(`Los libros me llamarán ${ep.nombre}.`)
  lineas.push('', location.origin)
  return lineas.join('\n')
}

// Compartir nativo del móvil; si no está, copia al portapapeles.
export async function compartirResultado(
  texto: string
): Promise<'compartido' | 'copiado' | 'error'> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ text: texto })
      return 'compartido'
    } catch (e) {
      // Canceló el diálogo: no es un fallo que enseñar.
      if (e instanceof DOMException && e.name === 'AbortError') return 'compartido'
      // Cualquier otro error: probamos con el portapapeles.
    }
  }
  try {
    await navigator.clipboard.writeText(texto)
    return 'copiado'
  } catch {
    return 'error'
  }
}
