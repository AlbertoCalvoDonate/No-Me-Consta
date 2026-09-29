import { useState } from 'react'
import { LOGROS } from '../data/logros'
import type { Logro } from '../data/logros'
import { useLogrosEstado } from '../hooks/useLogros'
import { COLOR, pixel } from '../utils/estilo'
import { sfx } from '../utils/sfx'

// LOS LOGROS, UN BLOQUE POR PAGINA.
//
// Antes eran los cuarenta y nueve de corrido en una lista, y esa lista medía
// 2.000px: había que arrastrar en todos los tamaños, incluido el ordenador,
// y para ver por dónde ibas en un bloque tenías que recorrerte los de encima.
//
// Ahora cada bloque es una página y se pasa con las flechas. Sale ganando algo
// más que el scroll: los bloques son tramos distintos del juego -durar,
// epítetos, por dónde caes, tramas, colección- y verlos separados dice de un
// vistazo cuál llevas entero y cuál no has tocado. La descripción de cada uno
// se abre al tocarlo, que es cuando interesa.
const GRUPOS = LOGROS.reduce<string[]>((acc, l) => {
  if (!acc.includes(l.grupo)) acc.push(l.grupo)
  return acc
}, [])

export function LogrosPanel({ onCerrar }: { onCerrar: () => void }) {
  const { conseguidos, total, hechos } = useLogrosEstado()
  const [pagina, setPagina] = useState(0)
  const [abierto, setAbierto] = useState<Logro | null>(null)

  const grupo = GRUPOS[Math.min(pagina, GRUPOS.length - 1)]
  const delGrupo = LOGROS.filter((l) => l.grupo === grupo)
  const hechosGrupo = delGrupo.filter((l) => conseguidos.has(l.id)).length
  // Los ocultos que aun no tienes se juntan en UNA casilla. Pintados uno a uno
  // eran casillas identicas ("Logro oculto"): en "Por donde cae" salian nueve
  // seguidas y el bloque entero parecia un error.
  const visibles = delGrupo.filter((l) => !(l.oculto && !conseguidos.has(l.id)))
  const ocultos = delGrupo.length - visibles.length

  const ir = (d: number) => {
    sfx.boton()
    setPagina(Math.max(0, Math.min(GRUPOS.length - 1, pagina + d)))
  }

  return (
    // El fondo va SOLIDO desde el primer fotograma. Antes el panel entero
    // entraba desde opacity 0, asi que mientras duraba el fundido se veian las
    // dos pantallas superpuestas: el listado encima del menu, con el titulo y
    // los botones transparentandose por debajo. Parecia un parpadeo.
    // Quien anima ahora es el contenido, con .nmc-panel en index.css.
    <div
      className="nmc-panel"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        background: '#0c0c0d',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          flexShrink: 0,
          padding: '14px 16px 10px',
          borderBottom: '1px solid rgba(224,184,77,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ ...pixel, fontWeight: 400, fontSize: 22, color: COLOR.oro }}>Logros</div>
          <div style={{ ...pixel, fontWeight: 500, fontSize: 13, color: COLOR.apagado, marginTop: 2 }}>
            {hechos} de {total}
          </div>
        </div>
        <button
          onClick={() => { sfx.boton(); onCerrar() }}
          aria-label="Cerrar"
          style={{
            width: 38,
            height: 38,
            border: 'none',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.08)',
            color: COLOR.texto,
            fontSize: 20,
            lineHeight: 1,
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>

      <div
        style={{
          flexShrink: 0,
          padding: '12px 14px 6px',
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            ...pixel,
            fontWeight: 500,
            fontSize: 13,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: COLOR.oro,
          }}
        >
          {grupo}
        </div>
        <div style={{ ...pixel, fontWeight: 500, fontSize: 13, color: COLOR.apagado }}>
          {hechosGrupo}/{delGrupo.length}
        </div>
      </div>

      {/* Centrado a proposito: hay bloques de doce y bloques de dos, y un
          bloque de dos pegado arriba con el resto de la pantalla vacia parece
          que falta algo. Centrado parece lo que es. */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 7,
          alignContent: 'center',
          padding: '0 14px 10px',
          boxSizing: 'border-box',
        }}
      >
        {visibles.map((l) => {
          const hecho = conseguidos.has(l.id)
          return (
            <button
              key={l.id}
              onClick={() => { sfx.boton(); setAbierto(l) }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                minWidth: 0,
                padding: '8px 9px',
                background: hecho ? 'rgba(224,184,77,0.08)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${hecho ? 'rgba(224,184,77,0.3)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 9,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  flexShrink: 0,
                  borderRadius: '50%',
                  background: hecho ? COLOR.oro : 'rgba(255,255,255,0.1)',
                  color: '#1a1a1a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {hecho ? '✓' : ''}
              </span>
              <span
                style={{
                  ...pixel,
                  fontWeight: 500,
                  fontSize: 12,
                  lineHeight: 1.2,
                  color: hecho ? COLOR.texto : '#6b6558',
                  minWidth: 0,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 2,
                }}
              >
                {l.nombre}
              </span>
            </button>
          )
        })}
        {ocultos > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 9px',
              border: '1px dashed rgba(255,255,255,0.12)',
              borderRadius: 9,
              ...pixel,
              fontWeight: 500,
              fontSize: 12,
              lineHeight: 1.2,
              color: '#5c5750',
            }}
          >
            {ocultos} {ocultos === 1 ? 'oculto' : 'ocultos'} por descubrir
          </div>
        )}
      </div>

      <div
        style={{
          flexShrink: 0,
          padding: '4px 14px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
        }}
      >
        <button onClick={() => ir(-1)} disabled={pagina === 0} style={flecha(pagina === 0)}>
          ‹
        </button>
        <div style={{ ...pixel, fontWeight: 500, fontSize: 13, color: COLOR.apagado }}>
          {pagina + 1} / {GRUPOS.length}
        </div>
        <button
          onClick={() => ir(1)}
          disabled={pagina >= GRUPOS.length - 1}
          style={flecha(pagina >= GRUPOS.length - 1)}
        >
          ›
        </button>
      </div>

      {abierto && (
        <div
          onClick={() => setAbierto(null)}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 50,
            background: 'rgba(0,0,0,0.78)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: COLOR.panel,
              border: `1px solid ${conseguidos.has(abierto.id) ? 'rgba(224,184,77,0.45)' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: 14,
              padding: '16px 18px',
              maxWidth: 320,
              width: '100%',
              boxSizing: 'border-box',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                ...pixel,
                fontWeight: 400,
                fontSize: 19,
                color: conseguidos.has(abierto.id) ? COLOR.oro : COLOR.texto,
              }}
            >
              {abierto.nombre}
            </div>
            <div
              style={{
                ...pixel,
                fontWeight: 500,
                fontSize: 14,
                lineHeight: 1.4,
                color: COLOR.apagado,
                margin: '8px 0 4px',
              }}
            >
              {abierto.desc}
            </div>
            <div style={{ ...pixel, fontWeight: 500, fontSize: 12.5, color: '#6b6558' }}>
              {conseguidos.has(abierto.id) ? 'Conseguido' : 'Todavía no'}
            </div>
            <button
              onClick={() => { sfx.boton(); setAbierto(null) }}
              style={{
                ...pixel,
                marginTop: 14,
                width: '100%',
                background: 'none',
                border: `1px solid ${COLOR.oro}`,
                borderRadius: 8,
                padding: '7px 16px',
                fontWeight: 400,
                fontSize: 15,
                color: COLOR.oro,
                cursor: 'pointer',
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function flecha(apagada: boolean) {
  return {
    ...pixel,
    width: 42,
    height: 32,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: apagada ? '#3d3a35' : COLOR.oro,
    fontSize: 20,
    lineHeight: 1,
    cursor: apagada ? 'default' : 'pointer',
  } as const
}
