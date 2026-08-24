// Color de fondo determinista por personaje: mismo nombre -> mismo color
// siempre, sin tener que asignarlo a mano carta por carta.
export function characterColor(character: string): string {
  let hash = 0
  for (let i = 0; i < character.length; i++) {
    hash = character.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 38%, 22%)`
}
