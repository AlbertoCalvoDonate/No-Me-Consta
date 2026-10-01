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
FROM partidas;

-- ===========================================================================
-- 2. POR DONDE CAE LA GENTE. Si un final se come la mitad, ese final es el
-- juego entero y los demas son decorado.
SELECT final, COUNT(*) AS veces, ROUND(AVG(meses), 1) AS duraban
FROM partidas
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
GROUP BY meses
ORDER BY meses;

-- ===========================================================================
-- 8. LA ULTIMA CARTA QUE VIERON LOS QUE CAYERON PRONTO. Lo que sea que sale
-- ahi mucho, esta matando gente antes de que el juego empiece.
SELECT d.carta, COUNT(*) AS veces
FROM decisiones d
JOIN partidas p ON p.id = d.partida
WHERE p.meses <= 8 AND d.turno = p.meses
GROUP BY d.carta
ORDER BY veces DESC
LIMIT 15;
