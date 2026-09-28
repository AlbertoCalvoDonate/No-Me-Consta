// Valida src/data/cards.content.ts sin necesidad de arrancar el juego.
// Uso:  npm run validate-cards
//
// Comprueba: ids duplicados o con formato raro, stats mal escritas en
// `effects`, valores de efecto fuera de rango, campos obligatorios
// vacíos, y referencias rotas de `nextCardId`. Pensado para que lo
// pueda correr alguien que no programa: si algo falla, dice
// exactamente qué carta y qué está mal, en español.
//
// Nota técnica: en vez de compilar el .ts, extraemos el array literal
// de cartas como texto y lo evaluamos como JS. Funciona porque
// cards.content.ts solo contiene objetos planos (sin tipos ni lógica
// dentro de las cartas) — si eso deja de ser cierto, este script habrá
// que actualizarlo.

import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const CONTENT_FILE = fileURLToPath(new URL('../src/data/cards.content.ts', import.meta.url))
const CARDS_FILE = fileURLToPath(new URL('../src/data/cards.ts', import.meta.url))
const RETRATOS_DIR = fileURLToPath(new URL('../public/characters', import.meta.url))
const RETRATOS = new Set(readdirSync(RETRATOS_DIR))
const VALID_STATS = ['medios', 'gobierno', 'calle', 'caja']
const VALID_PHASES = [1, 2, 3, 4]
const EFFECT_MIN = -3
const EFFECT_MAX = 3
const TEXT_SOFT_LIMIT = 220

function extractCardsArray(source) {
  const marker = 'export const contentCards: Card[] = ['
  const start = source.indexOf(marker)
  if (start === -1) {
    throw new Error(`No encuentro "${marker}" en cards.content.ts. ¿Se ha renombrado el export?`)
  }
  const arrayStart = start + marker.length - 1 // incluye el '['
  const closingIndex = source.lastIndexOf(']')
  if (closingIndex === -1 || closingIndex < arrayStart) {
    throw new Error('No encuentro el cierre "]" del array de cartas.')
  }
  const literal = source.slice(arrayStart, closingIndex + 1)
  // eslint-disable-next-line no-eval -- ver nota técnica arriba
  return eval(literal)
}

function fmt(id, index) {
  return id ? `"${id}" (carta #${index + 1})` : `carta sin id (posición #${index + 1})`
}

// Caracteres que delatan texto pegado de un procesador o de una IA. El mazo
// estaba limpio salvo nueve rayas, reescritas a mano; esto es para que no
// vuelvan a colarse.
const RAROS = [
  ['—', 'raya (em dash)'],
  ['–', 'guion medio (en dash)'],
  ['…', 'puntos suspensivos de un caracter'],
  ['“', 'comilla curva de apertura'],
  ['”', 'comilla curva de cierre'],
  ['’', 'apostrofo curvo'],
  [' ', 'espacio duro'],
]

// NOMBRES PROPIOS REALES. El juego va de politica espanola de verdad, pero lo
// real son las SITUACIONES, no el atlas ni el callejero: un personaje se
// reconoce por lo que hace, no porque la carta diga de donde es. Nombrar un
// pais o una ciudad ademas convierte una satira en una acusacion concreta
// contra un sitio concreto, que es otra cosa.
//
// Llego a haber tres (Sahara, Ceuta y Bruselas) y salieron todos. Esto es
// para que no vuelvan a entrar sin darse cuenta.
const LUGARES = [
  'Espana', 'Espanya', 'Madrid', 'Barcelona', 'Sevilla', 'Valencia', 'Bilbao',
  'Zaragoza', 'Malaga', 'Ceuta', 'Melilla', 'Gibraltar', 'Sahara', 'Marruecos',
  'Argelia', 'Portugal', 'Francia', 'Alemania', 'Italia', 'Rusia', 'Ucrania',
  'China', 'Israel', 'Venezuela', 'Andorra', 'Suiza', 'Panama', 'Mexico',
  'Argentina', 'Colombia', 'Cuba', 'Bruselas', 'Waterloo', 'Estrasburgo',
  'Cataluna', 'Catalunya', 'Euskadi', 'Galicia', 'Andalucia', 'Extremadura',
  'Murcia', 'Baleares', 'Canarias', 'Navarra', 'Moncloa', 'Ferraz', 'Genova',
  'Donana', 'UCO',
  // Estos nueve se colaron y estuvieron meses dentro. Se quedan escritos para
  // que el dia que alguien los reescriba sin querer, salte aqui y no en X.
  'Carabanchel', 'Mostoles', 'Alicante', 'Jerez', 'Soria', 'Twitter',
  'Berlanga', 'Eurostat', 'Corte Ingles',
]
// Se compara sin tildes para que 'Sahara' cace tambien 'Sahara' con tilde.
const sinTildes = (x) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const LUGARES_RE = new RegExp('\\b(' + LUGARES.join('|') + ')\\b', 'i')

// Y AHORA AL REVES, que es lo que de verdad funciona. La lista de arriba solo
// caza lo que a alguien se le ocurrio escribir en ella; barriendo el mazo
// aparecieron nueve nombres reales que no estaban previstos -una red social,
// unos grandes almacenes, cuatro ciudades, un director de cine y una oficina
// europea-, y ninguno salto. Asi que en vez de una lista negra que hay que
// adivinar, aqui hay una lista blanca: toda palabra en mayuscula A MITAD DE
// FRASE es sospechosa hasta que este permitida.
//
// Lo permitido son instituciones genericas (Gobierno, Congreso, Hacienda),
// los nombres de los personajes del juego, las fiestas del calendario y las
// pocas palabras que el castellano escribe en mayuscula. Todo lo demas lo
// tiene que mirar una persona: casi siempre sera un nombre propio real.
const MAYUSCULAS_PERMITIDAS = new Set([
  // Instituciones y cargos, sin nombre propio: describen, no senalan.
  'Gobierno', 'Estado', 'Congreso', 'Senado', 'Parlamento', 'Consejo', 'Ministros',
  'Ministerio', 'Ministra', 'Ministro', 'Presidencia', 'Presidente', 'Presidenta',
  'Vicepresidenta', 'Vicepresidente', 'Hacienda', 'Fiscalia', 'Fiscal', 'Justicia',
  'Interior', 'Sanidad', 'Educacion', 'Igualdad', 'Defensa', 'Exteriores',
  'Trabajo', 'Energia', 'Bienestar', 'Emocional', 'Administracion', 'Union',
  'Constitucion', 'Tribunal', 'Supremo', 'Audiencia', 'Juzgado', 'Junta',
  'Electoral', 'Diputacion', 'Ayuntamiento', 'Palacio', 'Moncloa',
  // Personajes del reparto tal y como se les nombra dentro de las cartas.
  'Escudero', 'Socia', 'Incomoda', 'Regional', 'Exiliado', 'Expresidente',
  'Cruzado', 'Periodista', 'Encuestador', 'Juez', 'Hermano', 'Dama', 'Guru',
  'Mopongo', 'Fontanera', 'Comisario', 'Agente', 'Espejo', 'Independentista',
  'Galgo', 'Karim',
  // Calendario y formulas.
  'Navidad', 'Nochebuena', 'Nochevieja', 'Reyes', 'Semana', 'Santa', 'Dios',
  'Como', 'Que', 'Cuando', 'Donde', 'Quien', 'Txekila',
  // "Como Pedro por su casa" es una frase hecha de diccionario, no un senor.
  'Pedro',
])

// Y las que la regla de arriba no ve: las marcas escriben la mayuscula EN
// MEDIO (WhatsApp, PowerPoint) y los organismos van en siglas (UE, ONG). La
// primera version de esta red solo miraba Palabras-Asi y se dejo fuera justo
// eso: dos marcas y un organismo seguian dentro despues de la limpieza.
const SIGLAS_PERMITIDAS = new Set([
  'ONG', 'GPS', 'VIP', 'ADN', 'IVA', 'IRPF', 'PIB', 'TV', 'SMS',
  // Palabras normales que alguien grita en mayusculas dentro de una carta.
  'NO', 'SI', 'ALTO', 'SECRETO', 'ES', 'YA', 'URGENTE', 'RESERVADO',
])

// Al jugador se le trata de USTED en todo el juego. Las dos excepciones son
// de familia y estan puestas a proposito: el hermano y la mujer tutean, y eso
// es justo lo que los caracteriza frente a los otros veinte personajes.
// Medido: El Hermano 36% de tuteo, La Primera Dama 25%, todos los demas 0%.
const TUTEAN = new Set(['El Hermano', 'La Primera Dama'])
// Formas de tu dirigidas al jugador. Solo se miran FUERA de las comillas: lo
// que un personaje cita de otro puede tutear sin problema.
const FORMAS_TU = /\b(te ha|te van|te lo|te la|te pido|te cuento|tienes|puedes|quieres|sabes|contigo|tuyo|tuya|preguntaste|firmaste|dijiste|hiciste)\b/i

function validate(cards) {
  const errors = []
  const warnings = []
  const seenIds = new Map()

  cards.forEach((card, index) => {
    const label = fmt(card.id, index)

    if (!card.id || typeof card.id !== 'string') {
      errors.push(`${label}: falta el "id" o no es texto.`)
    } else {
      if (!/^[a-z][a-z0-9_]*$/.test(card.id)) {
        errors.push(`${label}: el id "${card.id}" debería ser minúsculas/números/guion_bajo (ej. "mi_carta_2").`)
      }
      if (card.id.startsWith('final_')) {
        errors.push(`${label}: el prefijo "final_" está reservado para las cartas de cards.ts, usa otro id.`)
      }
      if (seenIds.has(card.id)) {
        errors.push(`${label}: id duplicado, ya lo usa la carta #${seenIds.get(card.id) + 1}.`)
      } else {
        seenIds.set(card.id, index)
      }
    }

    if (!VALID_PHASES.includes(card.phase)) {
      errors.push(`${label}: "phase" debe ser 1, 2, 3 o 4 (tiene ${JSON.stringify(card.phase)}).`)
    }

    if (!card.character || typeof card.character !== 'string') {
      errors.push(`${label}: falta "character" (quién habla en la carta).`)
    }

    // El retrato tiene que existir en public/characters. Sin esto, escribir
    // mal el nombre del fichero no falla en ningún sitio: la carta sale en
    // el juego con un hueco donde debería estar la cara.
    if (card.characterImage !== undefined) {
      if (typeof card.characterImage !== 'string') {
        errors.push(`${label}: "characterImage" debería ser el nombre del fichero, entre comillas.`)
      } else if (!RETRATOS.has(card.characterImage)) {
        errors.push(
          `${label}: el retrato "${card.characterImage}" no está en public/characters/.`,
        )
      }
    }

    if (!card.text || typeof card.text !== 'string') {
      errors.push(`${label}: falta "text" (el texto de la situación).`)
    } else if (card.text.length > TEXT_SOFT_LIMIT) {
      warnings.push(`${label}: el texto tiene ${card.text.length} caracteres, puede no caber bien en la carta (aviso, no bloqueante).`)
    }

    for (const side of ['left', 'right']) {
      const choice = card[side]
      if (!choice || typeof choice !== 'object') {
        errors.push(`${label}: falta la opción "${side}".`)
        continue
      }
      if (!choice.text || typeof choice.text !== 'string') {
        errors.push(`${label}: la opción "${side}" no tiene texto.`)
      }
      const effects = choice.effects
      if (!effects || typeof effects !== 'object') {
        errors.push(`${label}: la opción "${side}" no tiene "effects" (puede ser un objeto vacío {} si no cambia nada).`)
      } else {
        for (const [key, value] of Object.entries(effects)) {
          if (!VALID_STATS.includes(key)) {
            errors.push(`${label}: "${side}.effects.${key}" no es una stat válida (usa: ${VALID_STATS.join(', ')}).`)
            continue
          }
          if (typeof value !== 'number' || !Number.isInteger(value)) {
            errors.push(`${label}: "${side}.effects.${key}" debería ser un número entero.`)
          } else if (value < EFFECT_MIN || value > EFFECT_MAX) {
            warnings.push(`${label}: "${side}.effects.${key}" = ${value}, fuera del rango habitual ${EFFECT_MIN}..${EFFECT_MAX} (aviso, no bloqueante).`)
          }
        }
      }
      if (choice.moralidad !== undefined) {
        if (typeof choice.moralidad !== 'number' || !Number.isInteger(choice.moralidad)) {
          errors.push(`${label}: "${side}.moralidad" debería ser un número entero (o no ponerlo, si es neutro).`)
        } else if (choice.moralidad < EFFECT_MIN || choice.moralidad > EFFECT_MAX) {
          warnings.push(`${label}: "${side}.moralidad" = ${choice.moralidad}, fuera del rango habitual ${EFFECT_MIN}..${EFFECT_MAX} (aviso, no bloqueante).`)
        }
      }

      if (choice.nextCardId !== undefined && typeof choice.nextCardId !== 'string') {
        errors.push(`${label}: "${side}.nextCardId" debería ser texto (el id de la siguiente carta).`)
      }
    }

    if (card.isEnding) {
      warnings.push(`${label}: tiene "isEnding: true" — eso normalmente solo se usa en cards.ts, no en cards.content.ts.`)
    }
  })

  // Referencias nextCardId: deben apuntar a un id que exista en este mismo
  // archivo. (Las cartas de final viven en cards.ts y no se pueden encadenar
  // con nextCardId, así que no hace falta comprobar contra esas).
  // --- Repaso mecanico de los textos ---
  // Nada de esto juzga la escritura: son fallos de tecleo que se cuelan al
  // escribir cientos de cartas y que luego se ven en pantalla. Auditado el
  // mazo entero de golpe la primera vez: 465 cartas, 0 avisos, asi que esto
  // esta aqui para que siga asi.
  const textosVistos = new Map()
  cards.forEach((card, index) => {
    const label = fmt(card.id, index)
    const cuerpo = (card.text ?? '').trim()
    if (cuerpo) {
      const gemela = textosVistos.get(cuerpo)
      if (gemela) warnings.push(`${label}: tiene el MISMO texto que "${gemela}".`)
      else textosVistos.set(cuerpo, card.id)
      if (!/[.!?»"…)]$/.test(cuerpo)) {
        warnings.push(`${label}: el texto no acaba en signo de puntuación ("…${cuerpo.slice(-28)}").`)
      }
    }
    const trozos = [
      ['text', card.text],
      ['left.text', card.left?.text],
      ['right.text', card.right?.text],
      ['left.epilogueText', card.left?.epilogueText],
      ['right.epilogueText', card.right?.epilogueText],
    ]
    for (const [donde, txt] of trozos) {
      if (typeof txt !== 'string' || !txt) continue
      if ((txt.match(/"/g) ?? []).length % 2 !== 0) {
        warnings.push(`${label}: comillas sin cerrar en "${donde}".`)
      }
      if (/\s{2,}/.test(txt)) warnings.push(`${label}: espacio doble en "${donde}".`)
      // Tipografia de procesador de textos: la raya, el guion medio, las
      // comillas curvas y los puntos suspensivos de un solo caracter cantan a
      // texto pegado, no a alguien hablando. El juego escribe con guion normal,
      // comillas rectas y tres puntos.
      for (const [ch, nombre] of RAROS) {
        if (txt.includes(ch)) warnings.push(`${label}: ${nombre} en "${donde}". Reescribelo hablado.`)
      }
      if (/\s+[,.;:]/.test(txt)) warnings.push(`${label}: espacio antes de puntuación en "${donde}".`)
      const lugar = sinTildes(txt).match(LUGARES_RE)
      if (lugar) {
        errors.push(
          `${label}: nombre propio real ("${lugar[1]}") en "${donde}". ` +
            'En el mazo no hay paises, ciudades ni organismos con nombre: lo real son las situaciones.'
        )
      }
      // La red de verdad: mayusculas a mitad de frase que nadie ha permitido.
      // Se corta por frases y se salta la primera palabra de cada una, que va
      // en mayuscula por gramatica y no dice nada.
      for (const frase of txt.split(/(?<=[.!?:»"])\s+/)) {
        const palabras = frase.trim().split(/\s+/)
        for (let i = 1; i < palabras.length; i++) {
          const w = palabras[i].replace(/^[¿¡"«(]+/, '').replace(/[.,;:!?"»)]+$/, '')
          if (!/^[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]{2,}$/.test(w)) continue
          if (MAYUSCULAS_PERMITIDAS.has(sinTildes(w))) continue
          warnings.push(
            `${label}: "${w}" va en mayúscula a mitad de frase en "${donde}". ` +
              'Si es un nombre propio real, fuera; si no lo es, añádelo a MAYUSCULAS_PERMITIDAS.'
          )
        }
      }
      // Marcas y siglas, que la regla de arriba no ve por escribirse distinto.
      for (const bruto of txt.split(/\s+/)) {
        const w = bruto.replace(/^[¿¡"«(]+/, '').replace(/[.,;:!?"»)]+$/, '')
        if (w.length < 2) continue
        const camello = /^[A-Za-zÁÉÍÓÚÑÜáéíóúñü]*[a-záéíóúñü][A-ZÁÉÍÓÚÑÜ]/.test(w)
        const siglas = /^[A-ZÁÉÍÓÚÑÜ]{2,}$/.test(w)
        if (!camello && !siglas) continue
        if (SIGLAS_PERMITIDAS.has(sinTildes(w))) continue
        warnings.push(
          `${label}: "${w}" parece una marca o unas siglas en "${donde}". ` +
            'Si nombra algo real, fuera; si no, añádelo a SIGLAS_PERMITIDAS.'
        )
      }
    }
    if (card.text && !TUTEAN.has(card.character)) {
      const sinCitas = card.text.replace(/"[^"]*"/g, '')
      const m = sinCitas.match(FORMAS_TU)
      if (m) {
        warnings.push(`${label}: ${card.character} tutea al jugador ("${m[0]}") y el juego habla de usted.`)
      }
    }

    // Dos opciones con el mismo rotulo solo tiene sentido en las cartas de
    // muerte, donde los dos lados acaban la partida y esa es la broma.
    const esMuerte = Boolean(card.left?.epilogueText && card.right?.epilogueText)
    if (card.left?.text && card.left.text === card.right?.text && !esMuerte) {
      warnings.push(`${label}: las dos opciones dicen lo mismo ("${card.left.text}").`)
    }
  })

  const allIds = new Set(seenIds.keys())
  cards.forEach((card, index) => {
    const label = fmt(card.id, index)
    for (const side of ['left', 'right']) {
      const nextId = card[side]?.nextCardId
      if (nextId && !allIds.has(nextId)) {
        errors.push(`${label}: "${side}.nextCardId" apunta a "${nextId}", que no existe en cards.content.ts.`)
      }
    }
  })

  return { errors, warnings }
}

// LAS CARTAS DEL OTRO ARCHIVO. `cards.ts` tiene tipos y lógica, así que no se
// puede leer como un objeto plano y hasta ahora se quedaba entera fuera de la
// revisión: 38 cartas sin mirar, y entre ellas TODOS los finales, que son el
// texto que más se lee del juego y el que se comparte. Ahí seguían escondidas
// dos marcas después de una limpieza de nombres propios.
//
// No hace falta ejecutarlo para lo que importa aquí: se sacan los textos con
// una expresión regular y se les pasan las mismas reglas de nombres propios,
// marcas y tipografía. Lo estructural (efectos, ids, encadenados) se queda
// fuera a propósito, porque eso sí necesitaría evaluar el archivo.
function revisarTextosSueltos(ruta, avisos, errores) {
  let src
  try {
    src = readFileSync(ruta, 'utf8')
  } catch {
    return 0
  }
  const campos = /(?:text|epilogueText): '((?:[^'\\]|\\.)*)'/g
  let m
  let n = 0
  while ((m = campos.exec(src))) {
    n++
    const antes = src.slice(0, m.index)
    const ids = antes.match(/id: '([^']+)'/g)
    const label = `"${ids ? ids[ids.length - 1].slice(5, -1) : '?'}" (cards.ts)`
    const txt = m[1]
    const lugar = sinTildes(txt).match(LUGARES_RE)
    if (lugar) {
      errores.push(
        `${label}: nombre propio real ("${lugar[1]}"). ` +
          'En el mazo no hay paises, ciudades ni organismos con nombre.'
      )
    }
    for (const frase of txt.split(/(?<=[.!?:»"])\s+/)) {
      const palabras = frase.trim().split(/\s+/)
      for (let i = 1; i < palabras.length; i++) {
        const w = palabras[i].replace(/^[¿¡"«(]+/, '').replace(/[.,;:!?"»)]+$/, '')
        if (!/^[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]{2,}$/.test(w)) continue
        if (MAYUSCULAS_PERMITIDAS.has(sinTildes(w))) continue
        avisos.push(`${label}: "${w}" va en mayúscula a mitad de frase. ¿Nombre propio real?`)
      }
    }
    for (const bruto of txt.split(/\s+/)) {
      const w = bruto.replace(/^[¿¡"«(]+/, '').replace(/[.,;:!?"»)]+$/, '')
      if (w.length < 2) continue
      const camello = /^[A-Za-zÁÉÍÓÚÑÜáéíóúñü]*[a-záéíóúñü][A-ZÁÉÍÓÚÑÜ]/.test(w)
      const siglas = /^[A-ZÁÉÍÓÚÑÜ]{2,}$/.test(w)
      if (!camello && !siglas) continue
      if (SIGLAS_PERMITIDAS.has(sinTildes(w))) continue
      avisos.push(`${label}: "${w}" parece una marca o unas siglas.`)
    }
    for (const [ch, nombre] of RAROS) {
      if (txt.includes(ch)) avisos.push(`${label}: ${nombre}. Reescríbelo hablado.`)
    }
  }
  return n
}

function main() {
  const source = readFileSync(CONTENT_FILE, 'utf8')
  let cards
  try {
    cards = extractCardsArray(source)
  } catch (err) {
    console.error('No se ha podido leer el mazo:', err.message)
    process.exit(1)
  }

  if (!Array.isArray(cards)) {
    console.error('cards.content.ts no exporta un array. Revisa que no se haya roto la sintaxis.')
    process.exit(1)
  }

  const { errors, warnings } = validate(cards)
  const sueltos = revisarTextosSueltos(CARDS_FILE, warnings, errors)

  console.log(`Cartas analizadas: ${cards.length} (+ ${sueltos} textos de cards.ts)`)

  if (warnings.length > 0) {
    console.log(`\nAVISOS (${warnings.length}, no bloquean, pero échales un ojo):`)
    warnings.forEach((w) => console.log('  - ' + w))
  }

  if (errors.length > 0) {
    console.log(`\nERRORES (${errors.length}):`)
    errors.forEach((e) => console.log('  - ' + e))
    console.log('\nCorrige lo de arriba antes de hacer commit / npm run dev.')
    process.exit(1)
  }

  console.log('\nTodo correcto, no hay errores.')
}

main()
