import { epitetoDe } from '../data/epitetos'
import type { Stats } from '../types'

// Compartir el resultado de una partida. A propósito NO hay "puntuación": como
// en Reigns, lo que se cuenta es cuánto aguantaste y con qué reputación
// acabaste. La tira de bloques deja ver de un vistazo qué barra te hundió.

const STAT_ICONO: Record<keyof Stats, string> = {
  medios: '📰',
  gobierno: '🏛️',
  calle: '👥',
  caja: '💰',
}

function barra(valor: number): string {
  const llenos = Math.max(0, Math.min(5, Math.round((valor / 10) * 5)))
  return '█'.repeat(llenos) + '░'.repeat(5 - llenos)
}

export function textoResultado(meses: number, moralidad: number, stats: Stats): string {
  const ep = epitetoDe(moralidad)
  const anos = meses >= 12 ? ` (${(meses / 12).toFixed(1).replace('.', ',')} años)` : ''
  const tira = (['medios', 'gobierno', 'calle', 'caja'] as const)
    .map((k) => `${STAT_ICONO[k]}${barra(stats[k])}`)
    .join('  ')
  return [
    'No Me Consta 🇪🇸',
    `Aguanté ${meses} ${meses === 1 ? 'mes' : 'meses'}${anos} en el cargo.`,
    tira,
    `Los libros me llamarán ${ep.nombre}. «${ep.nota}»`,
    '',
    location.origin,
  ].join('\n')
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
