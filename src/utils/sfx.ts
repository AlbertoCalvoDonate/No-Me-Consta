// Sonidos SINTETIZADOS con Web Audio, sin un solo archivo de audio: todo son
// osciladores creados al vuelo. Pesa cero en el bundle y encaja con la
// estética pixel del juego, que es medio chiptune de todos modos.
//
// Reglas de la casa:
//  - El AudioContext no se puede crear hasta que el usuario toca algo (los
//    navegadores lo bloquean), así que se crea perezosamente en el primer
//    sonido, que siempre viene detrás de un clic o un swipe.
//  - Todo sonido es corto (< 1s salvo el final) y va a un volumen bajo: esto
//    acompaña, no compite con el texto.
//  - Se puede silenciar, y la preferencia se recuerda. Un juego que suena sin
//    permiso en una pestaña es un juego que se cierra.

const STORAGE_KEY = 'nomeconsta.sonido'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let enabled = leerPreferencia()

function leerPreferencia(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off'
  } catch {
    // Modo incógnito o cookies bloqueadas: no es motivo para quedarse mudo.
    return true
  }
}

function getCtx(): AudioContext | null {
  if (!enabled) return null
  if (ctx) return ctx
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
    master = ctx.createGain()
    master.gain.value = 0.16
    master.connect(ctx.destination)
  } catch {
    return null
  }
  return ctx
}

// Una nota. `bend` sube o baja el tono durante la nota (para los glissandos).
function nota(
  freq: number,
  dur: number,
  {
    tipo = 'square' as OscillatorType,
    retraso = 0,
    volumen = 1,
    bend = 0,
  } = {}
) {
  const c = getCtx()
  if (!c || !master) return
  const t0 = c.currentTime + retraso
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = tipo
  osc.frequency.setValueAtTime(freq, t0)
  if (bend) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + bend), t0 + dur)
  // Ataque muy corto y caída exponencial: sin esto se oye un "clic" al cortar.
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(volumen, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g)
  g.connect(master)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

// Ruido blanco con envolvente: sirve para papeles, murmullos y aplausos.
function ruido(dur: number, { retraso = 0, volumen = 0.5, filtro = 1200 } = {}) {
  const c = getCtx()
  if (!c || !master) return
  const t0 = c.currentTime + retraso
  const n = Math.floor(c.sampleRate * dur)
  const buf = c.createBuffer(1, n, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = filtro
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(volumen, t0 + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(bp)
  bp.connect(g)
  g.connect(master)
  src.start(t0)
  src.stop(t0 + dur)
}

export const sfx = {
  // Al empezar a arrastrar la carta: un toque seco, casi imperceptible.
  roce() {
    nota(320, 0.05, { tipo: 'triangle', volumen: 0.25 })
  },

  // Elección turbia: la moneda de toda la vida, dos notas rápidas hacia
  // arriba. Suena a premio, que es justo el chiste.
  moneda() {
    nota(988, 0.07, { tipo: 'square', volumen: 0.5 })
    nota(1319, 0.22, { tipo: 'square', retraso: 0.07, volumen: 0.5 })
  },

  // Elección honesta: una campanita limpia. Suena bien y no da nada.
  campana() {
    nota(880, 0.16, { tipo: 'triangle', volumen: 0.45 })
    nota(1320, 0.3, { tipo: 'triangle', retraso: 0.05, volumen: 0.28 })
  },

  // Elección neutra: papeles.
  papel() {
    ruido(0.13, { volumen: 0.28, filtro: 2600 })
  },

  // Una barra entra en zona crítica: dos pitidos de alarma barata.
  alarma() {
    nota(440, 0.1, { tipo: 'sawtooth', volumen: 0.35 })
    nota(440, 0.1, { tipo: 'sawtooth', retraso: 0.15, volumen: 0.35 })
  },

  // Balance de fin de año: campanita de calendario, tres notas subiendo.
  balance() {
    nota(659, 0.12, { tipo: 'triangle', volumen: 0.4 })
    nota(784, 0.12, { tipo: 'triangle', retraso: 0.11, volumen: 0.4 })
    nota(1047, 0.26, { tipo: 'triangle', retraso: 0.22, volumen: 0.4 })
  },

  // Noche electoral: fanfarria cutre de telediario, con su murmullo detrás.
  eleccion() {
    nota(523, 0.13, { tipo: 'square', volumen: 0.4 })
    nota(659, 0.13, { tipo: 'square', retraso: 0.12, volumen: 0.4 })
    nota(784, 0.13, { tipo: 'square', retraso: 0.24, volumen: 0.4 })
    nota(1047, 0.34, { tipo: 'square', retraso: 0.36, volumen: 0.45 })
    ruido(0.5, { retraso: 0.36, volumen: 0.14, filtro: 900 })
  },

  // Fin del gobierno: el trombón triste de toda la vida. Cuatro notas que
  // caen, cada una arrastrando el tono hacia abajo. Es LA broma del juego.
  trombon() {
    const notas = [392, 349, 330, 262]
    notas.forEach((f, i) => {
      nota(f, i === notas.length - 1 ? 0.75 : 0.28, {
        tipo: 'sawtooth',
        retraso: i * 0.26,
        volumen: 0.5,
        bend: -28,
      })
    })
  },

  // Sobrevivir las tres legislaturas: la fanfarria buena, con aplausos.
  triunfo() {
    const notas = [523, 659, 784, 1047, 1319]
    notas.forEach((f, i) => nota(f, 0.2, { tipo: 'square', retraso: i * 0.12, volumen: 0.42 }))
    ruido(1.1, { retraso: 0.6, volumen: 0.2, filtro: 1500 })
  },

  // --- silenciador -------------------------------------------------------
  activo(): boolean {
    return enabled
  },
  alternar(): boolean {
    enabled = !enabled
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off')
    } catch {
      /* sin persistencia, pero la sesión actual respeta la elección */
    }
    if (!enabled && ctx) {
      void ctx.close()
      ctx = null
      master = null
    }
    return enabled
  },
}
