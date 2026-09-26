// OJO ANTES DE USARLO: NO hace falta para los retratos nuevos, y pasarselo
// los estropea. Se escribio cuando la carta era mas alta que el retrato y
// sobraba fondo; desde que la carta tiene EXACTAMENTE la proporcion del
// retrato (ver SwipeCard), el retrato ya llena la carta el solo y este zoom
// solo sirve para dejar las cabezas enormes. Paso una vez y hubo que revertir
// los veintidos.
//
// La tuberia de un retrato nuevo es: recortar-fondo -> normalize-portraits ->
// to-webp -> colores-retrato. Sin esto.
//
// Re-encuadra los retratos tomando como referencia la CARA y no la silueta.
//
// normalize-portraits escala cada retrato para que su figura entera llene el
// lienzo. El resultado es que la cara sale de un tamaño distinto en cada uno:
// a quien el dibujo le dio mucho torso le queda la cabeza pequeña y lejana, y
// en la carta eso se nota, porque lo que se mira es la cara.
//
// Aqui la medida es la distancia entre los ojos, que es la unica que no
// miente: el ancho de la silueta lo infla el pelo largo y el de la mancha de
// piel lo infla el cuello. Todos los retratos se llevan a la distancia entre
// ojos del encuestador, que es el encuadre que se dio por bueno.
//
// Como se encuentran los ojos: en este arte son marcas negras planas pegadas
// a las cejas y al pelo, asi que buscarlas como manchas oscuras sueltas
// devuelve media cabeza en una sola mancha. Pero son AGUJEROS dentro de la
// mancha de piel: se aisla la cara por color, se rellena por fuera, y lo que
// queda dentro sin ser piel son los ojos, las cejas, la boca y las gafas. De
// ahi se cogen los dos agujeros gemelos que estan a la misma altura.
//
// Uso (hace falta un servidor de dev levantado y npx playwright):
//   1. npm run dev            (en otra terminal)
//   2. node scripts/encuadrar-cara.mjs            -> todos
//      node scripts/encuadrar-cara.mjs guru.webp  -> solo esos
//      node scripts/encuadrar-cara.mjs --medir    -> solo mide, no escribe
//
// No es idempotente del todo, porque cada pasada vuelve a comprimir. Por eso
// se salta los retratos que ya estan donde deben (ver QUIETO): en la practica
// correrlo dos veces seguidas no toca ningun archivo.
//
// Va DESPUES de normalize-portraits:
//   recortar-fondo -> normalize-portraits -> encuadrar-cara -> colores-retrato

import { writeFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

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

const CHARDIR = fileURLToPath(new URL('../public/characters/', import.meta.url))
const DEV_URL = process.env.DEV_URL || 'http://localhost:5173/'

const TW = 1020
const TH = 1200
// El retrato de referencia: el encuadre que se dio por bueno.
const REFERENCIA = 'encuestador.webp'
// Aire minimo sobre la cabeza. Acercarse a la cara sube la figura, y sin este
// tope a alguno se le cortaria el pelo por arriba.
const AIRE = 0.035
// Tope de acercamiento. Ampliar un webp ya comprimido lo emborrona, y por
// encima de esto se empieza a notar en la carta.
const MAX_ZOOM = 1.35
// Por debajo de esto no se reescribe: el retrato ya esta donde debe y volver
// a comprimirlo solo le quitaria calidad.
const QUIETO = { zoom: 0.02, px: 6 }
// Lo que hay en la carpeta y NO es un retrato de personaje.
const NO_SON_RETRATOS = /^(max_|min_|nocheelectoral|comite)/

// Para los pocos retratos donde no se encuentran los ojos (montura gruesa de
// gafas, que se come los agujeros) se estima la distancia a partir del ancho
// de la mancha de piel. El numero se recalcula en cada pasada con los
// retratos donde SI se encuentran, asi que esto es solo el respaldo.
const OJOS_POR_CARA = 0.4

// Medir dentro del navegador: Node no trae manipulacion de imagenes.
async function medirTodo(page, files) {
  return page.evaluate(async (files) => {
    const medir = async (f) => {
      const img = new Image()
      img.src = '/characters/' + f
      await img.decode()
      const w = img.naturalWidth
      const h = img.naturalHeight
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const g2 = c.getContext('2d', { willReadFrequently: true })
      g2.drawImage(img, 0, 0)
      const d = g2.getImageData(0, 0, w, h).data
      const N = w * h

      // Alto de la figura, para el aire sobre la cabeza.
      let figTop = h
      let figBot = 0
      for (let p = 0; p < N; p++) {
        if (d[p * 4 + 3] > 12) {
          const y = (p / w) | 0
          if (y < figTop) figTop = y
          if (y > figBot) figBot = y
        }
      }

      // Ancho de la cabeza segun la silueta. Incluye el pelo, asi que no vale
      // para medir la cara, pero es un dato que no depende de ningun color y
      // sirve para descartar detecciones imposibles.
      let anchoCabeza = 0
      const hastaCabeza = figTop + Math.round((figBot - figTop) * 0.35)
      for (let y = figTop; y <= hastaCabeza; y++) {
        let a = -1
        let b = -1
        for (let x = 0; x < w; x++) {
          if (d[(y * w + x) * 4 + 3] > 12) {
            if (a < 0) a = x
            b = x
          }
        }
        if (b - a + 1 > anchoCabeza) anchoCabeza = b - a + 1
      }

      // 1) Mascara de piel: rojo dominante, tono naranja, ni gris ni fluor.
      const piel = new Uint8Array(N)
      for (let p = 0; p < N; p++) {
        const i = p * 4
        if (d[i + 3] < 128) continue
        const r = d[i]
        const g = d[i + 1]
        const b = d[i + 2]
        if (r <= g || r <= b) continue
        const mn = Math.min(g, b)
        const s = (r - mn) / r
        if (s <= 0.18 || s >= 0.85 || r / 255 <= 0.45) continue
        const tono = ((g - b) / Math.max(r - mn, 1)) * 60
        if (tono < 2 || tono > 42) continue
        piel[p] = 1
      }

      // 2) Trozos de piel. La cara es el mas grande de los de arriba: las
      // manos son pequeñas y el cuello cuelga de la propia cara.
      const etiqueta = new Int32Array(N).fill(-1)
      const pila = new Int32Array(N)
      const recorrer = (mapa, semilla, id) => {
        let top = 0
        let n = 0
        let negros = 0
        let x0 = w
        let x1 = 0
        let y0 = h
        let y1 = 0
        pila[top++] = semilla
        etiqueta[semilla] = id
        while (top > 0) {
          const q = pila[--top]
          n++
          if ((d[q * 4] * 299 + d[q * 4 + 1] * 587 + d[q * 4 + 2] * 114) / 1000 < 60) negros++
          const qx = q % w
          const qy = (q / w) | 0
          if (qx < x0) x0 = qx
          if (qx > x1) x1 = qx
          if (qy < y0) y0 = qy
          if (qy > y1) y1 = qy
          if (qx > 0 && etiqueta[q - 1] === -1 && mapa[q - 1]) {
            etiqueta[q - 1] = id
            pila[top++] = q - 1
          }
          if (qx < w - 1 && etiqueta[q + 1] === -1 && mapa[q + 1]) {
            etiqueta[q + 1] = id
            pila[top++] = q + 1
          }
          if (qy > 0 && etiqueta[q - w] === -1 && mapa[q - w]) {
            etiqueta[q - w] = id
            pila[top++] = q - w
          }
          if (qy < h - 1 && etiqueta[q + w] === -1 && mapa[q + w]) {
            etiqueta[q + w] = id
            pila[top++] = q + w
          }
        }
        return { id, n, x0, x1, y0, y1, negro: negros / n }
      }
      const trozos = []
      for (let p = 0; p < N; p++) {
        if (piel[p] && etiqueta[p] === -1) trozos.push(recorrer(piel, p, trozos.length))
      }
      let cara = null
      let mejor = -1
      for (const t of trozos) {
        if (t.n < 0.004 * N) continue
        const cy = (t.y0 + t.y1) / 2
        const punt = t.n * (cy < h * 0.6 ? 1 : 0.25)
        if (punt > mejor) {
          mejor = punt
          cara = t
        }
      }
      if (!cara) return { f, error: 'no encuentro la cara' }

      // Ancho de la cara: el de los pomulos, medido en el tercio alto de la
      // mancha. Mas abajo cuelga el cuello y ensancharia la medida.
      const anchos = []
      const hasta = cara.y0 + Math.max(1, Math.round((cara.y1 - cara.y0) * 0.7))
      for (let y = cara.y0; y < hasta; y++) {
        let a = w
        let b = -1
        for (let x = cara.x0; x <= cara.x1; x++) {
          if (etiqueta[y * w + x] === cara.id) {
            if (x < a) a = x
            if (x > b) b = x
          }
        }
        if (b > a) anchos.push(b - a + 1)
      }
      anchos.sort((p, q) => p - q)
      const anchoCara = anchos.length ? anchos[Math.floor(anchos.length * 0.9)] : 0

      // 3) Los agujeros de la cara. Se rellena por fuera desde el marco del
      // bounding box y lo que queda dentro sin ser piel son ojos, cejas,
      // boca y gafas.
      const bx0 = Math.max(0, cara.x0 - 1)
      const bx1 = Math.min(w - 1, cara.x1 + 1)
      const by0 = Math.max(0, cara.y0 - 1)
      const by1 = Math.min(h - 1, cara.y1 + 1)
      const fuera = new Uint8Array(N)
      let top = 0
      const meter = (p) => {
        if (!fuera[p] && etiqueta[p] !== cara.id) {
          fuera[p] = 1
          pila[top++] = p
        }
      }
      for (let x = bx0; x <= bx1; x++) {
        meter(by0 * w + x)
        meter(by1 * w + x)
      }
      for (let y = by0; y <= by1; y++) {
        meter(y * w + bx0)
        meter(y * w + bx1)
      }
      while (top > 0) {
        const q = pila[--top]
        const qx = q % w
        const qy = (q / w) | 0
        if (qx > bx0) meter(q - 1)
        if (qx < bx1) meter(q + 1)
        if (qy > by0) meter(q - w)
        if (qy < by1) meter(q + w)
      }
      const hueco = new Uint8Array(N)
      for (let y = by0; y <= by1; y++) {
        for (let x = bx0; x <= bx1; x++) {
          const p = y * w + x
          if (!fuera[p] && etiqueta[p] !== cara.id) hueco[p] = 1
        }
      }
      etiqueta.fill(-1)
      const marcas = []
      for (let p = 0; p < N; p++) {
        if (hueco[p] && etiqueta[p] === -1) marcas.push(recorrer(hueco, p, marcas.length))
      }

      // 4) El par de ojos: dos marcas gemelas, a la misma altura, en la mitad
      // de arriba de la cara, separadas por una distancia de cara y -esto es
      // lo que mas falsos positivos quita- repartidas a lado y lado del eje
      // de la cara. Sin esa condicion, en los retratos con gafas se emparejan
      // un ojo con un hueco del pelo o con un pendiente, y el encuadre se va
      // medio lienzo de lado.
      const altoCara = cara.y1 - cara.y0 + 1
      const ejeCara = (cara.x0 + cara.x1) / 2
      // El pelo rubio y el pelirrojo pasan por piel -tienen el mismo tono
      // naranja-, asi que en esos retratos la mancha de cara se traga la
      // melena y aparecen agujeros donde no hay ojos: huecos del pelo, o un
      // pendiente de oro a cada lado, que ademas son simetricos y engañan a
      // todo lo demas. Lo que si se puede comprobar es si estan donde tienen
      // que estar: unos ojos ocupan como un tercio del ancho de la cabeza y
      // nunca se pegan a la coronilla. Los pendientes salen demasiado
      // separados y los huecos del pelo demasiado arriba.
      const cand = marcas
        .filter((m) => m.n >= 40 && (m.y0 + m.y1) / 2 < cara.y0 + altoCara * 0.6)
        .map((m) => ({ n: m.n, cx: (m.x0 + m.x1) / 2, cy: (m.y0 + m.y1) / 2 }))
      let par = null
      let punt = -1
      for (let i = 0; i < cand.length; i++) {
        for (let j = i + 1; j < cand.length; j++) {
          const A = cand[i].cx < cand[j].cx ? cand[i] : cand[j]
          const B = cand[i].cx < cand[j].cx ? cand[j] : cand[i]
          const dist = B.cx - A.cx
          if (dist < w * 0.08 || dist > w * 0.45) continue
          if (Math.abs(A.cy - B.cy) > altoCara * 0.1) continue
          const rel = Math.max(A.n, B.n) / Math.max(1, Math.min(A.n, B.n))
          if (rel > 3) continue
          const desvio = Math.abs((A.cx + B.cx) / 2 - ejeCara) / w
          if (desvio > 0.1) continue
          const p2 = (A.n + B.n) / (rel * (1 + 8 * desvio))
          if (p2 > punt) {
            punt = p2
            par = { A, B, desvio }
          }
        }
      }
      const base = {
        f,
        w,
        h,
        figTop,
        figBot,
        anchoCara,
        caraX: (cara.x0 + cara.x1) / 2,
        caraY0: cara.y0,
      }
      // Si ni el mejor par cae centrado, no son los ojos: mejor el apaño del
      // ancho de cara, que al menos no inventa un eje que no existe.
      if (!par || par.desvio > 0.05) return { ...base, ojos: false }
      const dOjos = par.B.cx - par.A.cx
      // Las dos comprobaciones contra la silueta.
      const respectoCabeza = dOjos / Math.max(1, anchoCabeza)
      const bajoLaCoronilla = (par.A.cy + par.B.cy) / 2 - figTop
      if (respectoCabeza < 0.22 || respectoCabeza > 0.5) return { ...base, ojos: false }
      if (bajoLaCoronilla < anchoCabeza * 0.25) return { ...base, ojos: false }
      // Ultimo filtro, y el que mas casos raros caza: unos ojos miden lo que
      // miden comparados con la cara en la que estan. Fuera de esta horquilla
      // lo encontrado son las lentes de unas gafas, demasiado separadas, o
      // los agujeros de la nariz, demasiado juntos.
      const proporcion = dOjos / Math.max(1, anchoCara)
      if (proporcion < 0.3 || proporcion > 0.55) return { ...base, ojos: false }
      return {
        ...base,
        ojos: true,
        d: dOjos,
        cx: (par.A.cx + par.B.cx) / 2,
        cy: (par.A.cy + par.B.cy) / 2,
      }
    }
    const out = []
    for (const f of files) out.push(await medir(f))
    return out
  }, files)
}

const args = process.argv.slice(2)
const soloMedir = args.includes('--medir')
const verHoja = args.includes('--ver')
const HOJA = (process.env.TEMP || '.') + '/encuadre-revision.png'
const pedidos = args.filter((a) => !a.startsWith('--'))
const todos = readdirSync(CHARDIR).filter((f) => f.endsWith('.webp') && !NO_SON_RETRATOS.test(f))
const files = pedidos.length ? pedidos : todos

const chromium = await loadChromium()
const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(DEV_URL, { waitUntil: 'domcontentloaded' })

// Se mide SIEMPRE el reparto entero aunque solo se vayan a tocar unos pocos:
// el objetivo sale de la referencia, y el respaldo de las gafas de la mediana
// de todos.
const medidas = await medirTodo(page, todos)
const porNombre = new Map(medidas.map((m) => [m.f, m]))
const conOjos = medidas.filter((m) => m.ojos)
const ref = porNombre.get(REFERENCIA)
if (!ref || !ref.ojos) throw new Error('no se puede medir la referencia ' + REFERENCIA)
const OBJ_D = ref.d / ref.w
const OBJ_Y = ref.cy / ref.h

const relaciones = conOjos.map((m) => m.d / m.anchoCara).sort((a, b) => a - b)
const relacion = relaciones.length ? relaciones[Math.floor(relaciones.length / 2)] : OJOS_POR_CARA

console.log(
  `referencia ${REFERENCIA}: ojo a ojo ${(OBJ_D * 100).toFixed(1)}% del ancho, a la altura ${(OBJ_Y * 100).toFixed(1)}%`
)
console.log(`ojo-a-ojo / ancho-de-cara (mediana de ${conOjos.length}): ${relacion.toFixed(3)}\n`)

const plan = []
for (const f of files) {
  const m = porNombre.get(f)
  if (!m || m.error) {
    console.log(`  ${f}: ${m ? m.error : 'no medido'}`)
    continue
  }
  const d = m.ojos ? m.d : m.anchoCara * relacion
  const cx = m.ojos ? m.cx : m.caraX
  const zoomIdeal = (OBJ_D * m.w) / d
  const zoom = Math.max(1, Math.min(MAX_ZOOM, zoomIdeal))
  const dx = TW / 2 - cx * zoom
  // La altura NO sale de la deteccion sino del aire sobre la cabeza. Podria
  // ponerse la linea de los ojos a la altura de la referencia, pero entonces
  // una deteccion torcida movera el retrato entero de arriba abajo, y el alto
  // de la figura no falla nunca. Ademas es lo que ya hacia normalize-portraits,
  // asi que el reparto no cambia de aire al pasar por aqui.
  const dy = AIRE * TH - m.figTop * zoom
  const quieto =
    Math.abs(zoom - 1) < QUIETO.zoom && Math.abs(dx) < QUIETO.px && Math.abs(dy) < QUIETO.px
  plan.push({ f, zoom, zoomIdeal, dx, dy, quieto, ojos: m.ojos })
}

plan.sort((a, b) => b.zoom - a.zoom)
for (const p of plan) {
  console.log(
    `${p.f.padEnd(28)} ${(p.ojos ? 'ojos' : 'GAFAS').padStart(5)} ${p.zoom.toFixed(2).padStart(5)}x (ideal ${p.zoomIdeal.toFixed(2)}) ` +
      `mueve ${(Math.round(p.dx) + ',' + Math.round(p.dy)).padStart(9)}` +
      `${p.zoomIdeal > MAX_ZOOM ? '  (tope)' : ''}${p.quieto ? '  quieto' : ''}`
  )
}

// Una medida que no se puede mirar es una medida en la que no se puede
// confiar: --ver pinta sobre cada retrato la caja de la cara y los ojos que
// ha encontrado, y deja una hoja de contactos para revisarla de un vistazo
// antes de tocar ningun archivo.
if (verHoja) {
  const url = await page.evaluate(
    async ({ medidas, lado }) => {
      const alto = Math.round((lado * 1200) / 1020)
      const cols = 6
      const fil = Math.ceil(medidas.length / cols)
      const c = document.createElement('canvas')
      c.width = cols * lado
      c.height = fil * (alto + 18)
      const x = c.getContext('2d')
      x.fillStyle = '#16161a'
      x.fillRect(0, 0, c.width, c.height)
      for (let k = 0; k < medidas.length; k++) {
        const m = medidas[k]
        const px = (k % cols) * lado
        const py = ((k / cols) | 0) * (alto + 18)
        const img = new Image()
        img.src = '/characters/' + m.f
        await img.decode()
        x.fillStyle = '#2a2a30'
        x.fillRect(px, py, lado, alto)
        x.drawImage(img, px, py, lado, alto)
        const kx = lado / m.w
        const ky = alto / m.h
        x.lineWidth = 2
        x.strokeStyle = m.ojos ? '#4ade80' : '#f59e0b'
        x.strokeRect(
          px + (m.caraX - m.anchoCara / 2) * kx,
          py + m.caraY0 * ky,
          m.anchoCara * kx,
          m.anchoCara * ky
        )
        if (m.ojos) {
          x.strokeStyle = '#38bdf8'
          x.beginPath()
          x.moveTo(px + (m.cx - m.d / 2) * kx, py + m.cy * ky)
          x.lineTo(px + (m.cx + m.d / 2) * kx, py + m.cy * ky)
          x.stroke()
          for (const lado2 of [-1, 1]) {
            x.beginPath()
            x.arc(px + (m.cx + (lado2 * m.d) / 2) * kx, py + m.cy * ky, 5, 0, 7)
            x.stroke()
          }
        }
        x.fillStyle = '#e8e2d4'
        x.font = '12px sans-serif'
        x.fillText(m.f.replace('.webp', '') + (m.ojos ? '' : '  (sin ojos)'), px + 4, py + alto + 13)
      }
      return c.toDataURL('image/png')
    },
    { medidas: medidas.filter((m) => !m.error), lado: 240 }
  )
  writeFileSync(HOJA, Buffer.from(url.split(',')[1], 'base64'))
  console.log('')
  console.log('hoja de revision: ' + HOJA)
}

if (soloMedir || verHoja) {
  console.log('\n(--medir: no se ha escrito nada)')
} else {
  let tocados = 0
  for (const p of plan) {
    if (p.quieto) continue
    const url = await page.evaluate(
      async ({ f, zoom, dx, dy, TW, TH }) => {
        const img = new Image()
        img.src = '/characters/' + f
        await img.decode()
        const c = document.createElement('canvas')
        c.width = TW
        c.height = TH
        const x = c.getContext('2d')
        x.imageSmoothingQuality = 'high'
        x.drawImage(
          img,
          0,
          0,
          img.naturalWidth,
          img.naturalHeight,
          dx,
          dy,
          img.naturalWidth * zoom,
          img.naturalHeight * zoom
        )
        return c.toDataURL('image/webp', 0.9)
      },
      { f: p.f, zoom: p.zoom, dx: p.dx, dy: p.dy, TW, TH }
    )
    writeFileSync(CHARDIR + p.f, Buffer.from(url.split(',')[1], 'base64'))
    tocados++
  }
  console.log(`\nHecho. ${tocados} retratos re-encuadrados sobre la cara.`)
}

await browser.close()
