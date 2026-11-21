// The home page of El Santo Resumen: the 3D notebook, the search and one card per tool, from secciones/inicio.json.
// It also writes _/materias.json, the subjects with their study pages, for the 3D scene and the advice page.
import fs from 'node:fs';
import path from 'node:path';
import { pieConAviso } from './aviso.mjs';
import { banda, botonCuenta, botonesEmergencia, scriptsServicio } from './servicio.mjs';
import { botonMenu, entradasInicio, enlace, filaEnlaces, menu } from './sitio.mjs';
import { icono as dibujo } from './iconos.mjs';
import { TIPOS_CON_NIVEL } from './niveles.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const icono = (nombre) => dibujo(nombre, 'in-icono');

const tarjeta = (e) => {
  // «grande» takes two columns. «ancho» takes the whole row, like the emergency card.
  // «mitad» goes side by side with the next «mitad», in a list of their own (grupos).
  // «aspecto» gives each card the look of what it is (inicio.css), so it is told apart at a glance.
  const clase = `in-entrada${{ grande: ' in-grande', ancho: ' in-ancho', mitad: ' in-mitad' }[e.tamano] || ''}`;
  const aspecto = e.aspecto ? ` data-aspecto="${esc(e.aspecto)}"` : '';
  // A button only takes inline content, so its title is a span with the same look as the others' h3.
  const cuerpo = (titulo, texto, enBoton = false) => `${icono(e.icono)}<span class="in-tx">${enBoton ? `<span class="in-h3">${esc(titulo)}</span>` : `<h3>${esc(titulo)}</h3>`}<span class="in-p">${esc(texto)}</span></span>`;
  if (e.accion === 'emergencia') {
    return `<li class="${clase} in-emergencia em-fuera"${aspecto}><button type="button" class="in-tarjeta" data-em-prender data-in-ir="${esc(enlace(e.href))}">${cuerpo(e.titulo, e.texto, true)}</button></li>`
      + `<li class="${clase} in-emergencia em-solo"${aspecto}><a class="in-tarjeta" href="${esc(enlace(e.href))}">${cuerpo('Protocolo prendido', 'Las materias muestran solo lo justo para rendir. Lo apagás con el botón de arriba.')}</a></li>`;
  }
  const externo = e.href.startsWith('https://') ? ' rel="noopener"' : '';
  return `<li class="${clase}"${aspecto}><a class="in-tarjeta" href="${esc(enlace(e.href))}"${externo}>${cuerpo(e.titulo, e.texto)}</a></li>`;
};

// Cards in a row with «mitad» go in a grid of their own with two columns, so they sit side by side whatever the number
// of columns the main grid has at that width. The rest keep the main grid, in order.
const grupos = (entradas) => entradas.reduce((g, e) => {
  const par = e.tamano === 'mitad';
  if (!g.length || g.at(-1).par !== par) g.push({ par, items: [] });
  g.at(-1).items.push(e);
  return g;
}, []);

export const armarInicio = ({ aqui, fuente, salida, materias, listo, pasadas }) => {
  const entradas = entradasInicio();
  const conResumen = materias.filter(listo);

  // a: year, 0 elective, -1 no longer in the plan. p: study pages, [file, name, id].
  const datos = conResumen.map((m) => {
    const f = path.join(fuente, m.slug, 'materia.json');
    const paginas = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).paginas || [] : [];
    return {
      s: m.slug,
      n: m.nombre,
      a: pasadas.includes(m.slug) ? -1 : m.anio,
      p: paginas.filter((p) => TIPOS_CON_NIVEL.includes(p.tipo)).map((p) => [p.archivo, p.nombre, p.id]),
    };
  });
  fs.writeFileSync(path.join(salida, '_', 'materias.json'), JSON.stringify(datos));

  const html = `<!doctype html>
<html lang="es" data-tema="noche">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#06122b">
<meta name="robots" content="noindex, nofollow">
<title>El Santo Resumen. Ingeniería en Sistemas, UTN</title>
<meta name="description" content="Resúmenes de todas las materias de Ingeniería en Sistemas de la UTN, con quiz y ejercicios de exámenes reales.">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=IBM+Plex+Mono:wght@500;600&family=Shantell+Sans:wght@400;600&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap">
<link rel="stylesheet" href="_/utn.css">
<link rel="stylesheet" href="_/carrera.css">
<link rel="stylesheet" href="_/inicio.css">
<script src="_/tema.js"></script>
<script src="_/ajustes.js" defer></script>
<script src="_/carrera-buscar.js" defer></script>
<script src="_/inicio.js" type="module"></script>
<script src="_/menu.js" defer></script>
${scriptsServicio('_', ['cuenta'])}
</head>
<body class="carrera inicio" data-materia="_" data-pagina="inicio">
<a class="saltar" href="#contenido">Saltar al contenido</a>
${banda}
<header class="barra">
${botonMenu}
<span class="b-materia">Ingeniería en Sistemas, UTN</span>
<div class="c-acciones">
<button type="button" id="foco" hidden></button>
${botonCuenta('b-tema')}
<button type="button" id="accesibilidad" class="b-tema">Configuración</button>
${botonesEmergencia('b-tema')}
</div>
</header>
${menu({ actual: 'index.html' })}
<main id="contenido">
<section class="in-heroe" aria-labelledby="inTitulo">
<div class="in-escena" id="inEscena" aria-hidden="true"></div>
<div class="in-texto">
<h1 id="inTitulo">El Santo Resumen</h1>
<p class="in-bajada">Las ${conResumen.length} materias de Sistemas resumidas para entenderlas y aprobarlas, con quiz y ejercicios de exámenes reales.</p>
<div class="c-herr in-buscar">
<div class="c-buscador"><label class="vh" for="cBuscar">Buscar materia o tema</label>
<input id="cBuscar" type="search" placeholder="Buscar materia o tema" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="cResultados" aria-expanded="false"><span id="cResCuenta" class="vh" role="status"></span><div id="cResultados" class="resultados c-resultados" role="listbox" aria-label="Resultados en toda la carrera" hidden></div></div>
<a class="b-pri in-ir" href="materias.html">Ver todas las materias</a>
</div>
<p class="in-nota">Hecho con el material del Drive de la carrera.</p>
</div>
<a class="in-ficha" id="inFicha" href="materias.html" hidden><span class="in-ficha-anio" id="inFichaAnio"></span><span class="in-ficha-nombre" id="inFichaNombre"></span><span class="in-ficha-ir">Abrir</span></a>
</section>
<section class="in-entradas" aria-labelledby="inQue">
<h2 id="inQue" class="vh">Qué hay</h2>
${grupos(entradas).map((g) => `<ul class="in-grilla${g.par ? ' in-par' : ''}">${g.items.map(tarjeta).join('')}</ul>`).join('\n')}
</section>
<nav class="in-secciones" aria-label="Más información">${filaEnlaces()}</nav>
</main>
${pieConAviso('Una iniciativa de <a href="https://lutastudios.com/">Luta Studios</a>.')}
</body>
</html>
`;
  fs.writeFileSync(path.join(salida, 'index.html'), html);
  for (const f of ['inicio.css', 'inicio.js', 'inicio3d.js']) fs.copyFileSync(path.join(aqui, 'plantilla', f), path.join(salida, '_', f));
};
