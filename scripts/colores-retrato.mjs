// Saca de CADA retrato el color de fondo que le pega, y escribe el mapa en
// src/data/coloresRetrato.ts para que la carta lo use.
//
// El problema que resuelve: el fondo de la carta salia de un hash del NOMBRE
// del personaje (`hsl(hash % 360, 38%, 22%)`), o sea un tono al azar sin
// ninguna relacion con la ilustracion. A `presi` le tocaba azul marino y,
// como lleva traje azul, la carta parecia llena de lado a lado. A los demas
// les tocaba lo que fuera, y como los retratos son PNG transparentes que se
// estrechan al llegar a los hombros, las esquinas quedaban de un color
// ajeno: los "huecos".
//
// Ahora el fondo sale del tono dominante de la ROPA (mitad inferior del
// retrato, que es la parte que toca los bordes de la carta), oscurecido
// siempre igual. Asi cada personaje conserva su color pero todos reciben el
// mismo tratamiento, que es lo que hace que el reparto se lea como una serie.
//
// Uso (hace falta un servidor de dev levantado):
//   1. npm run dev
//   2. node scripts/colores-retrato.mjs
//
// Hay que volver a pasarlo al anadir o cambiar un retrato. Si no se pasa, el
// personaje nuevo cae al color por defecto y sigue funcionando todo.

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
  const npxCache = process.env.PLAYWRIGHT_PATH
  if (npxCache) return (await import(npxCache)).chromium
  throw new Error('No encuentro playwright. Instalalo con: npm i -D playwright  (o define PLAYWRIGHT_PATH)')
}

const CHARDIR = fileURLToPath(new URL('../public/characters/', import.meta.url))
const SALIDA = fileURLToPath(new URL('../src/data/coloresRetrato.ts', import.meta.url))
const DEV_URL = process.env.DEV_URL || 'http://localhost:5173/'

// Las ilustraciones de escena (fin de partida) no son retratos de personaje.
const ESCENAS = /^(comite|max_|min_|nocheelectoral)/

// Cuanto se oscurece el color de la ropa para usarlo de fondo. 0.42 sale de
// probarlo: por encima de ~0.55 el personaje se funde con su propio fondo y
// deja de recortarse; por debajo de ~0.30 vuelve a parecer un agujero negro.
const OSCURO = 0.42
// Luminosidad final de TODAS las cartas, en tanto por uno. Igual para todos
// para que ninguna carta pese mas que otra; lo que las distingue es el tono.
// Por encima de ~0.26 el fondo empieza a competir con la cara.
const LUZ_FONDO = 0.19
const LUZ = 20 // solo para el caso raro de un retrato sin un pixel opaco abajo

const files = readdirSync(CHARDIR)
  .filter((f) => (f.endsWith('.webp') || f.endsWith('.png')) && !ESCENAS.test(f))
  .sort()

const browser = await loadChromium().then((c) => c.launch())
const page = await browser.newPage()
await page.goto(DEV_URL, { waitUntil: 'domcontentloaded' })

const mapa = {}
for (const f of files) {
  mapa[f] = await page.evaluate(
    async ({ f, LUZ, OSCURO, LUZ_FONDO }) => {
      const img = new Image()
      img.src = '/characters/' + f
      await img.decode()
      const w = img.naturalWidth
      const h = img.naturalHeight
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const x = c.getContext('2d')
      x.drawImage(img, 0, 0)
      const d = x.getImageData(0, 0, w, h).data

      // Se mira SOLO la franja de abajo del retrato, que es exactamente la
      // que toca el borde inferior de la carta y la que deja los huecos en
      // las dos esquinas cuando los hombros se estrechan. Mirar el retrato
      // entero no vale: el cuello y las manos son piel, y la piel es naranja
      // y bastante saturada, asi que se come el histograma y a TODOS los
      // personajes les salia el mismo marron (medido: 19 de 22).
      const desde = Math.floor(h * 0.90)
      // Y dentro de esa franja se DESCARTA la piel. La franja de abajo suele
      // ser ropa, pero no siempre: a quien va escotado le toca cuello y
      // escote, y entonces vuelve a pasar lo de antes, que el retrato entero
      // se tinte de marron carne. A La Fontanera le salia una carta marron
      // calida, que es lo contrario de lo que es el personaje.
      const esPiel = (i) => {
        const R = d[i], G = d[i + 1], B = d[i + 2]
        if (R <= G || R <= B) return false
        const mn = Math.min(G, B)
        const sat = (R - mn) / R
        if (sat <= 0.18 || sat >= 0.85 || R / 255 <= 0.45) return false
        const tono = ((G - B) / Math.max(R - mn, 1)) * 60
        return tono >= 2 && tono <= 42
      }
      let r = 0, g = 0, b = 0, n = 0
      let opacos = 0
      for (let y = desde; y < h; y++) {
        for (let px = 0; px < w; px++) {
          const i = (y * w + px) * 4
          if (d[i + 3] < 200) continue
          opacos++
          if (esPiel(i)) continue
          r += d[i]; g += d[i + 1]; b += d[i + 2]; n++
        }
      }
      // Si casi todo era piel no queda muestra de la que fiarse, asi que se
      // vuelve a contar con todo: mejor un marron que un color inventado a
      // partir de cuatro pixeles.
      if (n < opacos * 0.15) {
        r = 0; g = 0; b = 0; n = 0
        for (let y = desde; y < h; y++) {
          for (let px = 0; px < w; px++) {
            const i = (y * w + px) * 4
            if (d[i + 3] < 200) continue
            r += d[i]; g += d[i + 1]; b += d[i + 2]; n++
          }
        }
      }
      if (n === 0) return `hsl(220, 12%, ${LUZ}%)`
      // El promedio de la ropa se queda con el TONO bueno pero sin color:
      // promediar mezcla, y mezclar tiende al gris. Con el oscurecido encima,
      // las veintidos cartas salian entre #0b090b y #42444c, o sea negro con
      // matices que no se ven. El juego entero parecia gris.
      //
      // Asi que se conserva el tono (de donde es el color) y se le devuelve
      // la saturacion que el promedio le quito, con la luminosidad fijada
      // para todos: cada personaje tiene su color y ninguno se come al
      // retrato, que sigue siendo lo que se mira.
      const R = r / n / 255
      const G = g / n / 255
      const B = b / n / 255
      const mx = Math.max(R, G, B)
      const mn = Math.min(R, G, B)
      const l0 = (mx + mn) / 2
      let h0 = 0
      let s0 = 0
      if (mx !== mn) {
        const dd = mx - mn
        s0 = l0 > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn)
        if (mx === R) h0 = ((G - B) / dd + (G < B ? 6 : 0)) / 6
        else if (mx === G) h0 = ((B - R) / dd + 2) / 6
        else h0 = ((R - G) / dd + 4) / 6
      }
      // La ropa casi neutra (una camisa blanca, un traje gris) no tiene tono
      // del que tirar: lo poco que queda es ruido de compresion, y subirle la
      // saturacion no revela un color, lo INVENTA. Dos camisas blancas podian
      // acabar en tonos opuestos. Asi que por debajo de este umbral se manda
      // al azul pizarra de la casa, que es el color de las cartas sin cara.
      // Para decidir si hay color de verdad NO vale la saturacion HSL: en un
      // color casi blanco se dispara aunque no haya color. La camisa del
      // Escudero promedia rgb(225,209,218) -dieciseis puntos de diferencia, o
      // sea blanco- y la HSL la daba en 0,22, asi que colaba y acababa en un
      // vino inventado.
      //
      // Tampoco vale el croma absoluto, que es lo siguiente que se prueba:
      // castiga a los oscuros, y un azul marino tiene poco croma absoluto
      // siendo clarisimamente azul. Con eso, trece de veintitres retratos
      // acababan del mismo gris, que era volver al problema de partida.
      //
      // Lo que si vale es el croma RELATIVO al canal mas alto: blanco rosado
      // 0,07, azul marino 0,45.
      const NEUTRO = 0.18
      const casiGris = mx > 0 ? (mx - mn) / mx < NEUTRO : true
      if (casiGris) {
        // Todos los neutros al azul pizarra de la casa, pero no al MISMO: el
        // juego tiene nueve personajes de blanco, negro o gris, y nueve cartas
        // identicas vuelven a ser el problema de partida. Cada uno cae en un
        // punto distinto de la misma familia, sacado de su nombre de fichero,
        // asi que es estable y se parecen entre ellos sin confundirse.
        let hf = 0
        for (let i = 0; i < f.length; i++) hf = f.charCodeAt(i) + ((hf << 5) - hf)
        h0 = 0.55 + ((Math.abs(hf) % 1000) / 1000) * 0.17
      }
      // Suelo de saturacion para lo demas: con poco tono, ese poco se nota.
      const S = casiGris ? 0.26 : Math.min(0.58, Math.max(0.34, s0 * 2.4))
      const L = LUZ_FONDO
      const hue2rgb = (pp, qq, t) => {
        let tt = t
        if (tt < 0) tt += 1
        if (tt > 1) tt -= 1
        if (tt < 1 / 6) return pp + (qq - pp) * 6 * tt
        if (tt < 1 / 2) return qq
        if (tt < 2 / 3) return pp + (qq - pp) * (2 / 3 - tt) * 6
        return pp
      }
      const q = L < 0.5 ? L * (1 + S) : L + S - L * S
      const pp = 2 * L - q
      const to2 = (v) => Math.round(Math.min(255, Math.max(0, v * 255))).toString(16).padStart(2, '0')
      return (
        '#' +
        to2(hue2rgb(pp, q, h0 + 1 / 3)) +
        to2(hue2rgb(pp, q, h0)) +
        to2(hue2rgb(pp, q, h0 - 1 / 3))
      )
    },
    { f, LUZ, OSCURO, LUZ_FONDO }
  )
  console.log(f.padEnd(28), mapa[f])
}
await browser.close()

const cuerpo = `// GENERADO POR scripts/colores-retrato.mjs — no editar a mano.
//
// Color de fondo de la carta de cada personaje, sacado del tono dominante de
// su propia ilustracion (ver el script para el porque). Vuelve a generarlo
// con \`node scripts/colores-retrato.mjs\` cada vez que anadas o cambies un
// retrato; lo que no este aqui cae al color por defecto y no rompe nada.
export const COLOR_RETRATO: Record<string, string> = {
${files.map((f) => `  '${f}': '${mapa[f]}',`).join('\n')}
}
`
writeFileSync(SALIDA, cuerpo, 'utf8')
console.log(`\n${files.length} retratos -> src/data/coloresRetrato.ts`)
