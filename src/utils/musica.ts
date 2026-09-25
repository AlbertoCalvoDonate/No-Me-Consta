import { sfx } from './sfx'

// Música de fondo. Tres papeles y cuatro pistas para el de partida.
//
// Los bucles vienen ya cosidos de scripts/musica.mjs: cada archivo encadena
// consigo mismo sin salto, así que aquí basta con `loop = true` y nunca se oye
// la costura. Se reproducen con Web Audio y no con un <audio>, porque el bucle
// de un elemento <audio> mete un hueco de unos milisegundos en cada vuelta y
// en una pieza a 170 pulsos por minuto eso se oye como un tropiezo.
//
// Todo cuelga del bus de sfx, que a su vez cuelga del master: el botón de
// volumen que ya existía gobierna la música sin nada añadido, y al mutear se
// cierra el contexto y la música se para sola.

type Papel = 'titulo' | 'partida' | 'final'

// Cuánto suena cada papel respecto al volumen general. En partida va mucho más
// bajo a propósito: ahí lo que manda es el texto de la carta, y la música solo
// tiene que estar. En el título y en el final no compite con nada, así que
// puede oírse de verdad.
// Estos valores multiplican un archivo que ya esta a -20 LUFS. Medido en la
// salida real del navegador con estos numeros: el titulo sale a -19,6 dBFS de
// media con picos en -5, que deja margen de sobra para que los efectos se
// sumen sin saturar; la partida a -30, doce decibelios por debajo, que es el
// sitio de un fondo que no debe competir con el texto de la carta.
const NIVEL: Record<Papel, number> = {
  titulo: 0.72,
  partida: 0.18,
  final: 0.36,
}

// Cuatro variaciones para la partida. Se elige una por partida, no una fija:
// son el mismo vals con arreglos distintos, así que la partida siguiente suena
// familiar pero no idéntica. Un solo bucle de 72 segundos durante media hora
// cansa por bueno que sea.
const PARTIDA = ['partida-1', 'partida-2', 'partida-3', 'partida-4']

// Cambiar de pantalla cruza una pieza con otra: 1,2 s basta y no se arrastra.
const FUNDIDO = 1.2
// La PRIMERA vez entra desde el silencio absoluto, asi que sube un poco mas
// despacio para no dar un portazo. Poco mas: la musica ya no suena en el menu
// sino al empezar la partida, y ahi lo que se quiere es que este cuanto antes.
//
// Juega a favor un detalle de Web Audio: mientras el contexto esta suspendido
// su reloj NO avanza, asi que la rampa se programa y se ejecuta entera a
// partir del momento en que se despierta. No hay que sincronizar nada.
const FUNDIDO_FRIO = 1.8
let yaSono = false

// Lo que SUENA ahora mismo.
let papelActual: Papel | null = null
// Lo que se ha pedido que suene. Se apunta nada mas pedirlo, antes de la
// descarga: `arrancar` es asincrona y sin esto varias llamadas seguidas (un
// re-render basta) pasaban todas la comprobacion y se descargaba la misma
// pista cuatro veces.
let papelPedido: Papel | null = null
let pistaPedida: string | null = null
let fuente: AudioBufferSourceNode | null = null
let ganancia: GainNode | null = null
// El contexto sobre el que esta sonando lo que suena. Sirve para distinguir
// "han cambiado el volumen" de "han mutado y el contexto es otro".
let ctxActual: AudioContext | null = null
const cache = new Map<string, AudioBuffer>()
let enCurso = 0

// Opus donde se pueda (la mitad de tamaño) y AAC para Safari viejo.
function extension(): string {
  const a = document.createElement('audio')
  return a.canPlayType('audio/webm; codecs=opus') ? '.webm' : '.m4a'
}

async function cargar(ctx: AudioContext, nombre: string): Promise<AudioBuffer | null> {
  const ya = cache.get(nombre)
  if (ya) return ya
  try {
    const res = await fetch('/musica/' + nombre + extension())
    if (!res.ok) return null
    const buf = await ctx.decodeAudioData(await res.arrayBuffer())
    cache.set(nombre, buf)
    return buf
  } catch {
    // Sin música se juega igual. No es motivo para romper nada.
    return null
  }
}

function parar(ctx: AudioContext, g: GainNode | null, f: AudioBufferSourceNode | null) {
  if (!g || !f) return
  const t = ctx.currentTime
  g.gain.cancelScheduledValues(t)
  g.gain.setValueAtTime(g.gain.value, t)
  g.gain.linearRampToValueAtTime(0, t + FUNDIDO)
  try {
    f.stop(t + FUNDIDO + 0.05)
  } catch {
    /* ya estaba parada */
  }
}

async function arrancar(papel: Papel, nombre: string) {
  const bus = sfx.busDeMusica()
  if (!bus) return
  const { ctx, destino } = bus
  // El navegador crea el contexto suspendido hasta que el usuario toca algo.
  // Los efectos no lo notan porque siempre salen detras de un gesto, pero la
  // musica del titulo arranca sola al cargar la pagina: sin esto se quedaba
  // muda para siempre aunque el buffer estuviera sonando.
  if (ctx.state === 'suspended') void ctx.resume()
  const mio = ++enCurso
  const buf = await cargar(ctx, nombre)
  // Mientras se descargaba puede haber cambiado de pantalla: si ya no toca
  // esta pista, no se arranca.
  if (!buf || mio !== enCurso) return

  parar(ctx, ganancia, fuente)

  const g = ctx.createGain()
  g.gain.value = 0
  g.connect(destino)
  const f = ctx.createBufferSource()
  f.buffer = buf
  f.loop = true
  f.connect(g)
  f.start()
  const t = ctx.currentTime
  const subida = yaSono ? FUNDIDO : FUNDIDO_FRIO
  // Solo cuenta como "ya ha sonado" si el contexto estaba despierto: si el
  // jugador entro a jugar antes de tocar nada, la del titulo no llego a oirse
  // y la de partida sigue siendo la primera. Sin esto entraba con el fundido
  // corto, que desde el silencio es el portazo que se trataba de evitar.
  if (ctx.state === 'running') yaSono = true
  g.gain.setValueAtTime(0, t)
  // Rampa exponencial y no lineal: el oido no percibe el volumen de forma
  // lineal, y una rampa recta se oye como que "salta" al principio y se
  // arrastra al final. Se arranca desde un valor minusculo porque
  // exponentialRamp no admite empezar en cero.
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, NIVEL[papel]), t + subida)

  ganancia = g
  fuente = f
  ctxActual = ctx
  papelActual = papel
}

// Al minimizar el navegador o apagar la pantalla del movil, Web Audio sigue
// sonando: el vals se queda tocando dentro del bolsillo. Al esconderse la
// pestana se baja la musica y se suspende el contexto entero, que ademas deja
// de gastar bateria y de ocupar la salida de audio.
//
// El corte no es seco. Un cuarto de segundo de bajada sobra para que no
// chasquee, y hace falta de verdad: en el movil el sonido sigue saliendo por
// el altavoz mientras la pantalla se apaga, asi que ese chasquido se oiria.
const CORTE = 0.25
let dormidaPorLaPestana = false
let temporizador: number | null = null
// En desarrollo React monta dos veces, y el oyente se engancharia dos veces con
// el.
let vigilando = false

function vigilarLaPestana() {
  if (vigilando) return
  vigilando = true
  document.addEventListener('visibilitychange', () => {
    const bus = sfx.busDeMusica()
    if (!bus) return
    const { ctx } = bus
    if (temporizador !== null) {
      clearTimeout(temporizador)
      temporizador = null
    }
    if (document.hidden) {
      // Si no estaba sonando (nadie ha tocado nada todavia, o esta en mudo) no
      // hay nada que dormir, y suspender aqui estropearia el despertar.
      if (ctx.state !== 'running') return
      dormidaPorLaPestana = true
      if (ganancia) {
        const t = ctx.currentTime
        ganancia.gain.cancelScheduledValues(t)
        ganancia.gain.setValueAtTime(ganancia.gain.value, t)
        ganancia.gain.linearRampToValueAtTime(0, t + CORTE)
      }
      // Se espera a que acabe la bajada para suspender: suspender para el reloj
      // del contexto, asi que hacerlo antes congelaria la rampa a medias y el
      // corte volveria a ser seco. Los navegadores frenan los temporizadores de
      // las pestanas ocultas, pero disparar tarde solo significa un poco mas de
      // silencio antes de suspender, que no se nota.
      temporizador = window.setTimeout(
        () => {
          temporizador = null
          if (document.hidden) void ctx.suspend()
        },
        CORTE * 1000 + 50
      )
    } else {
      if (!dormidaPorLaPestana) return
      dormidaPorLaPestana = false
      // Volver no necesita gesto: el contexto se suspendio estando ya despierto,
      // y la norma solo exige el gesto la primera vez.
      if (ctx.state === 'suspended') void ctx.resume()
      const papel = papelActual
      if (ganancia && papel) {
        const t = ctx.currentTime
        ganancia.gain.cancelScheduledValues(t)
        ganancia.gain.setValueAtTime(Math.max(0.0001, ganancia.gain.value), t)
        ganancia.gain.exponentialRampToValueAtTime(Math.max(0.0002, NIVEL[papel]), t + FUNDIDO)
      }
    }
  })
}

// Los gestos que el navegador acepta como "el usuario ha interactuado". Se
// escuchan todos porque cuanto antes se suelte el audio, mas natural queda:
// mover el raton NO cuenta (no es un gesto de activacion segun la norma), asi
// que el primero suele ser el clic en cualquier sitio.
const EVENTOS = ['pointerdown', 'pointerup', 'mousedown', 'keydown', 'touchstart', 'touchend']

// Mientras el contexto siga suspendido, cualquier gesto sirve para soltarlo.
// Se desengancha solo en cuanto lo consigue.
function despertarAlPrimerGesto() {
  const intentar = () => {
    const bus = sfx.busDeMusica()
    if (!bus) return
    if (bus.ctx.state === 'suspended') {
      void bus.ctx.resume()
      return
    }
    for (const ev of EVENTOS) window.removeEventListener(ev, intentar)
  }
  for (const ev of EVENTOS) window.addEventListener(ev, intentar, { passive: true })
}

export const musica = {
  // Pone la música del papel indicado. Si ya está sonando la correcta no hace
  // nada, para que un re-render no la reinicie.
  poner(papel: Papel) {
    const nombre =
      papel === 'partida'
        ? // Se mantiene la misma pista mientras dure la partida; solo se
          // sortea otra cuando se vuelve a entrar a jugar.
          pistaEnPartida ?? (pistaEnPartida = PARTIDA[Math.floor(Math.random() * PARTIDA.length)])
        : papel
    if (papelPedido === papel && pistaPedida === nombre) return
    papelPedido = papel
    pistaPedida = nombre
    void arrancar(papel, nombre)
  },

  // Al empezar una partida nueva se sortea otra variación.
  barajarPartida() {
    pistaEnPartida = PARTIDA[Math.floor(Math.random() * PARTIDA.length)]
    if (papelPedido === 'partida') {
      papelPedido = null
      pistaPedida = null
    }
  },

  callar() {
    const bus = sfx.busDeMusica()
    enCurso++
    if (bus) parar(bus.ctx, ganancia, fuente)
    ganancia = null
    fuente = null
    papelActual = null
    papelPedido = null
    pistaPedida = null
  },

  // El botón de volumen cierra el contexto al mutear y lo recrea al volver, y
  // con él se van todos los nodos. Esto reengancha la música que tocara.
  reengancharAlVolumen() {
    despertarAlPrimerGesto()
    vigilarLaPestana()
    sfx.alCambiarElVolumen(() => {
      const bus = sfx.busDeMusica()
      // Si el contexto es el MISMO y la pista sigue sonando, no hay nada que
      // hacer: el boton de volumen ya ha movido la ganancia del bus.
      //
      // Aqui estaba el fallo de "suenan cuatro canciones a la vez". Esto
      // rearrancaba en cada paso del volumen, y ademas ponia `fuente` y
      // `ganancia` a null ANTES de llamar a arrancar, asi que el `parar` que
      // arrancar hace lo primero recibia dos nulos y no paraba nada: la pista
      // vieja se quedaba sonando para siempre y encima entraba otra. Cuatro
      // toques al boton, cuatro valses a la vez.
      if (bus && bus.ctx === ctxActual && fuente) return
      const papel = papelActual ?? papelPedido
      // Solo se sueltan los nodos cuando de verdad han muerto con su contexto
      // (mutear lo cierra). Si siguieran vivos, soltarlos aqui es lo que
      // impedia pararlos.
      ganancia = null
      fuente = null
      ctxActual = null
      papelActual = null
      papelPedido = papel
      pistaPedida = null
      if (papel && bus) {
        void arrancar(papel, papel === 'partida' ? (pistaEnPartida ?? PARTIDA[0]) : papel)
      }
    })
  },
}

let pistaEnPartida: string | null = null
