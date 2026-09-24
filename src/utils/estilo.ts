// Los pocos valores de estilo que se repiten por toda la interfaz.
//
// No es un sistema de diseño ni pretende serlo: el juego pinta con estilos en
// línea y así se queda. Esto solo recoge lo que estaba escrito a mano una y
// otra vez. Medido antes de extraerlo: el dorado aparecía 23 veces como hex
// suelto en nueve ficheros, y la fuente 32 veces en diez. Cambiar el acento
// del juego obligaba a buscar y reemplazar en veintitrés sitios, con el riesgo
// de dejarse uno.
//
// Lo que NO está aquí a propósito: los colores que solo salen una vez, los de
// una pantalla concreta y los que se calculan (el fondo de cada carta sale del
// retrato, ver utils/color.ts). Meterlos aquí sería inventarse una paleta que
// nadie usa.

// La tipografía del juego. Va como fragmento de estilo para poder esparcirlo:
//   style={{ ...pixel, fontSize: 18 }}
export const pixel = { fontFamily: 'var(--font-pixel)' } as const

export const COLOR = {
  // El acento: títulos, botones principales, el nombre del personaje bajo la
  // carta y los números que importan.
  oro: '#e0b84d',
  // Texto secundario y etiquetas: presente, pero que no compita con el oro.
  apagado: '#8a8272',
  // Texto normal sobre fondo oscuro.
  texto: '#f2ede0',
  // Peligro: una barra reventada, el final de la partida, borrar la partida.
  peligro: '#ff4d4d',
  // El fondo de los bloques que se levantan sobre el negro (tutorial, banner
  // de situación, tarjetas de los paneles).
  panel: '#1c1c1e',
} as const
