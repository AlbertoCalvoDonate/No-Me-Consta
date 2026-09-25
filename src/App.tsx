import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { motion, useMotionValue } from 'framer-motion'
import { useGameStore } from './hooks/useGameStore'
import { SwipeCard } from './components/SwipeCard'
import { StatBars } from './components/StatBars'
import { SituationBanner, type BannerKind } from './components/SituationBanner'
import { cards, ELECTION_INTERVAL, ELECTION_MAX_TERMS } from './data/cards'
import { BottomBar } from './components/BottomBar'
import { StartScreen } from './components/StartScreen'
import { SoundButton } from './components/SoundButton'
import { StatIcon } from './components/StatIcon'
import type { StatKey } from './types'
import { epitetoDe } from './data/epitetos'
import { sfx } from './utils/sfx'
import { haptics } from './utils/haptics'
import { registrarPartida } from './hooks/useLogros'
import type { Logro } from './data/logros'
import { LogroToast } from './components/LogroToast'
import { LogrosPanel } from './components/LogrosPanel'
import { RepartoPanel } from './components/RepartoPanel'
import { corruptionScore } from './components/SwipeCard'
import { hayPartidaEnCurso } from './hooks/persistPartida'
import { textoResultado, compartirResultado } from './utils/compartir'
import { COLOR, pixel } from './utils/estilo'
import { precargarRetratos } from './utils/precarga'
import { REPARTO } from './data/reparto'
import { PantallaCarga } from './components/PantallaCarga'
import { musica } from './utils/musica'

const STAT_LABEL: Record<StatKey, string> = {
  medios: 'Medios',
  gobierno: 'Gobierno',
  calle: 'Calle',
  caja: 'Caja B',
}

// Cómo cayó el gobierno, en una línea, para el texto de compartir. Solo los
// finales que NO son "una barra a 0" (esos ya dicen qué pilar reventó).
const CAUSA_COMPARTIR: Record<string, string> = {
  final_evento_mocion: 'Me tumbaron con una moción de censura.',
  final_evento_ruptura: 'Se rompió la coalición y me quedé solo.',
  final_evento_registro: 'Vinieron a registrar a las seis de la mañana.',
  elecciones_derrota: 'Perdí las elecciones.',
  elecciones_quemado_final: 'Doce años y me quemé: ni me presenté.',
  elecciones_retirada_final: 'Me retiré tras doce años en el cargo.',
  elecciones_leyenda_final: 'Me retiré invicto, tras doce años.',
}

// Ilustración de la pantalla de fin: una escena por indicador y dirección
// (techo/fondo), más específicas para los finales que no son "una barra a 0"
// (electorales) o que encajan mejor con SU texto en concreto que la genérica
// de su indicador ("final_partido_alta" es literalmente el Comité Ejecutivo).
const ILUSTRACION_ESPECIFICA: Record<string, string> = {
  final_partido_alta: 'comite.webp',
  elecciones_derrota: 'nocheelectoral.webp',
  elecciones_triunfo: 'nocheelectoral.webp',
  elecciones_quemado_final: 'nocheelectoral.webp',
  elecciones_retirada_final: 'nocheelectoral.webp',
  elecciones_leyenda_final: 'nocheelectoral.webp',
}
// Los retratos del reparto, que son los que espera la pantalla de carga. Los
// fontaneros no tienen, asi que no entran en la cuenta.
const RETRATOS = REPARTO.map((p) => p.imagen).filter((i): i is string => Boolean(i))

// Las ilustraciones que puede sacar la pantalla de fin, para precargarlas al
// final de la cola (ver ilustracionFin justo debajo).
const ILUSTRACIONES_FIN = [
  'max_medios.webp', 'min_medios.webp', 'max_gobierno.webp', 'min_gobierno.webp',
  'max_pueblo.webp', 'min_pueblo.webp', 'max_cajab.webp', 'min_cajab.webp',
  ...Object.values(ILUSTRACION_ESPECIFICA),
]

function ilustracionFin(endingId: string): string | undefined {
  if (ILUSTRACION_ESPECIFICA[endingId]) return ILUSTRACION_ESPECIFICA[endingId]
  const techo = endingId.includes('_max_')
  if (endingId.startsWith('final_medios')) return techo ? 'max_medios.webp' : 'min_medios.webp'
  if (endingId.startsWith('final_partido')) return techo ? 'max_gobierno.webp' : 'min_gobierno.webp'
  if (endingId.startsWith('final_votantes')) return techo ? 'max_pueblo.webp' : 'min_pueblo.webp'
  if (endingId.startsWith('final_caja')) return techo ? 'max_cajab.webp' : 'min_cajab.webp'
  return undefined
}

// Botones secundarios de la pantalla de fin (compartir / logros).
const botonGameOverSec: CSSProperties = {
  background: 'transparent',
  border: '2px solid rgba(224,184,77,0.45)',
  borderRadius: 8,
  padding: '7px 16px',
  ...pixel,
  fontWeight: 400,
  fontSize: 16,
  color: COLOR.oro,
  cursor: 'pointer',
}

export default function App() {
  // Pantalla de inicio: solo se ve una vez al cargar la web, no vuelve a
  // salir al reiniciar partida (restart lleva directo a jugar de nuevo).
  const [started, setStarted] = useState(false)
  // Entre darle a jugar y la primera carta hay una pantalla de carga que se
  // espera a los 22 retratos. Medido: las quince primeras cartas tocan casi
  // quince personajes distintos, asi que no vale con precargar unos pocos.
  // A cambio, de ahi en adelante toda carta sale al instante.
  const [cargando, setCargando] = useState(false)
  // Las ilustraciones de final NO entran en la espera: no hacen falta hasta
  // que acaba la partida, y para entonces han venido de fondo.
  useEffect(() => {
    if (started) precargarRetratos(ILUSTRACIONES_FIN)
  }, [started])

  // ¿Había una partida a medias en localStorage al cargar? (snapshot al montar;
  // el store ya la ha restaurado — "Continuar" solo tiene que enseñar el juego.)
  const [reanudable] = useState(hayPartidaEnCurso)
  const { stats, turn, gameOver, deathReason, deathStat, moralidad, currentCard, history, flagsVistos, anger, favor, extremeStreak, choose, restart } =
    useGameStore()
  // MUSICA. Tres momentos con tres papeles: el titulo y el final se oyen, y en
  // partida baja mucho para no pelearse con el texto de la carta (ver NIVEL en
  // utils/musica). La primera pieza no puede sonar hasta que el jugador toque
  // algo -los navegadores no dejan-, y aqui eso se cumple solo: la pantalla de
  // inicio no suena hasta que se interactua con ella.
  useEffect(() => {
    musica.reengancharAlVolumen()
    return () => sfx.alCambiarElVolumen(null)
  }, [])
  // En la pantalla de inicio NO hay musica. El navegador no deja sonar nada
  // hasta que el jugador toca algo, asi que una pieza de titulo solo podia
  // entrar a destiempo, despues de un clic que el jugador no dio para eso. La
  // musica empieza cuando empieza la partida, que ahi el gesto ya esta dado y
  // no se nota.
  useEffect(() => {
    if (!started) {
      musica.callar()
      return
    }
    if (cargando) return
    musica.poner(gameOver ? 'final' : 'partida')
  }, [started, cargando, gameOver])

  // Posición de arrastre de la carta actual, compartida con StatBars para
  // que los puntos de efecto se vean arriba, sobre el icono de cada stat,
  // en tiempo real conforme se mueve la carta (sin re-renders de React:
  // framer-motion actualiza esto fuera del ciclo de render).
  const [colaLogros, setColaLogros] = useState<Logro[]>([])
  // Récord anterior a esta partida, para la comparación de la pantalla de fin.
  const [recordPrevio, setRecordPrevio] = useState(0)
  const [verLogros, setVerLogros] = useState(false)
  const [verReparto, setVerReparto] = useState(false)
  const [compartido, setCompartido] = useState<'idle' | 'copiado' | 'error'>('idle')

  // El sonido va aqui y no en el store a proposito: es presentacion, no reglas
  // del juego. Suena segun lo turbia que sea la opcion elegida, usando el
  // mismo criterio con el que la carta pinta el panel de rojo o de verde.
  const elegir = (side: 'left' | 'right') => {
    const propia = corruptionScore(currentCard[side].effects)
    const otra = corruptionScore(currentCard[side === 'left' ? 'right' : 'left'].effects)
    if (propia > otra) sfx.moneda()
    else if (propia < otra) sfx.campana()
    else sfx.papel()
    haptics.eleccion()
    choose(side)
  }

  // Ritmo visual: la carta de hito (elecciones, balance, favor) tiñe el banner
  // y saca una etiqueta arriba, para que se note que no es un turno de trámite.
  const bannerKind: BannerKind = currentCard.isElection
    ? 'eleccion'
    : currentCard.isRecap
      ? 'balance'
      : currentCard.id === 'favor_ganado'
        ? 'favor'
        : 'normal'

  // La carta de favor es genérica; se le pone el nombre (y de rebote el color)
  // del personaje que ahora te debe una: el de la carta que acabas de responder.
  const favorChar =
    currentCard.id === 'favor_ganado'
      ? cards.find((c) => c.id === history[history.length - 1])?.character
      : undefined
  const cartaMostrada = favorChar ? { ...currentCard, character: favorChar } : currentCard

  // La pantalla de fin tiene bastante "chrome" fijo (título, indicador,
  // "duró X meses", epíteto) además del propio epílogo, y a veces una
  // ilustración (ver ilustracionFin). En moviles bajitos (iPhone SE, 375x667;
  // Android de 360x640) los epílogos largos no cabían sin scroll — medido,
  // hasta 108px de sobra en el peor caso (292 caracteres). Con el texto y los
  // márgenes más compactos, cabe entero hasta esa altura; por debajo (320x568)
  // sigue habiendo scroll de último recurso, que para eso está.
  //
  // La ilustración ocupa sitio (~85px): con un epílogo largo no compensa —
  // se prescinde de ella y se prioriza que quepa el texto sin scroll. Con una
  // corta, el modo compacto salta antes (100 en vez de 160 caracteres) para
  // dejarle sitio. Medido igual que el resto, sigue sin hacer falta scroll
  // hasta 360x640.
  const textoLen = deathReason?.length ?? 0
  const imagenDisponible = gameOver ? ilustracionFin(currentCard.id) : undefined
  const ilustracion = imagenDisponible && textoLen <= 190 ? imagenDisponible : undefined
  const modoCompacto = textoLen > (ilustracion ? 65 : 160)

  // La marca a batir. Solo hay algo que decir si ya habías jugado (récord > 0)
  // y no empataste. Cuando queda cerca se dice a cuánto, que pica más que el
  // número pelado.
  const meses = turn - 1
  const esRecord = recordPrevio > 0 && meses > recordPrevio
  const marcaTexto = (() => {
    if (recordPrevio === 0 || meses === recordPrevio) return undefined
    if (esRecord) return `Nuevo récord. Antes eran ${recordPrevio} meses.`
    const faltan = recordPrevio - meses
    if (faltan <= 6) return `A ${faltan} ${faltan === 1 ? 'mes' : 'meses'} de su récord.`
    return `Su récord sigue siendo ${recordPrevio} meses.`
  })()

  // Frase corta de "qué te tumbó" para el compartir. Los finales concretos
  // (moción, registro, urnas...) tienen su línea; los de barra dicen qué pilar
  // reventó; si no, la última frase del epílogo.
  const causaCompartir = (() => {
    const evento = CAUSA_COMPARTIR[currentCard.id]
    if (evento) return evento
    if (deathStat) {
      return `${STAT_LABEL[deathStat]} ${stats[deathStat] <= 0 ? 'por los suelos' : 'por las nubes'}.`
    }
    const m = deathReason?.match(/Fin del gobierno[^.!?]*[.!?]/)
    return m ? m[0] : ''
  })()

  const x = useMotionValue(0)
  useEffect(() => {
    // stop(): por si quedaba viva la animación de rebote del arrastre
    // anterior sobre esta MotionValue compartida (ver SwipeCard.handleDragEnd).
    x.stop()
    x.set(0)
  }, [currentCard.id, x])

  // Fin de partida: trombon triste, o fanfarria si aguanto las tres
  // legislaturas (los finales de la ultima convocatoria son isElection).
  const yaComprobado = useRef(false)
  useEffect(() => {
    if (!gameOver) {
      yaComprobado.current = false
      return
    }
    if (currentCard.isElection && turn >= ELECTION_INTERVAL * ELECTION_MAX_TERMS) sfx.triunfo()
    else {
      sfx.trombon()
      haptics.muerte()
    }
    if (yaComprobado.current) return
    yaComprobado.current = true
    const { nuevos, recordPrevio } = registrarPartida({
      meses: turn - 1,
      moralidad,
      endingId: currentCard.id,
      esEleccion: Boolean(currentCard.isElection),
      porEvento: Boolean(currentCard.byEvent),
      stats,
      cartas: history,
      flags: flagsVistos,
    })
    setRecordPrevio(recordPrevio)
    // El sonido y la vibración de logro los pone LogroToast, uno por uno
    // según van saliendo, no todos de golpe aquí.
    if (nuevos.length) setColaLogros(nuevos)
  }, [gameOver, currentCard, turn, moralidad, stats, history, flagsVistos])

  // Cartas de hito: el balance de fin de ano, la noche electoral y la carta de
  // favor se anuncian con su propio sonido.
  useEffect(() => {
    if (gameOver) return
    if (currentCard.isElection) sfx.eleccion()
    else if (currentCard.isRecap) sfx.balance()
    else if (currentCard.id === 'favor_ganado') sfx.favor()
    // Las cartas de fontanero no encienden los puntos, y eso el jugador solo
    // lo nota si se fija. El sonido se lo dice antes de leer.
    else if (currentCard.sinPistas) sfx.fontanero()
  }, [currentCard, gameOver])

  // Aviso al entrar una barra en zona critica (el mismo umbral que las pinta
  // de rojo). Solo al ENTRAR: si no, pitaria en cada carta mientras dure.
  const criticas = (['medios', 'gobierno', 'calle', 'caja'] as StatKey[]).filter(
    (k) => stats[k] <= 1 || stats[k] >= 9
  ).length
  const criticasPrevias = useRef(0)
  useEffect(() => {
    if (!gameOver && criticas > criticasPrevias.current) {
      sfx.alarma()
      haptics.critico()
    }
    criticasPrevias.current = criticas
  }, [criticas, gameOver])

  return (
    <>
      {/* Este juego está pensado solo para móvil en vertical: si el
          viewport está en horizontal, se oculta el juego y se pide girar. */}
      <div className="rotate-overlay">
        <div>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📱↻</div>
          <p style={{ maxWidth: 280, lineHeight: 1.5, ...pixel, fontWeight: 500, fontSize: 22 }}>
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
          {cargando && (
            <PantallaCarga
              imagenes={RETRATOS}
              onListo={() => {
                setCargando(false)
                setStarted(true)
              }}
            />
          )}

          {!started && !cargando && (
            <StartScreen
              onStart={() => {
                restart()
                musica.barajarPartida()
                setCargando(true)
              }}
              onContinuar={reanudable ? () => setCargando(true) : undefined}
              mesEnCurso={turn}
              onVerLogros={() => setVerLogros(true)}
              onVerReparto={() => setVerReparto(true)}
            />
          )}

          {/* Control de volumen. Durante la partida vive en la barra de abajo
              (BottomBar); en la pantalla de inicio, donde no hay barra, va
              suelto arriba a la derecha, que ahi no tapa nada. */}
          {!started && (
            <div style={{ position: 'absolute', top: 8, right: 10, zIndex: 10 }}>
              <SoundButton />
            </div>
          )}

          {started && (
            <>
              {/* Con la partida acabada las barras se quedan como registro del estado
                  final, pero sin la cuenta atras: "ÚLTIMO MES" parpadeando en una
                  partida que ya ha terminado promete un mes que no existe. */}
              <StatBars
                stats={stats}
                card={!gameOver ? currentCard : undefined}
                x={x}
                extremeStreak={extremeStreak}
                turn={turn}
                acabada={gameOver}
                anger={anger}
                favor={favor}
              />

              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {!gameOver && <SituationBanner text={cartaMostrada.text} kind={bannerKind} />}

                {/* Sin AnimatePresence a propósito: con ella, al cambiar de
                    key React mantenía montada la carta saliente un frame de
                    más (a la espera de una animación de salida que no
                    existe), y se veían solapadas las dos cartas — nombre de
                    personaje y panel de texto de ambas a la vez. Con un
                    condicional normal, React sustituye la carta en el mismo
                    commit, tal cual pide el comentario de más abajo. */}
                {!gameOver ? (
                  <SwipeCard
                    key={currentCard.id}
                    card={cartaMostrada}
                    onChoose={elegir}
                    x={x}
                    enfado={anger[cartaMostrada.character] ?? 0}
                    favorDebido={favor[cartaMostrada.character] ?? 0}
                  />
                ) : (
                  <motion.div
                    key="gameover"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                      flex: 1,
                      minHeight: 0,
                      margin: '12px 10px',
                      background: COLOR.panel,
                      borderRadius: 16,
                      padding: '12px 18px',
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
                    {/* Las piezas del desenlace entran una detras de otra en
                        vez de aparecer todas de golpe: el titular, lo que paso,
                        que barra se rompio, cuanto duro y como le recordaran.
                        Es el momento de la partida que mas se lee, y escalonarlo
                        obliga a leerlo en ese orden. Ver .nmc-desenlace. */}
                    <div className="nmc-desenlace" style={{ margin: 'auto 0', width: '100%' }}>
                    {ilustracion && (
                      <div
                        style={{
                          width: '100%',
                          height: 82,
                          borderRadius: 10,
                          overflow: 'hidden',
                          marginBottom: 10,
                          border: '1px solid rgba(255,255,255,0.12)',
                        }}
                      >
                        <img
                          src={`/characters/${ilustracion}`}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', display: 'block' }}
                        />
                      </div>
                    )}
                    <h2
                      style={{
                        color: COLOR.peligro,
                        marginBottom: modoCompacto ? 6 : 10,
                        marginTop: 0,
                        ...pixel,
                        fontWeight: 400,
                        fontSize: modoCompacto ? 23 : 27,
                        lineHeight: 1.2,
                      }}
                    >
                      Fin del gobierno
                    </h2>
                    <p
                      style={{
                        lineHeight: modoCompacto ? 1.28 : 1.45,
                        margin: modoCompacto ? '0 0 8px' : '0 0 16px',
                        ...pixel,
                        fontWeight: 500,
                        fontSize: modoCompacto ? 16 : 19,
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
                          gap: 8,
                          margin: modoCompacto ? '0 auto 8px' : '0 auto 14px',
                          width: 'fit-content',
                          padding: modoCompacto ? '5px 12px' : '8px 14px',
                          borderRadius: 10,
                          background: 'rgba(255,77,77,0.12)',
                          border: '1px solid rgba(255,77,77,0.35)',
                        }}
                      >
                        <StatIcon statKey={deathStat} value={stats[deathStat]} critical size={modoCompacto ? 22 : 30} />
                        <span
                          style={{
                            ...pixel,
                            fontWeight: 500,
                            fontSize: modoCompacto ? 16 : 19,
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
                        fontSize: modoCompacto ? 14 : 16,
                        lineHeight: 1.3,
                        margin: modoCompacto ? '0 0 8px' : '0 0 18px',
                        ...pixel,
                        fontWeight: 500,
                      }}
                    >
                      Duró {turn - 1} {turn - 1 === 1 ? 'mes' : 'meses'} en el cargo
                      {turn - 1 >= 12 ? ` (${(( turn - 1) / 12).toFixed(1)} años)` : ''}.
                    </p>
                    {/* La marca a batir, como en Reigns: enfrentarte a tu propio
                        récord justo al morir es media razón para volver a darle.
                        En la primera partida no hay con qué comparar, y si lo
                        clavaste tampoco hay nada que decir: se calla. */}
                    {marcaTexto && (
                      <p
                        style={{
                          color: esRecord ? COLOR.oro : COLOR.apagado,
                          // En compacto va más apretada a propósito: medido a
                          // 360x640, con los valores de siempre quince finales
                          // se pasaban por 5px y obligaban a hacer scroll.
                          fontSize: modoCompacto ? 12 : 13,
                          lineHeight: modoCompacto ? 1.2 : 1.3,
                          margin: modoCompacto ? '-7px 0 6px' : '-12px 0 18px',
                          ...pixel,
                          fontWeight: 500,
                        }}
                      >
                        {marcaTexto}
                      </p>
                    )}
                    {/* Cómo le recordarán: el único momento en que se
                        enseña la moralidad acumulada, y sin número — solo el
                        título que se ha ganado, como los apodos que la
                        historia les colgaba a los reyes. */}
                    <div
                      style={{
                        margin: '0',
                        paddingTop: modoCompacto ? 8 : 14,
                        borderTop: '1px solid rgba(224,184,77,0.22)',
                        width: '100%',
                      }}
                    >
                      <div
                        style={{
                          ...pixel,
                          fontWeight: 500,
                          fontSize: 13,
                          letterSpacing: 0.4,
                          color: COLOR.apagado,
                        }}
                      >
                        LOS LIBROS LE LLAMARÁN
                      </div>
                      <div
                        style={{
                          ...pixel,
                          fontWeight: 400,
                          fontSize: modoCompacto ? 21 : 25,
                          lineHeight: 1.2,
                          color: COLOR.oro,
                          margin: modoCompacto ? '2px 0 3px' : '4px 0 5px',
                        }}
                      >
                        {epitetoDe(moralidad).nombre}
                      </div>
                      <div
                        style={{
                          ...pixel,
                          fontWeight: 500,
                          fontSize: modoCompacto ? 13 : 15,
                          lineHeight: 1.25,
                          color: '#9a927f',
                        }}
                      >
                        {epitetoDe(moralidad).nota}
                      </div>
                    </div>
                    </div>
                    </div>
                    <div
                      style={{
                        flexShrink: 0,
                        marginTop: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                        width: '100%',
                      }}
                    >
                      <button
                        onClick={() => { sfx.boton(); restart() }}
                        style={{
                          background: COLOR.oro,
                          border: 'none',
                          borderRadius: 8,
                          padding: '12px 20px',
                          ...pixel,
                          fontWeight: 400,
                          fontSize: 21,
                          cursor: 'pointer',
                        }}
                      >
                        Nueva legislatura
                      </button>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={async () => {
                            sfx.boton()
                            const res = await compartirResultado(
                              textoResultado(turn - 1, moralidad, causaCompartir)
                            )
                            if (res !== 'compartido') {
                              setCompartido(res)
                              window.setTimeout(() => setCompartido('idle'), 2200)
                            }
                          }}
                          style={botonGameOverSec}
                        >
                          {compartido === 'copiado'
                            ? '¡Copiado!'
                            : compartido === 'error'
                              ? 'No se pudo'
                              : 'Compartir'}
                        </button>
                        <button onClick={() => { sfx.boton(); setVerLogros(true) }} style={botonGameOverSec}>
                          Logros
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              <BottomBar turn={turn} />
            </>
          )}

          <LogroToast cola={colaLogros} onVaciar={() => setColaLogros([])} />
          {verLogros && <LogrosPanel onCerrar={() => setVerLogros(false)} />}
          {verReparto && <RepartoPanel onCerrar={() => setVerReparto(false)} />}
        </div>
      </div>
    </>
  )
}
