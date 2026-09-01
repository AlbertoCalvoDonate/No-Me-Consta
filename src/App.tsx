import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue } from 'framer-motion'
import { useGameStore } from './hooks/useGameStore'
import { SwipeCard } from './components/SwipeCard'
import { StatBars } from './components/StatBars'
import { SituationBanner } from './components/SituationBanner'
import { BottomBar } from './components/BottomBar'
import { StartScreen } from './components/StartScreen'
import { StatIcon } from './components/StatIcon'
import type { StatKey } from './types'
import { epitetoDe } from './data/epitetos'
import { sfx } from './utils/sfx'
import { corruptionScore } from './components/SwipeCard'

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
  const { stats, turn, gameOver, deathReason, deathStat, moralidad, currentCard, choose, restart } =
    useGameStore()

  // Posición de arrastre de la carta actual, compartida con StatBars para
  // que las flechas de efecto se vean arriba, sobre el icono de cada stat,
  // en tiempo real conforme se mueve la carta (sin re-renders de React:
  // framer-motion actualiza esto fuera del ciclo de render).
  // Solo para repintar el boton del altavoz; la fuente de verdad vive en sfx.
  const [sonido, setSonido] = useState(sfx.activo())

  // El sonido va aqui y no en el store a proposito: es presentacion, no reglas
  // del juego. Suena segun lo turbia que sea la opcion elegida, usando el
  // mismo criterio con el que la carta pinta el panel de rojo o de verde.
  const elegir = (side: 'left' | 'right') => {
    const propia = corruptionScore(currentCard[side].effects)
    const otra = corruptionScore(currentCard[side === 'left' ? 'right' : 'left'].effects)
    if (propia > otra) sfx.moneda()
    else if (propia < otra) sfx.campana()
    else sfx.papel()
    choose(side)
  }

  const x = useMotionValue(0)
  useEffect(() => {
    // stop(): por si quedaba viva la animación de rebote del arrastre
    // anterior sobre esta MotionValue compartida (ver SwipeCard.handleDragEnd).
    x.stop()
    x.set(0)
  }, [currentCard.id, x])

  // Fin de partida: trombon triste, o fanfarria si aguanto las tres
  // legislaturas (los finales de la ultima convocatoria son isElection).
  useEffect(() => {
    if (!gameOver) return
    if (currentCard.isElection && turn > 100) sfx.triunfo()
    else sfx.trombon()
  }, [gameOver, currentCard, turn])

  // Cartas de hito: el balance de fin de ano y la noche electoral se anuncian.
  useEffect(() => {
    if (gameOver) return
    if (currentCard.isElection) sfx.eleccion()
    else if (currentCard.isRecap) sfx.balance()
  }, [currentCard, gameOver])

  // Aviso al entrar una barra en zona critica (el mismo umbral que las pinta
  // de rojo). Solo al ENTRAR: si no, pitaria en cada carta mientras dure.
  const criticas = (['medios', 'gobierno', 'calle', 'caja'] as StatKey[]).filter(
    (k) => stats[k] <= 1 || stats[k] >= 9
  ).length
  const criticasPrevias = useRef(0)
  useEffect(() => {
    if (!gameOver && criticas > criticasPrevias.current) sfx.alarma()
    criticasPrevias.current = criticas
  }, [criticas, gameOver])

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
            position: 'relative',
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
              onStart={() => {
                restart()
                setStarted(true)
              }}
            />
          )}

          {/* Altavoz para silenciar. Arriba a la derecha y discreto: tiene que
              estar a mano desde el primer momento, pero sin robar atencion. */}
          <button
            onClick={() => setSonido(sfx.alternar())}
            aria-label={sonido ? 'Silenciar' : 'Activar sonido'}
            style={{
              position: 'absolute',
              top: 8,
              right: 10,
              zIndex: 10,
              width: 34,
              height: 34,
              border: 'none',
              borderRadius: 8,
              background: 'rgba(0,0,0,0.35)',
              color: sonido ? '#e0b84d' : '#6b6656',
              fontSize: 17,
              lineHeight: 1,
              cursor: 'pointer',
            }}
          >
            {sonido ? '🔊' : '🔇'}
          </button>

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
                  <SwipeCard key={currentCard.id} card={currentCard} onChoose={elegir} x={x} />
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
                      overflow: 'hidden',
                    }}
                  >
                    {/* Dos zonas: el relato se desplaza si hace falta, y el
                        botón vive FUERA de esa zona, así que no se sale nunca.
                        Antes todo iba junto con overflow:hidden y
                        justifyContent:center, que cuando el texto no cabía lo
                        recortaba por arriba Y por abajo y se llevaba el botón
                        por delante (medido: en 360x640 pasaba con 54 de los 64
                        epílogos del juego). El `margin:auto` centra el relato
                        cuando sobra sitio. */}
                    <div
                      style={{
                        flex: 1,
                        minHeight: 0,
                        width: '100%',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'safe center',
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
                    {/* Cómo le recordarán: el único momento en que se
                        enseña la moralidad acumulada, y sin número — solo el
                        título que se ha ganado, como los apodos que la
                        historia les colgaba a los reyes. */}
                    <div
                      style={{
                        margin: '0',
                        paddingTop: 14,
                        borderTop: '1px solid rgba(224,184,77,0.22)',
                        width: '100%',
                      }}
                    >
                      <div
                        style={{
                          fontFamily: 'var(--font-pixel)',
                          fontWeight: 500,
                          fontSize: 14,
                          letterSpacing: 0.4,
                          color: '#8a8272',
                        }}
                      >
                        LOS LIBROS LE LLAMARÁN
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-pixel)',
                          fontWeight: 400,
                          fontSize: 25,
                          lineHeight: 1.25,
                          color: '#e0b84d',
                          margin: '4px 0 5px',
                        }}
                      >
                        {epitetoDe(moralidad).nombre}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-pixel)',
                          fontWeight: 500,
                          fontSize: 15,
                          lineHeight: 1.35,
                          color: '#9a927f',
                        }}
                      >
                        {epitetoDe(moralidad).nota}
                      </div>
                    </div>
                    </div>
                    </div>
                    <button
                      onClick={() => restart()}
                      style={{
                        flexShrink: 0,
                        marginTop: 14,
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
