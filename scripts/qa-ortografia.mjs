// LA ORTOGRAFÍA DE TODO LO QUE LEE EL JUGADOR, CONTRA UN DICCIONARIO DE VERDAD.
//
// Hasta ahora los validadores miraban la FORMA de los textos (mayúsculas a
// mitad de frase, marcas, comillas sin cerrar, rótulos de ficha) pero ninguno
// sabía si las palabras existían. Con casi ochocientas cartas escritas a mano
// eso es mucho sitio donde esconder una errata.
//
// Usa el diccionario Hunspell de castellano -el mismo de LibreOffice- a través
// de nspell, que lo lee en JavaScript puro: no hace falta Java ni binarios del
// sistema. Se instala con `npm install` como dependencia de desarrollo; si no
// está, el script lo dice y sale sin romper nada.
//
// LO QUE NO ES: un corrector de estilo. No opina de la escritura ni propone
// sinónimos. Dice "esta palabra no está en el diccionario" y ya.
//
// Uso:  node scripts/qa-ortografia.mjs            -> las dudosas, agrupadas
//       node scripts/qa-ortografia.mjs --donde    -> además, dónde sale cada una

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const raiz = new URL('../', import.meta.url)
const ruta = (p) => fileURLToPath(new URL(p, raiz))

const AFF = ruta('node_modules/dictionary-es/index.aff')
const DIC = ruta('node_modules/dictionary-es/index.dic')
if (!existsSync(AFF) || !existsSync(DIC)) {
  console.log('No está el diccionario de castellano. Instálalo con:\n')
  console.log('  npm install --save-dev nspell dictionary-es\n')
  process.exit(0)
}
const { default: nspell } = await import('nspell')
const corrector = nspell(readFileSync(AFF), readFileSync(DIC))

// ---------------------------------------------------------------------------
// DE DÓNDE SALE EL TEXTO
//
// Los ficheros de datos se leen por campos, que se sabe cuáles son. Los
// componentes se leen a lo bruto: cualquier cadena entrecomillada y cualquier
// trozo de JSX que tenga pinta de frase. Sobra ruido, pero el ruido son
// palabras inglesas de CSS que caen solas en la lista de permitidas.
// ---------------------------------------------------------------------------
const DATOS = [
  ['src/data/cards.content.ts', /(?:text|epilogueText): '((?:[^'\\]|\\.)*)'/g],
  ['src/data/cards.ts', /(?:text|epilogueText): '((?:[^'\\]|\\.)*)'/g],
  ['src/data/logros.ts', /(?:nombre|desc): '((?:[^'\\]|\\.)*)'/g],
  ['src/data/reparto.ts', /quien: '((?:[^'\\]|\\.)*)'/g],
]
const COMPONENTES = [
  'src/App.tsx',
  'src/components/StartScreen.tsx',
  'src/components/BottomBar.tsx',
  'src/components/StatBars.tsx',
  'src/components/SwipeCard.tsx',
  'src/components/RepartoPanel.tsx',
  'src/components/LogrosPanel.tsx',
  'src/components/LogroToast.tsx',
  'src/components/RedDeSeguridad.tsx',
  'src/components/PantallaCarga.tsx',
  'src/utils/compartir.ts',
]

// Los comentarios del código no son texto del juego: hablan del juego, usan el
// rótulo de los personajes y se permiten tecnicismos. Fuera.
function sinComentarios(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

// ¿Esto que he pescado de un .tsx es una frase para el jugador, o es CSS?
//
// Pide dos palabras seguidas en minúscula -que es lo que tiene una frase- y
// descarta lo que lleve sintaxis. La sintaxis se busca por lo que SOLO existe
// en CSS: color en hexadecimal, llamada a función (una letra pegada al
// paréntesis), medidas con unidad, y propiedades con dos guiones.
//
// El primer intento descartaba cualquier paréntesis, y con eso se perdió una
// frase de verdad: " (de su lado)", en las barras. Los paréntesis, el punto y
// coma y la almohadilla los usa el castellano; "rgba(" no.
const SINTAXIS_CSS = /#[0-9a-fA-F]{3,8}\b|[a-zA-Z]\(|\d\s*(px|%|deg|ms|rem|em)\b|--[a-z]/
const esFrase = (t) => /[a-záéíóúñü]\s+[a-záéíóúñü]/i.test(t) && !SINTAXIS_CSS.test(t)

const trozos = []
for (const [f, re] of DATOS) {
  const src = readFileSync(ruta(f), 'utf8')
  const lineas = src.split('\n')
  for (let i = 0; i < lineas.length; i++) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(lineas[i]))) trozos.push({ f, linea: i + 1, txt: m[1] })
  }
}
for (const f of COMPONENTES) {
  const lineas = sinComentarios(readFileSync(ruta(f), 'utf8')).split('\n')
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i]
    // Cadenas entrecomilladas con al menos dos palabras.
    for (const m of l.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g)) {
      const t = m[1] ?? m[2] ?? ''
      if (esFrase(t)) trozos.push({ f, linea: i + 1, txt: t })
    }
    // Texto de JSX suelto entre etiquetas.
    for (const m of l.matchAll(/>([^<>{}\n]{4,})</g)) {
      const t = m[1].trim()
      if (esFrase(t)) trozos.push({ f, linea: i + 1, txt: t })
    }
  }
}

// ---------------------------------------------------------------------------
// LO QUE EL DICCIONARIO NO TIENE Y AQUÍ ES CORRECTO
//
// Tres clases, y conviene no mezclarlas:
//   - Lo que el juego se inventa (Mopongo) o el castellano de la calle que no
//     está en el Hunspell.
//   - Palabras que la RAE admite desde hace poco y el diccionario no ha
//     alcanzado (pódcast, tuit, wifi).
//   - Ruido del código que se cuela al leer los .tsx a lo bruto.
// ---------------------------------------------------------------------------
const PERMITIDAS = new Set(
  [
    // Del juego. "presi" es como le habla el Ministro Caído, y "txekila" es
    // el chiste esquivando un nombre real. "karim" es un alias que la propia
    // carta dice que es falso, y "trincón" es el nombre de un logro.
    'mopongo', 'nomeconsta', 'presi', 'txekila', 'karim', 'trincón', 'vice',
    // Jerga política y periodística que el diccionario no trae
    'argumentario', 'argumentarios', 'tertuliano', 'tertulianos', 'tertuliana',
    'dedazo', 'dedazos', 'chiringuito', 'chiringuitos', 'enchufismo',
    'sanchismo', 'aforado', 'aforados', 'aforamiento', 'transfuguismo',
    'indepe', 'indepes', 'peperos', 'pepera',
    'cuñado', 'cuñadismo', 'postureo', 'pancarta', 'pancartas',
    'mariscada', 'mariscadas', 'sobresueldo', 'sobresueldos',
    'chivatazo', 'chivatazos', 'pelotazo', 'pelotazos', 'tamayazo',
    'macrogranja', 'macrogranjas', 'macroencuesta',
    'okupa', 'okupas', 'ecotasa', 'trapicheos', 'tránsfuga', 'taquígrafos',
    'convalidación', 'discrepantes', 'urbanizable', 'helipuerto', 'catamarán',
    'funambulista', 'honoris',
    // Tecnología reciente
    'pódcast', 'podcast', 'tuit', 'tuits', 'tuitero', 'tuitera', 'retuit',
    'wifi', 'hashtag', 'streaming', 'streamer', 'stories',
    'app', 'apps', 'online', 'gigas', 'sms', 'podcasts', 'bots', 'cripto',
    'iphone', 'ipad', 'android',
    'merchandising', 'community', 'manager', 'trending', 'topic', 'jet', 'spa',
    'vip', 'url',
    // Habla coloquial
    'flipas', 'flipando', 'movida', 'movidas', 'peña', 'chungo', 'chunga',
    'chiringo', 'currele', 'curro', 'currar', 'currando', 'tela',
    'cutre', 'cutres', 'cutrez', 'majo', 'maja', 'majete',
    'zasca', 'zascas', 'coña', 'wasap', 'paripé', 'pelín', 'chiqui',
    // Diminutivos, que el diccionario no construye
    'cosita', 'cortito', 'añitos', 'firmita', 'llamadita', 'numerito',
    'trabajito', 'golpecitos', 'favorcito', 'problemilla', 'batallitas',
    // Ruido de código
    'div', 'span', 'px', 'rgba', 'rgb', 'webkit', 'flex', 'grid', 'href',
    'true', 'false', 'null', 'undefined', 'const', 'let', 'return', 'style',
    'className', 'onClick', 'aria', 'svg', 'webp', 'png', 'src', 'alt',
    'inset', 'sans', 'serif', 'monospace', 'inherit', 'auto', 'none',
    'hidden', 'visible', 'absolute', 'relative', 'fixed', 'sticky',
    'center', 'left', 'right', 'top', 'bottom', 'column', 'row', 'wrap',
    'bold', 'normal', 'italic', 'uppercase', 'lowercase', 'capitalize',
    'pointer', 'default', 'transparent', 'solid', 'dashed', 'dotted',
    'opacity', 'circle', 'infinite', 'safe', 'steps',
  ].map((w) => w.toLowerCase())
)

// Y las palabras que SÍ tienen que estar bien escritas aunque el diccionario
// no las conozca: los nombres del reparto. Se sacan del propio reparto para
// que no haya que mantener dos listas.
const reparto = readFileSync(ruta('src/data/reparto.ts'), 'utf8')
for (const m of reparto.matchAll(/nombre: '([^']+)'/g)) {
  for (const w of m[1].split(/\s+/)) PERMITIDAS.add(w.toLowerCase())
}

// ---------------------------------------------------------------------------
const LETRA = 'a-záéíóúüñA-ZÁÉÍÓÚÜÑ'
const RE_PALABRA = new RegExp(`[${LETRA}]+(?:[-'’][${LETRA}]+)*`, 'g')

// EL DICCIONARIO NO TRAE LAS FORMAS QUE EL CASTELLANO CONSTRUYE SOLO.
//
// Hunspell lleva los lemas y sus flexiones, pero no los enclíticos
// ("recordarle", "defendiéndole", "firmárselo"), ni los superlativos en
// -ísimo, ni las palabras con prefijo ("exministro"). En la primera pasada
// esas tres cosas eran ochenta de las ciento dieciséis palabras dudosas: la
// lista era ilegible y lo de verdad roto se perdía dentro.
//
// Se resuelven como REGLA y no metiéndolas a mano en la lista de permitidas,
// que si no hay que ampliarla cada vez que alguien escribe un verbo con
// pronombre pegado. Se desmonta la palabra y se pregunta por lo que queda: si
// el trozo de dentro existe, la palabra entera es buena.
const encliticosConTilde = new Set()
const ENCLITICOS = /^(?:se|me|te|nos|le|les|lo|la|los|las)+$/
const sinTilde = (w) =>
  w.replace(/[áéíóú]/g, (c) => ({ á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' })[c])

function construidaSobreAlgoQueExiste(w) {
  const vale = (x) => x.length > 2 && corrector.correct(x)

  // 1. Verbo con pronombres pegados. Se prueban TODOS los cortes posibles, no
  //    el más largo: la cadena de pronombres es ambigua por la derecha y
  //    quedarse con el primero que encaje se equivoca. En "promételes" el
  //    corte goloso se lleva "te" + "les" y deja "promé", que no es nada;
  //    el bueno se lleva solo "les" y deja "prométe" -> "promete".
  //
  //    Y se prueba con y sin tilde, porque al pegar el pronombre la palabra
  //    gana sílabas y aparece una tilde que el lema no tiene ("firme" ->
  //    "fírmelo", "defendiendo" -> "defendiéndole").
  //
  //    OJO CON EL PUNTO CIEGO QUE ABRE ESTO. Quitarle la tilde a la raíz para
  //    preguntar por ella también acepta la tilde MAL puesta: "aprendáselo"
  //    (falta real que había en el mazo) se descuenta igual que "apréndaselo",
  //    porque las dos dan "aprenda". Saber cuál es la buena pide silabear y
  //    seguirle la pista al acento de la raíz, que es bastante más máquina de
  //    la que merece el problema. Así que no se dan por buenas en silencio:
  //    salen en una lista aparte, corta, para mirarlas a ojo.
  for (let i = 3; i < w.length - 1; i++) {
    if (!ENCLITICOS.test(w.slice(i))) continue
    const raiz = w.slice(0, i)
    if (vale(raiz)) return true
    if (/[áéíóú]/.test(raiz) && vale(sinTilde(raiz))) {
      encliticosConTilde.add(w)
      return true
    }
  }

  // 2. Superlativo. "clarísimo" -> claro / clara / clar.
  const sup = w.match(/^(.+?)[íi]sim[oa]s?$/)
  if (sup && ['o', 'a', '', 'e'].some((fin) => vale(sup[1] + fin))) return true

  // 3. Prefijos productivos que el diccionario no combina.
  const pre = w.match(/^(ex|re|super|macro|micro|anti|contra|pre|post|pro|sub|semi|auto|multi)(.+)$/)
  if (pre && vale(pre[2])) return true

  return false
}

const dudosas = new Map()
for (const t of trozos) {
  for (const m of t.txt.matchAll(RE_PALABRA)) {
    const bruta = m[0]
    const w = bruta.toLowerCase()
    if (w.length < 3) continue
    if (PERMITIDAS.has(w)) continue
    // El corrector distingue mayúsculas: se prueba tal cual y en minúscula,
    // que si no toda palabra que abre frase saldría como nombre propio.
    if (corrector.correct(bruta) || corrector.correct(w)) continue
    if (construidaSobreAlgoQueExiste(w)) continue
    if (!dudosas.has(w)) dudosas.set(w, [])
    dudosas.get(w).push(t)
  }
}

const detalle = process.argv.includes('--donde')
const orden = [...dudosas.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))

console.log(`Textos revisados: ${trozos.length}`)
console.log(`Palabras distintas fuera del diccionario: ${orden.length}\n`)
for (const [w, donde] of orden) {
  const sug = corrector.suggest(w).slice(0, 3)
  console.log(`  ${w}  (${donde.length})${sug.length ? '  ¿' + sug.join(' / ') + '?' : ''}`)
  if (detalle) {
    for (const d of donde.slice(0, 4)) {
      console.log(`      ${d.f}:${d.linea}  ${d.txt.slice(0, 110)}`)
    }
    if (donde.length > 4) console.log(`      ... y ${donde.length - 4} más`)
  }
}
if (orden.length === 0) console.log('Ninguna palabra fuera del diccionario.')

// ---------------------------------------------------------------------------
// LO QUE EL DICCIONARIO NO PUEDE VER
//
// Un corrector mira palabras sueltas, así que se le escapa todo lo que es
// correcto como palabra y falso como frase. Aquí van solo las reglas que se
// pueden comprobar sin entender la frase, que son pocas pero seguras:
//
//   - La apertura de interrogación y exclamación. En castellano se abren, y
//     comerse el signo es de los fallos que más cantan en pantalla.
//   - Las tildes que la RAE quitó y que siguen apareciendo por costumbre
//     ("sólo", "éste", "fué"). Hoy son falta, no variante.
//
// Lo que NO se mira, y es a propósito: "si/sí", "el/él", "mas/más", "aun/aún",
// "porque/por qué". Distinguirlas pide entender la frase, y un detector que se
// equivoca la mitad de las veces se acaba ignorando, que es peor que no
// tenerlo.
// ---------------------------------------------------------------------------
const TILDES_RETIRADAS =
  /(^|[^a-záéíóúñüA-ZÁÉÍÓÚÑÜ])(sólo|éste|ésta|éstos|éstas|ése|ésa|ésos|ésas|aquél|aquélla|aquéllos|aquéllas|tí|fué|fuí|vió|dió|fé)(?![a-záéíóúñüA-ZÁÉÍÓÚÑÜ])/i

const fallos = []
for (const t of trozos) {
  // Frase a frase: un texto puede tener una pregunta bien abierta y otra no.
  for (const frase of t.txt.split(/(?<=[.!?…])\s+/)) {
    if (/\?/.test(frase) && !/¿/.test(frase)) {
      fallos.push([t, 'pregunta sin abrir (falta "¿")', frase])
    }
    if (/!/.test(frase) && !/¡/.test(frase)) {
      fallos.push([t, 'exclamación sin abrir (falta "¡")', frase])
    }
  }
  const vieja = t.txt.match(TILDES_RETIRADAS)
  if (vieja) {
    fallos.push([t, `"${vieja[2]}" ya no lleva tilde desde la reforma de 2010`, t.txt])
  }
  // La palabra repetida: la errata que ningún corrector ve, porque las dos
  // palabras existen. Se salta lo que en castellano se repite de verdad
  // ("que que" no, pero "no, no" sí, y "muy muy" también), exigiendo que entre
  // las dos no haya ni coma ni punto.
  const repe = t.txt.match(
    /(^|[^a-záéíóúñüA-ZÁÉÍÓÚÑÜ])([a-záéíóúñü]{2,})\s+\2(?![a-záéíóúñüA-ZÁÉÍÓÚÑÜ])/
  )
  if (repe && !['no', 'muy', 'sí', 'si', 'ya'].includes(repe[2])) {
    fallos.push([t, `palabra repetida ("${repe[2]} ${repe[2]}")`, t.txt])
  }
}

if (encliticosConTilde.size) {
  console.log(
    `\nVerbos con pronombre pegado y tilde (${encliticosConTilde.size}). El diccionario no` +
      '\n  los trae, y aquí no se puede saber en qué sílaba va la tilde sin silabear.' +
      '\n  Se miran a ojo: va donde ya sonaba el verbo solo ("aprenda" -> "apréndaselo").'
  )
  console.log('  ' + [...encliticosConTilde].sort().join('   '))
}

console.log(`\nPuntuación y tildes retiradas: ${fallos.length ? fallos.length + ' por mirar' : 'nada que decir'}`)
for (const [t, que, frase] of fallos) {
  console.log(`  ${t.f}:${t.linea}  ${que}`)
  console.log(`      ${frase.trim().slice(0, 130)}`)
}
