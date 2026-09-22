// Quita el fondo liso que traen los retratos recién sacados de ChatGPT, para
// que en la carta se vea la figura recortada sobre el color de la carta y no
// un recuadro claro. También sirve para el damero de transparencia cuando
// viene rasterizado como píxeles de verdad (pasa al guardar una captura).
//
// Uso (hace falta un servidor de dev levantado y npx playwright):
//   1. npm run dev            (en otra terminal)
//   2. node scripts/recortar-fondo.mjs hermano.png ...   -> solo esos
//      node scripts/recortar-fondo.mjs                   -> todos
//
// Va ANTES de normalize-portraits: ese re-encuadra sobre el bounding box del
// canal alfa, así que con el fondo todavía pegado el bounding box es el lienzo
// entero y no re-encuadra nada. El orden bueno es:
//   recortar-fondo -> normalize-portraits -> to-webp -> colores-retrato
//
// Es idempotente: si el retrato ya venía recortado, lo detecta y no lo toca.
//
// Nota técnica: usa un navegador (canvas) porque Node no trae manipulación de
// imágenes. La página se carga desde localhost para que el canvas no quede
// "tainted" por CORS al leer los píxeles.

import { writeFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Playwright no es dependencia del proyecto (solo hace falta para este script
// puntual). Se intenta resolver del proyecto y, si no está, de la caché de
// npx. Si falla, el mensaje dice qué ejecutar.
async function loadChromium() {
  const tries = ['playwright', 'playwright-core']
  for (const mod of tries) {
    try {
      return (await import(mod)).chromium
    } catch {
      /* siguiente */
    }
  }
  const npxCache = process.env.PLAYWRIGHT_PATH
  if (npxCache) return (await import(npxCache)).chromium
  throw new Error(
    'No encuentro playwright. Instálalo con: npm i -D playwright  (o define PLAYWRIGHT_PATH)'
  )
}
const chromium = await loadChromium()

const CHARDIR = fileURLToPath(new URL('../public/characters/', import.meta.url))
const DEV_URL = process.env.DEV_URL || 'http://localhost:5173/'

// Cuánto puede alejarse un píxel del color de fondo y seguir contando como
// fondo. Por debajo de ~20 se queda un halo; por encima de ~35 empieza a
// comerse los grises claros de una camisa.
const TOLERANCIA = 26
// Si hubiera que borrar más de esto, algo ha ido mal (típicamente se ha
// tomado la ropa por fondo): mejor no tocar el archivo y avisar.
const MAX_BORRADO = 0.7

const args = process.argv.slice(2)
const files =
  args.length > 0
    ? args
    : readdirSync(CHARDIR).filter((f) => f.endsWith('.webp') || f.endsWith('.png'))

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(DEV_URL, { waitUntil: 'domcontentloaded' })

let tocados = 0
for (const f of files) {
  const res = await page.evaluate(
    async ({ f, TOLERANCIA, MAX_BORRADO }) => {
      const img = new Image()
      img.src = '/characters/' + f
      await img.decode()
      const w = img.naturalWidth
      const h = img.naturalHeight

      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const cx = c.getContext('2d')
      cx.drawImage(img, 0, 0)
      const imgData = cx.getImageData(0, 0, w, h)
      const d = imgData.data

      // El color de fondo se toma SOLO de las franjas laterales de ARRIBA.
      // Por abajo el torso sangra hasta el borde, y muestrear el marco entero
      // hace que una americana azul marino pase por fondo y desaparezca.
      // Se empieza por debajo del aire de cabecera, que ya es transparente en
      // los retratos que pasaron por normalize-portraits.
      const y0 = Math.round(h * 0.06)
      const y1 = Math.round(h * 0.22)
      const banda = Math.round(w * 0.07)
      const urna = new Map()
      for (let y = y0; y < y1; y++) {
        for (let x = 0; x < w; x++) {
          if (x >= banda && x < w - banda) continue
          const i = (y * w + x) * 4
          if (d[i + 3] < 128) continue
          // Se agrupa de 8 en 8 para que el ruido de compresión no parta el
          // mismo fondo en veinte tonos distintos.
          const k = `${d[i] >> 3},${d[i + 1] >> 3},${d[i + 2] >> 3}`
          const v = urna.get(k)
          if (v) {
            v.n++
            v.r += d[i]
            v.g += d[i + 1]
            v.b += d[i + 2]
          } else {
            urna.set(k, { n: 1, r: d[i], g: d[i + 1], b: d[i + 2] })
          }
        }
      }
      const muestras = [...urna.values()].reduce((a, v) => a + v.n, 0)
      if (muestras < 200) return { saltado: 'ya venía recortado' }

      // Hasta dos tonos (el damero alterna dos) y solo si son CLAROS: un fondo
      // oscuro no se distingue de la ropa y no merece la pena arriesgarse.
      const fondos = [...urna.values()]
        .sort((a, b) => b.n - a.n)
        .slice(0, 2)
        .map((v) => ({ r: v.r / v.n, g: v.g / v.n, b: v.b / v.n }))
        .filter((c0) => (c0.r + c0.g + c0.b) / 3 > 150)
      if (!fondos.length) return { saltado: 'el fondo no es claro, no me fío' }

      // Candidatos: parecidos a algún tono de fondo, o ya transparentes.
      const N = w * h
      const cand = new Uint8Array(N)
      for (let p = 0; p < N; p++) {
        const i = p * 4
        if (d[i + 3] < 40) {
          cand[p] = 1
          continue
        }
        for (const c0 of fondos) {
          if (
            Math.abs(d[i] - c0.r) <= TOLERANCIA &&
            Math.abs(d[i + 1] - c0.g) <= TOLERANCIA &&
            Math.abs(d[i + 2] - c0.b) <= TOLERANCIA
          ) {
            cand[p] = 1
            break
          }
        }
      }

      // Solo se borra lo que está PEGADO AL BORDE y conectado: así una camisa
      // blanca rodeada de americana oscura se queda, porque no toca el borde.
      const visto = new Uint8Array(N)
      const cola = new Int32Array(N)
      let cab = 0
      let fin = 0
      const meter = (p) => {
        if (!visto[p] && cand[p]) {
          visto[p] = 1
          cola[fin++] = p
        }
      }
      for (let x = 0; x < w; x++) {
        meter(x)
        meter((h - 1) * w + x)
      }
      for (let y = 0; y < h; y++) {
        meter(y * w)
        meter(y * w + w - 1)
      }
      while (cab < fin) {
        const p = cola[cab++]
        const x = p % w
        const y = (p / w) | 0
        if (x > 0) meter(p - 1)
        if (x < w - 1) meter(p + 1)
        if (y > 0) meter(p - w)
        if (y < h - 1) meter(p + w)
      }

      if (fin / N > MAX_BORRADO) {
        return { saltado: `borraría el ${Math.round((fin / N) * 100)}%, sospechoso` }
      }

      for (let p = 0; p < N; p++) if (visto[p]) d[p * 4 + 3] = 0

      // Suavizado de 1 píxel en el borde, para que el recorte no quede de
      // sierra sobre el fondo de la carta.
      const alfa = new Uint8ClampedArray(N)
      for (let p = 0; p < N; p++) alfa[p] = d[p * 4 + 3]
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const p = y * w + x
          const a = alfa[p]
          // Solo donde hay frontera: si los cuatro vecinos están como él, se
          // deja en paz y no se emborrona el interior de la figura.
          const n = alfa[p - 1]
          const s = alfa[p + 1]
          const e = alfa[p - w]
          const o = alfa[p + w]
          if (n === a && s === a && e === a && o === a) continue
          d[p * 4 + 3] = (a * 2 + n + s + e + o) / 6
        }
      }

      cx.putImageData(imgData, 0, 0)
      // Se reexporta en el MISMO formato que entró: convertir un webp a png
      // lo devolvería a pesar diez veces más.
      return {
        url: c.toDataURL(f.endsWith('.webp') ? 'image/webp' : 'image/png', 0.92),
        borrado: Math.round((fin / N) * 100),
        fondos: fondos.map((c0) => `rgb(${[c0.r, c0.g, c0.b].map(Math.round).join(',')})`),
      }
    },
    { f, TOLERANCIA, MAX_BORRADO }
  )

  if (res.saltado) {
    console.log(`  ${f}: ${res.saltado}`)
    continue
  }
  writeFileSync(CHARDIR + f, Buffer.from(res.url.split(',')[1], 'base64'))
  console.log(`  ${f}: fuera el ${res.borrado}% de fondo  [${res.fondos.join(' ')}]`)
  tocados++
}

await browser.close()
console.log(`\nHecho. ${tocados} de ${files.length} retratos recortados.`)
