import { useTransform, type MotionValue } from 'framer-motion'
import type { Card, Stats } from '../types'
import { STAT_ICONS } from '../statIcons'
import { EffectArrow } from './EffectArrow'

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
  const leftOpacity = useTransform(x, [-150, -30, 0], [1, 0, 0])
  const rightOpacity = useTransform(x, [0, 30, 150], [0, 0, 1])

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
        const critical = stats[key] <= 2
        const leftVal = card?.left.effects[key] ?? 0
        const rightVal = card?.right.effects[key] ?? 0
        return (
          <div key={key} style={{ flex: 1, textAlign: 'center' }} aria-label={`${label}: ${stats[key]}`}>
            <div style={{ fontSize: 22, lineHeight: 1 }}>{STAT_ICONS[key]}</div>
            <div
              style={{
                marginTop: 6,
                fontFamily: 'var(--font-pixel)',
                fontWeight: 500,
                fontSize: 26,
                color: critical ? '#ff4d4d' : '#e8e2d4',
              }}
            >
              {stats[key]}
            </div>
            {/* Hueco fijo para la flecha, para que los iconos no salten
                cuando aparece/desaparece */}
            <div style={{ position: 'relative', height: 20, marginTop: 2 }}>
              {leftVal !== 0 && <EffectArrow value={leftVal} opacity={leftOpacity} />}
              {rightVal !== 0 && <EffectArrow value={rightVal} opacity={rightOpacity} />}
            </div>
          </div>
        )
      })}
    </div>
  )
}
