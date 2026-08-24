import { motion, useTransform, type MotionValue, type PanInfo } from 'framer-motion'
import type { Card, StatEffects } from '../types'
import { characterColor } from '../utils/color'

// Tamaño FIJO a propósito — no crece ni encoge con el largo del texto, para
// que la carta de debajo se vea siempre, no solo un hueco pequeño. El texto
// que no quepa se recorta (overflow hidden) en vez de agrandar la etiqueta.
const PANEL_WIDTH = 190
const PANEL_HEIGHT = 96
const PANEL_HIDDEN = PANEL_WIDTH + 20

// Cuánto de "corrupta" es una decisión, a partir de sus propios efectos:
// caja/partido son ganancias de trastienda, medios/votantes son legitimidad
// pública. Si una opción gana más de lo primero que de lo segundo, es la
// "mala" (roja); si es al revés, es la "buena" (verde) — así el color sigue
// la moralidad real de cada carta, no si está a la izquierda o la derecha.
function corruptionScore(effects: StatEffects) {
  const caja = effects.caja ?? 0
  const partido = effects.partido ?? 0
  const medios = effects.medios ?? 0
  const votantes = effects.votantes ?? 0
  return caja + partido - medios - votantes
}

const CLEAN = { bg: '#12331f', accent: '#4dff88' }
const CORRUPT = { bg: '#3a1414', accent: '#ff4d4d' }

// Etiqueta de tamaño fijo (ni crece ni encoge con el texto) que entra
// deslizándose desde el lateral en sincronía directa con el arrastre — no
// con umbrales de opacidad. "Hermana" de la carta, no hija, así que vive
// ENCIMA de ella sin rotar ni moverse con su transform. Pegada arriba y
// deliberadamente pequeña: el resto de la carta (el retrato) queda visible
// durante todo el gesto, en vez de taparla entera.
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
  const panelXRaw = useTransform(
    x,
    side === 'left' ? [-150, 0] : [0, 150],
    side === 'left' ? [0, -PANEL_HIDDEN] : [PANEL_HIDDEN, 0]
  )
  // Redondeado a píxel entero: sin esto, justo al llegar al valor máximo
  // (totalmente revelado) el navegador podía renderizar un subpíxel de más
  // o de menos y se veía como un salto de 1px al terminar la animación.
  const panelX = useTransform(panelXRaw, (v) => Math.round(v))
  return (
    <motion.div
      style={{
        position: 'absolute',
        top: 14,
        [side]: 14,
        width: PANEL_WIDTH,
        height: PANEL_HEIGHT,
        x: panelX,
        background: colors.bg,
        opacity: 0.93,
        border: `2px solid ${colors.accent}`,
        borderRadius: 12,
        boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        overflow: 'hidden',
        padding: '10px 12px',
        boxSizing: 'border-box',
        zIndex: 4,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-pixel)',
          fontWeight: 700,
          fontSize: 20,
          lineHeight: 1.25,
          color: '#fff',
          textAlign: 'center',
        }}
      >
        {text}
      </div>
    </motion.div>
  )
}

const SWIPE_THRESHOLD = 100
// Un "flick" rápido cuenta como elección aunque no llegue a los 100px de
// distancia — así se parece más a un gesto real y hay menos posibilidades
// de que el ratón se salga de la ventana antes de completar el arrastre.
const FLICK_VELOCITY = 500

interface Props {
  card: Card
  onChoose: (side: 'left' | 'right') => void
  x: MotionValue<number>
}

export function SwipeCard({ card, onChoose, x }: Props) {
  const rotate = useTransform(x, [-200, 200], [-15, 15])

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
      onChoose('left')
    } else if (decidedRight) {
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
        padding: '16px 24px 12px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <motion.div
          key={card.id}
          style={{
            x,
            rotate,
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            background: characterColor(card.character),
            borderRadius: 16,
            boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
            overflow: 'hidden',
            cursor: 'grab',
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.7}
          dragSnapToOrigin
          dragTransition={{ bounceStiffness: 400, bounceDamping: 30 }}
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
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'top center',
              }}
            />
          )}
        </motion.div>

        {/* Paneles de respuesta: hermanos de la carta (no hijos), por eso no
            rotan ni viajan con ella — entran deslizándose desde el lateral
            en sincronía directa con el arrastre. */}
        <ChoicePanel text={card.left.text} side="left" colors={leftColors} x={x} />
        <ChoicePanel text={card.right.text} side="right" colors={rightColors} x={x} />
      </div>

      <div
        style={{
          flexShrink: 0,
          textAlign: 'center',
          marginTop: 10,
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
