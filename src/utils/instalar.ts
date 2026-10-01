import { useEffect, useState } from 'react'

// UN BOTON DE INSTALAR DENTRO DEL JUEGO.
//
// "Añadir a pantalla de inicio" esta escondido en el menu de tres puntos del
// navegador y mucha gente no lo ha abierto en su vida. El navegador ofrece una
// forma de pedirlo nosotros: avisa antes de enseñar su propio cartel, le
// decimos "espera", y lo sacamos donde se vea.
//
// NO SIEMPRE SE PUEDE, y el boton lo tiene en cuenta: solo aparece si el
// navegador ha dicho que si. Los casos en que no dice nada:
//   - Ya esta instalado (entonces el juego ya corre en su ventana).
//   - El navegador no lo soporta. En iOS, Safari NO lo soporta y no hay forma
//     de pedirlo por codigo: ahi se instala a mano desde Compartir.
//   - No se cumplen los requisitos (sin manifest, sin iconos, sin HTTPS).
// En todos ellos el boton simplemente no se pinta, que es mejor que un boton
// que promete algo y no hace nada.

interface EventoInstalar extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let guardado: EventoInstalar | null = null
const oyentes = new Set<(hay: boolean) => void>()

function avisar(hay: boolean) {
  for (const f of oyentes) f(hay)
}

// Se engancha al cargar el modulo y no dentro del componente: el navegador
// lanza el aviso muy pronto, a veces antes de que React haya pintado nada, y
// si no hay nadie escuchando en ese momento el aviso se pierde y el boton no
// sale nunca.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    guardado = e as EventoInstalar
    avisar(true)
  })
  window.addEventListener('appinstalled', () => {
    guardado = null
    avisar(false)
  })
}

// ¿Esta el juego corriendo YA como app instalada? Sirve para no ofrecer
// instalar algo que ya esta instalado.
export function vaComoApp(): boolean {
  if (typeof window === 'undefined') return false
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches
  // iOS no soporta display-mode y usa esta propiedad suya.
  const ios = (window.navigator as { standalone?: boolean }).standalone === true
  return Boolean(standalone || ios)
}

export function useSePuedeInstalar(): boolean {
  const [hay, setHay] = useState(() => guardado !== null)
  useEffect(() => {
    oyentes.add(setHay)
    return () => {
      oyentes.delete(setHay)
    }
  }, [])
  return hay && !vaComoApp()
}

// ¿Es un iPhone o un iPad? Importa porque ALLI NO HAY BOTON POSIBLE: Safari no
// implementa `beforeinstallprompt` y no hay forma de pedir la instalacion por
// codigo. Se instala a mano desde Compartir, y punto.
//
// Y en iOS esto vale para TODOS los navegadores, no solo para Safari: Apple
// obliga a que Chrome, Firefox y los demas usen su motor por debajo, asi que
// son Safari con otra cara y se comportan igual.
//
// La deteccion mira el iPad moderno aparte porque desde iPadOS 13 se hace
// pasar por un Mac de escritorio en el user agent, y lo unico que le delata es
// que tiene pantalla tactil.
function esIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPhone|iPod/.test(ua)) return true
  const iPadMentiroso = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1
  return /iPad/.test(ua) || iPadMentiroso
}

// Como se instala esto AQUI, en este movil concreto:
//   'boton' - el navegador deja pedirlo y hay boton (Chrome y compañia).
//   'mano'  - se puede, pero hay que explicarlo (iOS).
//   'no'    - o ya esta instalado, o este navegador no lo ofrece todavia
//             (Firefox en Android tiene lo suyo en su menu) o es un ordenador.
export type ComoInstalar = 'boton' | 'mano' | 'no'

export function useComoInstalar(): ComoInstalar {
  const conBoton = useSePuedeInstalar()
  if (conBoton) return 'boton'
  if (esIOS() && !vaComoApp()) return 'mano'
  return 'no'
}

// Devuelve si lo instalo. El evento solo se puede usar UNA vez: si lo rechaza,
// el navegador no vuelve a ofrecerlo en esta visita, asi que se tira y el
// boton desaparece. Insistir en la misma sesion es de aplicacion pesada.
export async function pedirInstalar(): Promise<boolean> {
  if (!guardado) return false
  const e = guardado
  guardado = null
  avisar(false)
  try {
    await e.prompt()
    const { outcome } = await e.userChoice
    return outcome === 'accepted'
  } catch {
    return false
  }
}
