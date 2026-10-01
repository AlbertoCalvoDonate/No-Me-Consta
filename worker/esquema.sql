-- LAS PARTIDAS QUE MANDA EL JUEGO.
--
-- Dos tablas y no una, y es la razon de usar D1 y no un fichero: `partidas`
-- contesta "cuanto dura la gente y por donde cae", y `decisiones` contesta
-- "que hace la gente con ESTA carta", que es lo que de verdad no se puede
-- saber de otra forma. Con el log en texto plano, lo segundo obliga a
-- escribir un parser cada vez que uno tiene una duda.
--
-- LO QUE NO HAY AQUI, Y ES A PROPOSITO: ni IP, ni user agent, ni nada que
-- siga a nadie entre partidas. El `id` es aleatorio y de LA PARTIDA, no del
-- telefono: dos partidas del mismo movil no se pueden relacionar. Asi lo que
-- se le dice al jugador -"solo datos de partida, nada personal"- es cierto
-- mirando el esquema, no solo mirando la intencion.
--
-- Se aplica con:
--   npx wrangler d1 execute nomeconsta-partidas --remote --file=worker/esquema.sql

CREATE TABLE IF NOT EXISTS partidas (
  id TEXT PRIMARY KEY,
  -- Epoch en milisegundos, puesto por el SERVIDOR. El reloj del movil puede
  -- estar en cualquier año y ordenar por el daria cosas raras.
  cuando INTEGER NOT NULL,
  version TEXT NOT NULL,
  final TEXT NOT NULL,
  meses INTEGER NOT NULL,
  moralidad INTEGER NOT NULL,
  medios INTEGER NOT NULL,
  gobierno INTEGER NOT NULL,
  calle INTEGER NOT NULL,
  caja INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_partidas_cuando ON partidas (cuando);
CREATE INDEX IF NOT EXISTS idx_partidas_final ON partidas (final);

CREATE TABLE IF NOT EXISTS decisiones (
  partida TEXT NOT NULL,
  turno INTEGER NOT NULL,
  carta TEXT NOT NULL,
  -- 'I' o 'D', como en el log que ya se compartia a mano.
  lado TEXT NOT NULL,
  medios INTEGER NOT NULL,
  gobierno INTEGER NOT NULL,
  calle INTEGER NOT NULL,
  caja INTEGER NOT NULL,
  moralidad INTEGER NOT NULL,
  PRIMARY KEY (partida, turno)
);

-- Por carta, que es como se va a preguntar casi siempre: cuanto sale, que
-- lado elige la gente, en que mes aparece.
CREATE INDEX IF NOT EXISTS idx_decisiones_carta ON decisiones (carta);

-- La encuesta de la primera partida. Van las RESPUESTAS pegadas a cada
-- partida y NO un identificador del movil: asi se puede comparar "partidas de
-- gente que juega a menudo" contra el resto, y a la vez dos partidas de la
-- misma persona siguen sin poderse juntar. El porque, en src/utils/perfil.ts.
-- NULL = no contesto, que no es lo mismo que "no juega".
ALTER TABLE partidas ADD COLUMN juega TEXT;
ALTER TABLE partidas ADD COLUMN reigns TEXT;
