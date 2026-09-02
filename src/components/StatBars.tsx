import { useTransform, type MotionValue } from 'framer-motion'
import type { Card, Stats } from '../types'
import { EffectPips } from './EffectPips'
import { StatIcon } from './StatIcon'
import { SWIPE_REVEAL_DISTANCE } from './SwipeCard'
import { STAT_MAX } from '../data/cards'

// Barra de nivel: un segmento por punto (0 a STAT_MAX). El relleno del icono
// es bonito pero NO se puede comparar entre indicadores: como cada silueta
// tiene una forma distinta, el mismo nivel ocupa áreas muy distintas y "medio
// bocadillo" no parece lo mismo que "medio templo". Esto se lee igual en los
// cuatro y dice exactamente cuántos puntos quedan, que es lo que importa
// cuando estás en rojo: el aviso salta a 1 punto, pero se muere a 0.
function LevelBar({ value, critical }: { value: number; critical: boolean }) {
  return (
    // El margen lateral es lo que separa visualmente las cuatro barras: sin
    // él se leen como una única tira de 40 segmentos y no se ve dónde acaba
    // un indicador y empieza el siguiente.
    <div style={{ display: 'flex', gap: 1.5, margin: '5px 11px 0', height: 6 }}>
      {Array.from({ length: STAT_MAX }, (_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            borderRadius: 1,
            background:
              i < value ? (critical ? '#ff4d4d' : '#e0b84d') : 'rgba(255,255,255,0.14)',
          }}
        />
      ))}
    </div>
  )
}

const ITEMS: { key: keyof Stats; label: string }[] = [
  { key: 'medios', label: 'Medios' },
  { key: 'gobierno', label: 'Gobierno' },
  { key: 'calle', label: 'Calle' },
  { key: 'caja', label: 'Caja B' },
]

// Pista de efecto: al arrastrar la carta se encienden puntos sobre el icono
// del indicador que va a moverse — uno, dos o tres según la magnitud, pero
// SIN decir si sube o baja. Es como Reigns: te dice que algo cambia y cuánto,
// y te toca aprender a ti qué hace cada personaje. Ponlo en false para
// esconder también la magnitud (modo aún más a ciegas).
const SHOW_EFFECT_PIPS = true

interface Props {
  stats: Stats
  card?: Card
  x: MotionValue<number>
}

export function StatBars({ stats, card, x }: Props) {
  // Mismos umbrales que usa la carta para revelar el texto de cada lado al
  // arrastrar, así los puntos de arriba aparecen exactamente a la vez.
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
            {/* Los puntos de efecto se superponen sobre el icono al arrastrar
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
                {SHOW_EFFECT_PIPS && leftVal !== 0 && (
                  <EffectPips value={leftVal} opacity={leftOpacity} />
                )}
                {SHOW_EFFECT_PIPS && rightVal !== 0 && (
                  <EffectPips value={rightVal} opacity={rightOpacity} />
                )}
              </div>
            </div>
            <LevelBar value={stats[key]} critical={critical} />
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
