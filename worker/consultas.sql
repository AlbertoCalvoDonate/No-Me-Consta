-- LAS PREGUNTAS QUE MERECE LA PENA HACERLE A LOS DATOS.
--
-- No es un fichero que haya que procesar: es una base de datos y se le
-- pregunta cuando se quiera. Cada bloque se lanza asi:
--
--   npx wrangler d1 execute nomeconsta-partidas --remote --command "..."
--
-- o entero, para verlas todas de una:
--
--   npx wrangler d1 execute nomeconsta-partidas --remote --file=worker/consultas.sql
--
-- OJO CON UNA COSA AL LEERLAS: aqui no hay jugadores, hay PARTIDAS. No existe
-- ningun identificador que una dos partidas de la misma persona (el porque,
-- en src/utils/perfil.ts). Asi que "el 40% de las partidas duran menos de diez
-- meses" es cierto; "el 40% de la GENTE no pasa de diez meses" no se puede
-- saber con esto, porque una sola persona empeñada puede ser veinte partidas.

-- Y OTRA: las partidas del que ha hecho el juego estan marcadas con `quien`.
-- No valen para medir, porque uno ya sabe que hace cada personaje y por donde
-- se muere. Casi todas las consultas de aqui llevan `WHERE quien IS NULL` por
-- eso. Para verlas incluidas, quitar esa linea.

-- Y LA TERCERA, QUE ES NUEVA Y LA MAS FACIL DE OLVIDAR:
--
-- Desde el 01/10/2026 hay filas con `final = 'abandonada'`. Son partidas que
-- el jugador dejo a medias y que el juego manda al ocultarse la pestaña. NO
-- SON MUERTES: nadie perdio ahi, simplemente se fue. Si se cuelan en "¿cuanto
-- dura la gente?" o en "¿por donde cae?", las dos mienten hacia abajo.
--
-- Por eso casi todo lo de aqui lleva ademas `AND final <> 'abandonada'`. Las
-- que preguntan por CARTAS (4, 5 y 6) no lo llevan a proposito: una decision
-- tomada en una partida abandonada es una decision igual de real, y tirarla
-- seria perder justo el dato que mas costo conseguir.
--
-- Las dos ultimas (11 y 12) son las que miran precisamente eso.

-- ===========================================================================
-- 0. ¿CUANTAS HAY, Y DE QUIEN?
SELECT
  COALESCE(quien, 'gente de fuera') AS de_quien,
  SUM(CASE WHEN final <> 'abandonada' THEN 1 ELSE 0 END) AS terminadas,
  SUM(CASE WHEN final =  'abandonada' THEN 1 ELSE 0 END) AS abandonadas,
  COUNT(*) AS total
FROM partidas
GROUP BY quien;

-- ===========================================================================
-- 1. LO BASICO: ¿cuanto dura la gente?
-- La mediana importa mas que la media: cuatro partidas de dos minutos y una de
-- hora y media dan una media que no le ha pasado a nadie.
SELECT
  COUNT(*) AS partidas,
  ROUND(AVG(meses), 1) AS media_meses,
  MIN(meses) AS peor,
  MAX(meses) AS mejor,
  SUM(CASE WHEN meses < 10 THEN 1 ELSE 0 END) AS menos_de_10_meses,
  SUM(CASE WHEN meses >= 48 THEN 1 ELSE 0 END) AS legislatura_entera
FROM partidas
WHERE quien IS NULL AND final <> 'abandonada';

-- ===========================================================================
-- 2. POR DONDE CAE LA GENTE. Si un final se come la mitad, ese final es el
-- juego entero y los demas son decorado.
SELECT final, COUNT(*) AS veces, ROUND(AVG(meses), 1) AS duraban
FROM partidas
WHERE quien IS NULL AND final <> 'abandonada'
GROUP BY final
ORDER BY veces DESC;

-- ===========================================================================
-- 3. LA PREGUNTA DE LA ENCUESTA: ¿es que el juego es duro, o es que quien lo
-- prueba no juega a nada? Sin esto, "duro veinte meses" no se puede leer.
SELECT
  COALESCE(juega, 'no contesto') AS juega,
  COALESCE(reigns, 'no contesto') AS conocia_reigns,
  COUNT(*) AS partidas,
  ROUND(AVG(meses), 1) AS media_meses
FROM partidas
WHERE quien IS NULL AND final <> 'abandonada'
GROUP BY juega, reigns
ORDER BY partidas DESC;

-- ===========================================================================
-- 4. LAS CARTAS QUE NO VE NADIE. Esto es lo que no se podia saber de ninguna
-- otra forma, y la razon de que las decisiones vayan en su propia tabla.
-- Una carta escrita que no sale nunca es trabajo tirado.
SELECT carta, COUNT(*) AS veces, ROUND(AVG(turno), 1) AS mes_medio
FROM decisiones
GROUP BY carta
ORDER BY veces ASC
LIMIT 30;

-- ===========================================================================
-- 5. LAS QUE SALEN DEMASIADO. El otro lado de lo mismo: si una carta es el 5%
-- de todo lo que sale, se nota y cansa.
SELECT
  carta,
  COUNT(*) AS veces,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM decisiones), 2) AS porcentaje
FROM decisiones
GROUP BY carta
ORDER BY veces DESC
LIMIT 20;

-- ===========================================================================
-- 6. ¿HAY CARTAS QUE NADIE DUDA? Si el 95% elige el mismo lado, esa carta no
-- es una decision: es un peaje con dos botones.
SELECT
  carta,
  COUNT(*) AS veces,
  ROUND(100.0 * SUM(CASE WHEN lado = 'I' THEN 1 ELSE 0 END) / COUNT(*)) AS pct_izquierda
FROM decisiones
GROUP BY carta
HAVING veces >= 8
ORDER BY ABS(50 - pct_izquierda) DESC
LIMIT 20;

-- ===========================================================================
-- 7. EN QUE MES SE CAE. Si hay un pico, ahi hay un muro que no se ve desde
-- dentro.
SELECT meses, COUNT(*) AS partidas
FROM partidas
WHERE quien IS NULL AND final <> 'abandonada'
GROUP BY meses
ORDER BY meses;

-- ===========================================================================
-- 8. LA ULTIMA CARTA QUE VIERON LOS QUE CAYERON PRONTO. Lo que sea que sale
-- ahi mucho, esta matando gente antes de que el juego empiece.
SELECT d.carta, COUNT(*) AS veces
FROM decisiones d
JOIN partidas p ON p.id = d.partida
WHERE p.meses <= 8 AND d.turno = p.meses AND p.final <> 'abandonada'
GROUP BY d.carta
ORDER BY veces DESC
LIMIT 15;

-- ===========================================================================
-- 9. ¿LA GENTE MEJORA? Esta es la que uno cree que necesita un identificador
-- por movil, y no: con el numero de partida basta. No sigue a nadie en
-- concreto, pero contesta la pregunta, que era sobre la curva y no sobre una
-- persona.
SELECT
  CASE
    WHEN partida_n = 1 THEN '1a partida'
    WHEN partida_n <= 3 THEN '2a-3a'
    WHEN partida_n <= 10 THEN '4a-10a'
    ELSE 'de la 11a en adelante'
  END AS cuando,
  COUNT(*) AS partidas,
  ROUND(AVG(meses), 1) AS media_meses,
  MAX(meses) AS mejor
FROM partidas
WHERE quien IS NULL AND final <> 'abandonada'
GROUP BY cuando
ORDER BY MIN(partida_n);

-- ===========================================================================
-- 10. Y LA PRIMERA PARTIDA DE TODAS, que es la que decide si alguien vuelve.
SELECT final, COUNT(*) AS veces, ROUND(AVG(meses), 1) AS duraban
FROM partidas
WHERE quien IS NULL AND partida_n = 1 AND final <> 'abandonada'
GROUP BY final
ORDER BY veces DESC;

-- ===========================================================================
-- 11. CUANTA GENTE LO DEJA, Y CUANDO.
--
-- La pregunta que esta base no podia contestar hasta el 01/10/2026, porque
-- quien abandonaba no mandaba nada y TODO lo medido era, por construccion, de
-- gente que habia llegado a un final.
--
-- Si el abandono se concentra en un mes concreto, ahi hay algo que aburre o
-- que no se entiende, y no se parece en nada a morir: morir es el juego
-- funcionando.
SELECT
  meses AS mes_en_que_lo_dejaron,
  COUNT(*) AS partidas
FROM partidas
WHERE quien IS NULL AND final = 'abandonada'
GROUP BY meses
ORDER BY meses;

-- ===========================================================================
-- 12. LA ULTIMA CARTA DEL QUE SE FUE. Si una carta sale mucho aqui y poco en
-- la 8, no esta matando a nadie: esta aburriendo, que cuesta mas de ver.
SELECT d.carta, COUNT(*) AS veces, ROUND(AVG(d.turno), 1) AS mes_medio
FROM decisiones d
JOIN partidas p ON p.id = d.partida
WHERE p.quien IS NULL AND p.final = 'abandonada' AND d.turno = p.meses
GROUP BY d.carta
ORDER BY veces DESC
LIMIT 15;
