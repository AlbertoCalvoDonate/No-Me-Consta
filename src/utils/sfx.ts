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
//  - El volumen se ajusta en pasos (25/50/75/100 % y mudo) y la preferencia se
//    recuerda. Un juego que suena sin permiso en una pestaña es un juego que
//    se cierra.
//
// CADENA: cada sonido entra por seco (`mezcla`) y, si quiere, manda una copia
// al envío de reverb. Todo pasa por un compresor antes de salir, porque en una
// partida rápida se solapan tres o cuatro sonidos y sin él saturaba.
//
//   nota/ruido ──┬─────────────────────► mezcla ─► master(volumen) ─► comp ─► out
//                └─► envio ─► convolver ─┘

const STORAGE_KEY = 'nomeconsta.volumen'

// Ganancia del bus principal al 100 %. Los pasos son fracciones de esta.
const BASE_GAIN = 0.16

// El ciclo que recorre el botón, en orden: 25 → 50 → 75 → 100 → mudo → 25...
const PASOS = [0.25, 0.5, 0.75, 1, 0] as const
const POR_DEFECTO = 3 // 100 %

let ctx: AudioContext | null = null
let master: GainNode | null = null
let mezcla: GainNode | null = null
let envio: GainNode | null = null
let paso = leerPaso()
// La musica cuelga del mismo master que los efectos, para que el boton de
// volumen que ya existe la gobierne sin logica aparte. Va por su propio nodo
// porque tiene su propia mezcla (el fondo de partida suena mas bajo que el del
// titulo) y porque hay que poder fundirla sin tocar los efectos.
let busMusica: GainNode | null = null
// El fondo de despacho cuelga de aqui, y esto de busMusica. Hace falta un
// nodo propio porque el bus de musica NO pasa por `master` (ver mas abajo el
// porque), asi que no tiene la atenuacion de 0,16 que llevan los efectos: un
// ruido sintetizado a escala completa entraba por ahi a -4,8 dB, o sea a
// todo trapo. Este numero es esa atenuacion, medida en la salida real hasta
// dejar la cama del fondo cerca de -50 dB.
const AMBIENTE_GAIN = 0.018
let busAmbiente: GainNode | null = null
let avisarCambio: (() => void) | null = null

function leerPaso(): number {
  try {
    const v = Number.parseInt(localStorage.getItem(STORAGE_KEY) ?? '', 10)
    return Number.isInteger(v) && v >= 0 && v < PASOS.length ? v : POR_DEFECTO
  } catch {
    // Modo incógnito o cookies bloqueadas: no es motivo para quedarse mudo.
    return POR_DEFECTO
  }
}

// Respuesta al impulso de una sala pequeña, generada al vuelo: ruido que decae
// exponencialmente. Corta (0,9 s) a propósito — queremos que los sonidos tengan
// aire, no que suenen dentro de una catedral.
function salaCorta(c: AudioContext): AudioBuffer {
  const dur = 0.9
  const n = Math.floor(c.sampleRate * dur)
  const buf = c.createBuffer(2, n, c.sampleRate)
  for (let canal = 0; canal < 2; canal++) {
    const d = buf.getChannelData(canal)
    for (let i = 0; i < n; i++) {
      // El (1 - i/n)^3 da la caída; el arranque suave evita el "clic" inicial.
      const caida = Math.pow(1 - i / n, 3)
      d[i] = (Math.random() * 2 - 1) * caida * Math.min(1, i / 400)
    }
  }
  return buf
}

function getCtx(): AudioContext | null {
  if (PASOS[paso] === 0) return null
  if (ctx) return ctx
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()

    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -18
    comp.knee.value = 12
    comp.ratio.value = 6
    comp.attack.value = 0.004
    comp.release.value = 0.18
    comp.connect(ctx.destination)

    master = ctx.createGain()
    master.gain.value = BASE_GAIN * PASOS[paso]
    master.connect(comp)

    mezcla = ctx.createGain()
    mezcla.connect(master)

    const conv = ctx.createConvolver()
    conv.buffer = salaCorta(ctx)
    conv.connect(mezcla)
    envio = ctx.createGain()
    envio.gain.value = 1
    envio.connect(conv)

    // La musica NO pasa por `master` ni por el compresor. BASE_GAIN (0,16)
    // esta calibrado para osciladores a escala completa, y los archivos de
    // musica ya vienen normalizados a -20 LUFS: encadenar las dos atenuaciones
    // dejaba el fondo en -41 dBFS, o sea inaudible. Medido con la cadena real
    // en el navegador: 0,55 x 0,16 = 0,088.
    // Cuelga del destino con el PASO de volumen como unica ganancia, asi el
    // boton lo sigue gobernando y al mutear el contexto se cierra igual.
    busMusica = ctx.createGain()
    busMusica.gain.value = PASOS[paso]
    busMusica.connect(ctx.destination)

    busAmbiente = ctx.createGain()
    busAmbiente.gain.value = AMBIENTE_GAIN
    busAmbiente.connect(busMusica)
  } catch {
    return null
  }
  return ctx
}

// Micro-desafinado aleatorio (±12 céntimos). El roce y los "papeles" suenan en
// cada carta: sin esto se oyen como una ametralladora, siempre el mismo clip.
function pizcaDeAzar(): number {
  return 1 + (Math.random() - 0.5) * 0.014
}

interface OpcionesNota {
  tipo?: OscillatorType
  retraso?: number
  volumen?: number
  /** Sube o baja el tono durante la nota (glissandos). */
  bend?: number
  /** Segundo oscilador desafinado en céntimos: engorda el timbre. */
  unison?: number
  /** Filtro paso-bajo; si se da `barridoA`, hace un barrido hasta esa frecuencia. */
  filtro?: number
  barridoA?: number
  /** Cuánto se manda a la reverb (0-1). */
  reverb?: number
  /** Deja el tono exacto (para acordes y fanfarrias). */
  exacto?: boolean
  /** Cuanto tarda en llegar a su volumen. Por defecto 12 ms, que es "ya". */
  ataque?: number
  /** Izquierda -1, centro 0, derecha 1. Lo usa el fondo de despacho. */
  pan?: number
  /** A donde sale. Por defecto la mezcla de efectos. */
  destino?: AudioNode
}

function nota(freq: number, dur: number, o: OpcionesNota = {}) {
  const c = getCtx()
  if (!c || !mezcla || !envio) return
  const {
    tipo = 'square', retraso = 0, volumen = 1, bend = 0,
    unison = 0, filtro, barridoA, reverb = 0, exacto = false, ataque = 0.012,
    pan = 0, destino,
  } = o
  const t0 = c.currentTime + retraso
  const f = exacto ? freq : freq * pizcaDeAzar()

  const g = c.createGain()
  // Ataque muy corto y caída exponencial: sin esto se oye un "clic" al cortar.
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(volumen, t0 + Math.min(ataque, dur * 0.8))
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)

  let salida: AudioNode = g
  if (filtro) {
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.Q.value = 6
    lp.frequency.setValueAtTime(filtro, t0)
    if (barridoA) lp.frequency.exponentialRampToValueAtTime(Math.max(60, barridoA), t0 + dur)
    g.connect(lp)
    salida = lp
  }
  conectar(c, salida, destino ?? mezcla, pan)
  if (reverb > 0) {
    const env = c.createGain()
    env.gain.value = reverb
    salida.connect(env)
    env.connect(envio)
  }

  const voces = unison ? [0, unison, -unison] : [0]
  for (const cents of voces) {
    const osc = c.createOscillator()
    osc.type = tipo
    osc.frequency.setValueAtTime(f, t0)
    osc.detune.value = cents
    if (bend) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f + bend), t0 + dur)
    osc.connect(g)
    osc.start(t0)
    osc.stop(t0 + dur + 0.02)
  }
}

// Ruido con envolvente: sirve para papeles, murmullos y aplausos.
// Enchufa un nodo a su salida, metiendo un panoramizador por medio si hace
// falta. El fondo de despacho lo usa para repartir los ruidos por el estereo:
// una oficina en la que todo suena en el centro no suena a oficina.
function conectar(c: AudioContext, desde: AudioNode, hasta: AudioNode, pan: number) {
  if (!pan || typeof c.createStereoPanner !== 'function') {
    desde.connect(hasta)
    return
  }
  const p = c.createStereoPanner()
  p.pan.value = Math.max(-1, Math.min(1, pan))
  desde.connect(p)
  p.connect(hasta)
}

function ruido(
  dur: number,
  {
    retraso = 0, volumen = 0.5, filtro = 1200, tipoFiltro = 'bandpass' as BiquadFilterType,
    barridoA = 0, reverb = 0, pan = 0, destino = undefined as AudioNode | undefined,
  } = {}
) {
  const c = getCtx()
  if (!c || !mezcla || !envio) return
  const t0 = c.currentTime + retraso
  const n = Math.floor(c.sampleRate * dur)
  const buf = c.createBuffer(1, n, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const bp = c.createBiquadFilter()
  bp.type = tipoFiltro
  bp.frequency.setValueAtTime(filtro, t0)
  if (barridoA) bp.frequency.exponentialRampToValueAtTime(Math.max(60, barridoA), t0 + dur)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  // El ataque no puede durar mas que el sonido. Con 20 ms fijos, cualquier
  // ruido mas corto que eso programaba la caida ANTES del final de la subida
  // y no sonaba nada: las teclas del fondo de despacho, de 12 ms, salian a
  // -120 dB, o sea mudas. Una quinta parte de los sucesos del despacho no
  // existia y en la mezcla no se notaba, porque lo que falta no suena.
  g.gain.exponentialRampToValueAtTime(volumen, t0 + Math.min(0.02, dur * 0.4))
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(bp)
  bp.connect(g)
  conectar(c, g, destino ?? mezcla, pan)
  if (reverb > 0) {
    const env = c.createGain()
    env.gain.value = reverb
    g.connect(env)
    env.connect(envio)
  }
  src.start(t0)
  src.stop(t0 + dur)
}

export const sfx = {
  // Cualquier boton de la interfaz (empezar, logros, reparto, compartir...).
  // Seco y corto: no es un acontecimiento del juego, solo la confirmacion de
  // que el dedo ha dado donde queria. Dos capas, que un solo tono suena a
  // pitido y no a boton: el chasquido del contacto y debajo un golpe con
  // cuerpo que baja de tono.
  boton() {
    ruido(0.035, { volumen: 0.55, filtro: 3200, tipoFiltro: 'highpass' })
    nota(300, 0.07, { tipo: 'square', volumen: 0.6, filtro: 1400, bend: -90 })
  },

  // Al empezar a arrastrar la carta: un toque seco, casi imperceptible.
  roce() {
    nota(320, 0.06, { tipo: 'triangle', volumen: 0.34, filtro: 1800 })
  },

  // Elección turbia: la moneda de toda la vida, dos notas rápidas hacia
  // arriba. Suena a premio, que es justo el chiste.
  moneda() {
    nota(988, 0.07, { tipo: 'square', volumen: 0.45, unison: 8, reverb: 0.12 })
    nota(1319, 0.24, { tipo: 'square', retraso: 0.07, volumen: 0.45, unison: 8, reverb: 0.2 })
  },

  // Elección honesta: una campanita limpia. Suena bien y no da nada.
  campana() {
    nota(880, 0.18, { tipo: 'triangle', volumen: 0.42, unison: 5, reverb: 0.25 })
    nota(1320, 0.34, { tipo: 'triangle', retraso: 0.05, volumen: 0.24, reverb: 0.3 })
  },

  // Elección neutra: papeles.
  papel() {
    ruido(0.16, { volumen: 1.4, filtro: 2600, tipoFiltro: 'lowpass', barridoA: 1000, reverb: 0.1 })
  },

  // Un sonido del FONDO de despacho (ver utils/ambiente). Sale por el bus de
  // musica y no por la mezcla de efectos: asi el fondo se puede bajar, fundir
  // y dormir entero sin tocar los sonidos del juego, que es lo que hace falta
  // al esconder la pestana o al mutear.
  enElAmbiente(
    tipo: 'nota' | 'ruido',
    o: {
      freq?: number
      dur: number
      retraso?: number
      volumen?: number
      filtro?: number
      tipoFiltro?: BiquadFilterType
      barridoA?: number
      pan?: number
    }
  ) {
    const c = getCtx()
    if (!c || !busAmbiente) return
    if (tipo === 'nota') {
      nota(o.freq ?? 440, o.dur, {
        tipo: 'sine', retraso: o.retraso, volumen: o.volumen, filtro: o.filtro,
        exacto: true, pan: o.pan, destino: busAmbiente,
      })
    } else {
      ruido(o.dur, {
        retraso: o.retraso, volumen: o.volumen, filtro: o.filtro,
        tipoFiltro: o.tipoFiltro, barridoA: o.barridoA, pan: o.pan, destino: busAmbiente,
      })
    }
  },

  // REPARTIR. Al empezar una partida caen las cartas: tres golpes secos de
  // carton, cada uno un poco mas agudo y mas cerca del anterior, que es como
  // suena una baraja al dejarse caer. Es ruido filtrado y nada mas: el carton
  // no tiene tono, solo un golpe corto y ancho.
  //
  // El ultimo suena un pelo mas fuerte porque es la carta que se queda arriba,
  // la que el jugador va a leer.
  reparto() {
    const golpes = [
      { t: 0, v: 1.05, f: 1500 },
      { t: 0.115, v: 1.15, f: 1800 },
      { t: 0.2, v: 1.6, f: 2200 },
    ]
    for (const g of golpes) {
      ruido(0.055, {
        retraso: g.t, volumen: g.v, filtro: g.f, tipoFiltro: 'bandpass', barridoA: g.f * 0.45,
        reverb: 0.12,
      })
    }
  },

  // A SOLAS. Lo que suena en las cartas del Espejo, que no son un personaje
  // hablando sino usted pensando. Darles voz de personaje era decir "alguien
  // le habla" cuando no hay nadie: una nota grave, lenta y con mucha reverb,
  // que es como suena una habitacion cuando se queda vacia.
  aSolas() {
    nota(147, 1.5, {
      tipo: 'sine', retraso: 0.42, volumen: 0.42, ataque: 0.35, reverb: 0.55, exacto: true,
    })
    nota(220, 1.1, {
      tipo: 'sine', retraso: 0.55, volumen: 0.18, ataque: 0.4, reverb: 0.6, exacto: true,
    })
  },

  // LA VOZ DEL PERSONAJE. Dos notas cortas al llegar su carta, como el habla
  // de los bichos de Animal Crossing: no dice palabras, dice QUIEN.
  //
  // El registro no es decorativo, es el dato: sale del indicador que ese
  // personaje encarna. Agudo es prensa, medio es coalicion, grave es dinero.
  // Asi, antes de leer nada, el oido ya sabe que se juega, que es exactamente
  // la habilidad que pide un Reigns: ves quien habla y sabes lo que te juegas.
  // Dentro de su registro, cada personaje cae en una nota distinta de una
  // escala pentatonica -sacada de su nombre, asi que siempre la misma- y la
  // pentatonica no desafina contra ninguna de las cuatro musicas de partida.
  //
  // Va MUY bajo a proposito: suena en cada carta, y lo que suena en cada carta
  // no puede pedir atencion.
  voz(nombre: string, registro: 'medios' | 'gobierno' | 'calle' | 'caja' | 'ninguno') {
    const BASE = { medios: 784, gobierno: 523, calle: 440, caja: 294, ninguno: 392 }
    const PENTA = [0, 2, 4, 7, 9]
    let h = 0
    for (let i = 0; i < nombre.length; i++) h = nombre.charCodeAt(i) + ((h << 5) - h)
    const f = BASE[registro] * Math.pow(2, PENTA[Math.abs(h) % PENTA.length] / 12)
    // Compensacion de sonoridad: a igual amplitud, el oido oye menos los
    // graves, asi que las voces de caja B (las mas graves) salian por debajo
    // de las de medios. Medido con esta curva, las veinticinco voces caen
    // entre -40,0 y -36,4 dB, salvo la del propio presidente, que sale a
    // -45,1. Esa se queda asi: es la voz de uno mismo, y que sea la mas
    // discreta del reparto no molesta a nadie.
    const k = Math.pow(784 / f, 0.5)
    // ESPERA antes de hablar. La carta nueva se monta en el mismo instante en
    // que suena la eleccion de la anterior (la moneda, la campana), y eso son
    // treinta decibelios por encima de la voz: quedaba tapada del todo. Se
    // metio, se publico y no se oia.
    //
    // Casi medio segundo despues, el golpe ya ha caido y solo queda su cola, y
    // ademas es justo cuando la carta termina de entrar: el personaje habla
    // cuando acaba de llegar, que es lo que se espera.
    const ESPERA = 0.45
    nota(f, 0.08, {
      tipo: 'triangle', retraso: ESPERA, volumen: 0.52 * k, filtro: 2800, exacto: true, reverb: 0.1,
    })
    nota(f * 1.5, 0.06, {
      tipo: 'triangle', retraso: ESPERA + 0.055, volumen: 0.32 * k, filtro: 2800,
      exacto: true, reverb: 0.12,
    })
  },

  // Carta de fontanero: las unicas que no encienden los puntos. El sonido
  // dice lo mismo que la falta de puntos, y antes: dos notas graves a
  // distancia de tritono, secas y sin reverb, que es el intervalo que el oido
  // no sabe donde colocar. No resuelve, no sube, no baja. Se queda ahi.
  fontanero() {
    nota(98, 0.5, { tipo: 'triangle', volumen: 0.34, filtro: 700, unison: 4 })
    nota(138.6, 0.62, { tipo: 'triangle', retraso: 0.09, volumen: 0.24, filtro: 600, unison: 4 })
  },

  // Una barra entra en zona crítica: dos pitidos de alarma barata.
  alarma() {
    nota(440, 0.12, { tipo: 'sawtooth', volumen: 1, filtro: 2400, reverb: 0.12 })
    nota(440, 0.12, { tipo: 'sawtooth', retraso: 0.17, volumen: 1, filtro: 2400, reverb: 0.12 })
  },

  // Balance de fin de año: campanita de calendario, tres notas subiendo.
  balance() {
    const notas = [659, 784, 1047]
    notas.forEach((f, i) =>
      nota(f, i === 2 ? 0.28 : 0.13, {
        tipo: 'triangle', retraso: i * 0.11, volumen: 0.38, unison: 5, exacto: true, reverb: 0.3,
      })
    )
  },

  // GENTIO. La gente de la sede cuando sale el escrutinio: sesenta palmas
  // sueltas repartidas por el estereo, cada una con su tono y su momento, y
  // debajo el rumor de una sala llena. Las palmas no van a compas a proposito:
  // un aplauso sincronizado suena a maquina, y lo que hace que un aplauso
  // suene a gente es justamente que nadie da la palmada a la vez.
  //
  // Arranca flojo y se viene arriba, como en una sede de verdad: primero los
  // de delante, que ven la pantalla, y dos segundos despues el resto.
  gentio(dur = 2.4) {
    for (let i = 0; i < 60; i++) {
      // Repartidas en el tiempo con sesgo al principio... pero no del todo:
      // el cuadrado hace que se amontonen un poco mas tarde, que es cuando la
      // sala entera se entera.
      const t = Math.pow(Math.random(), 0.7) * dur
      ruido(0.022, {
        retraso: t,
        volumen: 1.1 + Math.random() * 1.5,
        filtro: 1300 + Math.random() * 2400,
        tipoFiltro: 'bandpass',
        reverb: 0.4,
        pan: (Math.random() * 2 - 1) * 0.85,
      })
    }
    // El rumor: la sala, las voces, el eco del local.
    ruido(dur + 0.6, { volumen: 1.5, filtro: 850, barridoA: 600, reverb: 0.55 })
    // Y dos gritos sueltos, que en toda sede hay alguien que grita.
    for (const g of [0.35, 1.25]) {
      ruido(0.28, {
        retraso: g, volumen: 0.95, filtro: 950, tipoFiltro: 'bandpass', barridoA: 1500,
        reverb: 0.5, pan: g > 1 ? 0.6 : -0.55,
      })
    }
  },

  // Noche electoral: fanfarria cutre de telediario, con su murmullo detrás.
  eleccion() {
    const notas = [523, 659, 784, 1047]
    notas.forEach((f, i) =>
      nota(f, i === 3 ? 0.36 : 0.13, {
        tipo: 'square', retraso: i * 0.12, volumen: 0.4, unison: 9, exacto: true, reverb: 0.25,
      })
    )
    ruido(0.5, { retraso: 0.36, volumen: 0.12, filtro: 900, reverb: 0.4 })
  },

  // Te acabas de ganar a alguien de verdad (carta de favor): dos notas
  // cómplices, en corto, como un apretón de manos que nadie ve.
  favor() {
    nota(587, 0.12, { tipo: 'triangle', volumen: 0.34, unison: 6, exacto: true, reverb: 0.25 })
    nota(880, 0.3, { tipo: 'triangle', retraso: 0.1, volumen: 0.3, unison: 6, exacto: true, reverb: 0.35 })
  },

  // Logro desbloqueado: el "ding" que le faltaba al pop-up. Arpegio brillante
  // de cuatro notas con una chispa de ruido agudo encima.
  logro() {
    const notas = [784, 1047, 1319, 1568]
    notas.forEach((f, i) =>
      nota(f, i === 3 ? 0.42 : 0.1, {
        tipo: 'triangle', retraso: i * 0.07, volumen: 0.36, unison: 6, exacto: true, reverb: 0.35,
      })
    )
    ruido(0.35, { retraso: 0.2, volumen: 0.07, filtro: 7000, barridoA: 11000, reverb: 0.4 })
  },

  // FIN DEL GOBIERNO. El cuerno grave: una nota sostenida enorme que entra
  // despacio, se dobla hacia abajo y tarda en irse.
  //
  // Antes era el trombon de chiste de toda la vida, y el chiste esta bien
  // hasta que lo oyes por decimoquinta vez: se rie de la derrota justo cuando
  // el jugador acaba de perder cuarenta minutos de partida. Esto no se rie.
  //
  // Como esta hecho, que es todo capas graves:
  //  - un subgrave a 41 Hz, que mas que oirse se nota;
  //  - el cuerpo del cuerno a 82 Hz en sierra, con siete voces desafinadas
  //    entre si: ese roce entre voces es lo que hace que suene a masa y no a
  //    sintetizador;
  //  - una tercera capa a 110 y 116 Hz que baten una contra otra, que es el
  //    truco viejo para que algo suene mal sin sonar desafinado;
  //  - y un golpe de ruido grave por debajo, con la reverb abierta.
  // Todo con ataque lento: un sonido que ya esta sonando cuando empiezas a
  // oirlo no impone. Y el segundo golpe llega cuando el primero aun no se ha
  // ido, que es de donde sale la sensacion de que aquello no se acaba.
  derrota() {
    nota(41, 3.2, { tipo: 'sine', volumen: 1, ataque: 0.5, reverb: 0.35, exacto: true })
    nota(82, 2.8, {
      tipo: 'sawtooth', volumen: 0.85, ataque: 0.35, bend: -12, unison: 14,
      filtro: 420, barridoA: 130, reverb: 0.45, exacto: true,
    })
    nota(110, 2.4, {
      tipo: 'sawtooth', retraso: 0.12, volumen: 0.3, ataque: 0.4, unison: 9,
      filtro: 700, barridoA: 200, reverb: 0.5, exacto: true,
    })
    nota(116, 2.4, {
      tipo: 'sawtooth', retraso: 0.12, volumen: 0.3, ataque: 0.4, unison: 9,
      filtro: 700, barridoA: 200, reverb: 0.5, exacto: true,
    })
    ruido(1.6, { volumen: 0.9, filtro: 320, tipoFiltro: 'lowpass', barridoA: 90, reverb: 0.6 })
    // El segundo golpe, un tono mas abajo y sin prisa.
    nota(55, 3.4, { tipo: 'sawtooth', retraso: 1.5, volumen: 0.8, ataque: 0.55,
      bend: -8, unison: 12, filtro: 360, barridoA: 110, reverb: 0.5, exacto: true })
    nota(27.5, 3.6, { tipo: 'sine', retraso: 1.5, volumen: 1, ataque: 0.7, reverb: 0.4, exacto: true })
  },

  // Sobrevivir las tres legislaturas: la fanfarria buena, con aplausos.
  triunfo() {
    const notas = [523, 659, 784, 1047, 1319]
    notas.forEach((f, i) =>
      nota(f, i === 4 ? 0.5 : 0.2, {
        tipo: 'square', retraso: i * 0.12, volumen: 0.4, unison: 10, exacto: true, reverb: 0.3,
      })
    )
    ruido(1.2, { retraso: 0.6, volumen: 0.18, filtro: 1500, reverb: 0.5 })
  },

  // --- volumen ----------------------------------------------------------
  // Paso actual (0..PASOS.length-1) y su porcentaje (0 = mudo).
  paso(): number {
    return paso
  },
  porcentaje(): number {
    return Math.round(PASOS[paso] * 100)
  },
  // Avanza un paso del ciclo y devuelve el nuevo porcentaje.
  ciclar(): number {
    paso = (paso + 1) % PASOS.length
    try {
      localStorage.setItem(STORAGE_KEY, String(paso))
    } catch {
      /* sin persistencia, pero la sesión actual respeta la elección */
    }
    const factor = PASOS[paso]
    if (factor === 0) {
      if (ctx) {
        void ctx.close()
        ctx = null
        master = null
        mezcla = null
        envio = null
        busMusica = null
        busAmbiente = null
      }
    } else {
      if (master) master.gain.value = BASE_GAIN * factor
      if (busMusica) busMusica.gain.value = factor
    }
    avisarCambio?.()
    return this.porcentaje()
  },

  // Bus por el que entra la musica de fondo (ver utils/musica). Devuelve null
  // si el juego esta en mudo: ahi no hay contexto de audio siquiera.
  busDeMusica(): { ctx: AudioContext; destino: GainNode } | null {
    const c = getCtx()
    if (!c || !busAmbiente) return null
    return { ctx: c, destino: busAmbiente }
  },

  // Se llama al tocar el boton de volumen. La musica lo necesita porque al
  // mutear se cierra el contexto entero y al volver hay que rearrancarla.
  alCambiarElVolumen(fn: (() => void) | null) {
    avisarCambio = fn
  },
}
