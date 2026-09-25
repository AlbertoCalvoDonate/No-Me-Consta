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
  // Sin un toque previo del usuario el navegador BLOQUEA la vibracion y deja
  // un error en la consola por cada intento. No lanza, asi que el try/catch no
  // lo tapa: hay que no llamar. Lo encontro el QA a lo bruto, que abre la
  // pagina, restaura un guardado y juega sin tocar nada con el dedo; ahi
  // salian tres errores de consola seguidos, y los errores de consola son la
  // senal con la que se vigila todo lo demas.
  const act = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } })
    .userActivation
  if (act && !act.hasBeenActive) return
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
