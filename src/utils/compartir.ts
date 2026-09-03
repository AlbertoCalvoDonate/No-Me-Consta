import { epitetoDe } from '../data/epitetos'

// Compartir el resultado de una partida. A propósito NO hay "puntuación": como
// en Reigns, lo que se cuenta es cuánto aguantaste, cómo te recordarán y qué
// te tumbó. Nada más.

export function textoResultado(meses: number, moralidad: number, causa: string): string {
  const ep = epitetoDe(moralidad)
  const lineas = [
    `Duré ${meses} ${meses === 1 ? 'mes' : 'meses'} en el cargo.`,
    `Los libros me llamarán ${ep.nombre}.`,
  ]
  if (causa) lineas.push(causa)
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
