import { COLOR_RETRATO } from '../data/coloresRetrato'

// Color de fondo de la carta. Sale del retrato del personaje: el tono medio
// de la franja de abajo de su ilustracion, oscurecido (lo genera
// scripts/colores-retrato.mjs).
//
// Antes salia de un hash del NOMBRE — `hsl(hash % 360, 38%, 22%)` — o sea un
// tono al azar sin ninguna relacion con el dibujo. A `presi` le tocaba azul
// marino y, como lleva traje azul, su carta parecia llena de borde a borde;
// al resto le tocaba cualquier cosa y, como los retratos son transparentes y
// se estrechan al llegar a los hombros, las dos esquinas de abajo quedaban de
// un color ajeno al personaje. Eso eran los "huecos".
//
// Con el color sacado de la propia ropa, el hueco deja de leerse como un
// hueco y pasa a leerse como el fondo del retrato, sin tocar ni una carta a
// mano: se anade el .webp, se vuelve a pasar el script y ya esta.
// Los que no tienen cara Y no son una voz colectiva: los fontaneros y el
// expediente. Van los tres del MISMO gris azulado, sin color propio, y eso es
// parte de lo que son: tres personas distintas haciendo el mismo trabajo, y
// ninguna con foto en ningun sitio. Dejarlos al hash del nombre le daba a La
// Fontanera un verde de chicle, que ademas es el color con el que este juego
// dice "esta eleccion es limpia".
const SIN_CARA: Record<string, string> = {
  'La Fontanera': '#1b1e26',
  'El Comisario': '#1b1e26',
  'El Agente': '#1b1e26',
  'El Expediente': '#191b21',
}

export function characterColor(character: string, characterImage?: string): string {
  const delRetrato = characterImage && COLOR_RETRATO[characterImage]
  if (delRetrato) return delRetrato

  const aPelo = SIN_CARA[character]
  if (aPelo) return aPelo

  // Sin retrato (las voces colectivas que cierran la partida: "La Redaccion",
  // "El Comite Ejecutivo", "La Calle"...) se sigue usando el hash del nombre:
  // ahi no hay ilustracion de la que sacar nada, y lo unico que importa es
  // que cada voz tenga un color propio y estable.
  //
  // Saturacion baja a proposito: con 38% el hash sacaba verdes y turquesas de
  // chicle que no pegan con nada del juego, y ademas MIENTEN, porque en este
  // juego el verde significa que una eleccion es limpia.
  let hash = 0
  for (let i = 0; i < character.length; i++) {
    hash = character.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 22%, 17%)`
}

// El fondo de la carta como DEGRADADO, no como color plano. Ahora que el
// retrato llena la carta, el fondo solo asoma alrededor de la cabeza: un
// plano ahi se lee como un recorte pegado sobre un rectangulo, y un degradado
// se lee como aire detras de la figura. Oscurece hacia abajo, que es donde
// esta el cuerpo.
export function characterBackground(character: string, characterImage?: string): string {
  const base = characterColor(character, characterImage)
  return `linear-gradient(170deg, ${aclarar(base, 1.35)} 0%, ${base} 46%, ${aclarar(base, 0.55)} 100%)`
}

function aclarar(hex: string, k: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const n = Number.parseInt(m[1], 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(Math.min(255, Math.max(0, v * k)))
  )
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')
}
