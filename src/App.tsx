import { useEffect, useState } from 'react'
import { motion, useMotionValue } from 'framer-motion'
import { useGameStore } from './hooks/useGameStore'
import { SwipeCard } from './components/SwipeCard'
import { StatBars } from './components/StatBars'
import { SituationBanner } from './components/SituationBanner'
import { BottomBar } from './components/BottomBar'
import { StartScreen } from './components/StartScreen'
import { StatIcon } from './components/StatIcon'
import type { StatKey } from './types'

const STAT_LABEL: Record<StatKey, string> = {
  medios: 'Medios',
  gobierno: 'Gobierno',
  calle: 'Calle',
  caja: 'Caja B',
}

export default function App() {
  // Pantalla de inicio: solo se ve una vez al cargar la web, no vuelve a
  // salir al reiniciar partida (restart lleva directo a jugar de nuevo).
  const [started, setStarted] = useState(false)
  const { stats, turn, gameOver, deathReason, deathStat, currentCard, choose, restart } =
    useGameStore()

  // Posición de arrastre de la carta actual, compartida con StatBars para
  // que las flechas de efecto se vean arriba, sobre el icono de cada stat,
  // en tiempo real conforme se mueve la carta (sin re-renders de React:
  // framer-motion actualiza esto fuera del ciclo de render).
  const x = useMotionValue(0)
  useEffect(() => {
    // stop(): por si quedaba viva la animación de rebote del arrastre
    // anterior sobre esta MotionValue compartida (ver SwipeCard.handleDragEnd).
    x.stop()
    x.set(0)
  }, [currentCard.id, x])

  return (
    <>
      {/* Este juego está pensado solo para móvil en vertical: si el
          viewport está en horizontal, se oculta el juego y se pide girar. */}
      <div className="rotate-overlay">
        <div>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📱↻</div>
          <p style={{ maxWidth: 280, lineHeight: 1.5, fontFamily: 'var(--font-pixel)', fontWeight: 500, fontSize: 22 }}>
            Este juego es solo para móvil, en vertical. Gira tu dispositivo para jugar.
          </p>
        </div>
      </div>

      <div className="phone-frame-outer">
        <div
          className="phone-frame"
          style={{
            display: 'flex',
            flexDirection: 'column',
            // Patrón de banderitas (estilo monograma) por encima del degradado,
            // así se ve también en móvil, donde el marco llena la pantalla.
            backgroundColor: '#0a0a0b',
            backgroundImage:
              "url('/bg-flags.svg'), radial-gradient(circle at top, #2c2c2e, #0a0a0b)",
            backgroundRepeat: 'repeat, no-repeat',
            backgroundSize: '150px 130px, cover',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {!started && (
            <StartScreen
              onStart={(mode) => {
                restart(mode)
                setStarted(true)
              }}
            />
          )}

          {started && (
            <>
              <StatBars stats={stats} card={!gameOver ? currentCard : undefined} x={x} />

              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {!gameOver && <SituationBanner text={currentCard.text} />}

                {/* Sin AnimatePresence a propósito: con ella, al cambiar de
                    key React mantenía montada la carta saliente un frame de
                    más (a la espera de una animación de salida que no
                    existe), y se veían solapadas las dos cartas — nombre de
                    personaje y panel de texto de ambas a la vez. Con un
                    condicional normal, React sustituye la carta en el mismo
                    commit, tal cual pide el comentario de más abajo. */}
                {!gameOver ? (
                  <SwipeCard key={currentCard.id} card={currentCard} onChoose={choose} x={x} />
                ) : (
                  <motion.div
                    key="gameover"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                      flex: 1,
                      minHeight: 0,
                      margin: '12px 10px',
                      background: '#1c1c1e',
                      borderRadius: 16,
                      padding: '16px 18px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      color: '#f2f2f2',
                      // Scroll en vez de recorte, y centrado con `margin:auto`
                      // en el contenido en lugar de `justifyContent:center`:
                      // con center + overflow, cuando el contenido no cabe se
                      // corta por ARRIBA Y POR ABAJO y el botón de reiniciar
                      // desaparecía (medido: en 360x640 pasaba con 54 de los
                      // 64 epílogos). Con `margin:auto` se centra si sobra
                      // sitio y se puede desplazar si falta.
                      overflowY: 'auto',
                    }}
                  >
                    <div style={{ margin: 'auto 0', width: '100%' }}>
                    <h2
                      style={{
                        color: '#ff4d4d',
                        marginBottom: 12,
                        marginTop: 0,
                        fontFamily: 'var(--font-pixel)',
                        fontWeight: 400,
                        fontSize: 27,
                        lineHeight: 1.3,
                      }}
                    >
                      Fin del gobierno
                    </h2>
                    <p
                      style={{
                        lineHeight: 1.45,
                        margin: '0 0 16px',
                        fontFamily: 'var(--font-pixel)',
                        fontWeight: 500,
                        fontSize: 19,
                      }}
                    >
                      {deathReason}
                    </p>
                    {/* Qué indicador se rompió. En Reigns la pantalla de
                        muerte siempre te dice qué pilar falló: es lo que te
                        enseña a jugar mejor la próxima. */}
                    {deathStat && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          margin: '0 auto 14px',
                          width: 'fit-content',
                          padding: '8px 14px',
                          borderRadius: 10,
                          background: 'rgba(255,77,77,0.12)',
                          border: '1px solid rgba(255,77,77,0.35)',
                        }}
                      >
                        <StatIcon statKey={deathStat} value={stats[deathStat]} critical size={30} />
                        <span
                          style={{
                            fontFamily: 'var(--font-pixel)',
                            fontWeight: 500,
                            fontSize: 19,
                            color: '#ff9b9b',
                          }}
                        >
                          {STAT_LABEL[deathStat]}
                          {stats[deathStat] <= 0 ? ' por los suelos' : ' por las nubes'}
                        </span>
                      </div>
                    )}
                    <p
                      style={{
                        color: '#888',
                        fontSize: 16,
                        lineHeight: 1.4,
                        margin: '0 0 18px',
                        fontFamily: 'var(--font-pixel)',
                        fontWeight: 500,
                      }}
                    >
                      Duró {turn - 1} {turn - 1 === 1 ? 'mes' : 'meses'} en el cargo
                      {turn - 1 >= 12 ? ` (${(( turn - 1) / 12).toFixed(1)} años)` : ''}.
                    </p>
                    <button
                      onClick={() => restart()}
                      style={{
                        background: '#e0b84d',
                        border: 'none',
                        borderRadius: 8,
                        padding: '12px 18px',
                        fontFamily: 'var(--font-pixel)',
                        fontWeight: 400,
                        fontSize: 21,
                        cursor: 'pointer',
                      }}
                    >
                      Nueva legislatura
                    </button>
                    </div>
                  </motion.div>
                )}
              </div>

              <BottomBar turn={turn} />
            </>
          )}
        </div>
      </div>
    </>
  )
}
