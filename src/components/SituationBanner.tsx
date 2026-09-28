import { useLayoutEffect, useRef, useState } from 'react'
import { COLOR, pixel } from '../utils/estilo'
// Altura fija a propósito: así el retrato de abajo siempre ocupa el mismo
// espacio, sin importar si el texto de la carta es corto o largo. Los
// textos que no caben encogen de letra (ver `useEncaje` más abajo).
// Banner compacto (letra pequeña) para dejarle sitio a la carta, que es lo
// que manda visualmente — estilo Reigns.
const BANNER_HEIGHT = 168

// Tamaño de letra: el que se usa siempre, y el suelo por debajo del cual no se
// baja aunque el texto no quepa. 13px es lo último que se lee cómodo en esta
// fuente; si algún día hace falta bajar de ahí, el problema es la carta, no el
// banner, y lo dice el validador con su aviso de longitud.
const LETRA = 18
const LETRA_MIN = 13

// Encoge la letra hasta que el texto quepa entero en el hueco.
//
// ESTO ARREGLA UN FALLO QUE SE VEÍA EN MÓVILES PEQUEÑOS. Antes había un
// `-webkit-line-clamp` de 8 líneas, pensando que cortaría con puntos
// suspensivos. Pero a 18px con interlineado 1.3 esas 8 líneas miden 187px y en
// el hueco solo caben 152, así que el bloque quedaba más alto que su caja y,
// como la caja centra su contenido, se recortaba POR ARRIBA Y POR ABAJO a la
// vez: en una pantalla de 360px la carta más larga perdía la primera línea y
// la última, sin puntos suspensivos ni nada que avisara. El jugador leía un
// texto que empezaba a medias.
//
// Medir en vez de calcular es a propósito: el ancho del móvil, la fuente que
// haya cargado y el texto de cada carta cambian cuántas líneas salen, y
// cualquier número fijo se queda corto en algún teléfono. Esto pregunta al
// navegador y baja de punto en punto hasta que entra.
function useEncaje(texto: string) {
  const ref = useRef<HTMLDivElement>(null)
  const [tam, setTam] = useState(LETRA)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ajustar = () => {
      let fs = LETRA
      el.style.fontSize = `${fs}px`
      // +1 de tolerancia: el redondeo a subpíxel hace que un texto que cabe
      // justo se declare desbordado y encoja sin necesidad.
      while (fs > LETRA_MIN && el.scrollHeight > el.clientHeight + 1) {
        fs -= 1
        el.style.fontSize = `${fs}px`
      }
      setTam(fs)
    }
    ajustar()
    // Girar el móvil cambia el ancho y con él el número de líneas.
    //
    // Se vigila al PADRE, no a este elemento: al ajustar se le cambia el
    // tamaño de letra, o sea su tamaño, así que observarse a sí mismo sería
    // pedirle al navegador que se persiga la cola (cada ajuste dispara otra
    // notificación y salen los "ResizeObserver loop" por consola). El padre
    // mide siempre lo mismo salvo que cambie la ventana, que es justo cuando
    // hay que recalcular.
    const caja = el.parentElement
    if (!caja) return
    const ro = new ResizeObserver(ajustar)
    ro.observe(caja)
    return () => ro.disconnect()
  }, [texto])

  return { ref, tam }
}

// Ritmo visual: las cartas de hito no se leen igual que una carta cualquiera.
// El banner cambia de color y saca una etiqueta pequeña arriba, para que se
// note de un vistazo que esto NO es un turno de trámite.
export type BannerKind = 'normal' | 'eleccion' | 'balance' | 'favor'

const ESTILO: Record<
  BannerKind,
  { bg: string; borde: string; etiqueta?: string; color: string }
> = {
  normal: { bg: COLOR.panel, borde: 'rgba(224,184,77,0.25)', color: COLOR.oro },
  eleccion: { bg: '#221c0e', borde: 'rgba(224,184,77,0.65)', etiqueta: 'Noche electoral', color: COLOR.oro },
  balance: { bg: '#0e1c21', borde: 'rgba(120,199,214,0.55)', etiqueta: 'Balance del año', color: '#9bd6e2' },
  favor: { bg: '#0f1f18', borde: 'rgba(107,214,154,0.55)', etiqueta: 'Te deben una', color: '#8fe0b4' },
}

export function SituationBanner({ text, kind = 'normal' }: { text: string; kind?: BannerKind }) {
  const e = ESTILO[kind]
  const { ref, tam } = useEncaje(text)
  return (
    <div
      style={{
        position: 'relative',
        flexShrink: 0,
        height: BANNER_HEIGHT,
        boxSizing: 'border-box',
        background: e.bg,
        borderBottom: `1px solid ${e.borde}`,
        padding: e.etiqueta ? '20px 14px 8px' : '8px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {e.etiqueta && (
        <div
          style={{
            position: 'absolute',
            top: 6,
            left: 0,
            right: 0,
            textAlign: 'center',
            ...pixel,
            fontWeight: 500,
            fontSize: 12,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: e.color,
          }}
        >
          ◆ {e.etiqueta} ◆
        </div>
      )}
      <div
        ref={ref}
        // Marca para las pruebas automáticas: sin ella hay que localizar este
        // texto recorriendo todos los divs con getComputedStyle, que fuerza un
        // reflow por elemento y llega a tumbar la pestaña al repetirlo miles
        // de veces.
        data-testid="situacion"
        style={{
          ...pixel,
          fontWeight: 500,
          fontSize: tam,
          lineHeight: 1.3,
          letterSpacing: 0.2,
          textAlign: 'center',
          color: '#f7ecd2',
          // Que ocupe todo el hueco y no más: es lo que permite comparar
          // `scrollHeight` (lo que mide el texto) con `clientHeight` (lo que
          // hay) y saber si cabe.
          width: '100%',
          maxHeight: '100%',
          overflow: 'hidden',
        }}
      >
        {text}
      </div>
    </div>
  )
}
