// Mide lo que SUENA de verdad, no lo que dice el codigo que deberia sonar.
//
// En sfx.ts cada sonido lleva un `volumen`, pero ese numero no es lo que se
// oye: el unison mete tres osciladores en la misma ganancia (asi que suma
// tres veces), la reverb anade cola, el compresor recorta los picos y el
// master multiplica por 0,16. Leer el codigo y creerselo es justo el error de
// medir sin mirar.
//
// Esto pincha la salida del navegador: parchea AudioNode.connect para que
// todo lo que llegue a ctx.destination pase tambien por un analizador, llama
// a cada sonido y mide pico, volumen medio y cuanto dura de verdad.
//
// Uso (hace falta un servidor de dev levantado y npx playwright):
//   1. npm run dev
//   2. node scripts/qa-sonido.mjs

async function loadChromium() {
  for (const mod of ['playwright', 'playwright-core']) {
    try {
      return (await import(mod)).chromium
    } catch {
      /* siguiente */
    }
  }
  if (process.env.PLAYWRIGHT_PATH) return (await import(process.env.PLAYWRIGHT_PATH)).chromium
  throw new Error('No encuentro playwright. Instalalo con: npm i -D playwright')
}

const DEV_URL = process.env.DEV_URL || 'http://localhost:5173/'
const chromium = await loadChromium()
// Sin este flag el navegador crea el contexto dormido y no suena nada, porque
// nadie ha tocado la pantalla.
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage()
const fallos = []
page.on('pageerror', (e) => fallos.push(e.message))
await page.goto(DEV_URL, { waitUntil: 'domcontentloaded' })

const medidas = await page.evaluate(async () => {
  const espia = { nodo: null, ctx: null }
  const connectOriginal = AudioNode.prototype.connect
  AudioNode.prototype.connect = function (destino, ...resto) {
    const r = connectOriginal.call(this, destino, ...resto)
    try {
      if (destino instanceof AudioNode && destino === destino.context.destination) {
        if (!espia.nodo || espia.ctx !== destino.context) {
          espia.ctx = destino.context
          espia.nodo = destino.context.createAnalyser()
          espia.nodo.fftSize = 2048
        }
        connectOriginal.call(this, espia.nodo)
      }
    } catch {
      /* si no se puede pinchar, se mide lo que se pueda */
    }
    return r
  }

  const { sfx } = await import('/src/utils/sfx.ts')
  // La pagina ya ha creado su AudioContext al montar (la musica lo pide para
  // saber si puede sonar), asi que sus conexiones al destino ya estan hechas
  // y el parche de arriba llega tarde. Pasando por mudo se cierra el contexto
  // entero; al volver al 100% se crea uno nuevo, y ese si pasa por el parche.
  while (sfx.porcentaje() !== 0) sfx.ciclar()
  while (sfx.porcentaje() !== 100) sfx.ciclar()

  const SONIDOS = [
    'boton', 'roce', 'papel', 'moneda', 'campana', 'favor',
    'alarma', 'balance', 'logro', 'eleccion', 'fontanero', 'reparto', 'trombon', 'triunfo',
  ]
  const VENTANA = 3200 // ms de escucha por sonido, de sobra para el mas largo

  const medir = async (nombre) => {
    sfx[nombre]()
    await new Promise((r) => setTimeout(r, 30))
    if (!espia.nodo) return { nombre, error: 'no he podido pinchar la salida' }
    const buf = new Float32Array(espia.nodo.fftSize)
    let pico = 0
    let suma = 0
    let bloques = 0
    let ultimoSonido = 0
    const t0 = performance.now()
    for (;;) {
      const t = performance.now() - t0
      if (t > VENTANA) break
      espia.nodo.getFloatTimeDomainData(buf)
      let picoBloque = 0
      let energia = 0
      for (let i = 0; i < buf.length; i++) {
        const v = Math.abs(buf[i])
        if (v > picoBloque) picoBloque = v
        energia += buf[i] * buf[i]
      }
      if (picoBloque > pico) pico = picoBloque
      if (picoBloque > 0.001) {
        ultimoSonido = t
        suma += energia / buf.length
        bloques++
      }
      await new Promise((r) => requestAnimationFrame(r))
    }
    const rms = bloques ? Math.sqrt(suma / bloques) : 0
    return {
      nombre,
      pico,
      rms,
      dura: ultimoSonido,
      picoDb: pico > 0 ? 20 * Math.log10(pico) : -99,
      rmsDb: rms > 0 ? 20 * Math.log10(rms) : -99,
    }
  }

  const out = []
  for (const s of SONIDOS) {
    out.push(await medir(s))
    // Silencio entre sonido y sonido para que no se solapen las colas.
    await new Promise((r) => setTimeout(r, 400))
  }
  return out
}, null)

console.log('sonido      pico      medio     dura     ')
console.log('------------------------------------------')
for (const m of medidas) {
  if (m.error) {
    console.log(`${m.nombre.padEnd(11)} ${m.error}`)
    continue
  }
  const aviso =
    m.pico >= 0.99 ? '  SATURA' : m.pico < 0.02 ? '  casi no se oye' : m.dura < 20 ? '  no suena' : ''
  console.log(
    `${m.nombre.padEnd(11)} ${m.picoDb.toFixed(1).padStart(6)} dB ${m.rmsDb.toFixed(1).padStart(6)} dB ${String(Math.round(m.dura)).padStart(5)} ms${aviso}`
  )
}
const validos = medidas.filter((m) => !m.error && m.rms > 0)
if (validos.length > 1) {
  const db = validos.map((m) => m.rmsDb)
  console.log('')
  console.log(
    `rango entre el mas flojo y el mas fuerte: ${(Math.max(...db) - Math.min(...db)).toFixed(1)} dB`
  )
  console.log(
    `  el mas fuerte: ${validos.reduce((a, b) => (b.rmsDb > a.rmsDb ? b : a)).nombre}, el mas flojo: ${validos.reduce((a, b) => (b.rmsDb < a.rmsDb ? b : a)).nombre}`
  )
}
if (fallos.length) {
  console.log('\nerrores en la pagina:')
  for (const e of fallos.slice(0, 5)) console.log('  ' + e)
}

await browser.close()
