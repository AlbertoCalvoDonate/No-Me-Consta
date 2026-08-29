import { motion } from 'framer-motion'
import type { Stats } from '../types'
import { STAT_MAX } from '../data/cards'

// Iconos planos de una sola pieza (estilo Reigns original), con el propio
// dibujo haciendo de máscara para un relleno que sube desde abajo según el
// valor de la stat (0-STAT_MAX) — así se ve "cuánto queda" sobre el propio
// icono, sin número al lado, igual que en el juego original.
const VB = 24

// Cada icono es un fragmento de <path>/<rect>/<circle> en un viewBox de
// 24x24, pensado para leerse bien de pequeño y en una sola silueta.
// Metáforas lo más literales posible (van con etiqueta de texto debajo).
function IconShapes({ statKey }: { statKey: keyof Stats }) {
  switch (statKey) {
    case 'medios':
      // Bocadillo de diálogo: prensa / opinión pública.
      return (
        <path d="M4,3 h16 a2,2 0 0 1 2,2 v9 a2,2 0 0 1 -2,2 h-8 l-5,4 v-4 h-3 a2,2 0 0 1 -2,-2 v-9 a2,2 0 0 1 2,-2 z" />
      )
    case 'gobierno':
      // Edificio institucional con columnas: la coalición que te sostiene.
      // Si se caen las columnas, se cae el Gobierno — la metáfora es directa.
      // Columnas centradas a mano: el hueco libre (21 de ancho menos 4
      // columnas de 3) son 9, repartidos en 5 huecos de 1.8. De ahí las x.
      return (
        <>
          <path d="M12,1.5 L22.5,7 L1.5,7 Z" />
          <rect x="1.5" y="8" width="21" height="2" />
          <rect x="3.3" y="11" width="3" height="8" />
          <rect x="8.1" y="11" width="3" height="8" />
          <rect x="12.9" y="11" width="3" height="8" />
          <rect x="17.7" y="11" width="3" height="8" />
          <rect x="1.5" y="20" width="21" height="2.5" />
        </>
      )
    case 'calle':
      // Tres siluetas de gente: la calle, la gente de a pie. Antes era una
      // urna, pero la urna se confundía con "elecciones"/"gobierno"; un grupo
      // de personas se lee como "la gente" sin ambigüedad.
      // Tres bustos. Cada cuerpo arranca justo donde acaba su cabeza (con un
      // pelín de solape): antes los hombros empezaban 6 unidades más abajo y
      // las cabezas parecían flotar. Los de los lados van bastante más bajos
      // y pequeños para que la silueta haga escalón: si van a la misma altura
      // los tres cuerpos se funden en un bloque plano y deja de leerse como
      // gente.
      return (
        <>
          <circle cx="4.2" cy="9.5" r="2.7" />
          <path d="M0.3,22.5 v-6.7 a3.9,3.9 0 0 1 7.8,0 v6.7 Z" />
          <circle cx="19.8" cy="9.5" r="2.7" />
          <path d="M15.9,22.5 v-6.7 a3.9,3.9 0 0 1 7.8,0 v6.7 Z" />
          <circle cx="12" cy="5.8" r="3.7" />
          <path d="M6.6,22.5 v-8 a5.4,5.4 0 0 1 10.8,0 v8 Z" />
        </>
      )
    case 'caja':
      // Maletín: dinero de trastienda / caja B.
      return (
        <>
          <path d="M8,8 V6 a4,4 0 0 1 8,0 V8 h-2.2 V6.2 a1.8,1.8 0 0 0 -3.6,0 V8 Z" />
          <rect x="2.5" y="8" width="19" height="12.5" rx="2" />
        </>
      )
  }
}

export function StatIcon({
  statKey,
  value,
  critical,
  size = 44,
}: {
  statKey: keyof Stats
  value: number
  critical: boolean
  size?: number
}) {
  const pct = Math.max(0, Math.min(1, value / STAT_MAX))
  const fillHeight = VB * pct
  const fillY = VB - fillHeight
  const clipId = `stat-icon-clip-${statKey}`
  const fillColor = critical ? '#ff4d4d' : '#e0b84d'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`} aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <IconShapes statKey={statKey} />
        </clipPath>
      </defs>
      {/* Silueta vacía, siempre visible de fondo. Más clara que antes para
          que el icono se lea aunque la stat esté casi a cero (poco relleno). */}
      <g fill="#6b6656">
        <IconShapes statKey={statKey} />
      </g>
      {/* Relleno tipo medidor: sube desde abajo, recortado a la silueta.
          `attrY`, no `y`: Framer Motion anima `y` en un <rect> como
          transform CSS (translateY) en vez de como atributo SVG real, y el
          clip-path se define en las coordenadas ORIGINALES del icono — con
          el rect desplazado por transform en vez de por atributo, el
          recorte deja de coincidir con el dibujo y parecen dos iconos
          distintos superpuestos. `attrY`/`attrHeight` fuerzan a Motion a
          tocar el atributo de verdad, alineado con el clip-path.
          Tween en vez de spring: un muelle con rebote puede pasarse de 0
          por una fracción de píxel al vaciarse del todo, y SVG no acepta
          una altura negativa (rompe con un error en consola) — un medidor
          tampoco necesita ese rebote. */}
      <motion.rect
        x={0}
        width={VB}
        clipPath={`url(#${clipId})`}
        fill={fillColor}
        initial={false}
        animate={{ attrY: fillY, height: fillHeight }}
        transition={{ type: 'tween', ease: 'easeOut', duration: 0.35 }}
      />
    </svg>
  )
}
