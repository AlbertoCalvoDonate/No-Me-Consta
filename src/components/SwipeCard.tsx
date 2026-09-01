import { motion, useTransform, type MotionValue, type PanInfo } from 'framer-motion'
import type { Card, StatEffects } from '../types'
import { characterColor } from '../utils/color'
import { sfx } from '../utils/sfx'

// Tamaño FIJO a propósito — no crece ni encoge con el largo del texto, para
// que la carta de debajo se vea siempre, no solo un hueco pequeño. El texto
// que no quepa se recorta (overflow hidden) en vez de agrandar la etiqueta.
const PANEL_WIDTH = 216
const PANEL_HEIGHT = 130
const PANEL_HIDDEN = PANEL_WIDTH + 24

// Inclinación máxima de la carta al arrastrar (grados). El panel de respuesta
// es hijo de la carta y gira con ella, como una pegatina pegada encima.
const CARD_TILT = 12

// Proporción común de todos los retratos (scripts/normalize-portraits.mjs los
// re-encuadra a 1020x1200). El <img> se dimensiona a este ratio y se escala
// para caber entero en la carta, así todos se ven igual en cualquier pantalla.
const PORTRAIT_RATIO = '1020 / 1200'

// Distancia de arrastre a la que un lado se considera "totalmente revelado".
// Se exporta porque StatBars usa el mismo valor para las flechas de efecto —
// deben moverse en sincronía.
//
// OJO con las unidades: esto se mide sobre `x`, que es el desplazamiento YA
// amortiguado por dragElastic (0.7), mientras que SWIPE_THRESHOLD se compara
// contra el recorrido real del DEDO. Es decir: dedo ≈ x / 0.7. Con 60 aquí,
// el panel no se completaba hasta 86px de dedo, pero la elección ya estaba
// decidida a los 70px — el panel no llegaba a leerse entero nunca. Medido:
// con 38 se completa a ~54px de dedo, bastante antes del umbral.
export const SWIPE_REVEAL_DISTANCE = 38

// Cuánto de "corrupta" es una decisión, a partir de sus propios efectos:
// caja/partido son ganancias de trastienda, medios/votantes son legitimidad
// pública. Si una opción gana más de lo primero que de lo segundo, es la
// "mala" (roja); si es al revés, es la "buena" (verde) — así el color sigue
// la moralidad real de cada carta, no si está a la izquierda o la derecha.
export function corruptionScore(effects: StatEffects) {
  const caja = effects.caja ?? 0
  const partido = effects.gobierno ?? 0
  const medios = effects.medios ?? 0
  const votantes = effects.calle ?? 0
  return caja + partido - medios - votantes
}

const CLEAN = { bg: '#12331f', accent: '#4dff88' }
const CORRUPT = { bg: '#3a1414', accent: '#ff4d4d' }

// Etiqueta de tamaño fijo (ni crece ni encoge con el texto) que entra
// deslizándose desde el lateral en sincronía directa con el arrastre — no
// con umbrales de opacidad. Deliberadamente pequeña y arriba: el resto de la
// carta (el retrato) queda visible durante todo el gesto.
//
// GEOMETRÍA (varios intentos fallidos antes de dar con esto):
//  - Es HERMANA de la carta, no hija: así el overflow:hidden de la carta no la
//    recorta, y no hereda su rotación (el texto se lee siempre recto).
//  - Viaja con la carta en X (`cardX + deslizamiento`), no se queda quieta: si
//    no, al arrastrar la carta se iba y el panel se quedaba flotando fuera.
//  - Queda CENTRADA en horizontal, no pegada a un lateral. Pegada al borde se
//    salía de la carta al inclinarse esta, y encima ese borde es justo el que
//    se va de pantalla al arrastrar, así que el panel se cortaba con él.
function ChoicePanel({
  text,
  side,
  colors,
  x,
}: {
  text: string
  side: 'left' | 'right'
  colors: { bg: string; accent: string }
  x: MotionValue<number>
}) {
  // El deslizamiento arranca en 0, no en una zona muerta: el panel empieza a
  // asomar desde el primer píxel de arrastre y entra de forma gradual. Con
  // zona muerta entraba tarde y de golpe, y no daba tiempo a leerlo. Para el
  // rebote al soltar no hace falta colchón aquí: de eso se encarga `opacity`,
  // que apaga el panel en cuanto el arrastre cruza al lado contrario.
  const slideRaw = useTransform(
    x,
    side === 'left' ? [-SWIPE_REVEAL_DISTANCE, 0] : [0, SWIPE_REVEAL_DISTANCE],
    side === 'left' ? [0, -PANEL_HIDDEN] : [PANEL_HIDDEN, 0]
  )
  // Solo el deslizamiento de entrada: el panel NO acompaña a la carta. Una vez
  // dentro se queda QUIETO en pantalla aunque se siga arrastrando, y es la
  // carta la que se va por debajo (como en el Reigns original). Antes le
  // sumaba el desplazamiento de la carta y, pasada la distancia de revelado,
  // el panel se iba con ella en vez de quedarse a la vista.
  // Redondeado a píxel entero: sin esto, al llegar al valor máximo el
  // navegador podía renderizar un subpíxel de más y se veía un salto de 1px.
  const panelX = useTransform(slideRaw, (v) => Math.round(v))
  // El panel de un lado NO existe (opacity 0) en cuanto el arrastre está en
  // el lado contrario — incluso 1px. Así, pase lo que pase con el rebote al
  // soltar (que puede cruzar el 0 hacia el otro signo), el panel que no se ha
  // elegido nunca llega a verse. Cuando se empieza a arrastrar hacia este
  // lado el panel ya está a 0.93 pero todavía fuera de pantalla (zona muerta),
  // así que tampoco se ve "aparecer".
  const opacity = useTransform(x, (v) => ((side === 'left' ? v < 0 : v > 0) ? 0.93 : 0))
  return (
    <motion.div
      style={{
        position: 'absolute',
        top: 26,
        left: '50%',
        marginLeft: -PANEL_WIDTH / 2,
        width: PANEL_WIDTH,
        height: PANEL_HEIGHT,
        x: panelX,
        background: colors.bg,
        opacity,
        border: `2px solid ${colors.accent}`,
        borderRadius: 12,
        boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        padding: '8px 10px',
        boxSizing: 'border-box',
        zIndex: 4,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: '100%',
          fontFamily: 'var(--font-pixel)',
          // 400: es el único peso que existe de verdad para esta fuente (ver
          // nota en index.css) — un 700 aquí forzaría un "bold" sintético
          // que se ve borroso, sobre todo a este tamaño.
          fontWeight: 400,
          fontSize: 18,
          lineHeight: 1.2,
          color: '#fff',
          textAlign: 'center',
          overflowWrap: 'anywhere',
        }}
      >
        {text}
      </div>
    </motion.div>
  )
}

// Recorrido del DEDO para que el gesto cuente como elección. Tiene que dejar
// margen de sobra por encima del punto en el que el panel ya está entero
// (~54px de dedo, ver SWIPE_REVEAL_DISTANCE): ese hueco es el tiempo que
// tienes para leer la opción antes de que la carta se vaya.
const SWIPE_THRESHOLD = 82
// Un "flick" rápido cuenta como elección aunque no llegue a esa distancia —
// así se parece más a un gesto real y hay menos posibilidades de que el
// ratón se salga de la ventana antes de completar el arrastre.
const FLICK_VELOCITY = 500

interface Props {
  card: Card
  onChoose: (side: 'left' | 'right') => void
  x: MotionValue<number>
}

export function SwipeCard({ card, onChoose, x }: Props) {
  const rotate = useTransform(x, [-100, 100], [-CARD_TILT, CARD_TILT])

  const leftIsCorrupt = corruptionScore(card.left.effects) > corruptionScore(card.right.effects)
  const leftColors = leftIsCorrupt ? CORRUPT : CLEAN
  const rightColors = leftIsCorrupt ? CLEAN : CORRUPT

  // Sin animación de salida a propósito: la carta siguiente entra al
  // instante en cuanto se decide (nada que esperar, nada que se pueda
  // quedar a medias). Solo se anima la entrada (initial → animate).
  function handleDragEnd(_: unknown, info: PanInfo) {
    const decidedLeft = info.offset.x < -SWIPE_THRESHOLD || (info.offset.x < 0 && info.velocity.x < -FLICK_VELOCITY)
    const decidedRight = info.offset.x > SWIPE_THRESHOLD || (info.offset.x > 0 && info.velocity.x > FLICK_VELOCITY)
    if (decidedLeft) {
      // `x` es la MISMA MotionValue compartida que heredará la carta
      // siguiente (cambia de key, pero no de `x`). `x.stop()` mata la
      // animación de rebote que framer-motion lanza al soltar: si no, esa
      // animación sigue corriendo sobre `x` tras desmontarse esta carta,
      // se pasa del 0 hacia el signo contrario y asoma un trozo del panel
      // de la otra opción en la carta nueva. `x.set(0)` deja la carta
      // siguiente en su sitio desde el primer frame.
      x.stop()
      x.set(0)
      onChoose('left')
    } else if (decidedRight) {
      x.stop()
      x.set(0)
      onChoose('right')
    }
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        // Márgenes mínimos: la carta es lo que manda en pantalla y el
        // retrato está limitado por el ANCHO (su ratio es 1020/1200), así que
        // cada píxel lateral que se recorta aquí lo gana la imagen.
        padding: '10px 8px 8px',
        boxSizing: 'border-box',
      }}
    >
      {/* SIN overflow:hidden a propósito: este contenedor NO rota, así que al
          inclinarse la carta sus esquinas se salían de él y las recortaba en
          vertical — y con ellas el panel de respuesta, que se veía cortado por
          la mitad. La carta ya se recorta a sí misma con su propio
          overflow+borderRadius, que es el borde visible. */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <motion.div
          key={card.id}
          style={{
            x,
            rotate,
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            boxSizing: 'border-box',
            background: characterColor(card.character),
            borderRadius: 16,
            border: '2px solid rgba(255,255,255,0.22)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
            overflow: 'hidden',
            cursor: 'grab',
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.7}
          dragSnapToOrigin
          dragTransition={{ bounceStiffness: 450, bounceDamping: 45 }}
          onDragStart={() => sfx.roce()}
          onDragEnd={handleDragEnd}
          initial={{ scale: 0.88, opacity: 0, y: 60 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 24, mass: 0.8 }}
        >
          {card.characterImage && (
            <img
              src={`/characters/${card.characterImage}`}
              alt={card.character}
              draggable={false}
              style={{
                // Todos los retratos están re-encuadrados al mismo lienzo
                // (PORTRAIT_RATIO, ver scripts/normalize-portraits.mjs). En vez
                // de forzar la imagen a llenar un hueco de forma variable (que
                // recortaba distinto en cada pantalla), el <img> se dimensiona
                // a ESE ratio y se escala para caber entero dentro de la carta:
                // el retrato se ve completo y con el mismo plano SIEMPRE. Lo
                // que sobra de carta queda del color de fondo (que es el mismo
                // que asoma por el fondo transparente del png).
                display: 'block',
                width: 'auto',
                height: 'auto',
                maxWidth: '100%',
                maxHeight: '100%',
                aspectRatio: PORTRAIT_RATIO,
                objectFit: 'cover',
                objectPosition: 'center top',
              }}
            />
          )}

        </motion.div>

        {/* Paneles de respuesta: hermanos de la carta (ver comentario en
            ChoicePanel). Viajan con ella en X y quedan centrados, así que
            siempre caen dentro de la carta sin que nada los recorte. */}
        <ChoicePanel text={card.left.text} side="left" colors={leftColors} x={x} />
        <ChoicePanel text={card.right.text} side="right" colors={rightColors} x={x} />
      </div>

      <div
        style={{
          flexShrink: 0,
          textAlign: 'center',
          marginTop: 7,
          fontFamily: 'var(--font-pixel)',
          fontWeight: 500,
          fontSize: 22,
          color: '#e0b84d',
        }}
      >
        {card.character}
      </div>
    </div>
  )
}
