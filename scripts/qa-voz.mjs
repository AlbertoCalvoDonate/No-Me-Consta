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
const PRONOMBRES = /(^|[^a-záéíóúñü])(yo|me|mí|mi|mis|conmigo|nos|nuestro|nuestra|nuestros|nuestras)([^a-záéíóúñü]|$)/i

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
    'creo|pienso|opino|insisto|repito|añado|llevo|llevamos|paso|dejo|espero' +
    ')([^a-záéíóúñü]|$)',
  'i'
)

// 3. Que se dirija a alguien.
const DIRIGIRSE = new RegExp(
  '(^|[^a-záéíóúñü])(' +
    'usted|ustedes|presidente|presi|' +
    'd[ií]game|d[ií]galo|m[ií]reme|m[ií]relo|esc[uú]cheme|f[ií]jese|haga|venga|oiga|perdone|' +
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

const habla = (t) => PRONOMBRES.test(t) || VERBOS.test(t) || DIRIGIRSE.test(t)

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
