// Convierte las pistas de ost-fuentes/ en los bucles que se publican en
// public/musica/.
//
// El problema de una canción generada (Suno y compañía) es que tiene entrada y
// final: si la pones en bucle tal cual, cada vuelta da un bandazo. Aquí se
// recorta un trozo del centro que empiece y acabe en el MISMO punto del
// compás, y se cose la costura con un fundido cruzado, de modo que el archivo
// resultante encadena consigo mismo sin salto.
//
// Los tres pasos, y por qué:
//   1. Tempo por autocorrelación de la envolvente de ataques. Sin él, cortar
//      "a los 60 segundos" cae a mitad de compás y se nota muchísimo.
//   2. Elegir el bucle buscando dónde el audio se PARECE más a sí mismo un
//      bucle después. Entre varios cortes de la misma duración en compases,
//      no todos suenan igual de bien: se prueba cada candidato y gana el que
//      menos tiene que disimular.
//   3. Fundido cruzado en la costura: el trozo que sigue al final del bucle se
//      desvanece encima de su principio. Así la vuelta no tiene ni un click.
//
// Al final se normaliza el volumen de las tres a la misma referencia, que si
// no la del título entra a un volumen y la de partida a otro.
//
// Uso:  node scripts/musica.mjs
// Necesita ffmpeg. Si no está en el PATH se coge el de node_modules
// (npm i --no-save ffmpeg-static).

import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const RAIZ = fileURLToPath(new URL('../', import.meta.url))
const FUENTES = RAIZ + 'ost-fuentes/'
const DESTINO = RAIZ + 'public/musica/'
const TMP = RAIZ + 'node_modules/.musica-tmp/'

function buscarFfmpeg() {
  const candidatos = [
    RAIZ + 'node_modules/ffmpeg-static/ffmpeg.exe',
    RAIZ + 'node_modules/ffmpeg-static/ffmpeg',
    'ffmpeg',
  ]
  for (const c of candidatos) {
    try {
      execFileSync(c, ['-version'], { stdio: 'ignore' })
      return c
    } catch {
      /* siguiente */
    }
  }
  throw new Error('No encuentro ffmpeg. Instálalo con: npm i --no-save ffmpeg-static')
}
const FF = buscarFfmpeg()
const ff = (args) => execFileSync(FF, ['-v', 'error', '-y', ...args], { maxBuffer: 1 << 28 })

// --- Análisis -------------------------------------------------------------

const SR_ANALISIS = 22050
const HOP = 256

// Devuelve el audio en mono a SR_ANALISIS, como Float32Array entre -1 y 1.
function decodificar(ruta) {
  const crudo = execFileSync(
    FF,
    ['-v', 'error', '-i', ruta, '-ac', '1', '-ar', String(SR_ANALISIS), '-f', 's16le', '-'],
    { maxBuffer: 1 << 28 }
  )
  const muestras = new Int16Array(crudo.buffer, crudo.byteOffset, crudo.length / 2)
  const x = new Float32Array(muestras.length)
  for (let i = 0; i < muestras.length; i++) x[i] = muestras[i] / 32768
  return x
}

// Envolvente de ataques: cuánto sube la energía de una ventana a la siguiente.
// Los golpes del compás salen como picos, que es lo que el tempo necesita.
function envolvente(x) {
  const n = Math.floor((x.length - 1024) / HOP)
  const e = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    let s = 0
    for (let j = i * HOP; j < i * HOP + 1024; j++) s += x[j] * x[j]
    e[i] = Math.log1p(s * 100)
  }
  const d = new Float32Array(n - 1)
  for (let i = 0; i < n - 1; i++) d[i] = Math.max(0, e[i + 1] - e[i])
  return d
}

function tempo(d) {
  const fps = SR_ANALISIS / HOP
  let media = 0
  for (const v of d) media += v
  media /= d.length
  const c = new Float32Array(d.length)
  for (let i = 0; i < d.length; i++) c[i] = d[i] - media
  const lo = Math.floor((fps * 60) / 180)
  const hi = Math.floor((fps * 60) / 60)
  let mejor = lo
  let mejorV = -Infinity
  for (let lag = lo; lag < hi; lag++) {
    let s = 0
    for (let i = 0; i + lag < c.length; i++) s += c[i] * c[i + lag]
    if (s > mejorV) {
      mejorV = s
      mejor = lag
    }
  }
  return { bpm: (60 * fps) / mejor, segundosPorPulso: mejor / fps }
}

// Envolvente de energía, una muestra cada 50 ms. Se compara ESTO y no la onda
// cruda: dos pasajes que suenan igual casi nunca coinciden muestra a muestra
// (basta un desfase de milisegundos para que la correlación se hunda), pero su
// envolvente sí se parece. Con la onda cruda, todos los candidatos puntuaban
// por debajo de 0,1 y la elección era practicamente al azar.
const PASO_ENV = Math.round(SR_ANALISIS * 0.05)
function energia(x) {
  const n = Math.floor(x.length / PASO_ENV)
  const e = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    let s = 0
    for (let j = i * PASO_ENV; j < (i + 1) * PASO_ENV; j++) s += x[j] * x[j]
    e[i] = Math.sqrt(s / PASO_ENV)
  }
  return e
}

// Cuánto se parece el pasaje que empieza en `a` al que empieza en `b`, sobre
// una ventana de 4 s. Uno es idéntico, cero es que no tienen nada que ver.
function parecido(env, a, b, ventanaSeg = 4) {
  const fps = SR_ANALISIS / PASO_ENV
  const ia = Math.round(a * fps)
  const ib = Math.round(b * fps)
  const w = Math.round(ventanaSeg * fps)
  if (ia < 0 || ib < 0 || ia + w > env.length || ib + w > env.length) return -1
  let ma = 0
  let mb = 0
  for (let i = 0; i < w; i++) {
    ma += env[ia + i]
    mb += env[ib + i]
  }
  ma /= w
  mb /= w
  let sa = 0
  let sb = 0
  let sab = 0
  for (let i = 0; i < w; i++) {
    const va = env[ia + i] - ma
    const vb = env[ib + i] - mb
    sa += va * va
    sb += vb * vb
    sab += va * vb
  }
  return sab / (Math.sqrt(sa * sb) + 1e-9)
}

// Busca el mejor bucle: empieza en un tiempo fuerte, dura un número entero de
// compases y cierra donde el audio más se parece a su propio comienzo.
function elegirBucle(x, env, segundosPorPulso, objetivoSeg) {
  const dur = x.length / SR_ANALISIS
  const PULSOS_POR_COMPAS = 3 // son valses, ver el análisis del README
  const compas = segundosPorPulso * PULSOS_POR_COMPAS
  const compases = Math.max(4, Math.round(objetivoSeg / compas))
  const largo = compases * compas
  // Se descartan los primeros y los últimos 15 segundos: ahí están la entrada
  // y el desvanecido final, que nunca hacen buen bucle.
  const desde = 15
  const hasta = dur - largo - 15
  if (hasta <= desde) return { inicio: Math.max(0, (dur - largo) / 2), largo, compases, nota: 0 }
  // Nivel medio en una ventana corta, para comparar el volumen de los dos
  // extremos del bucle.
  const fps = SR_ANALISIS / PASO_ENV
  const nivel = (t, seg = 1) => {
    const i = Math.round(t * fps)
    const w = Math.round(seg * fps)
    if (i < 0 || i + w > env.length) return 0
    let s = 0
    for (let k = 0; k < w; k++) s += env[i + k]
    return s / w
  }
  let mejor = desde
  let mejorNota = -Infinity
  for (let t = desde; t <= hasta; t += compas) {
    // Que se parezcan no basta: si el bucle acaba fuerte y empieza flojo, al
    // dar la vuelta hay un bajon de volumen que se oye aunque no haya
    // chasquido. Medido en una primera version, una de las pistas caia de
    // 0,093 a 0,040 justo en la costura. Se penaliza esa diferencia.
    const a = nivel(t)
    const b = nivel(t + largo)
    const desajuste = Math.abs(Math.log((a + 1e-6) / (b + 1e-6)))
    const nota = parecido(env, t, t + largo) - desajuste * 0.5
    if (nota > mejorNota) {
      mejorNota = nota
      mejor = t
    }
  }
  return { inicio: mejor, largo, compases, nota: mejorNota }
}

// --- Corte y compresión ---------------------------------------------------

function cortarYCoser(origen, salidaBase, inicio, largo, cruce, etiqueta) {
  const cuerpo = TMP + etiqueta + '-cuerpo.wav'
  const cola = TMP + etiqueta + '-cola.wav'
  const wav = TMP + etiqueta + '.wav'
  // En tres pasos y no en un solo grafo de filtros: leer el mismo fichero por
  // dos ramas (asplit + dos atrim a alturas distintas) bloquea el grafo y
  // ffmpeg saca cero segundos de audio. Probado.
  //
  // 1) el cuerpo del bucle, entrando desvanecido. curve=qsin y no el fundido
  //    lineal por defecto: cruzar dos trozos distintos con rampas lineales
  //    hunde el volumen en mitad de la costura (medido, hasta 7 dB de bajon).
  //    La curva de seno mantiene la potencia constante, que es lo que pide un
  //    cruce entre material que no esta correlacionado.
  ff(['-ss', String(inicio), '-t', String(largo), '-i', origen,
      '-af', `afade=t=in:st=0:d=${cruce}:curve=qsin`, '-ar', '48000', '-ac', '2', cuerpo])
  // 2) el trozo que viene JUSTO DESPUES, saliendo desvanecido;
  ff(['-ss', String(inicio + largo), '-t', String(cruce), '-i', origen,
      '-af', `afade=t=out:st=0:d=${cruce}:curve=qsin`, '-ar', '48000', '-ac', '2', cola])
  // 3) la cola se posa sobre el principio del cuerpo: esa es la costura.
  ff(['-i', cuerpo, '-i', cola, '-filter_complex',
      '[0:a][1:a]amix=inputs=2:duration=first:normalize=0[out]',
      '-map', '[out]', '-ar', '48000', '-ac', '2', wav])
  rmSync(cuerpo, { force: true })
  rmSync(cola, { force: true })

  // 4) volumen parejo entre pistas, con GANANCIA FIJA y no con loudnorm.
  //    loudnorm en una pasada es adaptativo: al principio del fichero todavia
  //    no ha convergido y atenua la entrada, justo donde esta la costura del
  //    bucle. Medido, dejaba el arranque hasta 10 dB por debajo del final y al
  //    dar la vuelta se oia el bajon. Asi que se mide primero y se aplica una
  //    ganancia constante, que no deforma nada.
  const medido = medirLoudness(wav)
  const ganancia = OBJETIVO_LUFS - medido

  // Opus para quien pueda (casi todos) y AAC de respaldo para Safari viejo.
  const vol = ['-af', `volume=${ganancia.toFixed(2)}dB`]
  ff(['-i', wav, ...vol, '-c:a', 'libopus', '-b:a', '48k', '-vbr', 'on', '-application', 'audio',
      salidaBase + '.webm'])
  ff(['-i', wav, ...vol, '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', salidaBase + '.m4a'])
  rmSync(wav, { force: true })
  return { medido, ganancia }
}

// --- Principal ------------------------------------------------------------

// Cuánto dura el bucle de cada papel. El de partida es el más largo porque es
// el que se oye durante minutos; los otros dos acompañan pantallas cortas.
const OBJETIVO = { titulo: 48, final: 48, 'partida-1': 72, 'partida-2': 72, 'partida-3': 72, 'partida-4': 72 }
const CRUCE = 2.5
// Nivel al que quedan todas. -20 LUFS es musica de fondo: se oye sin taparle
// el sitio a los efectos, que son los que tienen que cortar.
const OBJETIVO_LUFS = -20

// Loudness integrada del fichero, en LUFS, leida de la salida de ebur128.
function medirLoudness(ruta) {
  let salida = ''
  try {
    execFileSync(FF, ['-hide_banner', '-i', ruta, '-af', 'ebur128', '-f', 'null', '-'],
      { stdio: ['ignore', 'ignore', 'pipe'], maxBuffer: 1 << 26 })
  } catch (e) {
    salida = String(e.stderr ?? '')
  }
  if (!salida) {
    const r = execFileSync(FF, ['-hide_banner', '-i', ruta, '-af', 'ebur128', '-f', 'null', '-'],
      { stdio: ['ignore', 'ignore', 'pipe'], maxBuffer: 1 << 26 })
    salida = String(r)
  }
  const m = salida.match(/I:\s*(-?[\d.]+)\s*LUFS/g)
  if (!m) return OBJETIVO_LUFS
  const ultimo = m[m.length - 1].match(/(-?[\d.]+)/)
  return ultimo ? Number(ultimo[1]) : OBJETIVO_LUFS
}

mkdirSync(DESTINO, { recursive: true })
mkdirSync(TMP, { recursive: true })

const fuentes = readdirSync(FUENTES).filter((f) => /\.(mp3|wav|ogg|m4a)$/i.test(f)).sort()
if (!fuentes.length) throw new Error('No hay nada en ost-fuentes/')

console.log('%s', 'PISTA'.padEnd(14) + 'BPM'.padStart(6) + 'BUCLE'.padStart(10) + 'COSTURA'.padStart(9) + '   SALIDA')
let total = 0
for (const f of fuentes) {
  const etiqueta = f.replace(/\.[^.]+$/, '')
  const origen = FUENTES + f
  const x = decodificar(origen)
  const { bpm, segundosPorPulso } = tempo(envolvente(x))
  const env = energia(x)
  const objetivo = OBJETIVO[etiqueta] ?? 64
  const { inicio, largo, compases, nota } = elegirBucle(x, env, segundosPorPulso, objetivo)
  const { medido, ganancia } = cortarYCoser(origen, DESTINO + etiqueta, inicio, largo, CRUCE, etiqueta)
  const kb = ['.webm', '.m4a'].map((e) => Math.round(statSync(DESTINO + etiqueta + e).size / 1024))
  total += kb[0]
  console.log(
    etiqueta.padEnd(14) +
      bpm.toFixed(0).padStart(6) +
      `${largo.toFixed(1)}s`.padStart(10) +
      nota.toFixed(2).padStart(9) +
      `   ${kb[0]} KB webm · ${kb[1]} KB m4a  (${compases} compases desde ${inicio.toFixed(1)}s, ${medido.toFixed(1)} LUFS ${ganancia >= 0 ? '+' : ''}${ganancia.toFixed(1)} dB)`
  )
}
rmSync(TMP, { recursive: true, force: true })
console.log(`\nTotal publicado (webm): ${total} KB`)
