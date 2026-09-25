import { useCallback, useEffect, useState } from 'react'
import { motion, useTransform, type MotionValue, type PanInfo } from 'framer-motion'
import type { Card, StatEffects } from '../types'
import { characterColor, characterBackground } from '../utils/color'
import { sfx } from '../utils/sfx'
import { COLOR, pixel } from '../utils/estilo'

// Tamaño FIJO a propósito — no crece ni encoge con el largo del texto, para
// que la carta de debajo se vea siempre, no solo un hueco pequeño. El texto
// que no quepa se recorta (overflow hidden) en vez de agrandar la etiqueta.
const PANEL_WIDTH = 216
const PANEL_HEIGHT = 130
const PANEL_HIDDEN = PANEL_WIDTH + 24

// Inclinación máxima de la carta al arrastrar (grados).
const CARD_TILT = 12
// Cuanto se desplaza la carta al asomar una opcion sin arrastrar.
const PEEK_DISTANCE = 58

// Distancia de arrastre a la que un lado se considera "totalmente revelado".
// Se exporta porque StatBars usa el mismo valor para los puntos de efecto —
// deben moverse en sincronía.
//
// OJO con las unidades: esto se mide sobre `x`, que es el desplazamiento YA
// amortiguado por dragElastic (0.7), mientras que SWIPE_THRESHOLD se compara
// contra el recorrido real del DEDO. Es decir: dedo ≈ x / 0.7. Con 60 aquí,
// el panel no se completaba hasta 86px de dedo, pero la elección ya estaba
// decidida a los 70px — el panel no llegaba a leerse entero nunca. Medido:
// con 38 se completa a ~54px de dedo, bastante antes del umbral.
export const SWIPE_REVEAL_DISTANCE = 38

// Cuánto de "corrupta" es una decisión, a partir de sus propios efectos:
// caja/partido son ganancias de trastienda, medios/votantes son legitimidad
// pública. Si una opción gana más de lo primero que de lo segundo, es la
// "mala" (roja); si es al revés, es la "buena" (verde) — así el color sigue
// la moralidad real de cada carta, no si está a la izquierda o la derecha.
export function corruptionScore(effects: StatEffects) {
  const caja = effects.caja ?? 0
  const partido = effects.gobierno ?? 0
  const medios = effects.medios ?? 0
  const votantes = effects.calle ?? 0
  return caja + partido - medios - votantes
}

const CLEAN = { bg: '#12331f', accent: '#4dff88' }
const CORRUPT = { bg: '#3a1414', accent: COLOR.peligro }
// Para cuando no hay nada que elegir de verdad.
const NEUTRO = { bg: '#26262a', accent: '#8d8677' }

// Etiqueta de tamaño fijo (ni crece ni encoge con el texto) que entra
// deslizándose desde el lateral en sincronía directa con el arrastre — no
// con umbrales de opacidad. Deliberadamente pequeña y arriba: el resto de la
// carta (el retrato) queda visible durante todo el gesto.
//
// GEOMETRÍA (varios intentos fallidos antes de dar con esto):
//  - Es HERMANA de la carta, no hija: así el overflow:hidden de la carta no la
//    recorta, y no hereda su rotación (el texto se lee siempre recto).
//  - Viaja con la carta en X (`cardX + deslizamiento`), no se queda quieta: si
//    no, al arrastrar la carta se iba y el panel se quedaba flotando fuera.
//  - Queda CENTRADA en horizontal, no pegada a un lateral. Pegada al borde se
//    salía de la carta al inclinarse esta, y encima ese borde es justo el que
//    se va de pantalla al arrastrar, así que el panel se cortaba con él.
function ChoicePanel({
  text,
  side,
  colors,
  x,
}: {
  text: string
  side: 'left' | 'right'
  colors: { bg: string; accent: string }
  x: MotionValue<number>
}) {
  // El deslizamiento arranca en 0, no en una zona muerta: el panel empieza a
  // asomar desde el primer píxel de arrastre y entra de forma gradual. Con
  // zona muerta entraba tarde y de golpe, y no daba tiempo a leerlo. Para el
  // rebote al soltar no hace falta colchón aquí: de eso se encarga `opacity`,
  // que apaga el panel en cuanto el arrastre cruza al lado contrario.
  const slideRaw = useTransform(
    x,
    side === 'left' ? [-SWIPE_REVEAL_DISTANCE, 0] : [0, SWIPE_REVEAL_DISTANCE],
    side === 'left' ? [0, -PANEL_HIDDEN] : [PANEL_HIDDEN, 0]
  )
  // Solo el deslizamiento de entrada: el panel NO acompaña a la carta. Una vez
  // dentro se queda QUIETO en pantalla aunque se siga arrastrando, y es la
  // carta la que se va por debajo (como en el Reigns original). Antes le
  // sumaba el desplazamiento de la carta y, pasada la distancia de revelado,
  // el panel se iba con ella en vez de quedarse a la vista.
  // Redondeado a píxel entero: sin esto, al llegar al valor máximo el
  // navegador podía renderizar un subpíxel de más y se veía un salto de 1px.
  const panelX = useTransform(slideRaw, (v) => Math.round(v))
  // El panel de un lado NO existe (opacity 0) en cuanto el arrastre está en
  // el lado contrario — incluso 1px. Así, pase lo que pase con el rebote al
  // soltar (que puede cruzar el 0 hacia el otro signo), el panel que no se ha
  // elegido nunca llega a verse. Cuando se empieza a arrastrar hacia este
  // lado el panel ya está a 0.93 pero todavía fuera de pantalla (zona muerta),
  // así que tampoco se ve "aparecer".
  const opacity = useTransform(x, (v) => ((side === 'left' ? v < 0 : v > 0) ? 0.93 : 0))
  return (
    <motion.div
      style={{
        position: 'absolute',
        // ARRIBA, que es donde va en Reigns y donde el jugador lo busca. Se
        // probo abajo, sobre el torso, para no taparle la cara al personaje, y
        // se probo como franja sobre el texto de la situacion, que no tapa
        // nada: las dos se sintieron mal. El cuadrado que entra por el lado y
        // se queda arriba es el gesto que se reconoce, y taparle media cara al
        // personaje mientras decides es parte de eso: estas hablando por
        // encima de el.
        top: '5%',
        left: '50%',
        marginLeft: -PANEL_WIDTH / 2,
        width: PANEL_WIDTH,
        // Proporcional a la carta y con tope: en una carta baja, 130px fijos
        // eran tres cuartas partes de la carta.
        height: '34%',
        minHeight: 88,
        maxHeight: PANEL_HEIGHT,
        x: panelX,
        background: colors.bg,
        opacity,
        border: `2px solid ${colors.accent}`,
        borderRadius: 12,
        boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        padding: '8px 10px',
        boxSizing: 'border-box',
        zIndex: 4,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: '100%',
          ...pixel,
          // 400: es el único peso que existe de verdad para esta fuente (ver
          // nota en index.css) — un 700 aquí forzaría un "bold" sintético
          // que se ve borroso, sobre todo a este tamaño.
          fontWeight: 400,
          fontSize: 18,
          lineHeight: 1.2,
          color: '#fff',
          textAlign: 'center',
          overflowWrap: 'anywhere',
        }}
      >
        {text}
      </div>
    </motion.div>
  )
}

// Recorrido del DEDO para que el gesto cuente como elección. Tiene que dejar
// margen de sobra por encima del punto en el que el panel ya está entero
// (~54px de dedo, ver SWIPE_REVEAL_DISTANCE): ese hueco es el tiempo que
// tienes para leer la opción antes de que la carta se vaya.
const SWIPE_THRESHOLD = 82
// Un "flick" rápido cuenta como elección aunque no llegue a esa distancia —
// así se parece más a un gesto real y hay menos posibilidades de que el
// ratón se salga de la ventana antes de completar el arrastre.
const FLICK_VELOCITY = 500

interface Props {
  card: Card
  onChoose: (side: 'left' | 'right') => void
  x: MotionValue<number>
  // Cuantas veces le ha desairado (o dado la razon) al personaje que habla.
  enfado: number
  favorDebido: number
  // Primera carta de la partida: en vez de aparecer, el mazo se REPARTE. Caen
  // las dos cartas de debajo y encima la que toca leer.
  repartir?: boolean
}

// El juego llevaba la cuenta del enfado y el favor de cada personaje desde el
// principio, pero no se veia en ninguna parte: te sorprendia una carta de
// enfado sin saber por que, o te salvaba alguien sin que supieras que le
// caias bien. Esto lo saca a la superficie en una linea, debajo del nombre.
//
// Deliberadamente sin numeros: no es un marcador que optimizar, es lo que
// notarias de alguien con quien tratas todos los dias.
// El escalon de 2 existe porque el SORTEO actua ahi: a partir de enfado 2 el
// motor le sube el peso a este personaje y vuelve antes (ver `clima` en
// useGameStore). Sin este aviso, el juego empezaba a perseguirte sin ensenar
// nada hasta el 3 — el mismo fallo que tenia la mocion de censura.
function estadoDelPersonaje(enfado: number, favor: number) {
  if (enfado >= 6) return { texto: 'No le perdona una', color: '#e05a4d' }
  if (enfado >= 3) return { texto: 'Harto de usted', color: '#e0904d' }
  if (enfado >= 2) return { texto: 'Empieza a hartarse', color: '#b08050' }
  if (favor >= 3) return { texto: 'Le debe una', color: '#8fc98f' }
  if (favor >= 2) return { texto: 'De su lado', color: '#7d8f7d' }
  return undefined
}

// Las dos salidas de una carta, ya resueltas: que dice cada lado y de que
// color va. Lo necesitan la carta (para el teclado) y el banner de arriba
// (para pintar los paneles), asi que se calcula en un solo sitio.
export function opcionesDeCarta(card: Card) {
  const leftIsCorrupt = corruptionScore(card.left.effects) > corruptionScore(card.right.effects)
  // En una carta de muerte (las dos salidas acaban la partida) los dos
  // paneles dicen "Pues..." y van del mismo color, como en Reigns: ya no hay
  // nada que elegir y esa es la broma. Cada lado conserva su propio epílogo,
  // así que sigue habiendo dos finales, pero se eligen a ciegas.
  const esMuerte = Boolean(card.left.epilogueText && card.right.epilogueText)
  const mismaOpcion = esMuerte || card.left.text === card.right.text
  return {
    textoIzq: esMuerte ? 'Pues...' : card.left.text,
    textoDer: esMuerte ? 'Pues...' : card.right.text,
    coloresIzq: mismaOpcion ? NEUTRO : leftIsCorrupt ? CORRUPT : CLEAN,
    coloresDer: mismaOpcion ? NEUTRO : leftIsCorrupt ? CLEAN : CORRUPT,
  }
}

export function SwipeCard({ card, onChoose, x, enfado, favorDebido, repartir }: Props) {
  const estado = estadoDelPersonaje(enfado, favorDebido)
  const rotate = useTransform(x, [-100, 100], [-CARD_TILT, CARD_TILT])
  const { textoIzq, textoDer, coloresIzq, coloresDer } = opcionesDeCarta(card)

  // TECLADO. La carta no tenia teclas ni foco, asi que sin puntero no habia
  // forma de jugar, ni con lector de pantalla tampoco.
  //
  // Va en dos pasos, igual que el arrastre: la flecha asoma la opcion (y se
  // puede leer, que si no el texto solo aparece arrastrando) y repetirla la
  // elige. Una pulsacion suelta nunca decide nada.
  //
  // Hubo tambien un toque en los lados de la carta para elegir sin arrastrar,
  // y se quito: se pisaba con el arrastre y el resultado era impredecible. En
  // tactil manda el gesto de deslizar, que es el del genero.
  const [asomado, setAsomado] = useState<'left' | 'right' | null>(null)
  const elegir = useCallback(
    (lado: 'left' | 'right') => {
      x.stop()
      x.set(0)
      setAsomado(null)
      onChoose(lado)
    },
    [onChoose, x]
  )
  const activar = useCallback(
    (lado: 'left' | 'right') => {
      if (asomado === lado) elegir(lado)
      else {
        setAsomado(lado)
        // Un pelo mas que el umbral de revelado, para que el panel entre del
        // todo y la carta se incline como si estuvieras arrastrando.
        x.set(lado === 'left' ? -PEEK_DISTANCE : PEEK_DISTANCE)
      }
    },
    [asomado, elegir, x]
  )
  // Al cambiar de carta se olvida el vistazo: la carta nueva empieza recta.
  useEffect(() => {
    setAsomado(null)
    x.set(0)
  }, [card.id, x])

  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); activar('left') }
      else if (e.key === 'ArrowRight') { e.preventDefault(); activar('right') }
      else if (e.key === 'Escape' && asomado) { setAsomado(null); x.set(0) }
      else if ((e.key === 'Enter' || e.key === ' ') && asomado) { e.preventDefault(); elegir(asomado) }
    }
    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [activar, asomado, elegir, x])

  // Sin animación de salida a propósito: la carta siguiente entra al
  // instante en cuanto se decide (nada que esperar, nada que se pueda
  // quedar a medias). Solo se anima la entrada (initial → animate).
  function handleDragEnd(_: unknown, info: PanInfo) {
    const decidedLeft = info.offset.x < -SWIPE_THRESHOLD || (info.offset.x < 0 && info.velocity.x < -FLICK_VELOCITY)
    const decidedRight = info.offset.x > SWIPE_THRESHOLD || (info.offset.x > 0 && info.velocity.x > FLICK_VELOCITY)
    if (decidedLeft) {
      // `x` es la MISMA MotionValue compartida que heredará la carta
      // siguiente (cambia de key, pero no de `x`). `x.stop()` mata la
      // animación de rebote que framer-motion lanza al soltar: si no, esa
      // animación sigue corriendo sobre `x` tras desmontarse esta carta,
      // se pasa del 0 hacia el signo contrario y asoma un trozo del panel
      // de la otra opción en la carta nueva. `x.set(0)` deja la carta
      // siguiente en su sitio desde el primer frame.
      setAsomado(null)
      x.stop()
      x.set(0)
      onChoose('left')
    } else if (decidedRight) {
      setAsomado(null)
      x.stop()
      x.set(0)
      onChoose('right')
    }
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        // Márgenes mínimos: la carta es lo que manda en pantalla y el
        // retrato está limitado por el ANCHO (su ratio es 1020/1200), así que
        // cada píxel lateral que se recorta aquí lo gana la imagen.
        padding: '10px 8px 8px',
        boxSizing: 'border-box',
      }}
    >
      {/* SIN overflow:hidden a propósito: este contenedor NO rota, así que al
          inclinarse la carta sus esquinas se salían de él y las recortaba en
          vertical — y con ellas el panel de respuesta, que se veía cortado por
          la mitad. La carta ya se recorta a sí misma con su propio
          overflow+borderRadius, que es el borde visible. */}
      {/* La carta tiene EXACTAMENTE la proporcion del retrato (1020x1200), asi
          que el retrato entra entero y a la vez llena la carta: ni margen por
          abajo ni recorte por los lados.
          Con la carta ocupando todo el hueco disponible pasaba una de las dos
          cosas, segun la pantalla: o sobraba fondo (la figura flotaba) o, al
          taparlo con `cover`, se comia los lados, y a quien tiene mucho pelo
          le cortaba la cabeza. Lo que sobra de alto se queda de margen entre
          el texto y la carta, que ademas le da aire. */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* EL MAZO. Dos cartas asomando por detras, quietas y sin contenido.
            No hacen nada: estan para que se vea que debajo hay baraja y que
            esto no es una pantalla, son cartas que se van dando. Es de lo
            primero que se nota en Reigns y aqui no estaba.
            Van del color de esta carta pero mas oscuras, asi que el mazo
            cambia de tono con el personaje en vez de ser un gris pegado. */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          {[
            { g: -4.5, y: 16, e: 0.94, o: 0.55 },
            { g: 3, y: 8, e: 0.97, o: 0.75 },
          ].map((c, i) => (
            <motion.div
              key={c.g}
              initial={repartir ? { y: -460, opacity: 0, rotate: c.g * 2 } : false}
              animate={{ y: c.y, opacity: c.o, rotate: c.g }}
              transition={
                repartir
                  ? { type: 'spring', stiffness: 260, damping: 26, delay: i * 0.1 }
                  : { duration: 0 }
              }
              style={{
                position: 'absolute',
                width: '100%',
                maxHeight: '100%',
                aspectRatio: '1020 / 1200',
                borderRadius: 16,
                background: characterColor(card.character, card.characterImage),
                border: '2px solid rgba(255,255,255,0.12)',
                filter: 'brightness(0.55)',
                scale: c.e,
              }}
            />
          ))}
        </div>

        <motion.div
          key={card.id}
          style={{
            x,
            rotate,
            position: 'relative',
            width: '100%',
            maxWidth: '100%',
            maxHeight: '100%',
            aspectRatio: '1020 / 1200',
            zIndex: 1,
            boxSizing: 'border-box',
            background: characterBackground(card.character, card.characterImage),
            borderRadius: 16,
            border: '2px solid rgba(255,255,255,0.22)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
            overflow: 'hidden',
            cursor: 'grab',
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          // Enfocable y anunciable: antes la carta no tenia ni rol ni foco ni
          // etiqueta, asi que con lector de pantalla el juego no se podia
          // jugar. El aria-label lleva la situacion y las dos salidas, que es
          // justo lo que el jugador vidente ve al asomar cada lado.
          tabIndex={0}
          role="group"
          aria-label={
            `${card.character}. ${card.text} ` +
            `Izquierda: ${textoIzq}. Derecha: ${textoDer}. ` +
            'Flecha izquierda o derecha para asomar una opción, otra vez para elegirla.'
          }
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.7}
          dragSnapToOrigin
          dragTransition={{ bounceStiffness: 450, bounceDamping: 45 }}
          onDragStart={() => sfx.roce()}
          onDragEnd={handleDragEnd}
          // Al empezar la partida la carta CAE sobre el mazo, detras de las dos
          // de debajo, que llevan una decima de ventaja cada una. El resto de
          // cartas siguen entrando como siempre, desde abajo y pequenas: eso
          // es pasar pagina, no repartir.
          initial={repartir ? { scale: 1, opacity: 0, y: -520 } : { scale: 0.88, opacity: 0, y: 60 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={
            repartir
              ? { type: 'spring', stiffness: 240, damping: 24, mass: 0.9, delay: 0.2 }
              : { type: 'spring', stiffness: 320, damping: 24, mass: 0.8 }
          }
        >
          {card.characterImage && (
            <img
              src={`/characters/${card.characterImage}`}
              // Decorativa a proposito: el nombre del personaje ya esta
              // escrito debajo de la carta, asi que un alt con el nombre lo
              // repetiria para un lector de pantalla. Y con alt vacio, el
              // navegador no pinta ese texto en la esquina mientras el png
              // aun no ha cargado, que es justo lo que se veia la primera
              // vez que salia cada personaje.
              alt=""
              draggable={false}
              style={{
                // El retrato LLENA la carta. Antes se escalaba para caber
                // entero, asi que sobraba fondo por arriba y por abajo y la
                // figura flotaba en mitad de un rectangulo oscuro: parecia una
                // pegatina puesta encima de la carta, no la carta.
                //
                // Con `cover` la imagen cubre todo el hueco y lo que sobra se
                // recorta. Se ancla ARRIBA porque arriba esta la cara: lo que
                // se pierde es torso, que no dice nada, y la figura sangra por
                // el borde de abajo, que es lo que se pedia.
                position: 'absolute',
                inset: 0,
                display: 'block',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center top',
              }}
            />
          )}

          {/* Sin retrato (las voces que cierran la partida: "La Redacción",
              "El Comité Ejecutivo", "La Calle"...) la carta salía como un
              rectángulo de color vacío. Se rotula con el nombre en grande,
              que además le da un aire de titular. */}
          {!card.characterImage && (
            <div style={{ padding: '0 22px', width: '100%', boxSizing: 'border-box', textAlign: 'center' }}>
              <Filete />
              <div
                style={{
                  ...pixel,
                  fontWeight: 400,
                  // El nombre manda en toda la carta, asi que se agranda hasta
                  // donde quepa: los cortos ("La Calle") se comian el hueco a
                  // 34px fijos y los largos se salian.
                  fontSize: card.character.length > 22 ? 34 : card.character.length > 14 ? 40 : 48,
                  lineHeight: 1.2,
                  letterSpacing: 0.5,
                  color: 'rgba(255,255,255,0.94)',
                  textShadow: '0 2px 10px rgba(0,0,0,0.45)',
                  overflowWrap: 'anywhere',
                  margin: '18px 0',
                }}
              >
                {card.character}
              </div>
              <Filete />
            </div>
          )}

        </motion.div>

        {/* Paneles de respuesta: hermanos de la carta (ver comentario en
            ChoicePanel). Viajan con ella en X y quedan centrados, así que
            siempre caen dentro de la carta sin que nada los recorte. */}
        <ChoicePanel text={textoIzq} side="left" colors={coloresIzq} x={x} />
        <ChoicePanel text={textoDer} side="right" colors={coloresDer} x={x} />
      </div>

      {/* El nombre va debajo de la carta SALVO cuando la carta no tiene
          retrato: en ese caso ya está rotulado dentro, en grande, y repetirlo
          aquí lo dejaba escrito dos veces en la misma pantalla. */}
      {card.characterImage && (
        <div style={{ flexShrink: 0, textAlign: 'center', marginTop: 7 }}>
          <div
            style={{
              ...pixel,
              fontWeight: 500,
              fontSize: 22,
              color: COLOR.oro,
              lineHeight: 1.1,
            }}
          >
            {card.character}
          </div>
          {estado && (
            <div
              style={{
                ...pixel,
                fontWeight: 500,
                fontSize: 13,
                color: estado.color,
                lineHeight: 1.1,
                marginTop: 2,
              }}
            >
              {estado.texto}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Filete de titular para las cartas sin retrato: las voces colectivas que
// cierran la partida (La Calle, El Comite Ejecutivo, La Militancia...). No
// tienen cara porque no son una persona, asi que la carta se resuelve como un
// comunicado en vez de dejar el hueco del retrato vacio.
function Filete() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        color: 'rgba(255,255,255,0.4)',
      }}
    >
      <span style={{ flex: 1, maxWidth: 70, height: 1, background: 'currentColor' }} />
      <span style={{ fontSize: 9, lineHeight: 1 }}>◆</span>
      <span style={{ flex: 1, maxWidth: 70, height: 1, background: 'currentColor' }} />
    </div>
  )
}
