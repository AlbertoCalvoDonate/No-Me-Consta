import type { Card } from '../types'
import { PHASE_MIN_TURN } from '../types'
import { contentCards } from './cards.content'

// Cartas de "final de partida" (mecánica de dinastía tipo Reigns).
// Van aparte de cards.content.ts porque llevan código (la función
// `condition`, que decide si el final aplica), no solo texto. Si solo
// quieres añadir/editar contenido normal, no hace falta que toques esto:
// edita src/data/cards.content.ts.
//
// 3 variantes por cada stat que toque fondo, más un final positivo por
// aguantar toda la legislatura con los indicadores saneados.
const endingCards: Card[] = [
  // MEDIOS a 0
  {
    id: 'final_medios_1',
    phase: 4,
    character: 'Portada de mañana',
    text: 'La prensa ha destapado todo. Ya no hay portavoz, comunicado ni "fake news" que lo tape.',
    left: { text: 'Dimitir', effects: {}, epilogueText: 'Cae el gobierno. Empieza una nueva era... con las mismas caras de siempre en otros sillones.' },
    right: { text: 'Aguantar hasta el final', effects: {}, epilogueText: 'Le echan del partido por WhatsApp, con captura de pantalla incluida.' },
    isEnding: true,
    condition: (s) => s.medios <= 0,
  },
  {
    id: 'final_medios_2',
    phase: 4,
    character: 'El Consejo Editorial',
    text: 'Hasta el medio más afín que le quedaba ha dejado de defenderle. La portada de mañana ya está cerrada, y no es buena.',
    left: { text: 'Rueda de prensa desesperada', effects: {}, epilogueText: 'Le hacen la pregunta que llevaban años sin atreverse. Fin del reinado, en directo y con audiencia récord.' },
    right: { text: 'No dar más declaraciones', effects: {}, epilogueText: 'Su silencio se convierte en el meme del año. Fin del reinado, sin decir una palabra.' },
    isEnding: true,
    condition: (s) => s.medios <= 0,
  },
  {
    id: 'final_medios_3',
    phase: 4,
    character: 'La Redacción',
    text: 'Se ha filtrado el documento definitivo. Ni el mejor community manager de España le salva ya de esta.',
    left: { text: 'Publicar la verdad completa', effects: {}, epilogueText: 'Se queda sin apoyos, pero sin más secretos. Fin del reinado, con la conciencia rara vez tan tranquila.' },
    right: { text: 'Culpar a "una campaña orquestada"', effects: {}, epilogueText: 'Hasta su cuñado deja de compartirlo en el grupo de WhatsApp. Fin del reinado.' },
    isEnding: true,
    condition: (s) => s.medios <= 0,
  },

  // PARTIDO a 0
  {
    id: 'final_partido_1',
    phase: 4,
    character: 'El Comité Ejecutivo',
    text: 'El partido ya no le sostiene. Han convocado una moción interna sin avisarle del todo.',
    left: { text: 'Presentar batalla en el congreso', effects: {}, epilogueText: 'Pierde 400 votos a 3. Los 3 eran los suyos. Fin del reinado.' },
    right: { text: 'Dimitir con dignidad (o lo que quede)', effects: {}, epilogueText: 'Se retira a dar conferencias motivacionales por 30.000€ la charla. Fin del reinado, con PowerPoint incluido.' },
    isEnding: true,
    condition: (s) => s.partido <= 0,
  },
  {
    id: 'final_partido_2',
    phase: 4,
    character: 'Los Barones Territoriales',
    text: 'Los barones se han reunido sin usted, en un reservado, con jamón y sin agenda oficial. La decisión ya está tomada.',
    left: { text: 'Aceptar la salida pactada', effects: {}, epilogueText: 'Le sustituyen por alguien "de consenso" que nadie recuerda haber votado. Fin del reinado.' },
    right: { text: 'Negarse a irse del cargo', effects: {}, epilogueText: 'El partido se parte en dos, cada mitad con un logo casi idéntico. Fin del reinado, con abogados de por medio.' },
    isEnding: true,
    condition: (s) => s.partido <= 0,
  },
  {
    id: 'final_partido_3',
    phase: 4,
    character: 'La Militancia',
    text: 'En cada asamblea local piden su cabeza. Hasta en la del pueblo de su suegro.',
    left: { text: 'Convocar primarias internas', effects: {}, epilogueText: 'Pierde por goleada frente a alguien que hace un mes nadie conocía. Fin del reinado.' },
    right: { text: 'Cancelar las primarias por "unidad"', effects: {}, epilogueText: 'La militancia se lo toma como el último insulto. Fin del reinado, con carteles quemados de fondo.' },
    isEnding: true,
    condition: (s) => s.partido <= 0,
  },

  // VOTANTES a 0
  {
    id: 'final_votantes_1',
    phase: 4,
    character: 'Noche electoral',
    text: 'Los resultados son un baño de sangre. El escaño número uno ya no lleva su nombre.',
    left: { text: 'Aceptar el resultado', effects: {}, epilogueText: 'Se acabó. La oposición jura que ellos serán distintos (no lo serán).' },
    right: { text: 'Impugnar el proceso', effects: {}, epilogueText: 'Nadie le cree, ni siquiera su propio abogado. Fin del reinado, con extra de ridículo.' },
    isEnding: true,
    condition: (s) => s.votantes <= 0,
  },
  {
    id: 'final_votantes_2',
    phase: 4,
    character: 'El Sondeo a Pie de Urna',
    text: 'El sondeo a pie de urna es tan malo que nadie del partido quiere salir en la foto de esta noche.',
    left: { text: 'Salir usted mismo a dar la cara', effects: {}, epilogueText: 'Asume la derrota en directo, con la voz temblando solo un poco. Fin del reinado, con cierto respeto.' },
    right: { text: 'Mandar a un portavoz secundario', effects: {}, epilogueText: 'Se le acusa de esconderse hasta en su propio funeral político. Fin del reinado.' },
    isEnding: true,
    condition: (s) => s.votantes <= 0,
  },
  {
    id: 'final_votantes_3',
    phase: 4,
    character: 'La Calle',
    text: 'Las manifestaciones frente a la sede llevan semanas sin parar. Hasta los que le votaron llevan pancarta.',
    left: { text: 'Convocar elecciones anticipadas', effects: {}, epilogueText: 'Pierde igualmente, pero al menos elige la fecha del funeral. Fin del reinado.' },
    right: { text: 'Agotar la legislatura hasta el final', effects: {}, epilogueText: 'Le echan en las urnas de todos modos, solo que más tarde y más enfadados. Fin del reinado.' },
    isEnding: true,
    condition: (s) => s.votantes <= 0,
  },

  // CAJA a 0
  {
    id: 'final_caja_1',
    phase: 4,
    character: 'El Interventor',
    text: 'Las cuentas del partido están intervenidas. No hay ni para la luz de la sede, y eso que la pagaba "un amigo".',
    left: { text: 'Pedir un préstamo a un banco "amigo"', effects: {}, epilogueText: 'El banco pasa factura política después, con intereses de amigo también. Fin del reinado.' },
    right: { text: 'Cerrar la sede central', effects: {}, epilogueText: 'El partido se disuelve en una fusión "estratégica" que es, en realidad, una absorción. Fin del reinado.' },
    isEnding: true,
    condition: (s) => s.caja <= 0,
  },
  {
    id: 'final_caja_2',
    phase: 4,
    character: 'El Tesorero',
    text: 'No queda ni para las nóminas. Los proveedores llevan meses sin cobrar y ya le han bloqueado en el móvil.',
    left: { text: 'Recorte drástico de gastos', effects: {}, epilogueText: 'El partido sobrevive, reducido a un local y una cafetera. Fin del reinado, con austeridad de verdad por una vez.' },
    right: { text: 'Buscar financiación venga de donde venga', effects: {}, epilogueText: 'La procedencia del dinero se convierte en la pregunta favorita de todos los jueces de España. Fin del reinado.' },
    isEnding: true,
    condition: (s) => s.caja <= 0,
  },
  {
    id: 'final_caja_3',
    phase: 4,
    character: 'La Agencia Tributaria',
    text: 'Hacienda ha embargado las cuentas mientras dura la instrucción. Ya ni para imprimir un cartel de campaña.',
    left: { text: 'Aceptar el embargo y colaborar', effects: {}, epilogueText: 'El partido queda bajo administración judicial, como una empresa cualquiera en concurso. Fin del reinado.' },
    right: { text: 'Recurrir el embargo por todas las vías', effects: {}, epilogueText: 'Gana tiempo, pero pierde toda la campaña por el camino. Fin del reinado, con las costas a su cargo.' },
    isEnding: true,
    condition: (s) => s.caja <= 0,
  },

  // TECHO — como en el Reigns original, tener una stat DEMASIADO alta (10)
  // también acaba mal, no solo tocar fondo. Una carta por stat, no 3 como
  // las de fondo — es una faceta añadida, no el mismo peso que el mazo
  // principal de finales.
  {
    id: 'final_medios_max',
    phase: 4,
    character: 'El Editor Jefe',
    text: 'Ya no queda un solo medio que se atreva a preguntarle nada. El silencio informativo es tan absoluto que hasta sus propios votantes empiezan a mosquearse.',
    left: {
      text: 'Abrir la mano un poco',
      effects: {},
      epilogueText: 'Vuelven las preguntas incómodas, y con ellas, algo parecido a la democracia. Fin del reinado, con final feliz relativo.',
    },
    right: {
      text: 'Apretar aún más el control',
      effects: {},
      epilogueText: 'Su propio "Ministerio de la Verdad" se convierte en la noticia del año, y encima gana un premio internacional a la libertad de prensa que ya no existe. Fin del reinado.',
    },
    isEnding: true,
    condition: (s) => s.medios >= 10,
  },
  {
    id: 'final_partido_max',
    phase: 4,
    character: 'El Aparato',
    text: 'El partido ya no delibera nada, solo aplaude. Hace tiempo que nadie le lleva la contraria en una reunión, y eso, en política, nunca es buena señal.',
    left: {
      text: 'Abrir el debate interno',
      effects: {},
      epilogueText: 'Las primeras voces discrepantes le acaban comiendo el puesto en menos de un mes. Fin del reinado.',
    },
    right: {
      text: 'Que siga el aplauso',
      effects: {},
      epilogueText: 'El día que se acaba la fiesta, cae usted y cae el partido entero con usted, aplaudiendo hasta el final. Fin del reinado.',
    },
    isEnding: true,
    condition: (s) => s.partido >= 10,
  },
  {
    id: 'final_votantes_max',
    phase: 4,
    character: 'El Politólogo',
    text: 'Su popularidad roza lo religioso. Ya le llaman "el líder", a secas, sin apellidos, y hay tesis doctorales enteras preocupadas por usted.',
    left: {
      text: 'Bajar el perfil, por si acaso',
      effects: {},
      epilogueText: 'Recupera algo de normalidad democrática, con gran alivio de los politólogos. Fin de un reinado que rozó el culto a la personalidad.',
    },
    right: {
      text: 'Disfrutar del pedestal',
      effects: {},
      epilogueText: 'Cuando por fin cae, cae de muy arriba y con eco en los libros de historia. Fin del reinado, de los que hacen doctorado.',
    },
    isEnding: true,
    condition: (s) => s.votantes >= 10,
  },
  {
    id: 'final_caja_max',
    phase: 4,
    character: 'El Perito Judicial',
    text: 'La caja B ha crecido tanto que ni sus propios contables saben ya justificarla. Los números son tan absurdos que se han vuelto imposibles de esconder.',
    left: {
      text: 'Confesarlo antes de que estalle',
      effects: {},
      epilogueText: 'El escándalo igualmente estalla, pero al menos lo cuenta usted primero. Fin del reinado, con matices.',
    },
    right: {
      text: 'Seguir escondiéndolo',
      effects: {},
      epilogueText: 'Se convierte en el mayor caso de corrupción de la historia reciente, con capítulo propio en la carrera de Económicas. Fin del reinado.',
    },
    isEnding: true,
    condition: (s) => s.caja >= 10,
  },

  // FINAL ESPECIAL — sobrevivir toda la legislatura con los stats saneados.
  // minTurn evita que este final "bueno" salga de rebote a los 5 minutos
  // solo por haber tocado las 4 stats a 6+ a la vez muy pronto en la
  // partida — ver el comentario sobre minTurn en useGameStore.ts.
  {
    id: 'final_reeleccion',
    phase: 4,
    character: 'Noche electoral (buena)',
    text: 'Contra todo pronóstico, ha llegado entero al final de la legislatura. Los cuatro indicadores aguantan. Toca votar.',
    left: {
      text: 'Presentarse a la reelección',
      effects: {},
      epilogueText: 'Gana con mayoría. Empieza otra legislatura... y con ella, otra ronda entera de tentaciones.',
    },
    right: {
      text: 'Retirarse mientras gana, por una vez',
      effects: {},
      epilogueText: 'Se va por la puerta grande, algo insólito en este juego. Fin de un reinado limpio (o casi).',
    },
    isEnding: true,
    minTurn: PHASE_MIN_TURN[4],
    condition: (s) => s.medios >= 6 && s.partido >= 6 && s.votantes >= 6 && s.caja >= 6,
  },
]

export const cards: Card[] = [...contentCards, ...endingCards]

export const STAT_MAX = 10
export const STAT_START = 5
