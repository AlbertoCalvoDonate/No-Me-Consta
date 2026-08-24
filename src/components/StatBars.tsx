import { useTransform, type MotionValue } from 'framer-motion'
import type { Card, Stats } from '../types'
import { EffectArrow } from './EffectArrow'
import { StatIcon } from './StatIcon'
import { SWIPE_REVEAL_DISTANCE } from './SwipeCard'

const ITEMS: { key: keyof Stats; label: string }[] = [
  { key: 'medios', label: 'Medios' },
  { key: 'partido', label: 'Partido' },
  { key: 'votantes', label: 'Votantes' },
  { key: 'caja', label: 'Caja B' },
]

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
        padding: '14px 6px',
      }}
    >
      {ITEMS.map(({ key, label }) => {
        // Crítico por ambos lados: tocar fondo Y tocar techo acaban mal
        // (ver los finales "_max" en cards.ts), así que el aviso rojo vale
        // para los dos extremos, no solo para cuando la stat está baja.
        const critical = stats[key] <= 2 || stats[key] >= 8
        const leftVal = card?.left.effects[key] ?? 0
        const rightVal = card?.right.effects[key] ?? 0
        return (
          <div key={key} style={{ flex: 1, textAlign: 'center' }} aria-label={`${label}: ${stats[key]}`}>
            <StatIcon statKey={key} value={stats[key]} critical={critical} />
            {/* Hueco fijo para la flecha, para que los iconos no salten
                cuando aparece/desaparece */}
            <div style={{ position: 'relative', height: 20, marginTop: 4 }}>
              {leftVal !== 0 && <EffectArrow value={leftVal} opacity={leftOpacity} />}
              {rightVal !== 0 && <EffectArrow value={rightVal} opacity={rightOpacity} />}
            </div>
          </div>
        )
      })}
    </div>
  )
}
