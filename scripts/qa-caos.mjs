// QA a lo bruto: hacerle al juego lo que nadie hace a proposito.
//
// El QA normal juega bien: entra, arrastra cartas, cierra. Los fallos que
// quedan vivos despues de meses estan justo donde nadie mira: un guardado a
// medio escribir, treinta arrastres en dos segundos, la pantalla de 280
// pixeles, el boton de volumen aporreado, una recarga en mitad de una
// animacion. Esto hace todo eso y comprueba que el juego sigue en pie.
//
// Lo que se vigila despues de cada gamberrada:
//   - ningun error en la consola ni excepcion sin capturar;
//   - la pagina sigue pintando algo (nada de pantalla en blanco);
//   - no aparece NaN ni undefined en pantalla;
//   - los indicadores siguen siendo numeros entre 0 y el maximo.
//
// Uso (hace falta un servidor de dev levantado y npx playwright):
//   1. npm run dev
//   2. node scripts/qa-caos.mjs

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
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] })

const hallazgos = []
const apunta = (gamberrada, que) => {
  hallazgos.push({ gamberrada, que })
  console.log(`  FALLO  ${que}`)
}

// Una pagina nueva por gamberrada: asi un fallo no contamina al siguiente.
async function abrir() {
  const page = await browser.newPage({ viewport: { width: 420, height: 860 } })
  const errores = []
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text())
  })
  page.on('pageerror', (e) => errores.push('excepcion: ' + e.message))
  return { page, errores }
}

async function entrar(page, preferirContinuar = false) {
  // Hay una pantalla de carga antes del menu: sin esperarla no hay ningun
  // boton que pulsar y la prueba cree que el juego esta roto. Paso por aqui
  // una vez creyendo haber encontrado un fallo que era mio.
  try {
    await page.waitForSelector('button', { timeout: 12000 })
  } catch {
    /* si no aparece ninguno, que lo diga la revision */
  }
  const orden = preferirContinuar
    ? ['Continuar', 'Empezar', 'Nueva', 'Jugar']
    : ['Empezar', 'Continuar', 'Nueva', 'Jugar']
  for (const t of orden) {
    const b = page.locator(`button:has-text("${t}")`).first()
    if ((await b.count()) && (await b.isVisible())) {
      await b.click()
      break
    }
  }
  await page.waitForTimeout(900)
}

// Todo lo que tiene que seguir siendo verdad pase lo que pase.
async function revisar(nombre, page, errores) {
  for (const e of errores.slice(0, 3)) apunta(nombre, 'error en consola: ' + e.slice(0, 160))
  errores.length = 0
  const estado = await page.evaluate(() => {
    const txt = document.body.innerText || ''
    const barras = []
    for (const b of document.querySelectorAll('button[aria-label]')) {
      const m = b.getAttribute('aria-label').match(/^(Medios|Gobierno|Calle|Caja B): (-?\d+|NaN)/)
      if (m) barras.push({ nombre: m[1], valor: Number(m[2]) })
    }
    return {
      vacio: txt.trim().length === 0,
      nan: /\bNaN\b/.test(txt),
      indefinido: /\bundefined\b/.test(txt),
      barras,
      desbordeH: document.documentElement.scrollWidth > window.innerWidth + 2,
    }
  })
  if (estado.vacio) apunta(nombre, 'pantalla en blanco')
  if (estado.nan) apunta(nombre, 'hay un NaN en pantalla')
  if (estado.indefinido) apunta(nombre, 'hay un "undefined" en pantalla')
  if (estado.desbordeH) apunta(nombre, 'la pagina se sale de ancho')
  for (const b of estado.barras) {
    if (!Number.isFinite(b.valor) || b.valor < 0 || b.valor > 10) {
      apunta(nombre, `indicador ${b.nombre} fuera de rango: ${b.valor}`)
    }
  }
  return estado
}

async function gamberrada(nombre, fn) {
  console.log(`\n== ${nombre}`)
  const { page, errores } = await abrir()
  try {
    await fn(page, errores)
  } catch (e) {
    apunta(nombre, 'la prueba reventó: ' + String(e.message).slice(0, 160))
  }
  try {
    await revisar(nombre, page, errores)
  } catch (e) {
    apunta(nombre, 'no se pudo revisar: ' + String(e.message).slice(0, 120))
  }
  await page.close()
}

const arrastrar = async (page, dx, pasos = 6) => {
  const b = await page.locator('body').boundingBox()
  const cx = b.width / 2
  const cy = b.height * 0.55
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx + dx, cy, { steps: pasos })
  await page.mouse.up()
}

// ---------------------------------------------------------------------------

await gamberrada('guardados corruptos', async (page) => {
  // Cada uno es una forma distinta de que el guardado llegue roto: escritura
  // a medias, una version vieja, un campo con el tipo cambiado. El juego tiene
  // que arrancar igual, con partida nueva si hace falta, y nunca en blanco.
  const basuras = [
    ['json roto', '{esto no es json'],
    ['vacio', ''],
    ['null', 'null'],
    ['array', '[1,2,3]'],
    ['sin estado', '{"v":1}'],
    ['stats vacias', '{"v":1,"estado":{"turn":5,"stats":{},"gameOver":false},"currentCardId":"gob_regalo_protocolo","flagsVistos":[]}'],
    ['stats de texto', '{"v":1,"estado":{"turn":5,"stats":{"medios":"5","gobierno":"5","calle":"5","caja":"5"},"gameOver":false},"currentCardId":"gob_regalo_protocolo","flagsVistos":[]}'],
    ['stats fuera de rango', '{"v":1,"estado":{"turn":5,"stats":{"medios":999,"gobierno":-40,"calle":5,"caja":5},"gameOver":false},"currentCardId":"gob_regalo_protocolo","flagsVistos":[]}'],
    ['turno absurdo', '{"v":1,"estado":{"turn":1e9,"stats":{"medios":5,"gobierno":5,"calle":5,"caja":5},"gameOver":false},"currentCardId":"gob_regalo_protocolo","flagsVistos":[]}'],
    ['carta que no existe', '{"v":1,"estado":{"turn":5,"stats":{"medios":5,"gobierno":5,"calle":5,"caja":5},"gameOver":false},"currentCardId":"no_existo","flagsVistos":[]}'],
    ['programada fantasma', '{"v":1,"estado":{"turn":5,"stats":{"medios":5,"gobierno":5,"calle":5,"caja":5},"gameOver":false,"scheduled":[{"id":"no_existo","turn":6}],"flags":[],"anger":null,"favor":null},"currentCardId":"gob_regalo_protocolo","flagsVistos":[]}'],
  ]
  for (const [etiqueta, valor] of basuras) {
    await page.goto(DEV_URL, { waitUntil: 'domcontentloaded' })
    await page.evaluate(
      ([v]) => {
        localStorage.setItem('nomeconsta.partida', v)
      },
      [valor]
    )
    await page.goto(DEV_URL, { waitUntil: 'networkidle' })
    await entrar(page)
    // Tres decisiones, que es donde se ve si el estado cargado era veneno.
    for (let i = 0; i < 3; i++) {
      await arrastrar(page, 240)
      await page.waitForTimeout(700)
    }
    const st = await page.evaluate(() => {
      const out = []
      for (const b of document.querySelectorAll('button[aria-label]')) {
        const m = b.getAttribute('aria-label').match(/^(Medios|Gobierno|Calle|Caja B): (-?\d+|NaN)/)
        if (m) out.push(Number(m[2]))
      }
      return { barras: out, texto: (document.body.innerText || '').slice(0, 80) }
    })
    const mal = st.barras.some((v) => !Number.isFinite(v) || v < 0 || v > 10)
    if (mal || (st.barras.length === 0 && !st.texto)) {
      apunta('guardados corruptos', `"${etiqueta}" deja el juego en mal estado: ${JSON.stringify(st.barras)}`)
    } else {
      console.log(`  ok  ${etiqueta}`)
    }
  }
})

await gamberrada('volumen y logros corruptos', async (page) => {
  for (const [k, v] of [
    ['nomeconsta.volumen', 'abc'],
    ['nomeconsta.volumen', '-3'],
    ['nomeconsta.volumen', '99'],
    ['nomeconsta.volumen', '{"a":1}'],
    ['nomeconsta.logros', '{roto'],
    ['nomeconsta.logros', '"no soy un objeto"'],
    ['nomeconsta.enfriamiento', 'null'],
  ]) {
    await page.goto(DEV_URL, { waitUntil: 'domcontentloaded' })
    await page.evaluate(([kk, vv]) => localStorage.setItem(kk, vv), [k, v])
    await page.goto(DEV_URL, { waitUntil: 'networkidle' })
    await entrar(page)
    await arrastrar(page, 240)
    await page.waitForTimeout(500)
    console.log(`  ok  ${k} = ${v}`)
  }
})

await gamberrada('treinta arrastres en dos segundos', async (page) => {
  await page.goto(DEV_URL, { waitUntil: 'networkidle' })
  await entrar(page)
  for (let i = 0; i < 30; i++) {
    await arrastrar(page, i % 2 ? 260 : -260, 2)
    await page.waitForTimeout(40) // sin esperar a que acabe la animacion
  }
  await page.waitForTimeout(1200)
})

await gamberrada('arrastres raros', async (page) => {
  await page.goto(DEV_URL, { waitUntil: 'networkidle' })
  await entrar(page)
  const b = await page.locator('body').boundingBox()
  const cx = b.width / 2
  const cy = b.height * 0.55
  // Arrastrar y volver al centro, arriba, abajo, en diagonal, y soltar fuera
  // de la ventana.
  const rutas = [
    [[60, 0], [0, 0]],
    [[0, -300]],
    [[0, 300]],
    [[200, 200], [-200, -200], [0, 0]],
    [[900, 0]],
    [[-900, 400]],
  ]
  for (const ruta of rutas) {
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    for (const [dx, dy] of ruta) await page.mouse.move(cx + dx, cy + dy, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(500)
  }
  // Soltar el boton del raton sin haberlo bajado, y bajarlo dos veces.
  await page.mouse.up()
  await page.mouse.down()
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(600)
})

await gamberrada('aporrear el boton de volumen', async (page) => {
  await page.goto(DEV_URL, { waitUntil: 'networkidle' })
  await entrar(page)
  const boton = page.locator('button[aria-label^="Volumen"], button[aria-label^="Sonido"]').first()
  if (!(await boton.count())) {
    apunta('aporrear el boton de volumen', 'no encuentro el boton de sonido')
    return
  }
  // Cada vuelta al mudo CIERRA el contexto de audio y lo recrea al volver.
  for (let i = 0; i < 25; i++) await boton.click({ force: true })
  await page.waitForTimeout(400)
  await arrastrar(page, 240)
  await page.waitForTimeout(700)
})

await gamberrada('el volumen no debe apilar musica', async (page) => {
  // Cada fuente de audio que arranca y no para se queda sonando. Si tocar el
  // volumen rearranca la musica sin parar la anterior, se apilan: el jugador
  // lo oyo como "suenan muchas canciones a la vez".
  await page.addInitScript(() => {
    // Se guardan las fuentes, no un contador: al mutear se CIERRA el contexto
    // y sus fuentes mueren sin disparar 'ended', asi que un contador se queda
    // contando fantasmas. Solo cuentan las que siguen en un contexto vivo.
    window.__fuentes = new Set()
    const start = AudioBufferSourceNode.prototype.start
    AudioBufferSourceNode.prototype.start = function (...a) {
      window.__fuentes.add(this)
      this.addEventListener('ended', () => window.__fuentes.delete(this))
      return start.apply(this, a)
    }
    window.__vivas = () =>
      [...window.__fuentes].filter((f) => f.context && f.context.state !== 'closed').length
  })
  await page.goto(DEV_URL, { waitUntil: 'networkidle' })
  await entrar(page)
  await arrastrar(page, 240)
  await page.waitForTimeout(2500) // que la musica arranque de verdad
  const boton = page.locator('button[aria-label^="Volumen"], button[aria-label^="Sonido"]').first()
  if (!(await boton.count())) {
    apunta('el volumen no debe apilar musica', 'no encuentro el boton de sonido')
    return
  }
  for (let i = 0; i < 8; i++) {
    await boton.click({ force: true })
    await page.waitForTimeout(500)
  }
  // Se deja tiempo a que mueran las colas de los efectos y los fundidos.
  await page.waitForTimeout(3500)
  const vivas = await page.evaluate(() => window.__vivas())
  if (vivas > 1) {
    apunta('el volumen no debe apilar musica', `${vivas} fuentes de audio sonando a la vez`)
  } else {
    console.log(`  ok  ${vivas} fuente(s) de audio viva(s) tras ocho cambios de volumen`)
  }
})

await gamberrada('abrir y cerrar paneles sin parar', async (page) => {
  await page.goto(DEV_URL, { waitUntil: 'networkidle' })
  await entrar(page)
  for (let i = 0; i < 12; i++) {
    for (const nombre of ['Logros', 'Reparto']) {
      const b = page.locator(`button:has-text("${nombre}")`).first()
      if ((await b.count()) && (await b.isVisible())) {
        await b.click({ force: true })
        await page.waitForTimeout(60)
        await page.keyboard.press('Escape')
        await page.waitForTimeout(60)
      }
    }
  }
  // Y ahora abrir un panel EN MITAD de un arrastre.
  const bb = await page.locator('body').boundingBox()
  await page.mouse.move(bb.width / 2, bb.height * 0.55)
  await page.mouse.down()
  await page.mouse.move(bb.width / 2 + 50, bb.height * 0.55, { steps: 4 })
  const logros = page.locator('button:has-text("Logros")').first()
  if ((await logros.count()) && (await logros.isVisible())) await logros.click({ force: true })
  await page.mouse.up()
  await page.waitForTimeout(700)
})

await gamberrada('pantallas imposibles', async (page) => {
  await page.goto(DEV_URL, { waitUntil: 'networkidle' })
  await entrar(page)
  const tamanos = [
    [280, 480],
    [320, 420],
    [1920, 380],
    [600, 1600],
    [240, 240],
  ]
  for (const [w, h] of tamanos) {
    await page.setViewportSize({ width: w, height: h })
    await page.waitForTimeout(350)
    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2
    )
    if (desborde) apunta('pantallas imposibles', `se sale de ancho a ${w}x${h}`)
    const hayCarta = await page.locator('[role="group"]').count()
    if (!hayCarta) apunta('pantallas imposibles', `no se ve la carta a ${w}x${h}`)
    await arrastrar(page, Math.min(240, w / 2))
    await page.waitForTimeout(450)
  }
  await page.setViewportSize({ width: 420, height: 860 })
})

await gamberrada('teclado a ciegas', async (page) => {
  await page.goto(DEV_URL, { waitUntil: 'networkidle' })
  await entrar(page)
  const teclas = ['Tab', 'Enter', 'Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'Escape', 'a', 'F5']
  for (let i = 0; i < 40; i++) {
    const t = teclas[Math.floor(Math.random() * (teclas.length - 1))] // F5 fuera
    await page.keyboard.press(t)
    await page.waitForTimeout(35)
  }
  await page.waitForTimeout(600)
})

await gamberrada('recargar en mitad de todo', async (page) => {
  await page.goto(DEV_URL, { waitUntil: 'networkidle' })
  await entrar(page)
  for (let i = 0; i < 6; i++) {
    await arrastrar(page, 240)
    await page.waitForTimeout(650)
  }
  const antes = await page.evaluate(() => {
    const out = {}
    for (const b of document.querySelectorAll('button[aria-label]')) {
      const m = b.getAttribute('aria-label').match(/^(Medios|Gobierno|Calle|Caja B): (\d+)/)
      if (m) out[m[1]] = Number(m[2])
    }
    return out
  })
  // Recargar justo despues de soltar, con la animacion a medias.
  await arrastrar(page, 240)
  await page.reload({ waitUntil: 'networkidle' })
  await entrar(page, true)
  const despues = await page.evaluate(() => {
    const out = {}
    for (const b of document.querySelectorAll('button[aria-label]')) {
      const m = b.getAttribute('aria-label').match(/^(Medios|Gobierno|Calle|Caja B): (\d+)/)
      if (m) out[m[1]] = Number(m[2])
    }
    return out
  })
  const perdido = Object.keys(antes).length > 0 && Object.keys(despues).length === 0
  if (perdido) apunta('recargar en mitad de todo', 'tras recargar no hay partida que continuar')
  else console.log(`  antes ${JSON.stringify(antes)}  despues ${JSON.stringify(despues)}`)
})

await gamberrada('partida larguisima', async (page) => {
  await page.goto(DEV_URL, { waitUntil: 'networkidle' })
  await entrar(page)
  let vueltas = 0
  for (let i = 0; i < 160; i++) {
    const fin = page.locator('button:has-text("Nueva legislatura")').first()
    if ((await fin.count()) && (await fin.isVisible())) {
      await fin.click()
      vueltas++
      await page.waitForTimeout(600)
      continue
    }
    await arrastrar(page, i % 3 ? 240 : -240, 3)
    await page.waitForTimeout(260)
  }
  console.log(`  ${vueltas} partidas encadenadas sin respirar`)
})

// ---------------------------------------------------------------------------
console.log('\n========================================')
if (hallazgos.length === 0) {
  console.log('Aguanta todo. Ni un fallo.')
} else {
  console.log(`${hallazgos.length} fallos:`)
  for (const h of hallazgos) console.log(`  [${h.gamberrada}] ${h.que}`)
  process.exitCode = 1
}
await browser.close()
