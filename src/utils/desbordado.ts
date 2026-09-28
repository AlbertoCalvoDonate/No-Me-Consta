import { useEffect, useLayoutEffect, useState, type RefObject } from 'react'

// "Aquí abajo hay más".
//
// El juego tiene dos sitios que se desplazan cuando no caben: la pantalla de
// inicio en móviles pequeños y el relato del final. En los dos el corte era una
// línea recta a media palabra, y una línea recta no parece un borde: parece que
// el texto está roto. Medido en un 320x568, en la pantalla de inicio quedaban
// 336px por debajo -entre ellos el botón de empezar- sin nada que lo dijera.
//
// Esto devuelve si queda algo por debajo del borde, para difuminarlo mientras
// lo haya y apagarlo al llegar al final.
//
// El degradado empieza pronto (78%) y no llega a cero a propósito: cortar del
// todo escondería una línea entera, y lo que se quiere es que se adivine que
// hay más, no taparlo.
export const DEGRADADO_BORDE =
  'linear-gradient(to bottom, #000 78%, rgba(0,0,0,0.55) 92%, rgba(0,0,0,0.12) 100%)'

export function useHayMasAbajo(
  ref: RefObject<HTMLElement | null>,
  activo: boolean,
  deps: unknown[] = []
): boolean {
  const [hayMas, setHayMas] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!activo || !el) {
      setHayMas(false)
      return
    }
    const mirar = () => setHayMas(el.scrollHeight - el.clientHeight - el.scrollTop > 4)
    mirar()
    el.addEventListener('scroll', mirar, { passive: true })
    // Se vigila también a los hijos: los retratos y las ilustraciones llegan de
    // la red y al entrar empujan al resto hacia abajo. Sin esto el degradado se
    // decidiría antes de que la pantalla esté completa.
    const ro = new ResizeObserver(mirar)
    ro.observe(el)
    for (const hijo of Array.from(el.children)) ro.observe(hijo)
    return () => {
      el.removeEventListener('scroll', mirar)
      ro.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, ...deps])

  return hayMas
}

// El estilo que se le pone al contenedor que se desplaza.
export function mascaraBorde(hayMas: boolean) {
  return {
    WebkitMaskImage: hayMas ? DEGRADADO_BORDE : undefined,
    maskImage: hayMas ? DEGRADADO_BORDE : undefined,
  }
}

// Alto de la ventana, en vivo. Se usa para apretar las pantallas que no caben
// en moviles bajitos: girar el telefono o que aparezca la barra del navegador
// cambia el hueco, asi que no vale medirlo una vez al arrancar.
export function useAltoVentana(): number {
  const [alto, setAlto] = useState(() =>
    typeof window === 'undefined' ? 800 : window.innerHeight
  )
  useEffect(() => {
    const mirar = () => setAlto(window.innerHeight)
    window.addEventListener('resize', mirar)
    window.addEventListener('orientationchange', mirar)
    return () => {
      window.removeEventListener('resize', mirar)
      window.removeEventListener('orientationchange', mirar)
    }
  }, [])
  return alto
}
