// General pages next to the map: study plan, exam days, teacher emails and thanks. Data lives in secciones/*.json.
import fs from 'node:fs';
import path from 'node:path';
import { pieConAviso } from './aviso.mjs';
import { banda, botonCuenta, botonesEmergencia, scriptsServicio } from './servicio.mjs';
import { APARTE, SECCIONES, botonMenu, filaEnlaces, menu } from './sitio.mjs';
import { icono } from './iconos.mjs';

export { SECCIONES };

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clave = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\(.*?\)/g, ' ').replace(/\b(de|las|los|la|el|en|y)\b/g, ' ').replace(/\s+/g, ' ').trim();

// Sysacad Lindo: the extension's ZIP and its captures (made with invented data) live in secciones/sysacad-lindo/.
const SYSACAD = { version: '2.4.1', zip: 'sysacad-lindo-2.4.1.zip' };
const CAPTURAS_SYSACAD = [
  ['mapa', 1040, 865, 'Mapa de correlativas, por año.', 'Mapa de correlativas de la carrera, con las materias en columnas por año y líneas que las unen.'],
  ['correlativas', 1100, 1289, 'Correlativas para cursar, con lo que más te frena arriba.', 'Página de correlatividades para cursar, con un recuadro «Lo que más te frena» y tablas por año.'],
  ['estado', 1100, 1315, 'Estado académico por año, con tu promedio.', 'Estado académico con el promedio, cuántas materias aprobaste, las electivas y una tabla por año.'],
  ['estado-oscuro', 1100, 1480, 'El mismo estado, en modo oscuro.', 'Estado académico en modo oscuro.'],
  ['entrada', 1100, 700, 'La entrada de Sysacad, ordenada.', 'Pantalla de ingreso de Sysacad con el formulario a la izquierda y los avisos a la derecha.'],
];

// The link with El Santo Resumen, made with an invented student (sysacad-capturas in the session that added it).
const VINCULO_SYSACAD = [
  ['vinculo-sysacad', 1100, 700, 'En Sysacad, tocás «Vincular» en Estado académico.', 'Estado académico de Sysacad con un recuadro que pregunta si usás El Santo Resumen, con los botones Vincular y Ahora no.'],
  ['vinculo-mapa', 1100, 760, 'En El Santo Resumen, aprobadas en verde y regulares en amarillo.', 'Mapa de materias de El Santo Resumen con primer año en verde, varias materias de segundo en amarillo y otras marcadas con «Ya la podés cursar».'],
];

// The link with Super CVG (2.3.0): the invitation in Sysacad, and Notas in Super CVG with real subject names over its demo.
const VINCULO_CVG = [
  ['vinculo-cvg-sysacad', 1100, 688, 'En Sysacad, tocás «Vincular» en Estado académico.', 'Estado académico de Sysacad con un recuadro que pregunta si usás Super CVG, con los botones Vincular y Ahora no.'],
  ['vinculo-cvg-notas', 1100, 700, 'En Super CVG, tu final aparece donde la cátedra no cargó nota.', 'Notas de Super CVG con tres materias. Dos tienen la nota del campus y Sistemas Operativos muestra un 9 marcado como final de Sysacad.'],
];

// Pages with their own look, in plantilla/paginas.css: the notebook of the home page instead of plain text.
const CON_ESTILO = ['sysacad-lindo.html', 'privacidad.html', 'agradecimientos.html', 'novedades.html'];
const SCRIPTS = { 'banco.html': ['cuenta', 'estrellas', 'banco'], 'subir.html': ['cuenta', 'estrellas', 'banco'], 'mis-resumenes.html': ['cuenta', 'estrellas', 'banco', 'mis'], 'consejos.html': ['cuenta', 'estrellas', 'consejos'], 'crear.html': ['piezas', 'crear'] };
const conCuenta = (s) => (SCRIPTS[s.archivo] || []).includes('cuenta');
const pagina = (s, descripcion, cuerpo) => `<!doctype html>
<html lang="es" data-tema="noche">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#06122b">
<meta name="robots" content="noindex, nofollow">
<title>${esc(s.nombre)}: Ingeniería en Sistemas, UTN</title>
<meta name="description" content="${esc(descripcion)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=IBM+Plex+Mono:wght@500;600&family=Shantell+Sans:wght@400;600&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap">
<link rel="stylesheet" href="_/utn.css">
<link rel="stylesheet" href="_/carrera.css">
${CON_ESTILO.includes(s.archivo) ? '<link rel="stylesheet" href="_/paginas.css">\n' : ''}<script src="_/tema.js"></script>
<script src="_/ajustes.js" defer></script>
<script src="_/secciones.js" defer></script>
<script src="_/menu.js" defer></script>
${scriptsServicio('_', SCRIPTS[s.archivo] || [])}
</head>
<body class="carrera seccion" data-materia="_" data-pagina="${s.archivo.replace('.html', '')}">
<a class="saltar" href="#contenido">Saltar al contenido</a>
${banda}
<header class="barra">
${botonMenu}
<a class="b-materia" href="materias.html">Todas las materias</a>
<div class="c-acciones">
<button type="button" id="foco" hidden></button>
${conCuenta(s) ? botonCuenta('b-tema') : ''}
<button type="button" id="accesibilidad" class="b-tema">Configuración</button>
${botonesEmergencia('b-tema')}
</div>
</header>
${menu({ actual: s.archivo })}
<main id="contenido" class="c-hoja s-hoja${['banco.html', 'consejos.html', 'mis-resumenes.html'].includes(s.archivo) ? ' ba-ancho' : s.archivo === 'crear.html' ? ' cr-ancho' : ''}">
<h1>${esc(s.nombre)}</h1>
${cuerpo}
</main>
<nav class="s-otras" aria-label="Otras secciones">${filaEnlaces(s)}</nav>
${pieConAviso('Una iniciativa de <a href="https://lutastudios.com/">Luta Studios</a>.')}
</body>
</html>
`;

const filtro = (id, texto) => `<div class="c-herr"><label class="vh" for="${id}">${esc(texto)}</label><input id="${id}" data-filtro type="search" placeholder="${esc(texto)}" autocomplete="off"></div><p class="c-ayuda" role="status" data-filtro-vacio hidden>No hay nada con ese nombre.</p>`;

export const armarSecciones = ({ aqui, salida, materias, listo }) => {
  const dato = (a) => JSON.parse(fs.readFileSync(path.join(aqui, 'secciones', `${a}.json`), 'utf8'));
  const porClave = new Map(materias.map((m) => [clave(m.nombre), m]));
  const enlace = (nombre) => {
    const m = porClave.get(clave(nombre));
    const limpio = nombre.replace(/\s*\(Cuat\.\)\s*$/, '');
    return m && listo(m) ? `<a href="${m.slug}/index.html">${esc(limpio)}</a>` : esc(limpio);
  };

  // Plan.
  const plan = dato('plan');
  const nombresPorN = new Map(plan.obligatorias.map((o) => [String(o.n), o.materia.replace(/\s*\(Cuat\.\)\s*$/, '')]));
  const nums = (t) => (t ? t.split('-').map((n) => n.trim()).filter(Boolean).map((n) => `<a class="s-num" href="#m-${n}" title="${esc(nombresPorN.get(n) || '')}" aria-label="${esc(nombresPorN.get(n) || `Materia ${n}`)}">${n}</a>`).join(', ') : '<span class="s-nada">Ninguna</span>');
  const cabeza = (primera) => `<thead><tr>${primera.map((c) => `<th scope="col">${c}</th>`).join('')}<th scope="col">Cursadas</th><th scope="col">Aprobadas</th></tr></thead>`;
  const anios = [...new Set(plan.obligatorias.map((o) => o.anio))];
  const niveles = [...new Set(plan.electivas.map((o) => o.nivel))];
  const planHtml = `<p class="bajada">Qué pide cada materia para cursarla y rendirla. Tocá un número para ir a esa materia. Ante la duda, manda el SYSACAD.</p>
${anios.map((a) => `<section class="s-bloque"><h2>${esc(a.replace('Primero', 'Primer').replace('Tercero', 'Tercer'))} año</h2><div class="s-tabla" tabindex="0" role="region" aria-label="${esc(a.replace('Primero', 'Primer').replace('Tercero', 'Tercer'))} año. Tabla, se puede desplazar"><table>${cabeza(['N°', 'Materia'])}<tbody>${plan.obligatorias.filter((o) => o.anio === a).map((o) => `<tr id="m-${o.n}"><td>${o.n}</td><td>${enlace(o.materia)}${o.nota ? `<span class="s-nota">${esc(o.nota)}</span>` : ''}</td><td>${nums(o.cursadas)}</td><td>${nums(o.aprobadas)}</td></tr>`).join('')}</tbody></table></div></section>`).join('\n')}
<h2 class="s-grande">Electivas</h2>
${niveles.map((a) => `<section class="s-bloque"><h3>${esc(a)}</h3><div class="s-tabla" tabindex="0" role="region" aria-label="Electivas de ${esc(a)}. Tabla, se puede desplazar"><table>${cabeza(['Materia', 'Dictado'])}<tbody>${plan.electivas.filter((o) => o.nivel === a).map((o) => `<tr><td>${enlace(o.materia)}</td><td>${esc(o.dictado.replace(' | ', ', ').replace('Cuatr.', 'Cuatrimestral'))}</td><td>${nums(o.cursadas)}</td><td>${nums(o.aprobadas)}</td></tr>`).join('')}</tbody></table></div></section>`).join('\n')}
<section class="s-bloque"><h2>Para recibirte</h2>
<p><b>Analista Desarrollador Universitario de Sistemas de Información.</b> Todas las materias de 1°, 2° y 3° año, 4 horas de electivas y Seminario Integrador de 3° año, que pide 16 para cursar y 6, 8, 13 y 14 para rendir.</p>
<p><b>Ingeniero en Sistemas de Información.</b> Todas las obligatorias, 20 horas de electivas y 200 horas de Prácticas Profesionales Supervisadas.</p>
<p>Las horas de las materias cuatrimestrales se cuentan como la mitad de las que figuran en el plan.</p></section>`;

  // Exam days.
  const mesas = dato('mesas');
  const orden = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  const bloqueMesas = (tipo) => {
    const filas = mesas.filter((m) => m.tipo === tipo);
    return [...new Set(filas.map((m) => m.anio))].map((a) => `<section class="s-bloque" data-filtro-grupo><h3>${esc(a)}</h3><div class="s-tabla" tabindex="0" role="region" aria-label="${esc(tipo)}, ${esc(a)}. Tabla, se puede desplazar"><table><thead><tr><th scope="col">Día</th><th scope="col">Hora</th><th scope="col">Materia</th></tr></thead><tbody>${filas.filter((m) => m.anio === a).sort((x, y) => orden.indexOf(x.dia) - orden.indexOf(y.dia) || x.hora.localeCompare(y.hora)).map((m) => `<tr data-filtro-texto="${esc(clave(m.materia))}"><td>${esc(m.dia)}</td><td>${esc(m.hora)}</td><td>${enlace(m.materia)}</td></tr>`).join('')}</tbody></table></div></section>`).join('\n');
  };
  const mesasHtml = `<p class="bajada">El día y la hora en que suele tomarse cada materia. Siempre manda lo que diga el SYSACAD.</p>
${filtro('sMesas', 'Buscar materia')}
<div data-filtro-grupo><h2 class="s-grande">Obligatorias</h2>
${bloqueMesas('Obligatorias')}</div>
<div data-filtro-grupo><h2 class="s-grande">Electivas</h2>
${bloqueMesas('Electivas')}</div>
<p class="s-fuente">Sale de la planilla «Días de Mesas de Examen» del Drive, leída el 2/11/2026.</p>`;

  // Teacher emails. The address is assembled in the browser so it isn't sitting in the page for a mail harvester.
  const docentes = dato('docentes');
  const celdaMail = (d) => (d.mail ? d.mail.match(/[\w.+-]+@[\w.-]+\.\w+/g).map((m) => `<button type="button" class="s-mail" data-m="${esc([...m].reverse().join('').replace('@', ' '))}" aria-label="Mostrar mail de ${esc(d.nombre)}">Mostrar mail</button>`).join('<br>') : esc(d.nota || 'Sin mail en la planilla'));
  const docentesHtml = `<p class="bajada">Docentes de Sistemas y de Básicas. Las correcciones se cargan en la <a href="https://docs.google.com/spreadsheets/d/1wFvWH516BMusWYd7Z1q8wnacpQgpzKPnq53Wllcepao/edit?gid=349018932">planilla completa</a>, con todas las carreras.</p>
${filtro('sDocentes', 'Buscar docente o materia')}
${['Sistemas', 'Básicas'].map((g) => `<section class="s-bloque" data-filtro-grupo><h2>${g}</h2><div class="s-tabla" tabindex="0" role="region" aria-label="Docentes de ${g}. Tabla, se puede desplazar"><table><thead><tr><th scope="col">Nombre</th><th scope="col">Mail</th><th scope="col">Materia</th></tr></thead><tbody>${docentes.filter((d) => d.depto === g).map((d) => `<tr data-filtro-texto="${esc(clave(`${d.nombre} ${d.obs}`))}"><td>${esc(d.nombre)}</td><td>${celdaMail(d)}</td><td>${esc(d.obs)}</td></tr>`).join('')}</tbody></table></div></section>`).join('\n')}
<noscript><p class="c-ayuda">Para ver los mails hace falta JavaScript. También están en la planilla completa.</p></noscript>
<p class="s-fuente">Leído el 2/11/2026. Puede haber cambiado desde entonces.</p>`;

  // Thanks.
  const gracias = dato('agradecimientos');
  // The one who keeps the Drive goes on a taped sheet. The names go like signatures in the notebook: --i staggers them in.
  const graciasHtml = `<p class="bajada">Todo este sitio sale de lo que otras personas decidieron compartir.</p>
${icono('gracias', 'pg-dibujo')}
<section class="s-bloque ag-creador" aria-labelledby="agCreador"><h2 id="agCreador">${esc(gracias.creador)}</h2><p>Armó y mantiene el <a href="https://drive.google.com/drive/folders/1ZgKML44drc8Wq3pcbHsc-ozPINv6xSHQ">Drive de la carrera</a>, de donde sale cada resumen.</p></section>
<section class="s-bloque ag-alumnos" aria-labelledby="agAlumnos"><h2 id="agAlumnos">Alumnos con material en el Drive</h2><p>Sus nombres figuran en trabajos, resúmenes o resoluciones. Si falta alguien, es porque su nombre no aparece en el texto de los archivos.</p>
<ul class="ag-firmas">${gracias.alumnos.map((n, i) => `<li style="--i: ${i}">${esc(n)}</li>`).join('')}</ul></section>
<p class="s-fuente ag-gracias-fuente">Si aparecés acá y preferís que saquemos tu nombre, escribinos a <a href="mailto:${esc(gracias.contacto)}">${esc(gracias.contacto)}</a>.</p>
<p class="s-cierre">Y a todos aquellos soldados que vinieron antes que nosotros, y a todos los que algún día vendrán.</p>`;

  // Student summaries. The list and the forms need the service, so the page says so when there is none.
  const opcionesMateria = [...materias].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map((m) => `<option value="${m.slug}">${esc(m.nombre)}</option>`).join('');
  const opcionesInstancia = [['parcial-1', '1° parcial'], ['parcial-2', '2° parcial'], ['parcial-3', '3° parcial'], ['parcial-4', '4° parcial'], ['final', 'Final o para todo']].map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
  const chipsInstancia = [['', 'Todas'], ['parcial-1', '1° parcial'], ['parcial-2', '2° parcial'], ['parcial-3', '3° parcial'], ['parcial-4', '4° parcial'], ['final', 'Final']].map(([v, n]) => `<button type="button" class="ba-chip" data-instancia="${v}" aria-pressed="${v ? 'false' : 'true'}">${n}</button>`).join('');
  const errorDe = (id) => `<p id="${id}Error" class="ba-error" aria-live="polite"></p>`;
  const bancoHtml = `<div class="ba-cabeza"><p class="bajada">Resúmenes que subieron otros alumnos, en PDF, Word, PowerPoint, HTML o Google. Ningún docente los revisó.</p><div class="ba-ir-fila"><a class="ba-mis" href="mis-resumenes.html">Mis resúmenes</a><a class="b-pri ba-ir" id="baIrSubir" href="subir.html">Subir un resumen</a></div></div>
<p id="baSin" class="c-ayuda">El banco todavía no está disponible. Los resúmenes de cada materia se siguen leyendo igual.</p>
<div id="baTodo" hidden>
<div class="ba-filtros" role="group" aria-label="Filtrar resúmenes">
<div class="ba-campo"><label for="baMateria">Materia</label><select id="baMateria"><option value="">Todas las materias</option>${opcionesMateria}</select></div>
<div class="ba-campo ba-chips-campo"><span id="baInstRotulo" class="ba-rotulo">Instancia</span><div class="ba-chips" role="group" aria-labelledby="baInstRotulo">${chipsInstancia}</div><select id="baInstancia" hidden><option value="">Todas las instancias</option>${opcionesInstancia}</select></div>
<div class="ba-campo ba-temas" id="baTemas" hidden><span id="baTemasRotulo" class="ba-rotulo">Etiquetas</span><div class="ba-chips" id="baTemasChips" role="group" aria-labelledby="baTemasRotulo"></div><button type="button" id="baTemasMas" class="ba-temas-mas" aria-expanded="false" aria-controls="baTemasChips" hidden></button></div>
</div>
<form id="baBusca" class="ba-busca" role="search" novalidate hidden><label for="baBuscar">Buscar dentro de los resúmenes</label><div class="ba-busca-fila"><input id="baBuscar" type="search" maxlength="100" autocomplete="off" enterkeyhint="search" placeholder="Por ejemplo: integral doble" aria-describedby="baBuscarError"><button type="submit" class="b-pri">Buscar</button><button type="button" id="baBorrarBusqueda" class="b-sec" hidden>Borrar búsqueda</button></div><p id="baBuscarError" class="ba-error" role="alert"></p></form>
<p id="baCuenta" class="ba-cuenta" role="status"></p>
<p id="baNada" class="c-ayuda" hidden>Probá con otras palabras o sacá algún filtro.</p>
<p id="baAviso" class="es-estado" role="status"></p>
<div id="baFalla" class="ba-falla" role="alert" hidden><p id="baFallaTexto"></p><button type="button" id="baReintentar" class="b-sec">Probar de nuevo</button></div>
<h2 class="vh">Resúmenes</h2>
<ul id="baLista" class="ba-lista"></ul>
<p id="baVacio" class="c-ayuda" hidden>Todavía no hay resúmenes con este filtro. <a href="subir.html" data-con-materia>Subí el tuyo</a>.</p>
</div>`;


  const subirHtml = `<p class="bajada">Compartí tu resumen con el resto. Hace falta una cuenta. Si no tenés, te la pide al enviar y no perdés lo que completaste.</p>
<p id="baSin" class="c-ayuda">El banco todavía no está disponible.</p>
<div id="baTodo" class="su-marco" hidden>
<form id="baForm" novalidate>
<div class="ba-campo su-zona-fila"><span id="suZonaRotulo" class="ba-rotulo">Tu resumen</span><div id="suZona"></div><p class="ba-ayuda su-crear">¿No lo tenés en un archivo? <a id="suIrCrear" href="crear.html">Armalo acá</a>, con texto, fotos y gráficos de la materia.</p></div>
<div class="ba-campo"><label for="suTitulo">Título</label><input id="suTitulo" type="text" maxlength="120" autocomplete="off" placeholder="Por ejemplo: SQL con ejercicios resueltos" aria-describedby="suTituloError">${errorDe('suTitulo')}</div>
<div class="ba-doble">
<div class="ba-campo"><label for="suMateria">Materia</label><select id="suMateria" aria-describedby="suMateriaError"><option value="">Elegí la materia</option>${opcionesMateria}</select>${errorDe('suMateria')}</div>
<div class="ba-campo"><label for="suInstancia">Instancia</label><select id="suInstancia" aria-describedby="suInstanciaError"><option value="">Elegí la instancia</option>${opcionesInstancia}</select>${errorDe('suInstancia')}</div>
</div>
<div class="ba-campo cr-etiquetas su-etiquetas"><label for="suEtiqueta">Etiquetas, si querés</label><div class="cr-chips"><ul id="suChips" class="cr-chips-l" aria-label="Etiquetas puestas" hidden></ul><input id="suEtiqueta" type="text" maxlength="30" autocomplete="off" enterkeyhint="done" placeholder="Por ejemplo: Parcial 1" aria-describedby="suEtiquetaAyuda suEtiquetaError"></div><p class="c-ayuda" id="suEtiquetaAyuda">Escribí una y tocá Enter, hasta 8. Sirven para encontrarlo en el banco.</p>${errorDe('suEtiqueta')}<p id="suEtiquetaVoz" class="vh" role="status"></p></div>
<div class="ba-campo"><label class="ba-casilla"><input id="suAcepto" type="checkbox" aria-describedby="suAceptoError"><span>Es mío o tengo permiso para compartirlo, y no trae datos de otras personas.</span></label>${errorDe('suAcepto')}</div>
<button type="submit" id="suEnviar" class="b-pri su-enviar">Subir resumen</button>
<p id="suSalida" class="es-estado ba-salida" role="status" tabindex="-1" hidden></p>
</form>
<aside class="su-lado" aria-labelledby="suQue"><h2 id="suQue">Qué entra</h2>
<ul><li>PDF, Word .docx y PowerPoint .pptx hasta 15 MB.</li><li>HTML hasta 5 MB. Se muestra limpio, sin scripts, salvo que revisemos los suyos y los dejemos andar.</li><li>Un enlace de Google Docs o Google Slides que pueda ver cualquiera.</li></ul>
<h2>Qué no entra</h2>
<ul><li>Archivos con macros, partes que se ejecutan solas o que cargan algo de afuera.</li><li>Datos de otras personas.</li><li>Material que no es tuyo y no tenés permiso para compartir.</li></ul>
<p class="s-fuente"><a href="privacidad.html">Qué se guarda cuando subís algo</a></p>
</aside>
</div>
<p class="su-volver"><a href="banco.html">Volver al banco</a> <a href="mis-resumenes.html">Mis resúmenes</a></p>`;

  // What this account uploaded, with its state, and from there edit it or upload a new version (mis.js).
  const misHtml = `<div class="ba-cabeza"><p class="bajada">Lo que subiste al banco y en qué está cada uno.</p><a class="b-pri ba-ir" href="subir.html">Subir un resumen</a></div>
<p id="baSin" class="c-ayuda">El banco todavía no está disponible.</p>
<div id="baTodo" hidden>
<template id="baOpciones"><select id="baMateria">${opcionesMateria}</select><select id="baInstancia">${opcionesInstancia}</select></template>
<div id="miIngresar" class="mi-ingresar" hidden><p>Ingresá con tu cuenta para ver lo que subiste.</p><button type="button" class="b-pri" id="miIngresarB">Ingresar</button></div>
<p id="miNoEsta" class="c-ayuda" hidden>Mis resúmenes todavía no está disponible.</p>
<div id="miFalla" class="ba-falla" role="alert" hidden><p id="miFallaTexto"></p><button type="button" id="miReintentar" class="b-sec">Probar de nuevo</button></div>
<p id="miCuenta" class="ba-cuenta" role="status"></p>
<h2 class="vh">Tus resúmenes</h2>
<ul id="miLista" class="mi-lista"></ul>
<div id="miVacio" class="mi-vacio" hidden><p>Todavía no subiste ningún resumen.</p><a class="b-pri" href="subir.html">Subir el primero</a></div>
</div>
<p class="su-volver"><a href="banco.html">Volver al banco</a></p>`;


  const consejosHtml = `<p class="bajada">Lo que aprendieron quienes ya cursaron, para toda la carrera y para cada materia. Elegí una materia para ver cómo encararla y qué resúmenes les sirvieron. Ningún docente lo revisó.</p>
<p id="coSin" class="c-ayuda">Los consejos todavía no están disponibles.</p>
<div id="coTodo" hidden>
<div class="ba-filtros"><div class="ba-campo"><label for="coMateria">Materia</label><select id="coMateria"><option value="">Ninguna, consejos generales</option>${opcionesMateria}</select></div></div>
<p id="coCuenta" class="ba-cuenta" role="status"></p>
<div id="coFalla" class="ba-falla" role="alert" hidden><p id="coFallaTexto"></p><button type="button" id="coReintentar" class="b-sec">Probar de nuevo</button></div>
<ul id="coLista" class="co-lista"></ul>
<p id="coVacio" class="c-ayuda" hidden></p>
<section class="co-escribir" id="coEscribir" aria-labelledby="coEscribirTitulo" hidden><h2 id="coEscribirTitulo">Dejá tu consejo</h2>
<p data-co-modo="materia">Uno por materia. Hace falta una cuenta. Acá no se sube nada. Para compartir un resumen, <a href="subir.html" data-con-materia>subilo al banco</a>.</p>
<p data-co-modo="general">Uno por cuenta, aparte del que dejes en cada materia. Si habla de una materia en particular, elegila arriba. Hace falta una cuenta.</p>
<form id="coForm" novalidate>
<div class="ba-campo"><label for="coTexto">Tu consejo</label><textarea id="coTexto" rows="5" maxlength="1500" aria-describedby="coTextoAyuda coTextoError"></textarea><small id="coTextoAyuda" class="ba-ayuda">De 10 a 1500 caracteres. Sin datos de otras personas.</small>${errorDe('coTexto')}</div>
<fieldset class="co-marcar" id="coSirvio"><legend>Qué te sirvió, si querés marcarlo</legend><p class="ba-ayuda">Hasta 3 páginas de la materia y hasta 3 resúmenes del banco.</p><div id="coOpciones"></div></fieldset>
<button type="submit" id="coEnviar" class="b-pri">Publicar consejo</button>
</form>
<p id="coSalida" class="es-estado ba-salida" role="status" tabindex="-1" hidden></p></section>
</div>`;

  // Notas del parche: what changed for the student, newest first, from secciones/novedades.json. Each published change a
  // student would notice adds a line there, in their words. The kind goes in the margin, like a note in pen.
  const TIPOS_NOVEDAD = { nuevo: 'Nuevo', mejora: 'Mejora', arreglo: 'Arreglo' };
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const fechaLarga = (iso) => {
    const [a, m, d] = iso.split('-').map(Number);
    return `${d} de ${MESES[m - 1]} de ${a}`;
  };
  const novedades = dato('novedades');
  for (const n of novedades) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(n.fecha) || !n.cambios.length) throw new Error(`secciones/novedades.json: fecha o cambios mal en ${n.fecha}`);
    for (const [tipo] of n.cambios) if (!TIPOS_NOVEDAD[tipo]) throw new Error(`secciones/novedades.json: tipo desconocido ${tipo}`);
  }
  const novedadesHtml = `<p class="bajada">Lo que cambió en El Santo Resumen, de lo más nuevo a lo más viejo.</p>
${icono('curita', 'pg-dibujo')}
${novedades.map((n) => `<section class="s-bloque nv-fecha" aria-labelledby="nv${n.fecha}"><h2 id="nv${n.fecha}"><time datetime="${n.fecha}">${fechaLarga(n.fecha)}</time></h2>
<ul class="nv-lista">${n.cambios.map(([tipo, texto]) => `<li><span class="nv-tipo nv-${tipo}">${TIPOS_NOVEDAD[tipo]}<span class="vh">:</span></span> <span>${esc(texto)}</span></li>`).join('')}</ul></section>`).join('\n')}`;

  // What is stored. Keep it in step with docs/ESPEC-SERVICIO.md.
  // Each part has its id for the index that sits on the left on wide screens.
  const PARTES_PRIVACIDAD = [['pvCuenta', 'Tu cuenta'], ['pvDatos', 'Qué se guarda y para qué'], ['pvPlazos', 'Cuánto tiempo'], ['pvQuien', 'Quién lo guarda'], ['pvBorrar', 'Cómo borrar tu cuenta o sacar algo']];
  const parte = (i, clase = '') => `<section class="s-bloque pv-parte${clase}" id="${PARTES_PRIVACIDAD[i][0]}" aria-labelledby="${PARTES_PRIVACIDAD[i][0]}T"><h2 id="${PARTES_PRIVACIDAD[i][0]}T">${PARTES_PRIVACIDAD[i][1]}</h2>`;
  const privacidadHtml = `<p class="bajada">Qué se guarda, para qué y cómo pedir que lo saquemos. <span class="pv-fecha">Actualizada el 8/11/2026.</span></p>
${icono('candado', 'pg-dibujo')}
<div class="pv-marco">
<nav class="pv-indice" aria-label="Partes de esta página"><ul>${PARTES_PRIVACIDAD.map(([id, t]) => `<li><a href="#${id}">${t}</a></li>`).join('')}</ul></nav>
<div class="pv-texto">
${parte(0)}
<p>Sin cuenta podés leer, bajar resúmenes y ver los votos y los me gusta. Para votar, marcar que te gusta un resumen, comentar, aconsejar, denunciar y subir hace falta una.</p>
<p>Se crea con usuario y contraseña, sin mail. La contraseña la guarda Supabase cifrada y nadie puede leerla. Como no hay mail, no hay forma de recuperarla.</p></section>
${parte(1)}
<ul class="pv-datos">
<li><b>Usuario y contraseña.</b> Para ingresar. Tu usuario se ve al lado de lo que publicás.</li>
<li><b>Votos, me gusta, comentarios, consejos y denuncias.</b> Quedan atados a tu cuenta, para que cada cuenta vote o marque que le gusta una sola vez y puedas borrar lo tuyo. También los votos y comentarios sobre las propuestas de respuesta.</li>
<li><b>Reportes de errores.</b> Lo que escribís, en qué parte del resumen y qué cuenta lo mandó, para poder corregirlo. Si te respondemos, la respuesta queda con el reporte y la ves con tu cuenta.</li>
<li><b>Tu progreso, si tenés cuenta.</b> El mapa de la carrera, lo que marcaste como hecho, las preguntas que erraste, tus simulacros, tus señaladores, tus cambios a los resúmenes y el resumen que estás armando. Se guarda en tu cuenta para que lo veas en cualquier dispositivo. No se publica ni se muestra a nadie.</li>
<li><b>Lo que trae Sysacad Lindo, si lo vinculás.</b> Qué materias aprobaste y cuáles tenés regulares, sin notas. La extensión lo pasa dentro de tu navegador. Queda ahí y, si tenés cuenta, viaja con tu progreso.</li>
<li><b>Lo que mandás a Super CVG.</b> La lista de resúmenes del banco que mandaste. Si vinculás tu cuenta, Super CVG ve esa lista y los resúmenes que subiste, y nada más. Para vincular se usa un código de un solo uso. Super CVG recibe una llave que solo sirve para ver esas listas, sacar algo de lo que mandaste y desvincular. El código y la llave se guardan cifrados. De la llave se anota la última vez que se usó, que ves en Tu cuenta.</li>
<li><b>Resúmenes que subís.</b> El archivo, su título, sus etiquetas, la materia, la instancia y qué cuenta lo subió. De un HTML, un Word o un PowerPoint se guarda además su texto, para moderarlo, para buscar dentro del banco y para mostrar cómo empieza. De un PDF se guarda el texto de sus dos primeras páginas, para buscar y para mostrar cómo empieza. De un enlace de Google se guarda solo qué documento es. Ese documento sigue en Google y su dueño lo puede cambiar.</li>
<li><b>Revisión de lo subido.</b> Cada archivo se revisa al subirlo y se rechaza si trae macros, partes que se ejecutan solas o enlaces que cargan algo de afuera. El HTML se muestra limpio, sin scripts, y aislado del resto del sitio. Si trae scripts, se guarda también tal cual llegó. Esos scripts corren solo si los revisamos y los dejamos andar, en otra dirección, sin conexión y sin acceso a tu cuenta.</li>
<li><b>Lo que buscás en el banco.</b> Se usa para responder y no se guarda en ningún lado.</li>
<li><b>Un hash de tu IP.</b> Nunca la IP. Sirve solo para el tope de cuentas nuevas por día y para frenar abusos.</li>
<li><b>Contadores de visitas.</b> Cuántos equipos vieron cada página y cuántas veces se bajó Sysacad Lindo, sumado por día, sin IP, sin cookies y sin identificar a nadie. Cada equipo cuenta una sola vez por página y por día. Para eso tu navegador anota qué páginas viste hoy y lo borra al día siguiente. Si tu navegador tiene prendido Global Privacy Control, no se cuenta nada. De cada resumen se cuenta cuántas veces se leyó y cuántas se bajó, sin saber quién.</li>
<li><b>Lo que queda en tu navegador.</b> Tu sesión, el tema, los ajustes de accesibilidad y las materias que guardás para leer sin internet, que no se guardan en ningún servidor. Sin cuenta, también tu progreso y el resumen que estás armando. Si compartís por link un resumen armado, el resumen va dentro del link y no llega a este sitio. También queda una copia de las estrellas y los niveles de las materias, que se renueva cada 10 minutos.</li>
</ul></section>
${parte(2)}
<ul class="pv-plazos">
<li>La cuenta, sus votos, sus me gusta, sus comentarios y tu progreso guardado, hasta que borres la cuenta. Se borran con ella.</li>
<li>Al salir de tu cuenta, tu progreso se borra de ese navegador y sigue en la cuenta.</li>
<li>Lo que mandaste a Super CVG queda hasta que lo saques, y el vínculo hasta que lo desvincules. El código, la llave y la lista se borran con la cuenta.</li>
<li>Los resúmenes que nadie aprobó se borran a los 60 días.</li>
<li>Los resúmenes publicados quedan hasta que pidas sacarlos. Si borrás la cuenta, siguen con autor anónimo.</li>
<li>Los reportes de errores ya resueltos o descartados, con su respuesta, se borran a los 180 días. Si borrás la cuenta, tus reportes quedan sin tu nombre. Tus denuncias se borran, salvo las de algo que ya se ocultó, que quedan sin decir quién las hizo.</li>
<li>El hash de la IP se borra a los 30 días.</li>
<li>Los contadores se guardan sumados por día y no tienen datos de nadie.</li>
</ul></section>
${parte(3)}
<p>Supabase, en sus servidores de San Pablo, Brasil, con Cloudflare adelante como filtro de red. El sitio está en GitHub Pages y las tipografías vienen de Google Fonts. Esos servicios ven tu conexión al cargar la página, como en cualquier web.</p></section>
${parte(4, ' pv-borrar pg-caja')}
<p>Ingresá en la entrada o en el banco, tocá tu usuario arriba y elegí «Borrar mi cuenta». Te pide la contraseña y no se puede deshacer.</p>
<p>Tus comentarios los borrás uno por uno desde cada resumen, y tus consejos desde la página de consejos, el general y el de cada materia. Para sacar un resumen o cualquier otra cosa, escribinos a <a href="mailto:info@lutastudios.com">info@lutastudios.com</a>.</p></section>
</div>
</div>`;

  const tamZip = Math.round(fs.statSync(path.join(aqui, 'secciones', 'sysacad-lindo', SYSACAD.zip)).size / 1024);
  // The download goes at the top and again next to the steps, where it is needed.
  const flechaBajar = '<svg class="sy-i" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M24 6v26"/><path d="M15 23l9 9 9-9"/><path d="M7 30v11h34V30"/></svg>';
  const bajar = (clase) => `<p class="sy-bajar"><a class="${clase}" href="_/sysacad/${SYSACAD.zip}" download data-uso="sysacad-bajado">${flechaBajar}Bajar Sysacad Lindo ${SYSACAD.version}</a> <span class="s-nota">Archivo ZIP, ${tamZip} KB</span></p>`;
  const sysacadHtml = `<p class="bajada">Una extensión para Chrome o Edge que ordena Sysacad. Tu carrera por año, las correlativas en un mapa, modo oscuro y filtros. No guarda tu contraseña ni manda nada a ningún lado.</p>
${bajar('b-pri')}
<div class="ojo sy-aviso" role="note"><p class="ojo-t">Las inscripciones todavía no están probadas</p><p>Alumnado tiene cerradas las inscripciones, así que no pudimos probar esa parte de la extensión. Si al inscribirte algo no anda, desactivala en <code>chrome://extensions</code> o <code>edge://extensions</code> y usá Sysacad como siempre.</p></div>
<div class="sy-heroe" aria-hidden="true"><span class="sy-pegada sy-atras"><img src="_/sysacad/estado-oscuro.webp" width="1100" height="1480" decoding="async" alt=""></span><span class="sy-pegada sy-frente"><img src="_/sysacad/mapa.webp" width="1040" height="865" fetchpriority="high" decoding="async" alt=""></span></div>
<section class="s-bloque sy-parte sy-santo" aria-labelledby="sySanto"><div class="sy-ver-cabeza"><h2 id="sySanto">Tu mapa de materias, pintado solo</h2>
<p class="pg-nota">Nuevo en la 2.2.0.</p></div>
<div class="sy-santo-texto"><p>Vinculá Sysacad Lindo con El Santo Resumen y tus aprobadas se pintan de verde y tus regulares de amarillo en el <a href="materias.html">mapa de materias</a>. Además te marca qué materias ya podés cursar.</p>
<p>Se actualiza cada vez que entrás a Estado académico. Solo pasan los nombres de las materias y su estado, sin notas, y nada sale de tu navegador.</p>
<p class="pg-nota">Se vincula con un toque desde Sysacad y se apaga cuando quieras en Ajustes.</p></div>
<ul class="sy-capturas" role="list">${VINCULO_SYSACAD.map(([n, w, h, pie, alt]) => `<li><figure><a class="sy-foto" href="_/sysacad/${n}.webp"><img src="_/sysacad/${n}.webp" width="${w}" height="${h}" loading="lazy" decoding="async" alt="${esc(alt)}"></a><figcaption>${esc(pie)}</figcaption></figure></li>`).join('')}</ul></section>
<section class="s-bloque sy-parte sy-santo" aria-labelledby="syCvg"><div class="sy-ver-cabeza"><h2 id="syCvg">Tus finales y tus pestañas, en Super CVG</h2>
<p class="pg-nota">Las pestañas, nuevo en la 2.4.0.</p></div>
<div class="sy-santo-texto"><p>Vinculá Sysacad Lindo con <a href="https://supercvg.lutastudios.com/">Super CVG</a>. La nota final de cada materia aprobada aparece en Notas, donde la cátedra no cargó nada en el campus.</p>
<p>Cada pestaña de Sysacad que abrís queda guardada: Estado académico, parciales, exámenes, plan, correlativas y certificados. En la pantalla Sysacad de Super CVG ves la última copia, aunque Sysacad no ande.</p>
<p>Pasan solo textos y tablas, de la extensión a Super CVG dentro de tu navegador. Ningún servidor en el medio.</p>
<p class="pg-nota">Se vincula desde Sysacad o desde Notas en Super CVG. En Ajustes apagás el vínculo o solo las pestañas.</p></div>
<ul class="sy-capturas" role="list">${VINCULO_CVG.map(([n, w, h, pie, alt]) => `<li><figure><a class="sy-foto" href="_/sysacad/${n}.webp"><img src="_/sysacad/${n}.webp" width="${w}" height="${h}" loading="lazy" decoding="async" alt="${esc(alt)}"></a><figcaption>${esc(pie)}</figcaption></figure></li>`).join('')}</ul></section>
<section class="s-bloque sy-parte sy-instalar" aria-labelledby="syInstalar"><div class="sy-instalar-lado"><h2 id="syInstalar">Cómo se instala</h2>
${bajar('b-sec')}</div>
<ol class="sy-pasos" role="list">
<li>Descomprimí el archivo. Te queda una carpeta llamada <code>sysacad-lindo</code>.</li>
<li>Abrí <code>chrome://extensions</code> en Chrome o <code>edge://extensions</code> en Edge. Copialo en la barra de direcciones.</li>
<li>Prendé el «Modo de desarrollador».</li>
<li>Tocá «Cargar descomprimida» y elegí la carpeta <code>sysacad-lindo</code>.</li>
<li>Entrá a Sysacad como siempre. La extensión anda en <code>alumnos.frro.utn.edu.ar</code> y, si la vinculás, también le pasa a El Santo Resumen tus aprobadas y regulares.</li>
</ol>
<p class="pg-nota">Para pasar a una versión nueva, bajala, reemplazá la carpeta y tocá el botón de recargar de la extensión en la misma página.</p></section>
<section class="s-bloque sy-parte" aria-labelledby="syHace"><h2 id="syHace">Qué hace</h2>
<ul class="sy-lista" role="list">
<li><b>Estado académico por año</b>, con tu promedio y cuánto te falta.</li>
<li><b>Correlativas por año</b>, con «Lo que más te frena» arriba.</li>
<li><b>«¿Y si la saco?»</b> Tocás una materia y te muestra qué podrías cursar si la aprobás.</li>
<li><b>Mapa de correlativas</b> de toda la carrera.</li>
<li><b>Certificados</b>, cada uno en una tarjeta, con el aviso de Sysacad al lado.</li>
<li><b>Vínculo con El Santo Resumen.</b> Si querés, tus aprobadas y regulares se pintan solas en su <a href="materias.html">mapa de materias</a>. Pasa en tu navegador, y solo va qué materias, sin notas.</li>
<li><b>Filtros y buscador</b> en las tablas largas.</li>
<li><b>Modo oscuro</b>, tres vistas y tamaño de letra.</li>
<li><b>Modo para daltonismo</b> y alto contraste.</li>
</ul>
<p class="pg-nota">Trae frases de fondo con humor de pasillo, alguna con una mala palabra. Se apagan desde Ajustes.</p></section>
<section class="s-bloque sy-parte sy-priv pg-caja" aria-labelledby="syPriv">${icono('candado', 'sy-priv-i')}<div><h2 id="syPriv">Tu privacidad</h2>
<p>Usa solo el almacenamiento de tu navegador, para tus ajustes. No lee ni guarda contraseñas, no manda nada a ningún servidor y no envía formularios por su cuenta. Todo lo hacés vos.</p>
<p>No es de la UTN ni de Sysacad. Si Sysacad cambia, puede dejar de andar hasta la próxima versión.</p></div></section>
<section class="s-bloque sy-parte sy-ver" aria-labelledby="syVer"><div class="sy-ver-cabeza"><h2 id="syVer">Cómo se ve</h2>
<p class="pg-nota">Las capturas tienen datos inventados.</p></div>
<ul class="sy-capturas" role="list">${CAPTURAS_SYSACAD.map(([n, w, h, pie, alt]) => `<li><figure><a class="sy-foto" href="_/sysacad/${n}.webp"><img src="_/sysacad/${n}.webp" width="${w}" height="${h}" loading="lazy" decoding="async" alt="${esc(alt)}"></a><figcaption>${esc(pie)}</figcaption></figure></li>`).join('')}</ul></section>`;

  // The kinds of part «Armá tu resumen» adds, each with its pen drawing (crear.js reads them by id).
  const CR_TIPOS = [
    ['crTitulo2', 'Título', 'Sumar un título', '<path d="M5 5.5h14M12 5.5V19M9.5 19h5"/>'],
    ['crTexto', 'Texto', 'Sumar texto', '<path d="M4 6.5h16M4 11h16M4 15.5h16M4 20h9"/>'],
    ['crNota', 'Recuadro', 'Sumar un recuadro', '<rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/><path d="M7.5 4.5v15M11 9.5h6M11 14h4"/>'],
    ['crFormula', 'Fórmula', 'Sumar una fórmula', '<path d="M3 13.5h2.8l2.7 5.5L13 5h8M14.5 10.5l5 6M19.5 10.5l-5 6"/>'],
    ['crFoto', 'Foto', 'Sumar una foto', '<rect x="3" y="5" width="18" height="14" rx="1.5"/><circle cx="8.5" cy="10" r="1.7"/><path d="M3.5 17.5l5.5-5 3.5 3 3-2.5 5 4.5"/>'],
    ['crGrafico', 'Gráfico', 'Sumar un gráfico o un simulador', '<path d="M4 3.5v16.5h16.5"/><path d="M6.5 16.5c2.5-.5 3.5-9 7-9 2.6 0 3 4.5 6 4.5"/>'],
  ];
  const crearHtml = `<p class="bajada">Armá tu resumen con texto, recuadros, fórmulas, fotos y los gráficos y simuladores de la materia. Se guarda solo en este navegador hasta que lo bajes, lo compartas o lo lleves al banco.</p>
<div id="crTodo" class="cr-marco">
<aside class="cr-lado" aria-label="Herramientas del resumen">
<div class="cr-sumar" role="group" aria-labelledby="crSumarT"><p class="cr-lado-t" id="crSumarT">Sumar</p><div class="cr-sumar-b">${CR_TIPOS.map(([id, texto, etiqueta, trazo]) => `<button type="button" class="b-sec cr-tipo" id="${id}" aria-label="${etiqueta}"><svg class="cr-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${trazo}</svg><span>${texto}</span></button>`).join('')}</div>
<p class="cr-donde" id="crDonde">Se suma al final.</p>
<p class="cr-pista">Clic derecho sobre una parte para más opciones.</p>
<div class="cr-aviso"><p id="crSalida" class="es-estado ba-salida vh" role="status" tabindex="-1"></p><button type="button" class="b-sec b-chico" id="crDeshacer" aria-keyshortcuts="Control+Z" hidden>Deshacer</button></div></div>
<nav class="cr-indice" aria-labelledby="crIndiceT" hidden><p class="cr-lado-t" id="crIndiceT">En tu resumen</p><ol id="crIndice"></ol></nav>
<div class="cr-fin"><button type="button" class="b-pri" id="crSubir">Llevarlo al banco</button><button type="button" class="b-sec" id="crBajar">Bajar el archivo</button><button type="button" class="b-sec" id="crLink">Compartir por link</button><button type="button" class="b-peligro" id="crBorrar">Empezar de cero</button></div>
</aside>
<div class="cr-centro">
<div class="cr-cabeza">
<div class="ba-doble">
<div class="ba-campo"><label for="crMateria">Materia</label><select id="crMateria"><option value="">Elegí la materia</option>${opcionesMateria}</select></div>
<div class="ba-campo"><label for="crTitulo">Título</label><input id="crTitulo" type="text" maxlength="120" autocomplete="off" placeholder="Por ejemplo: Integrales dobles con ejemplos"></div>
</div>
<div class="ba-campo cr-etiquetas"><label for="crEtiqueta">Etiquetas</label><div class="cr-chips"><ul id="crChips" class="cr-chips-l" role="list" aria-label="Etiquetas puestas" hidden></ul><input id="crEtiqueta" type="text" maxlength="30" autocomplete="off" enterkeyhint="done" placeholder="Por ejemplo: Parcial 1" aria-describedby="crEtiquetaAyuda"><button type="button" class="b-pri b-chico cr-chips-sumar" id="crEtiquetaSumar" tabindex="-1" hidden>Sumar</button></div><p class="c-ayuda" id="crEtiquetaAyuda">Escribí una y tocá Enter. Hasta 8.</p></div>
<fieldset class="cr-colores" aria-describedby="crColoresAyuda"><legend>Colores</legend><label class="cr-color"><input type="color" id="crFondo" value="#e7ecf3"> Fondo</label><label class="cr-color"><input type="color" id="crHojaColor" value="#ffffff"> Hoja</label><button type="button" class="b-texto" id="crColoresSacar" hidden>Volver a los de siempre</button><p class="c-ayuda" id="crColoresAyuda">Van con el resumen cuando lo bajás, lo compartís o lo llevás al banco.</p></fieldset>
</div>
<div id="crMesa" class="cr-mesa">
<div id="crHoja" class="cr-hoja" role="region" aria-label="Tu resumen"></div>
<p id="crVacio" class="c-ayuda cr-vacio-t">Tu hoja está en blanco. Empezá con un título o un texto desde «Sumar».</p>
</div>
</div>
</div>
<p class="su-volver"><a href="subir.html">Volver a Subir un resumen</a></p>`;

  const textos = {
    'plan.html': ['Correlativas de cada materia de Ingeniería en Sistemas.', planHtml],
    'mesas.html': ['Día y hora de las mesas de examen de cada materia.', mesasHtml],
    'docentes.html': ['Mails de docentes de Sistemas y de Básicas.', docentesHtml],
    'agradecimientos.html': ['Quienes compartieron el material de este sitio.', graciasHtml],
    'banco.html': ['Resúmenes que subieron otros alumnos, en PDF, Word, PowerPoint, HTML o Google.', bancoHtml],
    'consejos.html': ['Consejos de quienes ya cursaron, para toda la carrera y para cada materia.', consejosHtml],
    'subir.html': ['Subí tu resumen al banco.', subirHtml],
    'mis-resumenes.html': ['Los resúmenes que subiste al banco y en qué está cada uno.', misHtml],
    'crear.html': ['Armá un resumen con texto, fórmulas, fotos y gráficos de la materia, para bajarlo, compartirlo o subirlo al banco.', crearHtml],
    'privacidad.html': ['Qué se guarda en este sitio, para qué y por cuánto tiempo.', privacidadHtml],
    'sysacad-lindo.html': ['Extensión para Chrome o Edge que ordena Sysacad por año, con mapa de correlativas y modo oscuro.', sysacadHtml],
    'novedades.html': ['Qué cambió en El Santo Resumen, fecha por fecha.', novedadesHtml],
  };
  for (const s of [...SECCIONES, ...APARTE]) fs.writeFileSync(path.join(salida, s.archivo), pagina(s, ...textos[s.archivo]));
  fs.cpSync(path.join(aqui, 'secciones', 'sysacad-lindo'), path.join(salida, '_', 'sysacad'), { recursive: true });
  fs.copyFileSync(path.join(aqui, 'plantilla', 'secciones.js'), path.join(salida, '_', 'secciones.js'));
  fs.copyFileSync(path.join(aqui, 'plantilla', 'paginas.css'), path.join(salida, '_', 'paginas.css'));
};
