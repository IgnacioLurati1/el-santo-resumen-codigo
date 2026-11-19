// Builds the entry page of the whole degree: the study plan as a map, with what each subject asks for and unlocks.
//   node hub.mjs <materias.json> <fuente> <salida>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { armarSecciones } from './secciones.mjs';
import { SECCIONES, botonMenu, filaEnlaces, menu } from './sitio.mjs';
import { CAMBIO_RAPIDO, NIVELES, TIPOS_CON_NIVEL, esRapida, leerNiveles, leerPasadas, nivelDe } from './niveles.mjs';
import { pieConAviso } from './aviso.mjs';
import { banda, botonCuenta, botonesEmergencia, copiarServicio, scriptsServicio } from './servicio.mjs';
import { armarIndice } from './indice-carrera.mjs';
import { armarInicio } from './inicio.mjs';

const [lista, fuente, salida] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const materias = JSON.parse(fs.readFileSync(lista, 'utf8'));
const niveles = leerNiveles(aqui);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const porNumero = new Map(materias.filter((m) => m.n).map((m) => [m.n, m]));
const nombres = (ns) => ns.map((n) => (porNumero.has(n) ? porNumero.get(n).nombre : `materia ${n}`)).join(', ');

const listo = (m) => fs.existsSync(path.join(salida, m.slug, 'index.html'));
const leerJson = (m, a) => {
  const f = path.join(fuente, m.slug, a);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
};
const sinMarcas = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// One label for the subject: its level if every judged summary agrees, «Varía» if not, nothing if none was judged.
const nivelesDe = (m) => {
  const paginas = (leerJson(m, 'materia.json').paginas || []).filter((p) => TIPOS_CON_NIVEL.includes(p.tipo));
  const juzgados = paginas.map((p) => ({ nombre: p.nombre, nivel: nivelDe(niveles, m.slug, p.id) })).filter((x) => x.nivel !== 'no-juzgado');
  const distintos = [...new Set(juzgados.map((x) => x.nivel))];
  let marca = '';
  if (distintos.length === 1) marca = `<span class="c-marca c-nivel" data-nivel="${distintos[0]}">${esc(NIVELES[distintos[0]].nombre)}</span>`;
  else if (distintos.length > 1) marca = '<span class="c-marca c-nivel">Varía</span>';
  return { marca, detalle: juzgados.map((x) => `${x.nombre}: ${NIVELES[x.nivel].nombre}`).join('\n'), paginas: paginas.map((p) => `${p.id}=${p.nombre}`).join('|') };
};

// The option goes in an object: with .map(fila) the index would land in a second positional parameter.
const fila = (m, { pasada = false, obligatoria = false } = {}) => {
  const pide = [];
  if (m.cursadas.length) pide.push(`cursadas ${nombres(m.cursadas)}`);
  if (m.aprobadas.length) pide.push(`aprobadas ${nombres(m.aprobadas)}`);
  const correlativas = pide.length ? `<p class="c-pide">Para cursarla: ${esc(pide.join('; '))}.</p>` : '';
  const poco = leerJson(m, 'REPORTE.json').estado === 'poco-material' ? '<span class="c-marca">Hay poco material</span>' : '';
  const rapida = esRapida(niveles, m.slug);
  const { marca, detalle, paginas } = nivelesDe(m);
  const titulo = listo(m) ? `<a class="c-nom" href="${m.slug}/index.html">${esc(m.nombre)}</a>` : `<span class="c-nom c-sin">${esc(m.nombre)}</span><span class="c-marca">Todavía sin resumen</span>`;
  const estados = `<label class="c-estado"><span class="vh">Estado de ${esc(m.nombre)}</span><select data-slug="${m.slug}"><option value="">Sin cursar</option><option value="c">Regular</option><option value="a">Aprobada</option></select></label>`;
  return `<li class="c-fila" data-slug="${m.slug}" data-busca="${esc(sinMarcas(m.nombre))}" data-n="${m.n || ''}" data-c="${m.cursadas.join(',')}" data-a="${m.aprobadas.join(',')}" data-niveles="${esc(detalle)}" data-paginas="${esc(paginas)}"${rapida ? ' data-rapida="1"' : ''}${obligatoria ? ' data-obligatoria="1"' : ''}><div class="c-cuerpo">${titulo}<div class="c-marcas">${marca}${rapida ? '<span class="c-marca c-rapida">Cambio rápido</span>' : ''}${poco}${pasada ? '' : '<span class="c-marca c-puede" hidden>Ya la podés cursar</span>'}</div>${correlativas}</div>${estados}</li>`;
};
const anio = (a) => `<section class="c-anio" aria-labelledby="anio-${a}"><h2 id="anio-${a}"><span class="c-num">${a}°</span> año</h2><ul class="c-lista">${materias.filter((m) => m.anio === a).map((m) => fila(m, { obligatoria: !pasadas.includes(m.slug) })).join('')}</ul></section>`;
const pasadas = leerPasadas(aqui);
const electivas = materias.filter((m) => m.anio === 0 && !pasadas.includes(m.slug));
const delPasado = materias.filter((m) => pasadas.includes(m.slug));

const sinResumen = (t) => t.slice(t.indexOf('. ') + 2);
const leyenda = ['fuerte', 'normal', 'debil']
  .map((k) => `<div><dt><span class="c-marca c-nivel" data-nivel="${k}">${NIVELES[k].nombre}</span></dt><dd>${esc(sinResumen(NIVELES[k].texto))}</dd></div>`)
  .join('');

const html = `<!doctype html>
<html lang="es" data-tema="noche">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#06122b">
<meta name="robots" content="noindex, nofollow">
<title>Todas las materias. El Santo Resumen, Ingeniería en Sistemas, UTN</title>
<meta name="description" content="El plan de Ingeniería en Sistemas de la UTN como mapa, con el resumen de cada materia.">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Shantell+Sans:wght@400;600&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap">
<link rel="stylesheet" href="_/utn.css">
<link rel="stylesheet" href="_/carrera.css">
<link rel="stylesheet" href="_/recibido.css">
<script src="_/tema.js"></script>
<script src="_/ajustes.js" defer></script>
<script src="_/sysacad.js" defer></script>
<script src="_/recibido.js" defer></script>
<script src="_/carrera.js" defer></script>
<script src="_/carrera-buscar.js" defer></script>
<script src="_/menu.js" defer></script>
${scriptsServicio('_', ['cuenta', 'estrellas', 'niveles'])}
</head>
<body class="carrera" data-materia="_" data-pagina="entrada">
<a class="saltar" href="#contenido">Saltar al contenido</a>
${banda}
<header class="barra">
${botonMenu}
<a class="b-materia" href="index.html">El Santo Resumen</a>
<div class="c-acciones">
<button type="button" id="foco" hidden></button>
${botonCuenta('b-tema')}
<button type="button" id="accesibilidad" class="b-tema">Accesibilidad</button>
${botonesEmergencia('b-tema')}
<button type="button" id="tema" class="b-tema">Modo día</button>
</div>
</header>
${menu({ actual: 'materias.html' })}
<main id="contenido" class="c-hoja">
<div class="c-cabeza">
<h1>Todas las materias</h1>
<div class="c-intro">
<div class="c-herr">
<div class="c-buscador"><label class="vh" for="cBuscar">Buscar materia o tema</label>
<input id="cBuscar" type="search" placeholder="Buscar materia o tema" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="cResultados" aria-expanded="false"><span id="cResCuenta" class="vh" role="status"></span><div id="cResultados" class="resultados c-resultados" role="listbox" aria-label="Resultados en toda la carrera" hidden></div></div>
<button type="button" id="cMarcar" class="b-sec">Marcar lo que ya hice</button>
<button type="button" id="cPuedo" class="b-sec" aria-pressed="false">¿Qué puedo cursar?</button>
<button type="button" id="cOcultar" class="b-sec" hidden>Ocultar las aprobadas</button>
<p id="cCuenta" class="c-cuenta" role="status" tabindex="-1" hidden></p>
<button type="button" id="cFestejo" class="c-festejo" hidden><svg viewBox="0 0 26 10" aria-hidden="true"><ellipse cx="13" cy="5" rx="11" ry="3.4"/></svg>Volver a festejar</button>
</div>
<p id="cPuedoTexto" class="c-puedo-texto" role="status"></p>
<p id="cSysacad" class="c-ayuda c-sysacad" hidden><span id="cSysacadTexto"></span> <button type="button" id="cSysacadSacar" class="b-texto">Sacar lo de Sysacad</button></p>
<p id="cAyuda" class="c-ayuda" hidden>Marcá cada materia y te avisamos cuáles ya podés cursar, según las correlativas del plan del Drive. Ante la duda, vale lo que diga el SYSACAD. Si usás <a href="sysacad-lindo.html">Sysacad Lindo</a>, vinculalo y tus aprobadas y regulares llegan solas.</p>
<p id="cVacio" class="c-ayuda" role="status" hidden>Ninguna materia con ese nombre.</p>
</div>
</div>
<nav class="c-secciones" aria-label="Más información">${filaEnlaces()}</nav>
<div class="c-plano" id="cPlano">
<svg class="c-lineas" id="cLineas" aria-hidden="true"></svg>
<div class="c-anios">
${[1, 2, 3, 4, 5].map(anio).join('\n')}
</div>
<section class="c-anio c-electivas" aria-labelledby="electivas"><h2 id="electivas">Electivas</h2><ul class="c-lista">${electivas.map(fila).join('')}</ul></section>
<section class="c-anio c-electivas" aria-labelledby="pasado"><h2 id="pasado">Materias del pasado</h2><p class="c-ayuda">Ya no están en el plan de estudios. Quedan por si a alguien le sirven.</p><ul class="c-lista">${delPasado.map((m) => fila(m, { pasada: true })).join('')}</ul></section>
</div>
<aside class="c-ficha" id="cFicha" aria-hidden="true"><p class="c-ficha-ayuda">Pasá por una materia y se prenden las que pide y las que habilita.</p></aside>
<section class="c-leyenda" aria-labelledby="leyenda">
<h2 id="leyenda">Qué tan confiable es cada resumen</h2>
<p>Cada resumen tiene su propia marca, también cada parcial y el final. La ves arriba de cada página, y acá cuando ya está juzgado.</p>
<dl>${leyenda}<div><dt><span class="c-marca c-nivel">Sin marca</span></dt><dd>Todavía no se juzgó si alcanza para estudiar solo con esto.</dd></div><div><dt><span class="c-marca c-rapida">Cambio rápido</span></dt><dd>${esc(sinResumen(CAMBIO_RAPIDO))}</dd></div></dl>
</section>
</main>
${pieConAviso('Una iniciativa de <a href="https://lutastudios.com/">Luta Studios</a>.')}
</body>
</html>
`;
fs.mkdirSync(path.join(salida, '_'), { recursive: true });
fs.writeFileSync(path.join(salida, 'materias.html'), html);
for (const f of ['carrera.css', 'recibido.css', 'recibido.js', 'sysacad.js', 'carrera.js', 'carrera-buscar.js', 'menu.js']) fs.copyFileSync(path.join(aqui, 'plantilla', f), path.join(salida, '_', f));
copiarServicio(aqui, path.join(salida, '_'));
armarSecciones({ aqui, salida, materias, listo });
armarInicio({ aqui, fuente, salida, materias, listo, pasadas });
const pesoIndice = armarIndice(materias, fuente, salida);
console.log(`Índice: ${materias.length} materias, ${materias.filter(listo).length} con resumen, búsqueda ${Math.round(pesoIndice / 1024)} KB`);
