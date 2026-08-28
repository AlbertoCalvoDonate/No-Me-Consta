import { useTransform, type MotionValue } from 'framer-motion'
import type { Card, Stats } from '../types'
import { EffectArrow } from './EffectArrow'
import { StatIcon } from './StatIcon'
import { SWIPE_REVEAL_DISTANCE } from './SwipeCard'

const ITEMS: { key: keyof Stats; label: string }[] = [
  { key: 'medios', label: 'Medios' },
  { key: 'gobierno', label: 'Gobierno' },
  { key: 'calle', label: 'Calle' },
  { key: 'caja', label: 'Caja B' },
]

// Flechas ▲▼ que adelantan qué stat sube o baja con cada opción. De momento
// se quedan porque vienen muy bien para probar el mazo, pero la idea es
// quitarlas: Reigns enseña la MAGNITUD del cambio pero no la dirección, a
// propósito, para que el jugador tenga que aprender qué hace cada personaje.
// Ponlo en false y desaparecen; no hay que tocar nada más.
const SHOW_EFFECT_ARROWS = true

interface Props {
  stats: Stats
  card?: Card
  x: MotionValue<number>
}

export function StatBars({ stats, card, x }: Props) {
  // Mismos umbrales que usa la carta para revelar el texto de cada lado al
  // arrastrar, así las flechas de arriba aparecen exactamente a la vez.
  const fadeStart = SWIPE_REVEAL_DISTANCE / 4
  const leftOpacity = useTransform(x, [-SWIPE_REVEAL_DISTANCE, -fadeStart, 0], [1, 0, 0])
  const rightOpacity = useTransform(x, [0, fadeStart, SWIPE_REVEAL_DISTANCE], [0, 0, 1])

  return (
    <div
      style={{
        flexShrink: 0,
        display: 'flex',
        background: '#111113',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '12px 4px 10px',
      }}
    >
      {ITEMS.map(({ key, label }) => {
        // Crítico por ambos lados: tocar fondo (0) Y tocar techo (10) acaban
        // mal (ver los finales "_max" en cards.ts). El rojo salta solo a un
        // paso del final (<=1 o >=9), para que "rojo" signifique de verdad
        // "otra más y pierdes" y no "vas calentito".
        const critical = stats[key] <= 1 || stats[key] >= 9
        const leftVal = card?.left.effects[key] ?? 0
        const rightVal = card?.right.effects[key] ?? 0
        return (
          <div key={key} style={{ flex: 1, textAlign: 'center' }} aria-label={`${label}: ${stats[key]}`}>
            {/* La flecha de efecto se superpone sobre el icono al hacer swipe
                (position:absolute), así que el icono no salta al aparecer. */}
            <div style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
              <StatIcon statKey={key} value={stats[key]} critical={critical} />
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: -8,
                  height: 40,
                  pointerEvents: 'none',
                }}
              >
                {SHOW_EFFECT_ARROWS && leftVal !== 0 && (
                  <EffectArrow value={leftVal} opacity={leftOpacity} />
                )}
                {SHOW_EFFECT_ARROWS && rightVal !== 0 && (
                  <EffectArrow value={rightVal} opacity={rightOpacity} />
                )}
              </div>
            </div>
            {/* Etiqueta de texto: los iconos solos no siempre se entienden. */}
            <div
              style={{
                fontFamily: 'var(--font-pixel)',
                fontWeight: 500,
                fontSize: 14,
                letterSpacing: 0.4,
                lineHeight: 1,
                marginTop: 4,
                color: critical ? '#ff6b6b' : '#a8a08c',
              }}
            >
              {label}
            </div>
          </div>
        )
      })}
    </div>
  )
}
