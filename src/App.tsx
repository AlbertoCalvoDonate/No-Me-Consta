import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useMotionValue } from 'framer-motion'
import { useGameStore } from './hooks/useGameStore'
import { SwipeCard } from './components/SwipeCard'
import { StatBars } from './components/StatBars'
import { SituationBanner } from './components/SituationBanner'
import { BottomBar } from './components/BottomBar'
import { StartScreen } from './components/StartScreen'

export default function App() {
  // Pantalla de inicio: solo se ve una vez al cargar la web, no vuelve a
  // salir al reiniciar partida (restart lleva directo a jugar de nuevo).
  const [started, setStarted] = useState(false)
  const { stats, turn, gameOver, deathReason, currentCard, choose, restart } = useGameStore()

  // Posición de arrastre de la carta actual, compartida con StatBars para
  // que las flechas de efecto se vean arriba, sobre el icono de cada stat,
  // en tiempo real conforme se mueve la carta (sin re-renders de React:
  // framer-motion actualiza esto fuera del ciclo de render).
  const x = useMotionValue(0)
  useEffect(() => {
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
            background: 'radial-gradient(circle at top, #2c2c2e, #0a0a0b)',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {!started && <StartScreen onStart={() => setStarted(true)} />}

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

                <AnimatePresence>
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
                        margin: '16px 24px',
                        background: '#1c1c1e',
                        borderRadius: 16,
                        padding: 24,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        textAlign: 'center',
                        color: '#f2f2f2',
                        overflow: 'hidden',
                      }}
                    >
                      <h2
                        style={{
                          color: '#ff4d4d',
                          marginBottom: 16,
                          fontFamily: 'var(--font-pixel)',
                          fontWeight: 700,
                          fontSize: 30,
                          lineHeight: 1.35,
                        }}
                      >
                        Fin del reinado
                      </h2>
                      <p
                        style={{
                          lineHeight: 1.5,
                          marginBottom: 24,
                          fontFamily: 'var(--font-pixel)',
                          fontWeight: 500,
                          fontSize: 21,
                        }}
                      >
                        {deathReason}
                      </p>
                      <p
                        style={{
                          color: '#888',
                          fontSize: 18,
                          lineHeight: 1.5,
                          marginBottom: 24,
                          fontFamily: 'var(--font-pixel)',
                          fontWeight: 500,
                        }}
                      >
                        Duró {turn - 1} {turn - 1 === 1 ? 'decisión' : 'decisiones'} en el cargo.
                      </p>
                      <button
                        onClick={restart}
                        style={{
                          background: '#e0b84d',
                          border: 'none',
                          borderRadius: 8,
                          padding: '12px 18px',
                          fontFamily: 'var(--font-pixel)',
                          fontWeight: 700,
                          fontSize: 21,
                          cursor: 'pointer',
                        }}
                      >
                        Nueva legislatura
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <BottomBar turn={turn} />
            </>
          )}
        </div>
      </div>
    </>
  )
}
