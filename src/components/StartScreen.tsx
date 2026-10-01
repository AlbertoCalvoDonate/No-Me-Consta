import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Stats } from '../types'
import { StatIcon } from './StatIcon'
import { epitetoDe } from '../data/epitetos'
import { useLogrosEstado } from '../hooks/useLogros'
import { COLOR, pixel } from '../utils/estilo'
import { sfx } from '../utils/sfx'
import { mascaraBorde, useAltoVentana, useHayMasAbajo } from '../utils/desbordado'
import { borrarTodoElProgreso } from '../hooks/borrarGuardado'
import { useAtrasCierra } from '../utils/botonAtras'
import { dondeEstaInstalar, pedirInstalar, useComoInstalar } from '../utils/instalar'
import { apuntarQueSeLeDijo, yaSeLeDijo } from '../hooks/avisoInstalar'
import { apuntarAviso, useMandarPartidas, yaSeAviso } from '../utils/enviarPartida'
import { usePruebas } from '../utils/soyPruebas'

const STATS: { key: keyof Stats; label: string }[] = [
  { key: 'medios', label: 'Medios' },
  { key: 'gobierno', label: 'Gobierno' },
  { key: 'calle', label: 'Calle' },
  { key: 'caja', label: 'Caja B' },
]

const TOTAL_EPITETOS = 11

// Empezar de cero de verdad. Qué se borra exactamente y qué se queda, en
// hooks/borrarGuardado: aquí solo se pide.
//
// Antes esto vivía detrás de diez toques rápidos en el número de versión, y
// eso fallaba por los dos lados: quien lo necesitaba no sabía que existía, y
// quien no lo necesitaba podía encontrarlo aporreando la pantalla y borrarse
// el progreso sin enterarse de qué había pasado. Ahora es un botón que se ve,
// dice lo que hace y pregunta antes.

// Fecha de build formateada una sola vez (no cambia durante la sesión).
const buildDate = new Date(__BUILD_DATE__).toLocaleString('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})


export function StartScreen({
  onStart,
  onContinuar,
  mesEnCurso,
  onVerLogros,
  onVerReparto,
}: {
  onStart: () => void
  // Si hay una partida a medias que retomar. Ausente = no la hay.
  onContinuar?: () => void
  // El mes que muestra la barra de abajo (turn crudo), para que "Continuar"
  // coincida con lo último que vio el jugador.
  mesEnCurso: number
  onVerLogros: () => void
  onVerReparto: () => void
}) {
  const { partidas, mesesRecord, epitetoRecord, epitetosVistos, hechos, total, cartasVistas, totalCartas } =
    useLogrosEstado()

  // "Empezar de cero" con partida guardada borra esa partida sin avisar —
  // un toque de más y se pierde. Un paso de confirmación de por medio.
  const [confirmando, setConfirmando] = useState(false)
  // El tutorial ya no ocupa la pantalla: se abre si alguien lo pide.
  const [comoSeJuega, setComoSeJuega] = useState(false)

  const [borrando, setBorrando] = useState(false)
  // Lo mismo que en los paneles del juego: instalado, "atras" cierra la app.
  // Con el tutorial o una confirmacion delante, cierra eso (ver botonAtras).
  useAtrasCierra(comoSeJuega, () => setComoSeJuega(false))
  useAtrasCierra(borrando, () => setBorrando(false))
  useAtrasCierra(confirmando, () => setConfirmando(false))
  // Como se instala en ESTE movil: con boton, a mano (iOS) o de ninguna manera
  // (ya instalado, o un navegador que no lo ofrece). Ver utils/instalar.
  const comoInstalar = useComoInstalar()

  // EL AVISO DE QUE SE PUEDE INSTALAR, UNA SOLA VEZ.
  //
  // Sale solo si de verdad se puede: con un "instalalo" delante y ningun sitio
  // donde tocar, el aviso seria una burla. Y se apunta como visto al cerrarlo
  // -de cualquiera de las dos formas- para que no vuelva (ver avisoInstalar).
  const [avisando, setAvisando] = useState(false)
  useEffect(() => {
    if (comoInstalar === 'no' || yaSeLeDijo()) return
    setAvisando(true)
  }, [comoInstalar])
  const cerrarAviso = () => {
    apuntarQueSeLeDijo()
    setAvisando(false)
  }
  useAtrasCierra(avisando, cerrarAviso)

  // EL AVISO DE QUE SE MANDAN LAS PARTIDAS. Sale una vez, y con el interruptor
  // dentro: decir "mando esto" y no dar donde apagarlo es avisar de boquilla.
  // No compite con el de instalar: si tocan los dos, este espera a que el otro
  // se cierre, porque dos carteles a la vez se cierran los dos sin leer.
  const [contandoLog, setContandoLog] = useState(false)
  const [mandaPartidas, setMandaPartidas] = useMandarPartidas()
  const [esPruebas, setEsPruebas] = usePruebas()
  useEffect(() => {
    if (avisando || yaSeAviso()) return
    setContandoLog(true)
  }, [avisando])
  const cerrarLog = () => {
    apuntarAviso()
    setContandoLog(false)
  }
  useAtrasCierra(contandoLog, cerrarLog)
  const [reseteado, setReseteado] = useState(false)

  // Esta pantalla se desplaza en móviles pequeños: hay que avisar de ello.
  const cajaRef = useRef<HTMLDivElement>(null)
  const hayMas = useHayMasAbajo(cajaRef, true, [confirmando, reseteado])

  // Y ADEMÁS SE APRIETA. Medido: en un 320x568 el botón de empezar acababa
  // 105px por debajo del borde, o sea que lo primero que ve alguien que abre
  // el juego en un móvil pequeño es una pantalla sin botón. Se llegaba
  // bajando, pero nadie debería tener que buscar el botón de jugar.
  //
  // Con la letra y los márgenes más justos cabe entero. El umbral son 600px
  // de alto: por encima de eso ya cabía y no hay nada que apretar.
  const compacto = useAltoVentana() < 600

  const borrarTodo = () => {
    borrarTodoElProgreso()
    setBorrando(false)
    setReseteado(true)
    window.setTimeout(() => setReseteado(false), 2500)
  }

  return (
    <div
      ref={cajaRef}
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        color: '#f2f2f2',
        // En un movil de 320px el boton de empezar queda 105px por debajo del
        // borde: se llega, pero nada decia que hubiera que bajar. Ahora el
        // borde se difumina mientras quede algo, y se apaga al llegar abajo.
        ...mascaraBorde(hayMas),
      }}
    >
      {/* `margin: auto` centra el bloque cuando cabe; cuando no (móviles muy
          pequeños, 320px), el contenedor de arriba hace scroll. */}
      <div
        style={{
          margin: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          // El hueco de arriba en compacto no es simetria: el boton de
          // volumen vive pegado a la esquina y, con la pantalla apretada,
          // el titulo se le metia debajo. 38px es lo que mide ese boton
          // mas su margen.
          padding: compacto ? '38px 20px 12px' : '24px 26px',
          gap: compacto ? 10 : 16,
        }}
      >
      <div>
        <h1
          style={{
            ...pixel,
            margin: 0,
            fontWeight: 400,
            fontSize: compacto ? 34 : 46,
            color: COLOR.oro,
            lineHeight: 1.05,
          }}
        >
          No Me Consta
        </h1>
        <p style={{ ...pixel, margin: compacto ? '6px 0 0' : '8px 0 0', fontWeight: 500, fontSize: compacto ? 15 : 17, color: '#a89f8c' }}>
          Gobierna el país y vive para contarlo.
        </p>
      </div>

      {/* Marca personal: como en Reigns, cuánto aguantaste y qué has coleccionado
          — no una puntuación, un historial. Solo si ya has jugado. */}
      {partidas > 0 && (
        <div style={{ ...pixel, fontWeight: 500, fontSize: 14, lineHeight: 1.6, color: '#7d7768' }}>
          <div>
            Tu récord: <span style={{ color: '#c9a24a' }}>{mesesRecord} {mesesRecord === 1 ? 'mes' : 'meses'}</span>
            {epitetoRecord >= 0 && `, ${epitetoDe(epitetoRecord).nombre}`}
          </div>
          <div>
            {epitetosVistos}/{TOTAL_EPITETOS} epítetos · {hechos}/{total} logros
          </div>
          <div>
            Has visto <span style={{ color: '#c9a24a' }}>{cartasVistas}</span> de {totalCartas} cartas
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 2 }}>
        {onContinuar ? (
          <>
            <button onClick={() => { sfx.boton(); onContinuar() }} style={botonPrimario}>
              Continuar · {Math.max(0, mesEnCurso - 1)} meses
            </button>
            <button onClick={() => { sfx.boton(); setConfirmando(true) }} style={botonSecundario}>
              Empezar de cero
            </button>
          </>
        ) : (
          <button onClick={() => { sfx.boton(); onStart() }} style={botonPrimario}>
            Empezar legislatura
          </button>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { sfx.boton(); onVerReparto() }} style={botonSecundario}>
            El reparto
          </button>
          <button onClick={() => { sfx.boton(); onVerLogros() }} style={botonSecundario}>
            Logros
          </button>
        </div>
        <button onClick={() => { sfx.boton(); setComoSeJuega(true) }} style={botonTerciario}>
          ¿Cómo se gobierna?
        </button>
        {/* INSTALAR. "Añadir a pantalla de inicio" vive en el menú de tres
            puntos del navegador y mucha gente no ha abierto ese menú nunca.
            Aquí se pide en un botón que se ve. Desaparece solo en cuanto el
            juego ya está instalado. */}
        {/* El boton sale siempre que se pueda instalar, tambien donde hay que
            hacerlo a mano (iPhone, Firefox): alli no instala, abre las
            instrucciones. Un solo boton con el mismo nombre en todas partes,
            porque "instalar esto" es lo que el jugador quiere en los tres
            casos y donde esta el menu es problema nuestro, no suyo. */}
        {comoInstalar !== 'no' && (
          <button
            onClick={() => {
              sfx.boton()
              if (comoInstalar === 'boton') void pedirInstalar()
              else setAvisando(true)
            }}
            style={{ ...botonTerciario, color: COLOR.oro }}
          >
            Instalar en el móvil
          </button>
        )}
      </div>

      {/* AVISO DE SATIRA. Va aqui, en la portada y antes de jugar, y no
          escondido en un menu: la diferencia entre una parodia y una
          acusacion es la intencion, y la intencion hay que declararla donde
          se lea. Auditado el mazo (scripts/auditar-riesgo.mjs): de 501 cartas
          con texto, cinco nombran un delito y solo una lo afirma sin comillas
          -y esa habla del gobierno del propio jugador-. Los personajes son
          arquetipos y no hay un solo nombre real, ni de persona ni de sitio.
          Lo que si se reconoce son los retratos, y por eso esto esta aqui. */}
      <div
        style={{
          ...pixel,
          marginTop: 10,
          maxWidth: 420,
          textAlign: 'center',
          fontWeight: 500,
          fontSize: 12,
          lineHeight: 1.45,
          color: '#4f4b45',
          padding: '0 18px',
          boxSizing: 'border-box',
        }}
      >
        Sátira. Los personajes son arquetipos de ficción y las situaciones,
        inventadas. Cualquier parecido con personas reales es deliberadamente
        paródico y no describe hechos ciertos.
      </div>

      {/* Borrar el progreso. Discreto a propósito -no compite con "Empezar
          legislatura"- pero visible y con su nombre. Solo tiene sentido
          ofrecerlo si hay algo que borrar. */}
      {/* "ESTO SON PRUEBAS MIAS". Lo tiene que decir el movil porque el
          servidor no puede saberlo: no viaja ningun identificador. Y no
          identifica a nadie — dice que la PARTIDA es una prueba, no de quien
          es (ver utils/soyPruebas).
          Encendido se queda encendido: quien prueba, prueba muchas veces, y
          tener que acordarse en cada partida es garantia de olvidarse. */}
      {esPruebas && (
        <button
          onClick={() => { sfx.boton(); setEsPruebas(false) }}
          style={{ ...botonTerciario, marginTop: 2, color: COLOR.oro }}
        >
          Partida de prueba - DEV · activado
        </button>
      )}
      {/* SIN `partidas > 0`, Y ES LA GRACIA. Estaba condicionado a haber jugado
          alguna, y eso lo dejaba inutil justo cuando hace falta: en un movil
          recien instalado no se puede encender ANTES de la primera partida, asi
          que esa primera -la unica que no se puede repetir- contaba como real.
          Un interruptor que dice "no cuentes esto" tiene que estar antes de
          que haya algo que no contar. */}
      {!esPruebas && (
        <button
          onClick={() => { sfx.boton(); setEsPruebas(true) }}
          style={{ ...botonTerciario, marginTop: 2, color: '#5a5650' }}
        >
          Partida de prueba - DEV
        </button>
      )}

      {partidas > 0 && (
        <button
          onClick={() => { sfx.boton(); setBorrando(true) }}
          style={{ ...botonTerciario, marginTop: 2, color: '#6b5450' }}
        >
          Borrar mi progreso
        </button>
      )}

      <div
        style={{
          ...pixel,
          marginTop: 4,
          textAlign: 'center',
          fontWeight: 500,
          fontSize: 13,
          color: reseteado ? COLOR.oro : '#5a5650',
          padding: '4px 0',
          userSelect: 'none',
        }}
      >
        {reseteado ? 'Logros borrados' : `v${__APP_VERSION__} · ${buildDate}`}
      </div>
      </div>

      {/* EL AVISO DE INSTALAR, la primera vez y nunca más.
          En Android se instala con un toque aquí mismo. En iPhone no hay botón
          posible -Safari no deja pedirlo por código-, así que ahí el aviso
          enseña los dos pasos a mano en vez de un botón que no existiría. */}
      {/* QUE SE MANDA Y QUE NO. Se dice una vez, entero y sin letra pequeña:
          lo que viaja son los datos de la partida y nada mas. Y el interruptor
          va aquí mismo, no escondido en ningún ajuste, porque avisar sin dar
          dónde apagarlo es avisar de boquilla. */}
      {contandoLog && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 36,
            background: 'rgba(0,0,0,0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            style={{
              background: COLOR.panel,
              border: '1px solid rgba(255,255,255,0.16)',
              borderRadius: 14,
              padding: '20px 18px 16px',
              maxWidth: 310,
              width: '100%',
              boxSizing: 'border-box',
              textAlign: 'center',
            }}
          >
            <p style={{ ...pixel, margin: '0 0 8px', fontWeight: 400, fontSize: 19, lineHeight: 1.3, color: COLOR.texto }}>
              Esto está en pruebas
            </p>
            <p style={{ ...pixel, margin: '0 0 14px', fontWeight: 500, fontSize: 14, lineHeight: 1.45, color: COLOR.apagado }}>
              Se envían <strong style={{ color: COLOR.texto }}>solo datos del juego</strong>: qué cartas salieron, qué
              elegiste y cómo acabó — o que la dejaste a medias, que también hace falta saberlo. Sirve para ver si está
              bien equilibrado.
            </p>
            <p style={{ ...pixel, margin: '0 0 16px', fontWeight: 500, fontSize: 14, lineHeight: 1.45, color: COLOR.apagado }}>
              Al acabar la primera te preguntaré dos cosas sobre ti como jugador. Puedes pasar.
            </p>
            <p style={{ ...pixel, margin: '0 0 16px', fontWeight: 500, fontSize: 14, lineHeight: 1.45, color: COLOR.apagado }}>
              Nada personal: ni nombre, ni correo, ni nada que diga quién eres.
              Dos partidas tuyas ni siquiera se pueden relacionar entre sí.
            </p>
            <button
              onClick={() => { sfx.boton(); setMandaPartidas(!mandaPartidas) }}
              style={{
                ...pixel,
                width: '100%',
                background: 'none',
                border: `1px solid ${mandaPartidas ? 'rgba(255,255,255,0.18)' : COLOR.oro}`,
                borderRadius: 8,
                padding: '8px 12px',
                marginBottom: 10,
                fontWeight: 500,
                fontSize: 14,
                color: mandaPartidas ? COLOR.apagado : COLOR.oro,
                cursor: 'pointer',
              }}
            >
              {mandaPartidas ? 'Enviando · tocar para no enviar' : 'No se envía nada'}
            </button>
            <button onClick={() => { sfx.boton(); cerrarLog() }} style={{ ...botonPrimario, width: '100%', fontSize: 17, padding: '9px 16px' }}>
              Entendido
            </button>
          </div>
        </div>
      )}

      {avisando && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 35,
            background: 'rgba(0,0,0,0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            style={{
              position: 'relative',
              background: COLOR.panel,
              border: `1px solid rgba(224,184,77,0.4)`,
              borderRadius: 14,
              padding: '20px 18px 18px',
              maxWidth: 310,
              width: '100%',
              boxSizing: 'border-box',
              textAlign: 'center',
            }}
          >
            {/* La X. Un aviso del que no se puede salir sin hacer lo que pide
                no es un aviso, es un peaje. */}
            <button
              onClick={() => { sfx.boton(); cerrarAviso() }}
              aria-label="Cerrar"
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 34,
                height: 34,
                border: 'none',
                background: 'none',
                color: COLOR.apagado,
                fontSize: 18,
                lineHeight: 1,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>

            <img
              src="/iconos/icono-192.png"
              alt=""
              width={56}
              height={56}
              style={{ borderRadius: 12, display: 'block', margin: '0 auto 10px' }}
            />
            <p style={{ ...pixel, margin: '0 0 6px', fontWeight: 400, fontSize: 19, lineHeight: 1.3, color: COLOR.oro }}>
              Esto se puede instalar
            </p>
            <p style={{ ...pixel, margin: '0 0 16px', fontWeight: 500, fontSize: 14, lineHeight: 1.45, color: COLOR.apagado }}>
              {comoInstalar === 'boton'
                ? 'Se queda con su icono en la pantalla de inicio y se abre a pantalla completa, sin barra del navegador. Ocupa lo que una foto.'
                : dondeEstaInstalar()}
            </p>
            {comoInstalar === 'boton' ? (
              <button
                onClick={async () => {
                  sfx.boton()
                  await pedirInstalar()
                  cerrarAviso()
                }}
                style={{ ...botonPrimario, width: '100%', fontSize: 18, padding: '10px 18px' }}
              >
                Instalar
              </button>
            ) : (
              <button onClick={() => { sfx.boton(); cerrarAviso() }} style={{ ...botonSecundario, width: '100%' }}>
                Entendido
              </button>
            )}
          </div>
        </div>
      )}

      {/* Confirmación antes de tirar la partida guardada: un toque de más en
          "Empezar de cero" no debería costar el mes 30 sin avisar. */}
      {comoSeJuega && (
        <div
          onClick={() => setComoSeJuega(false)}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 30,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          {/* Se para el clic dentro para que tocar el texto no lo cierre. */}
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 340, width: '100%' }}>
      {/* Tutorial: instrucciones claras, tono seco. */}
            <div
              style={{
                background: COLOR.panel,
                borderRadius: 14,
                padding: compacto ? '11px 14px' : '16px 18px',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  ...pixel,
                  fontWeight: 500,
                  fontSize: 13,
                  letterSpacing: 0.8,
                  color: COLOR.apagado,
                  textTransform: 'uppercase',
                  marginBottom: compacto ? 6 : 10,
                }}
              >
                Cómo se gobierna
              </div>

              <p style={{ ...pixel, margin: 0, fontWeight: 500, fontSize: compacto ? 15 : 17, lineHeight: 1.4, color: '#e8e2d4' }}>
                Desliza cada carta a un lado o al otro para decidir.
                <br />
                Rara vez hay una opción buena. Esa es la gracia.
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-around', gap: 4, margin: compacto ? '9px 0 7px' : '14px 0 10px' }}>
                {STATS.map(({ key, label }) => (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <StatIcon statKey={key} value={5} critical={false} size={compacto ? 30 : 38} />
                    <span style={{ ...pixel, fontWeight: 500, fontSize: 12, color: '#a8a08c' }}>{label}</span>
                  </div>
                ))}
              </div>

              <p style={{ ...pixel, margin: 0, fontWeight: 500, fontSize: compacto ? 14 : 16, lineHeight: 1.35, color: '#b7b1a3' }}>
                Si una llega a 0 o al máximo, cae el gobierno. El tuyo. Cuando un
                icono se pone rojo es que esa ya puede tumbarte, sea por donde sea.
              </p>

              {/* LOS PUNTOS. Es la habilidad central del juego y no se explicaba en
                  ninguna parte: el jugador los veia encenderse y tenia que deducir
                  solo que significaban. Decir que hay puntos y que NO dicen la
                  direccion es lo que convierte el juego en un juego de aprenderse al
                  reparto, que es de lo que va. */}
              <p style={{ ...pixel, margin: compacto ? '7px 0 0' : '10px 0 0', fontWeight: 500, fontSize: compacto ? 14 : 16, lineHeight: 1.35, color: '#b7b1a3' }}>
                Al arrastrar se encienden puntos sobre lo que va a moverse. Dicen
                cuánto, no hacia dónde: eso se aprende mirando quién habla.
              </p>
            </div>
            <button
              onClick={() => { sfx.boton(); setComoSeJuega(false) }}
              style={{ ...botonSecundario, marginTop: 12, width: '100%' }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {borrando && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 30,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            style={{
              background: COLOR.panel,
              borderRadius: 14,
              padding: '22px 20px',
              maxWidth: 300,
              width: '100%',
              boxSizing: 'border-box',
              textAlign: 'center',
              border: '1px solid rgba(255,77,77,0.35)',
            }}
          >
            <p style={{ ...pixel, margin: '0 0 6px', fontWeight: 500, fontSize: 18, lineHeight: 1.4, color: COLOR.texto }}>
              ¿Borrar todo tu progreso?
            </p>
            {/* Se dice QUÉ se pierde, con los números delante: "¿estás seguro?"
                a secas no es una pregunta, es un trámite que se acepta sin
                leer. */}
            <p style={{ ...pixel, margin: '0 0 18px', fontWeight: 500, fontSize: 14, lineHeight: 1.4, color: COLOR.apagado }}>
              Se van los {hechos} logros, el récord de {mesesRecord} {mesesRecord === 1 ? 'mes' : 'meses'} y las {cartasVistas} cartas
              que llevas descubiertas. También la partida a medias, si la hay, y lo que dejó el gobierno anterior:
              volvería a empezar como el primer día. No se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => { sfx.boton(); setBorrando(false) }} style={botonSecundario}>
                Cancelar
              </button>
              <button
                onClick={() => { sfx.boton(); borrarTodo() }}
                style={{
                  ...pixel,
                  background: COLOR.peligro,
                  border: 'none',
                  borderRadius: 8,
                  padding: '7px 18px',
                  fontWeight: 400,
                  fontSize: 16,
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                Borrar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmando && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 30,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            style={{
              background: COLOR.panel,
              borderRadius: 14,
              padding: '22px 20px',
              maxWidth: 300,
              width: '100%',
              boxSizing: 'border-box',
              textAlign: 'center',
              border: '1px solid rgba(255,77,77,0.35)',
            }}
          >
            <p style={{ ...pixel, margin: '0 0 18px', fontWeight: 500, fontSize: 18, lineHeight: 1.4, color: COLOR.texto }}>
              ¿Empezar de cero?
              <br />
              Perderás la partida de {Math.max(0, mesEnCurso - 1)} meses.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => { sfx.boton(); setConfirmando(false) }} style={botonSecundario}>
                Cancelar
              </button>
              <button
                onClick={() => {
                  sfx.boton()
                  setConfirmando(false)
                  onStart()
                }}
                style={{
                  ...pixel,
                  background: COLOR.peligro,
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 18px',
                  fontWeight: 400,
                  fontSize: 16,
                  color: '#1a1a1a',
                  cursor: 'pointer',
                }}
              >
                Sí, borrarla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const botonPrimario: CSSProperties = {
  ...pixel,
  background: COLOR.oro,
  border: 'none',
  borderRadius: 10,
  padding: '13px 30px',
  fontWeight: 400,
  fontSize: 23,
  cursor: 'pointer',
}

// Mismo aspecto que los botones secundarios de la pantalla de fin
// (compartir / logros), por consistencia.
const botonSecundario: CSSProperties = {
  ...pixel,
  background: 'transparent',
  border: '2px solid rgba(224,184,77,0.45)',
  borderRadius: 8,
  padding: '7px 18px',
  fontWeight: 400,
  fontSize: 16,
  color: COLOR.oro,
  cursor: 'pointer',
}

// Mas discreto que el secundario: no compite con "El reparto" y "Logros", que
// son las dos que el jugador usa de verdad entre partidas.
const botonTerciario: CSSProperties = {
  background: 'none',
  border: 'none',
  ...pixel,
  fontWeight: 500,
  fontSize: 14,
  color: '#7d7768',
  cursor: 'pointer',
  padding: '2px 8px',
  textDecoration: 'underline',
  textUnderlineOffset: 3,
}
