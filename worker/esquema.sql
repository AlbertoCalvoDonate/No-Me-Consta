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

-- QUIEN JUGO, PUESTO A MANO Y DESPUES.
--
-- Esto NO lo manda el juego: lo rellena quien tiene acceso a la base, sobre
-- filas que ya estan guardadas. Por eso no toca nada de lo de arriba ni de lo
-- que se le dice al jugador: el juego sigue sin mandar ningun identificador.
--
-- Existe por una razon concreta: las partidas del que ha hecho el juego no
-- valen para medir nada. Uno ya sabe que hace cada personaje, por donde se
-- muere y que carta conviene. Si se mezclan con las de los testers, la media
-- miente hacia arriba. Marcarlas permite sacarlas de la cuenta (ver
-- consultas.sql) sin tener que borrarlas, que tambien sirven para otras cosas.
--
-- NULL = alguien de fuera, que es el caso normal.
ALTER TABLE partidas ADD COLUMN quien TEXT;

-- LA CUANTA PARTIDA ES ESTA EN ESE MOVIL.
--
-- Un numero, no un identificador: dos personas distintas en su quinta partida
-- mandan las dos un 5, y siguen siendo indistinguibles. Con esto se contesta
-- "¿la gente mejora segun juega?" -comparar las primeras partidas contra las
-- decimas, en el monton- que es para lo que uno se plantea poner un id por
-- movil. La pregunta de verdad no era sobre una persona concreta: era sobre la
-- curva. Y la curva no necesita saber de quien es cada punto.
ALTER TABLE partidas ADD COLUMN partida_n INTEGER;

-- LA SESION: UNE LOS DOS ENVIOS DE LA MISMA PARTIDA.
--
-- Desde el 01/10/2026 el juego manda tambien la partida SIN TERMINAR, al
-- ocultarse la pestaña: antes, quien jugaba cuatro meses y no volvia no
-- mandaba nada, y todo lo que habia aqui era -por construccion- de gente que
-- habia llegado a un final. La pregunta que mas importa en un playtest es la
-- contraria: si la gente se cae antes de engancharse.
--
-- Eso obliga a poder mandar la MISMA partida dos veces (a medias y, si vuelve,
-- acabada) sin que cuente como dos. De ahi este valor: lo genera el movil al
-- empezar la partida, es aleatorio y muere con ella (ver utils/pasosPartida).
--
-- NO ROMPE EL "NADA PERSONAL". Une dos envios de una partida y nada mas: dos
-- partidas del mismo movil siguen sin poderse relacionar, porque cada una trae
-- la suya. El id de la fila lo sigue poniendo el servidor.
--
-- UNIQUE para que dos balizas a la vez no puedan crear dos filas. En SQLite
-- los NULL no chocan entre si, asi que las filas de antes -que no tienen
-- sesion- conviven con el indice sin tocarlas.
ALTER TABLE partidas ADD COLUMN sesion TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_partidas_sesion ON partidas (sesion);
