import { useEffect, useRef, useState } from 'react'
import { useTransform, type MotionValue } from 'framer-motion'
import type { Card, Stats } from '../types'
import { EffectPips } from './EffectPips'
import { StatIcon } from './StatIcon'
import { SWIPE_REVEAL_DISTANCE } from './SwipeCard'
import { STAT_MAX, TURNOS_DE_GRACIA } from '../data/cards'

// Barra de nivel: un segmento por punto (0 a STAT_MAX). El relleno del icono
// es bonito pero NO se puede comparar entre indicadores: como cada silueta
// tiene una forma distinta, el mismo nivel ocupa áreas muy distintas y "medio
// bocadillo" no parece lo mismo que "medio templo". Esto se lee igual en los
// cuatro y dice exactamente cuántos puntos quedan, que es lo que importa
// cuando estás en rojo: el aviso salta a 1 punto, pero se muere a 0.
function LevelBar({
  value,
  critical,
  desde,
  pulso,
}: {
  value: number
  critical: boolean
  // Valor que tenia ANTES de la ultima decision (null = no hay nada que
  // resaltar). Los segmentos entre los dos valores destellan un momento.
  desde: number | null
  pulso: number
}) {
  const lo = desde === null ? -1 : Math.min(value, desde)
  const hi = desde === null ? -1 : Math.max(value, desde)
  const subio = desde !== null && value > desde
  return (
    // El margen lateral es lo que separa visualmente las cuatro barras: sin
    // él se leen como una única tira de 40 segmentos y no se ve dónde acaba
    // un indicador y empieza el siguiente.
    <div style={{ display: 'flex', gap: 1.5, margin: '5px 11px 0', height: 6 }}>
      {Array.from({ length: STAT_MAX }, (_, i) => {
        const movido = i >= lo && i < hi
        return (
          // La `key` lleva el numero de pulso a proposito: al cambiar, React
          // remonta el segmento y la animacion vuelve a empezar. Sin eso, dos
          // decisiones seguidas sobre la misma barra solo destellarian una vez.
          <div
            key={movido ? `${i}-${pulso}` : i}
            style={{
              flex: 1,
              borderRadius: 1,
              background:
                i < value ? (critical ? '#ff4d4d' : '#e0b84d') : 'rgba(255,255,255,0.14)',
              animation: movido
                ? `${subio ? 'nmc-gana' : 'nmc-pierde'} 620ms ease-out`
                : undefined,
            }}
          />
        )
      })}
    </div>
  )
}

// Qué mide cada barra y quién la mueve. Es el corazón del juego (como en
// Reigns: ves quién habla y ya sabes qué te juegas), pero hasta ahora vivía
// solo en el README. Ahora se toca el icono y lo dice.
const INFO: Record<keyof Stats, { label: string; que: string; quien: string }> = {
  medios: {
    label: 'Medios',
    que: 'El relato: lo que se publica y lo que se calla.',
    quien: 'El Periodista · El Jefe de Comunicación · El Escudero · El Juez',
  },
  gobierno: {
    label: 'Gobierno',
    que: 'La coalición: que tus socios no te suelten la mano.',
    quien: 'La Vicepresidenta · La Socia Incómoda · El Exiliado · El Independentista · El Expresidente · La Ministra · La Ministra de Igualdad',
  },
  calle: {
    label: 'Calle',
    que: 'La gente: encuestas, manifestaciones, la conversación del bar.',
    quien: 'El Encuestador · El Cruzado · La Presidenta Regional · La Oposición',
  },
  caja: {
    label: 'Caja B',
    que: 'El dinero opaco: sobres, mordidas, lo que no se declara.',
    quien: 'El Ministro Caído · El Hermano · El Gurú · La Primera Dama',
  },
}

const ITEMS = ['medios', 'gobierno', 'calle', 'caja'] as const

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
  // Meses seguidos con algun indicador en el extremo. Sirve para decir cuantos
  // quedan antes de que caiga el gobierno (ver TURNOS_DE_GRACIA).
  extremeStreak: number
  // Con la partida acabada las barras se quedan como registro del estado final,
  // pero sin cuenta atras: prometeria meses que ya no existen.
  acabada?: boolean
}

export function StatBars({ stats, card, x, extremeStreak, acabada }: Props) {
  // Mismos umbrales que usa la carta para revelar el texto de cada lado al
  // arrastrar, así los puntos de arriba aparecen exactamente a la vez.
  const fadeStart = SWIPE_REVEAL_DISTANCE / 4
  const leftOpacity = useTransform(x, [-SWIPE_REVEAL_DISTANCE, -fadeStart, 0], [1, 0, 0])
  const rightOpacity = useTransform(x, [0, fadeStart, SWIPE_REVEAL_DISTANCE], [0, 0, 1])

  // Qué barra tiene abierta la explicación (null = ninguna). Se toca el icono.
  const [abierto, setAbierto] = useState<keyof Stats | null>(null)

  // Tras cada decisión, destellan los segmentos que se han movido. Al deslizar,
  // las barras saltaban de golpe y era fácil no enterarse de qué te había
  // costado la carta, sobre todo leyendo ya la siguiente.
  const anterior = useRef<Stats | null>(null)
  const [pulso, setPulso] = useState<{ id: number; prev: Stats } | null>(null)
  useEffect(() => {
    const prev = anterior.current
    anterior.current = { ...stats }
    if (!prev || ITEMS.every((k) => prev[k] === stats[k])) return
    const id = Date.now()
    setPulso({ id, prev })
    const t = window.setTimeout(() => setPulso((p) => (p?.id === id ? null : p)), 700)
    return () => window.clearTimeout(t)
  }, [stats])

  return (
    <div style={{ flexShrink: 0, position: 'relative', zIndex: 20 }}>
      <div
        style={{
          display: 'flex',
          background: '#111113',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '12px 4px 10px',
        }}
      >
        {ITEMS.map((key) => {
          const label = INFO[key].label
          // Crítico por ambos lados: tocar fondo (0) Y tocar techo (10) acaban
          // mal (ver los finales "_max" en cards.ts). El rojo salta solo a un
          // paso del final (<=1 o >=9), para que "rojo" signifique de verdad
          // "otra más y pierdes" y no "vas calentito".
          const critical = stats[key] <= 1 || stats[key] >= 9
          // Reventado = ya esta en el extremo y corre la prorroga. Distinto de
          // critical, que es solo "a un paso".
          const reventado = !acabada && (stats[key] <= 0 || stats[key] >= STAT_MAX)
          const quedan = TURNOS_DE_GRACIA - extremeStreak
          const movido = Boolean(pulso && pulso.prev[key] !== stats[key])
          const subioIcono = Boolean(pulso && stats[key] > pulso.prev[key])
          const leftVal = card?.left.effects[key] ?? 0
          const rightVal = card?.right.effects[key] ?? 0
          return (
            <button
              key={key}
              type="button"
              onClick={() => setAbierto((a) => (a === key ? null : key))}
              aria-label={`${label}: ${stats[key]}. Qué es`}
              style={{
                flex: 1,
                textAlign: 'center',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Los puntos de efecto se superponen sobre el icono al arrastrar
                  (position:absolute), así que el icono no salta al aparecer. */}
              <div
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  lineHeight: 0,
                  // El icono acusa el golpe junto con los segmentos de la
                  // barra: un respingo hacia arriba si sube, un bajon si baja.
                  // La `key` del contenedor lleva el pulso para que React lo
                  // remonte y la animacion reempiece en decisiones seguidas.
                  animation: movido
                    ? `${subioIcono ? 'nmc-icono-sube' : 'nmc-icono-baja'} 480ms ease-out`
                    : undefined,
                }}
                key={movido ? `ico-${pulso?.id}` : 'ico'}
              >
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
              <LevelBar
                value={stats[key]}
                critical={critical}
                desde={pulso && pulso.prev[key] !== stats[key] ? pulso.prev[key] : null}
                pulso={pulso?.id ?? 0}
              />
              {/* Etiqueta de texto: los iconos solos no siempre se entienden.
                  Salvo cuando este indicador ya ha reventado: ahi importa mas
                  cuanto queda que como se llama, y el icono ya dice cual es.
                  Sin esto, "voy justo" (rojo a 1 o 9) y "ya he reventado y me
                  quedan dos meses" se veian exactamente igual. */}
              <div
                style={{
                  fontFamily: 'var(--font-pixel)',
                  fontWeight: 500,
                  fontSize: 14,
                  letterSpacing: 0.4,
                  lineHeight: 1,
                  marginTop: 4,
                  color: reventado
                    ? '#ff4d4d'
                    : critical
                      ? '#ff6b6b'
                      : abierto === key
                        ? '#e0b84d'
                        : '#a8a08c',
                  // Parpadeo solo en el ultimo mes: si parpadeara siempre que
                  // hay prorroga, dejaria de significar "ahora SI".
                  animation: reventado && quedan <= 1 ? 'nmc-alarma 900ms steps(2) infinite' : undefined,
                }}
              >
                {reventado ? (quedan <= 1 ? 'ÚLTIMO MES' : `${quedan} MESES`) : label}
              </div>
            </button>
          )
        })}
      </div>

      {abierto && (
        <>
          {/* Cierra al tocar fuera; oscurece un poco para que el panel destaque. */}
          <div
            onClick={() => setAbierto(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 19, background: 'rgba(0,0,0,0.35)' }}
          />
          <div
            style={{
              position: 'absolute',
              left: 8,
              right: 8,
              top: '100%',
              marginTop: 6,
              zIndex: 21,
              background: '#17171a',
              border: '1px solid rgba(224,184,77,0.35)',
              borderRadius: 12,
              padding: '12px 14px',
              boxShadow: '0 12px 30px rgba(0,0,0,0.55)',
              fontFamily: 'var(--font-pixel)',
              textAlign: 'left',
            }}
          >
            <div style={{ fontWeight: 500, fontSize: 15, color: '#e0b84d', marginBottom: 4 }}>
              {INFO[abierto].label}
            </div>
            <div style={{ fontWeight: 500, fontSize: 15, lineHeight: 1.35, color: '#e8e2d4' }}>
              {INFO[abierto].que}
            </div>
            <div
              style={{
                fontWeight: 500,
                fontSize: 13,
                lineHeight: 1.4,
                color: '#8a8272',
                marginTop: 6,
              }}
            >
              Lo mueven: {INFO[abierto].quien}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
