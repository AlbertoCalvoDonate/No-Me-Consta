import { motion, useTransform, type MotionValue } from 'framer-motion'
import { COLOR, pixel } from '../utils/estilo'
import { SWIPE_REVEAL_DISTANCE } from './SwipeCard'
// Altura fija a propósito: así el retrato de abajo siempre ocupa el mismo
// espacio, sin importar si el texto de la carta es corto o largo. Los
// textos muy largos se recortan con "…" en vez de agrandar el banner.
// Banner compacto (letra pequeña) para dejarle sitio a la carta, que es lo
// que manda visualmente — estilo Reigns.
const BANNER_HEIGHT = 168

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

// Lo que dice cada lado y de que color va, ya resuelto por opcionesDeCarta.
export interface OpcionesBanner {
  textoIzq: string
  textoDer: string
  coloresIzq: { bg: string; accent: string }
  coloresDer: { bg: string; accent: string }
}

// La respuesta que se esta asomando, encima del texto de la carta. Antes esto
// vivia DENTRO de la carta, abajo, y caia sobre la barbilla del personaje;
// arriba, dentro de la carta, tapaba la cara entera, que es por lo que estaba
// abajo. La solucion no era elegir a quien tapar: es que el sitio correcto
// nunca fue la carta, sino este bloque, donde el jugador ya esta leyendo.
// Como en Reigns: el texto de la situacion se sustituye por la salida.
function Respuesta({
  texto,
  lado,
  colores,
  x,
}: {
  texto: string
  lado: 'izq' | 'der'
  colores: { bg: string; accent: string }
  x: MotionValue<number>
}) {
  // Entra deslizando desde su lado, y ya esta entera antes de que el gesto
  // cuente como eleccion: ese hueco es el tiempo de leerla.
  const desliz = useTransform(
    x,
    lado === 'izq' ? [-SWIPE_REVEAL_DISTANCE, 0] : [0, SWIPE_REVEAL_DISTANCE],
    lado === 'izq' ? [0, -28] : [28, 0]
  )
  // El panel del lado contrario no existe en cuanto el arrastre cruza el cero,
  // ni un pixel: asi el rebote al soltar no lo asoma.
  const opacity = useTransform(x, (v) => ((lado === 'izq' ? v < 0 : v > 0) ? 1 : 0))
  return (
    <motion.div
      style={{
        position: 'absolute',
        inset: 0,
        x: desliz,
        opacity,
        background: colores.bg,
        borderBottom: `2px solid ${colores.accent}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px 18px',
        boxSizing: 'border-box',
        zIndex: 3,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          ...pixel,
          // 400 es el unico peso real de esta fuente (ver index.css).
          fontWeight: 400,
          fontSize: 22,
          lineHeight: 1.25,
          color: '#fff',
          textAlign: 'center',
          overflowWrap: 'anywhere',
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 5,
          overflow: 'hidden',
        }}
      >
        {texto}
      </div>
    </motion.div>
  )
}

export function SituationBanner({
  text,
  kind = 'normal',
  opciones,
  x,
}: {
  text: string
  kind?: BannerKind
  opciones?: OpcionesBanner
  x?: MotionValue<number>
}) {
  const e = ESTILO[kind]
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
        // Marca para las pruebas automáticas: sin ella hay que localizar este
        // texto recorriendo todos los divs con getComputedStyle, que fuerza un
        // reflow por elemento y llega a tumbar la pestaña al repetirlo miles
        // de veces.
        data-testid="situacion"
        style={{
          ...pixel,
          fontWeight: 500,
          fontSize: 18,
          lineHeight: 1.3,
          letterSpacing: 0.2,
          textAlign: 'center',
          color: '#f7ecd2',
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: e.etiqueta ? 7 : 8,
          overflow: 'hidden',
        }}
      >
        {text}
      </div>

      {opciones && x && (
        <>
          <Respuesta texto={opciones.textoIzq} lado="izq" colores={opciones.coloresIzq} x={x} />
          <Respuesta texto={opciones.textoDer} lado="der" colores={opciones.coloresDer} x={x} />
        </>
      )}
    </div>
  )
}
