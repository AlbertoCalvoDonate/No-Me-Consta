// ¿Habla el personaje, o le describe un narrador?
//
// En Reigns el que trae el asunto te lo dice a la cara y con tratamiento
// ("This is your 20th birthday My Lord"). La tercera persona la reservan para
// lo que pasa sin nadie delante. Aquí se busca lo mismo: que cuando hay
// alguien en la habitación, hable.
//
// DETECTAR ESTO BIEN CUESTA MÁS DE LO QUE PARECE. Buscar "yo" o "mi" no vale:
// media primera persona del castellano va en el verbo y no en el pronombre
// ("Podemos tocar la cocina", "Necesitamos una respuesta", "Le traigo el
// dato"). Un detector ingenuo marca esas como narradas y te hace reescribir
// cartas que ya estaban bien.
//
// Así que aquí se mira por tres vías, y basta con una:
//   1. Pronombres de primera persona.
//   2. Terminaciones verbales de primera persona (-o, -mos, -é, -í) sobre una
//      lista de verbos frecuentes, más los irregulares que no caben en regla.
//   3. Que se dirija a alguien: "usted", "presidente", "le digo", el
//      imperativo de cortesía ("dígame", "mírelo")...
//
// Y hay voces que NO tienen que hablar, listadas abajo: no es un fallo, es lo
// que son.
//
// Uso:  node scripts/qa-voz.mjs          -> resumen
//       node scripts/qa-voz.mjs --todas  -> además, la lista entera

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const CONTENT = fileURLToPath(new URL('../src/data/cards.content.ts', import.meta.url))
const fuente = readFileSync(CONTENT, 'utf8')

// 1. Pronombres y posesivos de primera persona.
//
// `nosotros` y `nosotras` van aparte aunque empiecen por "nos": la frontera de
// palabra que lleva la regla no los dejaba entrar, y por eso "la deuda del
// partido con nosotros" se contaba como narrada. Igual con `mío/mía`.
const PRONOMBRES = /(^|[^a-záéíóúñü])(yo|me|mí|mi|mis|conmigo|nos|nosotros|nosotras|nuestro|nuestra|nuestros|nuestras|m[ií]o|m[ií]a|m[ií]os|m[ií]as)([^a-záéíóúñü]|$)/i

// 2. Formas verbales de primera persona. Las regulares se cazan por
//    terminación sobre raíces frecuentes; las irregulares, una a una.
const VERBOS = new RegExp(
  '(^|[^a-záéíóúñü])(' +
    // irregulares y muy frecuentes
    'soy|estoy|voy|doy|sé|he|tengo|vengo|traigo|digo|hago|pongo|salgo|veo|quiero|puedo|' +
    'somos|estamos|vamos|damos|sabemos|hemos|tenemos|venimos|traemos|decimos|hacemos|' +
    'ponemos|salimos|vemos|queremos|podemos|debemos|' +
    // pasados de primera persona
    'fui|tuve|hice|dije|vine|traje|puse|salí|vi|quise|pude|supe|' +
    'firmé|monté|llamé|pedí|conseguí|escribí|publiqué|solté|conté|leí|miré|' +
    // regulares frecuentes en presente
    'necesito|propongo|pido|aviso|informo|cuento|reconozco|entiendo|prefiero|' +
    'necesitamos|proponemos|pedimos|avisamos|contamos|preferimos|firmamos|' +
    'creo|pienso|opino|insisto|repito|añado|llevo|llevamos|paso|dejo|espero|organizo' +
    ')([^a-záéíóúñü]|$)',
  'i'
)

// 3. Que se dirija a alguien.
const DIRIGIRSE = new RegExp(
  '(^|[^a-záéíóúñü])(' +
    'usted|ustedes|presidente|presi|' +
    'd[ií]game|d[ií]galo|m[ií]reme|m[ií]relo|esc[uú]cheme|f[ií]jese|haga|venga|oiga|perdone|' +
    // Imperativos de cortesia con el pronombre pegado: no hay forma de
    // decirlos sin tener a alguien delante. Se listan uno a uno y no por
    // terminacion porque en castellano hay nombres que acaban en -me
    // (informe, uniforme, enorme) y marcarlos seria peor que el fallo.
    'perm[ií]tame|cr[ée]ame|enti[ée]ndame|h[áa]game|d[ée]jeme|ll[áa]meme|ap[úu]nteme|c[uu][ée]nteme|' +
    'le digo|le pido|le aviso|le traigo|le cuento|le explico|le juro|le advierto|le recuerdo|' +
    'se lo digo|se lo cuento|se lo pido|se lo aviso|se lo traigo|se lo explico|se lo juro' +
    ')([^a-záéíóúñü]|$)',
  'i'
)

// Voces sin boca: no hay nadie delante y por eso se narran.
const SIN_BOCA = new Set([
  'El Espejo', 'La Calle', 'Noche electoral', 'El Sondeo a Pie de Urna',
  'Portada de mañana', 'El Expediente', 'La Coalición', 'La Militancia',
  'Los Barones Territoriales', 'El Comité Ejecutivo', 'La Redacción',
  'El Consejo Editorial', 'El Consejo de Administración', 'El Interventor',
  'La Inspección', 'Un aliado', 'El Personaje',
])

// Y las que se dejan narradas a sabiendas, con su motivo. Si alguna se
// reescribe algún día, que sea a propósito y no por limpiar una lista.
const A_PROPOSITO = new Map([
  ['Mopongo', 'su gracia entera es que no habla'],
  ['anger_fiscal', 'no habla porque le está haciendo el vacío: el silencio es el mensaje'],
])

const cartas = []
for (const b of fuente.split('\n  {').slice(1)) {
  const id = /id: '([^']+)'/.exec(b)
  const quien = /character: '([^']+)'/.exec(b)
  const texto = /text: '((?:[^'\\]|\\.)*)'/.exec(b)
  if (!id || !quien || !texto) continue
  cartas.push({ id: id[1], quien: quien[1], texto: texto[1], recap: b.includes('isRecap: true') })
}

// 2b. PRIMERA PERSONA DEL PLURAL POR TERMINACION, que es donde se escapaban
// mas. La lista de verbos de arriba es finita y el castellano no: "podríamos
// ajustar la metodologia", "recalificamos ese suelo" o "estiramos esto seis
// meses" son el personaje hablando, y salian marcadas como narradas.
//
// No se pone una regla ciega de -amos/-emos/-imos porque "primos" y "extremos"
// acaban igual, y marcarlas como que alguien habla seria peor que el fallo:
// taparia cartas narradas de verdad. Se miro el mazo entero: 84 palabras
// distintas con esas terminaciones: y solo cuatro no son verbos. Sale mas
// barato excluir esas cuatro que mantener una lista de ochenta.
const TERMINA_EN_NOSOTROS = /(^|[^a-záéíóúñü])([a-záéíóúñü]{3,}(?:amos|emos|imos))([^a-záéíóúñü]|$)/i
const NO_SON_VERBOS = /^(buen[ií]simos|car[ií]simos|extremos|primos|racimos|arrimos|anonimos|an[oó]nimos)$/i
const pluralPrimera = (t) => {
  const m = TERMINA_EN_NOSOTROS.exec(t)
  return Boolean(m) && !NO_SON_VERBOS.test(m[2])
}

const habla = (t) =>
  PRONOMBRES.test(t) || VERBOS.test(t) || DIRIGIRSE.test(t) || pluralPrimera(t)

const mudas = []
let conVoz = 0
let exentas = 0
for (const c of cartas) {
  if (SIN_BOCA.has(c.quien) || c.recap) {
    exentas++
    continue
  }
  if (A_PROPOSITO.has(c.quien) || A_PROPOSITO.has(c.id)) {
    exentas++
    continue
  }
  // Los feudos y roces entre terceros: el jugador mira una pelea ajena.
  if (/^(feud|roce)_/.test(c.id)) {
    exentas++
    continue
  }
  if (habla(c.texto)) conVoz++
  else mudas.push(c)
}

const total = conVoz + mudas.length
console.log(`${cartas.length} cartas con texto.`)
console.log(`  ${exentas} exentas (voces sin boca, balances, feudos y las narradas a propósito).`)
console.log(`  ${conVoz} de ${total} hablan (${Math.round((conVoz / total) * 100)}%).\n`)

if (mudas.length === 0) {
  console.log('Todas las que tienen a alguien delante, hablan.')
} else {
  const porQuien = new Map()
  for (const c of mudas) {
    if (!porQuien.has(c.quien)) porQuien.set(c.quien, [])
    porQuien.get(c.quien).push(c)
  }
  console.log(`NARRADAS CON ALGUIEN DELANTE (${mudas.length}):`)
  for (const [quien, suyas] of [...porQuien].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${quien} (${suyas.length})`)
    if (process.argv.includes('--todas')) {
      for (const c of suyas) console.log(`     ${c.id}: ${c.texto.slice(0, 90)}`)
    }
  }
}

console.log('\nNARRADAS A PROPÓSITO:')
for (const [quien, porQue] of A_PROPOSITO) console.log(`  ${quien}: ${porQue}`)
