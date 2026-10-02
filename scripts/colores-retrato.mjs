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
      if (n === 0) return { h: 220, s: 0.12, esNeutro: true }
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
      // Se devuelve en HSL y SIN cocinar. El reparto final se decide fuera,
      // mirando los veinticuatro a la vez: no se puede saber si un azul se
      // parece demasiado a otro azul viendolos de uno en uno.
      return { h: h0 * 360, s: S, esNeutro: casiGris }
    },
    { f, LUZ, OSCURO, LUZ_FONDO }
  )
}
await browser.close()

// ===========================================================================
// SEPARAR LOS QUE SE PARECEN DEMASIADO
//
// El color de cada carta sale de la ropa del personaje, y eso es correcto: es
// lo que hace que el fondo no parezca ajeno en las esquinas. El problema es
// que la realidad es monocroma — los politicos visten de azul marino — y
// catorce de los veinticuatro salian azules. El 58% del reparto con la misma
// carta.
//
// Se miro si habia de donde sacar variedad sin inventarla, listando los cuatro
// colores mas presentes del cuerpo de cada uno de esos catorce. No la hay: lo
// unico que aparece aparte del azul son tonos de piel, que el algoritmo ya
// descarta a proposito (sin ese descarte le salia el mismo marron a 19 de 22).
//
// POR QUE NO BASTA CON MOVER EL TONO: catorce cartas necesitan unos 180 grados
// de separacion para distinguirse, y un traje azul marino solo tolera unos 26
// antes de que el fondo se note ajeno en las esquinas de arriba. Asi que el
// trabajo se reparte entre las tres dimensiones del color: el tono se abre lo
// que el traje aguanta, y la PROFUNDIDAD y la SATURACION hacen el resto.
//
// Esto rompe a sabiendas la regla de "todas las cartas a la misma luminosidad
// para que ninguna pese mas que otra". Se mantiene el espiritu -el rango va de
// 0,15 a 0,235, y el techo sigue siendo el 0,26 en que el fondo empieza a
// competir con la cara- pero dentro de el, dos cartas seguidas en el circulo
// cromatico salen a distinta profundidad, que es lo que las separa cuando el
// tono no puede.
//
// NO SE TOCA EL RETRATO. Esto es solo el color que se ve DETRAS del PNG
// transparente, en las esquinas y a los lados.

const SEPARACION = 13 // grados minimos entre dos cartas vecinas en tono

// CUANTO MANDA EL CIRCULO Y CUANTO MANDA LA ROPA.
//
// 0 = el tono sale tal cual del retrato. 1 = las cartas se reparten a
// intervalos iguales por todo el circulo cromatico, y del arte solo queda el
// ORDEN (la mas azul de verdad sigue siendo la mas azul de todas).
//
// POR QUE HIZO FALTA SUBIRLO. El sistema de antes abria cada grupo en abanico
// sobre su propia media, con un tope de 26 grados. Medido con los 27 retratos:
// QUINCE cartas caian dentro de 52 grados (207-259), que es justo donde el
// azul marino se vuelve violeta — de ahi el "mucho fondo morado" — y quedaban
// 157 grados SEGUIDOS sin usar (50-207): ni un verde, ni un turquesa, ni un
// cian. El abanico ya iba al tope y no podia hacer mas.
//
// El motivo de fondo es que el tono casi no lleva informacion: los politicos
// visten todos de azul marino, asi que quince retratos distintos dicen el
// mismo numero. Ser fiel a un dato que es el mismo para todos es exactamente
// lo que produce quince cartas iguales. El orden si lleva informacion, y es lo
// que se conserva.
const REPARTO = 0.8

// SEIS escalones alternos de profundidad y saturacion, segun la posicion en el
// circulo: dos cartas de tono parecido caen en escalones distintos y dejan de
// confundirse. Con cuatro escalones entre 0,155 y 0,235 quedaban treinta y dos
// parejas que el ojo no separa — a esa oscuridad los colores se comprimen y un
// azul a 243 grados y otro a 251 son la misma carta. Medido en CIELAB, que es
// donde "parecido" significa algo.
//
// El techo sigue por debajo del 0,30 en que el fondo empieza a disputarle la
// atencion a la cara, que es el limite que importa.
//
// SE PROBO PASTEL el 02/10/2026 (luminosidad 0,77-0,90) y se descarto: separa
// las cartas de maravilla, pero no es el juego. Si alguna vez se vuelve a
// intentar, ojo con dos cosas que se rompen y no se ven venir: el degradado de
// utils/color.ts multiplica y con colores claros se sale de rango a blanco
// puro, y el cartel "NUEVA" es dorado y contra pastel se queda en 1,03:1 de
// contraste.
// MAS OSCUROS (02/10/2026, "queda mas elegante"). Luminosidad media medida en
// CIELAB: de 23,4 a 17,9 sobre 100, o sea una cuarta parte menos.
//
// Y LA SATURACION SUBE PORQUE LA PROFUNDIDAD BAJA, no por gusto. Al oscurecer,
// los colores se comprimen y dejan de distinguirse: con la saturacion de antes,
// bajar la luminosidad disparo las parejas confundibles de 6 a 24 de golpe
// (lo mide el propio script, al final). Mas saturacion devuelve el margen que
// quita la oscuridad, y ademas un oscuro saturado es un tono joya, que es
// justo lo elegante — un oscuro apagado es gris.
//
// Siguen siendo SEIS escalones alternos para que dos cartas seguidas en el
// circulo no salgan ademas con la misma claridad.
//
// SE PROBO PASTEL (luminosidad 0,77-0,90) y se descarto: separa de maravilla,
// pero no es el juego. Si alguna vez se reintenta, ojo con dos cosas que se
// rompen y no se ven venir: el degradado de utils/color.ts multiplica y con
// colores claros se sale de rango a blanco puro, y el cartel "NUEVA" es dorado
// y contra pastel se queda en 1,03:1 de contraste.
const PROFUNDIDAD = [0.23, 0.1, 0.19, 0.12, 0.21, 0.11]
const SATURACION = [0.6, 1.0, 0.75, 0.92, 0.68, 0.85]

const orden = files
  .map((f) => ({ f, ...mapa[f], original: mapa[f].h }))
  .sort((a, b) => a.h - b.h)

// SE REPARTEN POR EL CIRCULO, CONSERVANDO EL ORDEN.
//
// Hubo dos intentos antes y los dos fallaron por lo mismo, que es util saber:
//   - empujar al que pisa al anterior encadena, y los catorce azules se
//     mudaron enteros a 250-281 grados. Deslizar un grupo no lo separa.
//   - abrir cada grupo en abanico sobre su media no muda nada, pero con un
//     tope de 26 grados no llega: quince cartas seguian dentro de 52 grados.
//
// Lo que se hace ahora es colocar las 27 en una escalera de intervalos
// iguales (360/27 = 13,3 grados, que es justo la separacion minima que ya
// pedia SEPARACION) y luego mezclar esa escalera con el tono real segun
// REPARTO. Como las dos series van en el mismo orden, la mezcla tambien: la
// carta mas azul del arte sigue siendo la mas azul del juego.
const paso = 360 / orden.length

// Donde arranca la escalera. No se pone a ojo: se prueban los 360 giros y se
// elige el que menos mueve el conjunto respecto al color real de la ropa. Asi,
// de todos los repartos posibles, sale el que mas se parece al arte.
const distancia = (a, b) => {
  const d = (((a - b) % 360) + 540) % 360 - 180
  return Math.abs(d)
}
let ancla = 0
let mejor = Infinity
for (let g = 0; g < 360; g++) {
  let suma = 0
  for (let i = 0; i < orden.length; i++) suma += distancia(g + i * paso, orden[i].h)
  if (suma < mejor) {
    mejor = suma
    ancla = g
  }
}

orden.forEach((c, i) => {
  const ideal = ancla + i * paso
  // Por el camino corto, para que mezclar 350 con 10 no se vaya a 180.
  const salto = (((ideal - c.h) % 360) + 540) % 360 - 180
  c.h = c.h + REPARTO * salto
})

const hslAHex = (h, s, l) => {
  const hh = ((h % 360) + 360) % 360 / 360
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const canal = (t) => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  const to2 = (v) => Math.round(Math.min(255, Math.max(0, v * 255))).toString(16).padStart(2, '0')
  return '#' + to2(canal(hh + 1 / 3)) + to2(canal(hh)) + to2(canal(hh - 1 / 3))
}

orden.forEach((c, i) => {
  const l = PROFUNDIDAD[i % PROFUNDIDAD.length]
  // La saturacion propia manda, pero se empuja hacia el escalon que toca para
  // que dos vecinos no salgan igual de apagados.
  const s = (c.s + SATURACION[i % SATURACION.length]) / 2
  mapa[c.f] = hslAHex(c.h, s, l)
  const movido = Math.round(c.h - c.original)
  console.log(
    `  ${c.f.padEnd(28)} ${mapa[c.f]}  tono ${String(Math.round(c.h)).padStart(3)}` +
      `${movido ? ` (movido ${movido > 0 ? '+' : ''}${movido})` : ''}`
  )
})

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

// ¿SE DISTINGUEN DE VERDAD? Se mide aqui mismo y se imprime, porque es el
// numero que decide si los ajustes de arriba valen o no, y a ojo no se sabe:
// dos azules oscuros parecen distintos en el editor de color y son la misma
// carta en el movil.
//
// CIELAB porque es el espacio donde "parecido" significa algo — en RGB, la
// misma distancia numerica se ve enorme en los claros y nula en los oscuros, y
// aqui casi todo es oscuro. dE<10 es el umbral que se venia usando.
//
// OJO AL OSCURECER: al bajar la luminosidad los colores se comprimen y las
// parejas confundibles se disparan. Pasar PROFUNDIDAD de 0,145-0,285 a
// 0,105-0,205 las subio de 6 a 24 de golpe, y hubo que compensar con mas
// saturacion. Si tocas PROFUNDIDAD, mira este numero antes de dar nada por
// bueno.
const aLab = (hex) => {
  const n = Number.parseInt(hex.slice(1), 16)
  const g = (v) => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const r = g((n >> 16) & 255)
  const v = g((n >> 8) & 255)
  const b = g(n & 255)
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const X = f((0.4124 * r + 0.3576 * v + 0.1805 * b) / 0.95047)
  const Y = f(0.2126 * r + 0.7152 * v + 0.0722 * b)
  const Z = f((0.0193 * r + 0.1192 * v + 0.9505 * b) / 1.08883)
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)]
}
const hexes = files.map((f) => mapa[f])
const distancias = []
for (let i = 0; i < hexes.length; i++) {
  for (let j = i + 1; j < hexes.length; j++) {
    const a = aLab(hexes[i])
    const b = aLab(hexes[j])
    distancias.push(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]))
  }
}
distancias.sort((a, b) => a - b)
const confundibles = distancias.filter((d) => d < 10).length
const luz = hexes.reduce((a, h) => a + aLab(h)[0], 0) / hexes.length
console.log(
  `parejas confundibles (dE<10): ${confundibles} de ${distancias.length}` +
    `  |  la mas parecida dE=${distancias[0].toFixed(1)}` +
    `  |  luminosidad media ${luz.toFixed(1)} de 100`
)
