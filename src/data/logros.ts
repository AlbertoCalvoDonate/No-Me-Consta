import type { Stats, StatKey } from '../types'
import { cards } from './cards'
import { epitetoDe } from './epitetos'

// Sistema de logros. Cada logro tiene un check(r) que decide si se consigue,
// mirando el RESULTADO de la partida que acaba de terminar (mas los totales
// acumulados de todas las partidas anteriores). Se comprueban todos al final
// de cada partida; los que pasan y no estaban ya, saltan como pop-up y se
// tachan de la lista. Persistencia en localStorage (ver useLogros).

// Lo que se sabe al terminar una partida.
export interface ResultadoPartida {
  meses: number // turnos - 1
  moralidad: number // 0-10
  epitetoIndex: number // = Math.round(moralidad)
  stats: Stats // las 4 barras al terminar
  endingId: string // id de la carta de final
  esEleccion: boolean // el final fue una noche electoral
  porEvento: boolean // el final fue una mocion / registro / ruptura
  deathStat?: StatKey // barra que revento (0 o max), si aplica
  gano: boolean // final electoral que no es derrota / repeticion
  aguantoLasTres: boolean // llego al final de la 3a legislatura (carta _final)
  cartas: string[] // ids de todas las cartas vistas esta partida
  flags: string[] // flags que se encendieron alguna vez esta partida
  // acumulado de SIEMPRE (localStorage):
  partidasJugadas: number
  finalesDistintos: number // cuantos endingId distintos se han visto en total
  mesesRecord: number // el mejor "meses" de cualquier partida (ya incluye esta)
  epitetosVistos: number // cuantos epitetos distintos se han sacado
  cartasColeccionadas: number // cartas distintas vistas en toda la vida (ya incluye esta partida)
}

export interface Logro {
  id: string
  // Bloque bajo el que se agrupa en la lista. Estaba solo en comentarios, y
  // los 49 logros salian de corrido sin decir de que iba cada tramo.
  grupo: string
  nombre: string
  desc: string
  // Oculto: la descripcion no se ve hasta desbloquearlo (para no destripar
  // finales y tramas).
  oculto?: boolean
  check: (r: ResultadoPartida) => boolean
}

const K4: StatKey[] = ['medios', 'gobierno', 'calle', 'caja']

export const LOGROS: Logro[] = [
  // --- SUPERVIVENCIA (incremental) ---
  { id: 'sobrevive_12', grupo: 'Cuánto aguantas', nombre: 'Un año en el cargo', desc: 'Aguanta 12 meses.', check: (r) => r.meses >= 12 },
  { id: 'sobrevive_24', grupo: 'Cuánto aguantas', nombre: 'Reincidente', desc: 'Aguanta 24 meses.', check: (r) => r.meses >= 24 },
  { id: 'sobrevive_36', grupo: 'Cuánto aguantas', nombre: 'Cuesta abajo', desc: 'Aguanta 36 meses.', check: (r) => r.meses >= 36 },
  { id: 'sobrevive_48', grupo: 'Cuánto aguantas', nombre: 'Legislatura completa', desc: 'Aguanta 48 meses: una legislatura entera.', check: (r) => r.meses >= 48 },
  { id: 'sobrevive_96', grupo: 'Cuánto aguantas', nombre: 'La reelección', desc: 'Aguanta 96 meses: dos legislaturas.', check: (r) => r.meses >= 96 },
  { id: 'sobrevive_140', grupo: 'Cuánto aguantas', nombre: 'Doce años', desc: 'Aguanta 140 meses: casi tres legislaturas enteras.', check: (r) => r.meses >= 140 },

  // --- ESTADOS DE MORAL (los 11 epitetos) ---
  // Visibles a proposito: la lista ensena que existe un espectro moral (de
  // saqueador a santo), pero NO como se mueve. Al empezar no sabes cual te va
  // a tocar; el numero sigue oculto toda la partida. Los nombres calcan los de
  // epitetos.ts para que la lista y la pantalla de fin digan lo mismo.
  { id: 'moral_0', grupo: 'Cómo le recuerdan', nombre: 'El Saqueador', desc: epitetoDe(0).nota, check: (r) => r.epitetoIndex === 0 },
  { id: 'moral_1', grupo: 'Cómo le recuerdan', nombre: 'El Felón', desc: epitetoDe(1).nota, check: (r) => r.epitetoIndex === 1 },
  { id: 'moral_2', grupo: 'Cómo le recuerdan', nombre: 'El Trincón', desc: epitetoDe(2).nota, check: (r) => r.epitetoIndex === 2 },
  { id: 'moral_3', grupo: 'Cómo le recuerdan', nombre: 'El Escurridizo', desc: epitetoDe(3).nota, check: (r) => r.epitetoIndex === 3 },
  { id: 'moral_4', grupo: 'Cómo le recuerdan', nombre: 'El Tibio', desc: epitetoDe(4).nota, check: (r) => r.epitetoIndex === 4 },
  { id: 'moral_5', grupo: 'Cómo le recuerdan', nombre: 'El Equidistante', desc: epitetoDe(5).nota, check: (r) => r.epitetoIndex === 5 },
  { id: 'moral_6', grupo: 'Cómo le recuerdan', nombre: 'El Correcto', desc: epitetoDe(6).nota, check: (r) => r.epitetoIndex === 6 },
  { id: 'moral_7', grupo: 'Cómo le recuerdan', nombre: 'El Prudente', desc: epitetoDe(7).nota, check: (r) => r.epitetoIndex === 7 },
  { id: 'moral_8', grupo: 'Cómo le recuerdan', nombre: 'El Íntegro', desc: epitetoDe(8).nota, check: (r) => r.epitetoIndex === 8 },
  { id: 'moral_9', grupo: 'Cómo le recuerdan', nombre: 'El Sabio', desc: epitetoDe(9).nota, check: (r) => r.epitetoIndex === 9 },
  { id: 'moral_10', grupo: 'Cómo le recuerdan', nombre: 'El Santo', desc: epitetoDe(10).nota, check: (r) => r.epitetoIndex === 10 },
  { id: 'moral_todos', grupo: 'Cómo le recuerdan', nombre: 'Todos los santos y todos los pecados', desc: 'Consigue los 11 epítetos a lo largo de tus partidas.', check: (r) => r.epitetosVistos >= 11 },

  // --- FINALES: por donde caes ---
  // Solo el desplome (barra a 0). Reventar por arriba es otro final: 'cae_techo'.
  { id: 'cae_medios', grupo: 'Por dónde cae', nombre: 'Muerto en portada', desc: 'Cae con la prensa por los suelos.', oculto: true, check: (r) => r.deathStat === 'medios' && r.stats.medios <= 0 },
  { id: 'cae_gobierno', grupo: 'Por dónde cae', nombre: 'Puñalada por la espalda', desc: 'Cae porque tu propio Gobierno te suelta la mano.', oculto: true, check: (r) => r.deathStat === 'gobierno' && r.stats.gobierno <= 0 },
  { id: 'cae_calle', grupo: 'Por dónde cae', nombre: 'A la calle', desc: 'Cae con la gente en tu contra.', oculto: true, check: (r) => r.deathStat === 'calle' && r.stats.calle <= 0 },
  { id: 'cae_caja', grupo: 'Por dónde cae', nombre: 'Sin un duro', desc: 'Cae con la caja a cero.', oculto: true, check: (r) => r.deathStat === 'caja' && r.stats.caja <= 0 },
  { id: 'cae_techo', grupo: 'Por dónde cae', nombre: 'Demasiado de algo bueno', desc: 'Cae porque un contrapoder te elimina por haberte hecho demasiado fuerte.', oculto: true, check: (r) => /_max_/.test(r.endingId) },
  { id: 'cae_mocion', grupo: 'Por dónde cae', nombre: 'Moción de censura', desc: 'Te tumban en el Parlamento.', oculto: true, check: (r) => r.endingId === 'final_evento_mocion' },
  { id: 'cae_ruptura', grupo: 'Por dónde cae', nombre: 'Solo ante el peligro', desc: 'Se rompe la coalición y te quedas sin nadie.', oculto: true, check: (r) => r.endingId === 'final_evento_ruptura' },
  { id: 'cae_registro', grupo: 'Por dónde cae', nombre: 'A las seis de la mañana', desc: 'Coches en la puerta y una orden de registro.', oculto: true, check: (r) => r.endingId === 'final_evento_registro' },
  // El minimo que permite el juego son 4 meses (amortiguador + 3 turnos de
  // gracia), asi que pedir 2 era imposible. A 6 lo consigue el 2% de partidas.
  { id: 'cae_mes_1', grupo: 'Por dónde cae', nombre: 'Un suspiro', desc: 'Cae antes de cumplir medio año.', check: (r) => r.meses <= 6 && !r.gano },

  // --- FINALES: coleccionista ---
  { id: 'finales_5', grupo: 'Coleccionar finales', nombre: 'Se acaba de mil maneras', desc: 'Ve 5 finales distintos.', check: (r) => r.finalesDistintos >= 5 },
  { id: 'finales_12', grupo: 'Coleccionar finales', nombre: 'Museo de derrotas', desc: 'Ve 12 finales distintos.', check: (r) => r.finalesDistintos >= 12 },
  { id: 'finales_20', grupo: 'Coleccionar finales', nombre: 'Lo has visto todo', desc: 'Ve 20 finales distintos.', check: (r) => r.finalesDistintos >= 20 },

  // --- ELECCIONES ---
  { id: 'gana_elecciones', grupo: 'Elecciones', nombre: 'Cuatro años más', desc: 'Gana unas elecciones y sigue gobernando.', check: (r) => r.gano },
  { id: 'gana_triunfo', grupo: 'Elecciones', nombre: 'Mayoría absoluta', desc: 'Llega a una noche electoral con los cuatro indicadores en verde.', oculto: true, check: (r) => r.endingId === 'elecciones_triunfo' },
  { id: 'leyenda', grupo: 'Elecciones', nombre: 'Nombre para una plaza', desc: 'Aguanta las tres legislaturas y retírate invicto.', oculto: true, check: (r) => r.endingId === 'elecciones_leyenda_final' },
  { id: 'aguanta_tres', grupo: 'Elecciones', nombre: 'Hasta el final', desc: 'Llega al final de la tercera legislatura, como sea.', check: (r) => r.aguantoLasTres },

  // --- TRAMAS ---
  { id: 'hermano_condena', grupo: 'Tramas', nombre: 'Cosas de familia', desc: 'Deja que la trama de tu hermano llegue hasta el juicio.', oculto: true, check: (r) => r.flags.includes('hermano_juicio') },
  { id: 'guru_candidato', grupo: 'Tramas', nombre: 'La izquierda partida', desc: 'El Gurú monta su partido y se presenta contra ti.', oculto: true, check: (r) => r.flags.includes('guru_candidato') },
  { id: 'te_salvan', grupo: 'Tramas', nombre: 'Una mano lava la otra', desc: 'Alguien a quien has hecho muchos favores aparece a salvarte de caer.', oculto: true, check: (r) => r.flags.includes('ya_te_salvaron') },
  { id: 'fiscal_debe', grupo: 'Tramas', nombre: 'El fiscal amigo', desc: 'Acepta un favor del Fiscal.', oculto: true, check: (r) => r.flags.includes('magistrado_debe') || r.flags.includes('magistrado_colocado') },
  { id: 'bomba', grupo: 'Tramas', nombre: 'Todo tiene consecuencias', desc: 'Enciende una bomba de relojería y aguanta hasta que estalla.', oculto: true, check: (r) => r.cartas.some((c) => (c.startsWith('bomba_') && c !== 'bomba_sobre') || /_cobro_/.test(c) || /_vuelve$/.test(c)) },
  { id: 'vacaciones', grupo: 'Tramas', nombre: 'Vacaciones técnicas', desc: 'Coge las vacaciones de agosto.', oculto: true, check: (r) => r.cartas.includes('vacaciones_tecnicas') },

  // --- RAREZAS ---
  { id: 'equilibrio', grupo: 'Rarezas', nombre: 'Funambulista', desc: 'Cae con las cuatro barras a la vez entre 4 y 6. Ni frío ni calor.', oculto: true, check: (r) => !r.gano && K4.every((k) => r.stats[k] >= 4 && r.stats[k] <= 6) },
  { id: 'rechazas_rescate', grupo: 'Rarezas', nombre: 'Yo solo', desc: 'Rechaza un rescate y cae por tu cuenta.', oculto: true, check: (r) => r.cartas.some((c) => c.startsWith('rescate_') && !c.includes('cobro')) && !r.flags.includes('ya_te_salvaron') },

  // --- META ---
  { id: 'partidas_10', grupo: 'Constancia', nombre: 'Enganchado', desc: 'Juega 10 partidas.', check: (r) => r.partidasJugadas >= 10 },
  { id: 'partidas_50', grupo: 'Constancia', nombre: 'Esto ya es vicio', desc: 'Juega 50 partidas.', check: (r) => r.partidasJugadas >= 50 },

  // --- COLECCION ---
  // El mazo tiene casi 500 cartas y en una partida buena se ven ochenta. Estos
  // cuatro son la unica recompensa por seguir descubriendo situaciones nuevas
  // en vez de por durar mas, y hacen de barra de progreso a muy largo plazo.
  { id: 'coleccion_100', grupo: 'Descubrir cartas', nombre: 'Le va cogiendo el tranquillo', desc: 'Descubre 100 cartas distintas entre todas tus partidas.', check: (r) => r.cartasColeccionadas >= 100 },
  { id: 'coleccion_200', grupo: 'Descubrir cartas', nombre: 'Se conoce la casa', desc: 'Descubre 200 cartas distintas.', check: (r) => r.cartasColeccionadas >= 200 },
  { id: 'coleccion_350', grupo: 'Descubrir cartas', nombre: 'Aquí ya no le sorprende nadie', desc: 'Descubre 350 cartas distintas.', check: (r) => r.cartasColeccionadas >= 350 },
  {
    id: 'no_me_consta',
    grupo: 'Rarezas',
    nombre: 'No me consta',
    desc: 'Escurrir el bulto en dos interrogatorios de la misma partida.',
    oculto: true,
    check: (r) => r.flags.filter((f) => f.startsWith('nmc_')).length >= 2,
  },
  { id: 'coleccion_todas', grupo: 'Descubrir cartas', nombre: 'No me consta que quede ninguna', desc: 'Descubre todas las cartas del juego.', oculto: true, check: (r) => r.cartasColeccionadas >= cards.length },
]

export const TOTAL_LOGROS = LOGROS.length
