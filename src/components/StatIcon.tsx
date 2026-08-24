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
function IconShapes({ statKey }: { statKey: keyof Stats }) {
  switch (statKey) {
    case 'medios':
      // Megáfono: prensa / opinión pública.
      return (
        <>
          <path d="M7,9 L19,3 L19,21 L7,15 Z" />
          <rect x="3" y="10" width="4" height="5" rx="1.2" />
        </>
      )
    case 'partido':
      // Bandera: aparato del partido / lealtad interna.
      return (
        <>
          <rect x="5" y="2" width="2.4" height="20" rx="1" />
          <path d="M7.4,3 L20,7.5 L7.4,12 Z" />
        </>
      )
    case 'votantes':
      // Puño en alto: la calle / el electorado.
      return (
        <>
          <rect x="6" y="5" width="12" height="10" rx="4" />
          <rect x="9" y="14" width="6" height="8" rx="1.5" />
        </>
      )
    case 'caja':
      // Saco de dinero, con cuello estrecho para que no parezca una llama:
      // caja B / finanzas opacas.
      return (
        <>
          <path d="M9,7 L15,7 L12,3 Z" />
          <rect x="10" y="7" width="4" height="4" />
          <circle cx="12" cy="15.5" r="7" />
        </>
      )
  }
}

export function StatIcon({ statKey, value, critical }: { statKey: keyof Stats; value: number; critical: boolean }) {
  const pct = Math.max(0, Math.min(1, value / STAT_MAX))
  const fillHeight = VB * pct
  const fillY = VB - fillHeight
  const clipId = `stat-icon-clip-${statKey}`
  const fillColor = critical ? '#ff4d4d' : '#e0b84d'

  return (
    <svg width={30} height={30} viewBox={`0 0 ${VB} ${VB}`} aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <IconShapes statKey={statKey} />
        </clipPath>
      </defs>
      {/* Silueta vacía, siempre visible de fondo. */}
      <g fill="#4d493e">
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
