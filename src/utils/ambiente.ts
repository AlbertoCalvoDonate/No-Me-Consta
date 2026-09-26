import { sfx } from './sfx'

// EL DESPACHO. El fondo del juego ya no es musica, es el sitio donde pasa.
//
// Habia un vals, cuatro variaciones cosidas en bucle, y sonaba bien: el
// problema es que sonaba A ALGO. Una melodia te dice como sentirte, y este
// juego va de leer una carta, dudar y decidir; la melodia se pone delante de
// eso. Un despacho no. Un despacho solo esta ahi, y cuando llevas veinte
// minutos ya no lo oyes, que es exactamente lo que tiene que hacer un fondo.
//
// Ademas se va de encima el peso: los cuatro ficheros eran 5,5 MB, mas que
// todo el resto del juego junto. Esto no pesa nada porque no es un fichero,
// son osciladores y ruido generados en el momento, como el resto de sonidos.
//
// De que esta hecho:
//
//  - EL ZUMBIDO. Ruido filtrado muy grave y muy bajo, en bucle: el aire
//    acondicionado, el edificio. Con el filtro moviendose despacio, porque un
//    ruido perfectamente quieto el oido lo detecta como artificial en
//    segundos y deja de creerselo.
//  - LOS SUCESOS. Cada pocos segundos pasa algo pequeño y lejos: alguien
//    teclea, un telefono suena dos veces al fondo, papeles, una puerta, dos
//    voces que no se entienden. Repartidos por el estereo, que es lo que hace
//    que el sitio tenga ancho y no sea una pared de ruido.
//
// Todo cuelga del bus que ya existia para la musica, asi que el boton de
// volumen lo gobierna igual y al mutear se calla solo.

// Cada cuanto pasa algo, en segundos. Ni muy seguido (parece una oficina de
// dibujos animados) ni muy espaciado (deja de haber sitio y vuelve a ser un
// zumbido pelado).
const ENTRE_SUCESOS = [2.4, 6.5]

// Volumen del fondo dentro de su propio bus, que ya viene atenuado (ver
// AMBIENTE_GAIN en sfx). Muy abajo a proposito: esto no es para que se oiga,
// es para que se note cuando no esta.
const NIVEL = 0.12

let bus: { ctx: AudioContext; destino: GainNode } | null = null
let zumbido: AudioBufferSourceNode | null = null
let ganancia: GainNode | null = null
let reloj: number | null = null
let encendido = false

function ruidoEnBucle(ctx: AudioContext): AudioBuffer {
  // Tres segundos de ruido rosa pobre (ruido blanco filtrado a mano): el
  // blanco puro silba, y lo que suena a edificio es lo de abajo.
  const n = ctx.sampleRate * 3
  const buf = ctx.createBuffer(1, n, ctx.sampleRate)
  const d = buf.getChannelData(0)
  let ultimo = 0
  for (let i = 0; i < n; i++) {
    const blanco = Math.random() * 2 - 1
    // Paso bajo de un polo: cada muestra arrastra a la siguiente.
    ultimo = ultimo * 0.97 + blanco * 0.03
    d[i] = ultimo * 8
  }
  // Los extremos se cosen entre si para que el bucle no de un golpe cada tres
  // segundos: el final se funde con el principio.
  const cose = Math.floor(ctx.sampleRate * 0.25)
  for (let i = 0; i < cose; i++) {
    const k = i / cose
    d[i] = d[i] * k + d[n - cose + i] * (1 - k)
  }
  return buf
}

function arrancarZumbido() {
  if (!bus || zumbido) return
  const { ctx, destino } = bus
  const g = ctx.createGain()
  g.gain.value = 0
  g.connect(destino)

  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 220
  lp.Q.value = 0.7
  lp.connect(g)

  // El filtro respira: sube y baja un poco cada veinte segundos largos. Es lo
  // que separa "una sala" de "un fichero de ruido".
  const lfo = ctx.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = 0.045
  const prof = ctx.createGain()
  prof.gain.value = 70
  lfo.connect(prof)
  prof.connect(lp.frequency)
  lfo.start()

  const f = ctx.createBufferSource()
  f.buffer = ruidoEnBucle(ctx)
  f.loop = true
  f.connect(lp)
  f.start()

  const t = ctx.currentTime
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(NIVEL, t + 2.5)

  zumbido = f
  ganancia = g
}

// Los sucesos. Cada uno es corto, esta lejos y no se repite igual dos veces.
const SUCESOS: ((pan: number) => void)[] = [
  // Alguien teclea al otro lado del tabique.
  (pan) => {
    const cuantas = 3 + Math.floor(Math.random() * 5)
    for (let i = 0; i < cuantas; i++) {
      sfx.enElAmbiente('ruido', {
        dur: 0.012,
        retraso: i * (0.07 + Math.random() * 0.06),
        volumen: 1.6 + Math.random() * 0.9,
        filtro: 2600 + Math.random() * 1200,
        tipoFiltro: 'bandpass',
        pan,
      })
    }
  },
  // Un telefono, dos tonos, con una puerta de por medio.
  (pan) => {
    for (const r of [0, 0.42]) {
      sfx.enElAmbiente('nota', { freq: 660, dur: 0.3, retraso: r, volumen: 0.34, filtro: 700, pan })
      sfx.enElAmbiente('nota', { freq: 990, dur: 0.3, retraso: r, volumen: 0.2, filtro: 700, pan })
    }
  },
  // Papeles.
  (pan) => {
    sfx.enElAmbiente('ruido', {
      dur: 0.22, volumen: 1.7, filtro: 2000, tipoFiltro: 'lowpass', barridoA: 900, pan,
    })
  },
  // Una puerta, lejos.
  (pan) => {
    sfx.enElAmbiente('ruido', {
      dur: 0.12, volumen: 3, filtro: 240, tipoFiltro: 'lowpass', barridoA: 90, pan,
    })
  },
  // Dos que hablan y no se les entiende: ruido en la banda de la voz, con la
  // amplitud moviendose como se mueve una frase.
  (pan) => {
    const silabas = 4 + Math.floor(Math.random() * 5)
    for (let i = 0; i < silabas; i++) {
      sfx.enElAmbiente('ruido', {
        dur: 0.09 + Math.random() * 0.08,
        retraso: i * (0.13 + Math.random() * 0.1),
        volumen: 0.75 + Math.random() * 0.6,
        filtro: 400 + Math.random() * 500,
        tipoFiltro: 'bandpass',
        pan,
      })
    }
  },
]

function programarSuceso() {
  const [min, max] = ENTRE_SUCESOS
  const espera = (min + Math.random() * (max - min)) * 1000
  reloj = window.setTimeout(() => {
    if (encendido) {
      const cual = SUCESOS[Math.floor(Math.random() * SUCESOS.length)]
      // De lado, nunca en el centro: el centro es donde esta el jugador.
      const pan = (Math.random() < 0.5 ? -1 : 1) * (0.35 + Math.random() * 0.5)
      cual(pan)
      programarSuceso()
    }
  }, espera)
}

function parar() {
  if (reloj !== null) {
    clearTimeout(reloj)
    reloj = null
  }
  if (bus && ganancia && zumbido) {
    const t = bus.ctx.currentTime
    ganancia.gain.cancelScheduledValues(t)
    ganancia.gain.setValueAtTime(Math.max(0.0001, ganancia.gain.value), t)
    ganancia.gain.exponentialRampToValueAtTime(0.0001, t + 0.8)
    try {
      zumbido.stop(t + 0.9)
    } catch {
      /* ya estaba parado */
    }
  }
  zumbido = null
  ganancia = null
}

export const ambiente = {
  arrancar() {
    if (encendido) return
    bus = sfx.busDeMusica()
    if (!bus) return
    if (bus.ctx.state === 'suspended') void bus.ctx.resume()
    encendido = true
    arrancarZumbido()
    programarSuceso()
  },

  callar() {
    encendido = false
    parar()
    bus = null
  },

  // Se llama una vez al montar el juego. Deja enganchadas las dos cosas que
  // pueden matar el fondo por detras: el boton de volumen (que al mutear
  // CIERRA el contexto de audio y se lleva todos los nodos) y esconder la
  // pestana, que si no deja el despacho sonando dentro del bolsillo.
  vigilar() {
    sfx.alCambiarElVolumen(() => {
      const nuevo = sfx.busDeMusica()
      if (nuevo && bus && nuevo.ctx === bus.ctx && zumbido) return
      const estaba = encendido
      encendido = false
      if (reloj !== null) {
        clearTimeout(reloj)
        reloj = null
      }
      zumbido = null
      ganancia = null
      bus = null
      if (estaba) ambiente.arrancar()
    })

    document.addEventListener('visibilitychange', () => {
      if (!bus) return
      if (document.hidden) {
        if (ganancia) {
          const t = bus.ctx.currentTime
          ganancia.gain.cancelScheduledValues(t)
          ganancia.gain.setValueAtTime(Math.max(0.0001, ganancia.gain.value), t)
          ganancia.gain.exponentialRampToValueAtTime(0.0001, t + 0.25)
        }
        if (reloj !== null) {
          clearTimeout(reloj)
          reloj = null
        }
      } else if (encendido) {
        if (bus.ctx.state === 'suspended') void bus.ctx.resume()
        if (ganancia) {
          const t = bus.ctx.currentTime
          ganancia.gain.cancelScheduledValues(t)
          ganancia.gain.setValueAtTime(Math.max(0.0001, ganancia.gain.value), t)
          ganancia.gain.exponentialRampToValueAtTime(NIVEL, t + 1.2)
        }
        programarSuceso()
      }
    })
  },
}
