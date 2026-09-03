import { sfx } from './sfx'

// Vibración en móvil, con criterio: un toque seco al elegir, un doble al entrar
// una barra en rojo, uno largo al caer el gobierno. La misma "y ya" que el
// sonido — si el volumen está en mudo, tampoco vibra: el botón de volumen hace
// de interruptor de todo lo que molesta.
//
// Solo funciona en Android: iOS Safari no implementa navigator.vibrate, así
// que ahí esto es un no-op silencioso (no hay nada que "arreglar" en iOS).

const soporta =
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

function v(patron: number | number[]) {
  if (!soporta || sfx.porcentaje() === 0) return
  try {
    navigator.vibrate(patron)
  } catch {
    // Algunos navegadores lanzan si la pestaña está en segundo plano.
  }
}

export const haptics = {
  eleccion() {
    v(12)
  },
  critico() {
    v([0, 22, 55, 22])
  },
  muerte() {
    v([0, 45, 60, 110])
  },
  logro() {
    v([0, 14, 40, 14])
  },
}
