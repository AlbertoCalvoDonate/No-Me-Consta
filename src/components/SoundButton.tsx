import { useState } from 'react'
import { sfx } from '../utils/sfx'

// Un solo botón que recorre el ciclo de volumen: 25 → 50 → 75 → 100 → mudo.
// El icono cambia con el nivel y, salvo mudo, lleva el porcentaje al lado para
// que no haya duda de en qué paso está.
function iconoDe(pct: number) {
  if (pct === 0) return '🔇'
  if (pct <= 25) return '🔈'
  if (pct <= 50) return '🔉'
  return '🔊'
}

export function SoundButton() {
  const [pct, setPct] = useState(() => sfx.porcentaje())

  return (
    <button
      onClick={() => setPct(sfx.ciclar())}
      aria-label={pct === 0 ? 'Sonido: mudo' : `Volumen: ${pct}%`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        minWidth: 34,
        height: 30,
        padding: '0 8px',
        border: 'none',
        borderRadius: 8,
        background: 'rgba(0,0,0,0.35)',
        color: pct === 0 ? '#6b6656' : '#e0b84d',
        fontFamily: 'var(--font-pixel)',
        fontWeight: 500,
        fontSize: 14,
        lineHeight: 1,
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 15 }}>{iconoDe(pct)}</span>
      {pct > 0 && <span>{pct}%</span>}
    </button>
  )
}
