// Builds the static study pages of one subject: source Markdown and JSON in, plain HTML out.
// Output has no inline scripts or event attributes, so it passes the site's CSP check.
//   node construir.mjs <fuente/materia> <salida>
import { CAMBIO_RAPIDO, NIVELES, PASADA, TIPOS_CON_NIVEL, esRapida, leerNiveles, leerPasadas, nivelDe } from './niveles.mjs';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';
import katex from 'katex';
import hljs from 'highlight.js';
import { bloqueWidget, NOMBRES_BLOQUES, nombresDeInteractivos, prepararInteractivos, validarCreador } from './widgets.mjs';
import { pieConAviso } from './aviso.mjs';
import { SIN_VERIFICAR, SIN_VERIFICAR_FIN, banda, botonCuenta, botonesEmergencia, copiarServicio, scriptsServicio } from './servicio.mjs';
import { botonMenu, menu } from './sitio.mjs';
import { icono } from './iconos.mjs';

const [fuente, salida] = process.argv.slice(2);
const aqui = path.dirname(fileURLToPath(import.meta.url));
// Exam mode's pure part: the time offered first for each exam.
const EXAMEN = createRequire(import.meta.url)('./plantilla/examen.js');
const leer = (f) => fs.readFileSync(path.join(fuente, f), 'utf8');
const materia = JSON.parse(leer('materia.json'));
const opcional = (f) => (fs.existsSync(path.join(fuente, f)) ? JSON.parse(leer(f)) : []);
const preguntas = opcional('preguntas.json');
const tarjetas = opcional('tarjetas.json');
const ejercicios = fs.existsSync(path.join(fuente, 'ejercicios.json')) ? JSON.parse(leer('ejercicios.json')) : [];

// Exams up to 2022 belong to the old study plan. A subject can say its content did not change.
const valeViejo = materia.planViejo?.vale === true;
const anioDe = (s) => {
  const t = String(s || '').replace(/plan\s+\d{4}/gi, ' ');
  const anios = [...t.matchAll(/\b(?:19|20)\d{2}\b/g)].map((m) => +m[0]);
  for (const m of t.matchAll(/\b\d{1,2}\/\d{1,2}\/(\d{2})\b/g)) anios.push(2000 + +m[1]);
  return anios.length ? Math.max(...anios) : null;
};
const esViejo = (s) => {
  const a = anioDe(s);
  return a !== null && a <= 2022;
};
const marcaViejo = (s) => (!valeViejo && esViejo(s) ? ' <em class="viejo">Plan viejo</em>' : '');
const planDe = (e) => {
  if (e.plan === 'nuevo') return 'nuevo';
  if (e.plan === 'viejo' || esViejo(e.fecha)) return 'viejo';
  return e.fecha ? 'nuevo' : 'sin-fecha';
};
const AVISO_VIEJO = valeViejo
  ? '<p class="aviso-viejo">Los exámenes de 2022 o antes son del plan anterior. En esta materia el contenido es el mismo, así que siguen sirviendo.</p>'
  : '<p class="aviso-viejo">Lo marcado «Plan viejo» es de 2022 o antes, del plan anterior. Puede no coincidir con lo que se toma hoy.</p>';
const conNivel = (html, extra) => (/<p class="bajada">[\s\S]*?<\/p>/.test(html) ? html.replace(/<p class="bajada">[\s\S]*?<\/p>/, (m) => m + extra) : extra + html);
const AVISO_ALUMNOS = '<p class="aviso-viejo">Esta materia no tiene apuntes de la cátedra en el Drive. Lo que sigue sale de trabajos y resúmenes de alumnos. Usalo de guía y confirmalo con la cátedra.</p>';
const conAvisoAlumnos = (html) => (/<p class="bajada">[\s\S]*?<\/p>/.test(html) ? html.replace(/<p class="bajada">[\s\S]*?<\/p>/, (m) => m + AVISO_ALUMNOS) : AVISO_ALUMNOS + html);
const conAviso = (html) => (/<p class="bajada">[\s\S]*?<\/p>/.test(html) ? html.replace(/<p class="bajada">[\s\S]*?<\/p>/, (m) => m + AVISO_VIEJO) : AVISO_VIEJO + html);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/<span class="katex-mathml">[\s\S]*?<\/math><\/span>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const md = new Marked({
  gfm: true,
  renderer: {
    code({ text, lang }) {
      const idioma = (lang || '').trim();
      const h = idioma && hljs.getLanguage(idioma) ? hljs.highlight(text, { language: idioma }).value : esc(text);
      return `<pre class="codigo"><code>${h}</code></pre>\n`;
    },
    table(t) {
      const celda = (c, tag) => `<${tag}>${this.parser.parseInline(c.tokens)}</${tag}>`;
      // An empty corner is not a header: as a th, a screen reader would announce a column with no name.
      const cab = `<tr>${t.header.map((c) => celda(c, c.tokens.length ? 'th' : 'td')).join('')}</tr>`;
      const filas = t.rows.map((f) => `<tr>${f.map((c) => celda(c, 'td')).join('')}</tr>`).join('');
      return `<div class="tabla"><table><thead>${cab}</thead><tbody>${filas}</tbody></table></div>\n`;
    },
  },
  extensions: [
    {
      name: 'resaltado',
      level: 'inline',
      start: (s) => s.indexOf('=='),
      tokenizer(src) {
        const m = /^==(?=\S)([^\n]*?\S)==/.exec(src);
        if (m) return { type: 'resaltado', raw: m[0], tokens: this.lexer.inlineTokens(m[1]) };
        return undefined;
      },
      renderer(t) {
        return `<mark>${this.parser.parseInline(t.tokens)}</mark>`;
      },
    },
  ],
});

// KaTeX's drawing is hidden from screen readers; its MathML copy is what they read, so every formula has a name, also
// inside a quiz option or a link. In that copy, the characters Markdown reads as syntax (| * _ [ ] and the rest) go as
// entities: they stay text and never cut a table cell or open an emphasis. Ids and the search index leave it out.
const MATHML = /<span class="katex-mathml">[\s\S]*?<\/math><\/span>/g;
const sinMathml = (html) => html.replace(MATHML, '');
const conMathml = (html) => html.replace(MATHML, (m) => m.replace(/>([^<]+)</g, (_, t) => `>${t.replace(/[\\`*_~[\]|=$!]/g, (c) => `&#${c.charCodeAt(0)};`)}<`));
const formula = (m, displayMode) => conMathml(katex.renderToString(m, { displayMode, throwOnError: true, output: 'htmlAndMathml' }));

// Math goes first so Markdown never touches it. Code fences and inline code stay untouched.
function conMate(texto) {
  const partes = texto.split(/(```[\s\S]*?```|`[^`\n]*`)/g);
  return partes
    .map((p, i) => {
      if (i % 2) return p;
      return p
        // KaTeX writes line breaks inside its SVG paths, and a line break would cut a table row in two.
        .replace(/\$\$([^$]+)\$\$/g, (_, m) => formula(m, true).replace(/\s*\n\s*/g, ' '))
        .replace(/(^|[^\\\w])\$([^$\n]+)\$/g, (_, a, m) => a + formula(m, false).replace(/\s*\n\s*/g, ' '));
    })
    .join('');
}
const render = (t) => md.parse(conMate(t));
const renderLinea = (t) => md.parseInline(conMate(t));

// :::name args ... ::: blocks, nestable. Lines inside code fences are ignored.
function bloques(texto) {
  const raiz = { nombre: null, args: '', lineas: [] };
  const pila = [raiz];
  let enCodigo = false;
  for (const linea of texto.split(/\r?\n/)) {
    if (/^\s*```/.test(linea)) enCodigo = !enCodigo;
    const abre = !enCodigo && /^:::([a-z][a-z0-9]*)\s*(.*)$/.exec(linea);
    if (abre) {
      const nuevo = { nombre: abre[1], args: abre[2], lineas: [] };
      pila.at(-1).lineas.push(nuevo);
      pila.push(nuevo);
    } else if (!enCodigo && /^:::\s*$/.test(linea)) {
      if (pila.length === 1) throw new Error('::: sin abrir');
      pila.pop();
    } else pila.at(-1).lineas.push(linea);
  }
  if (pila.length !== 1) throw new Error(`Bloque sin cerrar: ${pila.at(-1).nombre}`);
  return hijos(raiz);
}

function hijos(nodo) {
  let html = '';
  let buffer = [];
  const volcar = () => {
    if (buffer.length) html += render(buffer.join('\n'));
    buffer = [];
  };
  for (let i = 0; i < nodo.lineas.length; i++) {
    const l = nodo.lineas[i];
    if (typeof l === 'string') {
      buffer.push(l);
      continue;
    }
    volcar();
    if (!tomadoVacio(l)) {
      html += bloque(l);
      continue;
    }
    // Empty «tomado» blocks in a row, with only blank lines between them, go out as one list.
    const tanda = [l];
    for (let k = i + 1; k < nodo.lineas.length; k++) {
      const x = nodo.lineas[k];
      if (typeof x === 'string' && !x.trim()) continue;
      if (!tomadoVacio(x)) break;
      tanda.push(x);
      i = k;
    }
    html += tomadosSueltos(tanda);
  }
  volcar();
  return html;
}

// A «:::tomado» with no body only says that a topic was asked. As margin notes they piled up on top of each other next
// to an empty stripe, so they go inside the text as a list.
const tomadoVacio = (n) => typeof n !== 'string' && n.nombre === 'tomado' && n.lineas.every((x) => typeof x === 'string' && !x.trim());
const tomadosSueltos = (tanda) => {
  const items = tanda.map((n) => {
    const [a, b] = n.args.split('|').map((s) => s.trim());
    return `<li><strong>${esc(a)}</strong>${b ? ` <span>${esc(b)}${marcaViejo(b)}</span>` : ''}</li>`;
  });
  return `<div class="tomado tomado-lista"><p class="tomado-t">${tanda.length === 1 ? 'Lo tomaron en un examen' : 'Lo tomaron en exámenes'}</p><ul>${items.join('')}</ul></div>\n`;
};

// Graphs of the page being built, for the catalog that edit mode and the summary maker offer (figuras.json).
let figurasEnCurso = null;
const figurasCatalogo = [];

function bloque(n) {
  if (NOMBRES_BLOQUES.includes(n.nombre)) {
    const html = bloqueWidget(n, { renderLinea, esc, interactivos: interactivosPropios });
    if (figurasEnCurso && (n.nombre === 'grafico' || n.nombre === 'grafico3d')) {
      const { desc, ...cfg } = JSON.parse(n.lineas.join('\n').trim());
      figurasEnCurso.push({ tipo: n.nombre, titulo: n.args.split('|')[0].trim(), desc, cfg });
    }
    return html;
  }
  const [a, b] = n.args.split('|').map((s) => s.trim());
  const cuerpo = () => hijos(n);
  switch (n.nombre) {
    case 'tomado':
      return `<div class="tomado"><aside class="nota"><strong>${esc(a)}</strong>${b ? `<span>${esc(b)}${marcaViejo(b)}</span>` : ''}</aside>${cuerpo()}</div>\n`;
    case 'ojo':
      return `<div class="ojo"><p class="ojo-t">${renderLinea(a || 'Ojo')}</p>${cuerpo()}</div>\n`;
    case 'teorema':
      return `<div class="teorema"><p class="teorema-t">${renderLinea(a)}</p>${cuerpo()}${b ? `<p class="bloque-fuente">${esc(b)}</p>` : ''}</div>\n`;
    case 'demostracion':
      return `<div class="demostracion"><p class="demostracion-t">Demostración</p>${cuerpo()}${a ? `<p class="bloque-fuente">${esc(a)}</p>` : ''}</div>\n`;
    case 'ejemplo':
      return `<div class="ejemplo"><p class="ejemplo-t">${renderLinea(a || 'Ejemplo')}</p>${cuerpo()}${b ? `<p class="bloque-fuente">${esc(b)}</p>` : ''}</div>\n`;
    case 'alumnos':
      return `<div class="alumnos"><p class="alumnos-t">Sale de apuntes de alumnos</p>${cuerpo()}${a ? `<p class="bloque-fuente">${esc(a)}</p>` : ''}</div>\n`;
    case 'criollo':
      return `<div class="criollo"><p class="criollo-t">En criollo</p>${cuerpo()}</div>\n`;
    case 'idea':
      return `<div class="idea">${cuerpo()}</div>\n`;
    case 'pregunta':
      return `<details class="pregunta"><summary><span>${renderLinea(a)}</span>${b ? `<small>${esc(b)}${marcaViejo(b)}</small>` : ''}</summary><div class="resp">${cuerpo()}</div></details>\n`;
    case 'ejercicio': {
      const crudo = n;
      const corte = crudo.lineas.findIndex((l) => l === '---solucion---');
      if (corte < 0) throw new Error(`Ejercicio sin solución: ${a}`);
      const enun = hijos({ lineas: crudo.lineas.slice(0, corte) });
      const sol = hijos({ lineas: crudo.lineas.slice(corte + 1) });
      return `<div class="ejercicio"><p class="ej-t">${renderLinea(a)}${b ? ` <small>${esc(b)}</small>` : ''}</p>${enun}<details class="sol"><summary>Ver la resolución del Drive</summary>${sol}</details></div>\n`;
    }
    default:
      throw new Error(`Bloque desconocido: ${n.nombre}`);
  }
}

// Wrap each h2 in a section, add ids and collect the table of contents.
function armar(html) {
  const usados = new Set();
  const toc = [];
  const conIds = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_, n, t) => {
    let id = slug(t) || 'seccion';
    while (usados.has(id)) id += '-2';
    usados.add(id);
    toc.push({ n: +n, t: sinMathml(t).replace(/<[^>]+>/g, ''), id });
    return `<h${n} id="${id}">${t}</h${n}>`;
  });
  const trozos = conIds.split(/(?=<h2 id=)/);
  return { html: trozos.map((t) => (t.startsWith('<h2') ? `<section class="sec">${t}</section>` : t)).join('\n'), toc };
}

const texto = (html) => html.replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(MATHML, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim();

// Stable across builds as long as the question keeps its wording.
const idPregunta = (q) => createHash('sha1').update(q.enunciado).digest('base64url').slice(0, 10);

function pregunta(q, i, pag) {
  const fuenteQ = q.origen ? `<p class="q-origen">Se tomó: ${esc(q.origen)}${marcaViejo(q.origen)}</p>` : '';
  const expl = `<div class="q-expl" tabindex="-1" hidden>${render(q.explicacion)}</div>`;
  const base = `class="q" data-q="${idPregunta(q)}" data-tema="${esc(q.tema)}" data-enlace="${esc(q.enlace || '')}" data-tipo="${q.tipo}"`;
  // The options are a group named by their statement. Unique per page: each list of questions has its own prefix.
  const idEnun = `qe-${pag}-${i + 1}`;
  const cab = `<div class="q-enun" id="${idEnun}"><span class="q-n">${i + 1}</span><div>${render(q.enunciado)}${fuenteQ}</div></div>`;
  if (q.tipo === 'abierta') {
    return `<li ${base}>${cab}<details class="q-abierta"><summary>Ver qué dice el material</summary><div>${render(q.explicacion)}</div><p class="q-auto">¿Cómo te fue? <button type="button" class="b-auto" aria-pressed="false" data-ok="1">La sabía</button> <button type="button" class="b-auto" aria-pressed="false" data-ok="0">Me faltó</button></p></details></li>`;
  }
  const ops = q.opciones
    .map((o, j) => `<li><button type="button" class="op" data-ok="${j === q.correcta ? 1 : 0}">${renderLinea(o)}</button></li>`)
    .join('');
  return `<li ${base}>${cab}<ul class="ops" role="group" aria-labelledby="${idEnun}">${ops}</ul>${expl}</li>`;
}

const BOTON_REPASO = '<p class="quiz-repaso"><button type="button" class="b-sec quiz-repasar" hidden></button></p>';
const quiz = (id, qs, titulo, bajada) => `<section class="sec quiz" id="quiz" data-quiz="${id}" data-materia="${materia.slug}">
<h2>${esc(titulo)}</h2>
<p class="quiz-baja">${esc(bajada)}</p>
${BOTON_REPASO}
<ol class="qs">${qs.map((q, i) => pregunta(q, i, id)).join('')}</ol>
<p class="quiz-fin" aria-live="polite"><span class="quiz-res">Todavía no respondiste ninguna.</span> <button type="button" class="b-sec quiz-reset">Empezar de nuevo</button></p>
</section>`;

// Every page of the subject is one level down, so the menu's links start with ../.
const MENU = menu({ base: '../' });

function layout({ pagina, titulo, cuerpo, toc, desc, em = 'fuera', reportable = false, examen = false, estudio = false }) {
  const conW = cuerpo.includes(' data-w="');
  const conInteractivos = hayInteractivos && cuerpo.includes(' data-w="interactivo"');
  const nav = `<li class="nav-todas"><a href="../materias.html">Todas las materias</a></li><li class="em-solo"><a href="emergencia.html"${pagina === 'emergencia' ? ' aria-current="page"' : ''}>Emergencia</a></li>${materia.paginas
    .map((p) => `<li class="em-fuera"><a href="${p.archivo}"${p.id === pagina ? ' aria-current="page"' : ''}>${esc(p.nombre)}</a></li>`)
    .join('')}<li class="em-fuera"><a href="../banco.html?materia=${materia.slug}">Banco de resúmenes</a></li><li class="em-fuera"><a href="../consejos.html?materia=${materia.slug}">Consejos</a></li><li class="nav-em">${botonesEmergencia('b-sec')}</li><li class="nav-em em-fuera">${botonCuenta('b-tema')}</li>`;
  const indice = toc.length
    ? `<nav class="toc" aria-label="En esta página"><p>En esta página</p><ul>${toc.map((t) => `<li class="n${t.n}${t.clase ? ` ${t.clase}` : ''}"><a href="#${t.id}">${esc(t.t)}</a></li>`).join('')}</ul></nav>`
    : '';
  return `<!doctype html>
<html lang="es" data-tema="noche"${em === 'ver' ? '' : ` data-em-${em}`}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(titulo)}: ${esc(materia.nombre)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=IBM+Plex+Mono:wght@400;500&family=Shantell+Sans:wght@400;600&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap">
<link rel="stylesheet" href="${materia.assets}/katex/katex.min.css">
<link rel="stylesheet" href="${materia.assets}/utn.css">
${conW ? `<link rel="stylesheet" href="${materia.assets}/w.css">
` : ''}<script src="${materia.assets}/tema.js"></script>
<script src="${materia.assets}/utn.js" defer></script>
<script src="${materia.assets}/piezas.js" defer></script>
<script src="${materia.assets}/editar.js" defer></script>
<script src="${materia.assets}/ajustes.js" defer></script>
<script src="${materia.assets}/menu.js" defer></script>
<script src="${materia.assets}/sin-internet.js" defer></script>
${estudio ? `<script src="${materia.assets}/voz.js" defer></script>
<script src="${materia.assets}/senaladores.js" defer></script>
` : ''}${examen ? `<script src="${materia.assets}/examen.js" defer></script>
` : ''}${conW ? `<script src="${materia.assets}/expr.js" defer></script>
<script src="${materia.assets}/w.js" defer></script>
` : ''}${conInteractivos ? `<script src="interactivos.js" defer></script>
` : ''}<script src="buscar.js" defer></script>
${scriptsServicio(materia.assets, ['cuenta', ...(cuerpo.includes('<figure') ? ['diagrama'] : []), ...(cuerpo.includes('data-estrellas-materia') ? ['estrellas'] : []), ...(cuerpo.includes('class="nivel" data-nivel') ? ['niveles'] : []), ...(reportable ? ['reportar'] : []), ...(cuerpo.includes('class="em-votos"') ? ['propuesta'] : [])])}
</head>
<body data-materia="${materia.slug}" data-pagina="${pagina}">
<a class="saltar" href="#contenido">Saltar al contenido</a>
${banda}
<header class="barra">
${botonMenu}
<a class="b-materia" href="index.html">${esc(materia.nombre)}</a>
<div class="b-buscar"><label class="vh" for="buscar">Buscar en la materia</label><input id="buscar" type="search" placeholder="Buscar en la materia" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="resultados" aria-expanded="false"><span id="resCuenta" class="vh" aria-live="polite"></span><ul id="resultados" class="resultados" role="listbox" aria-label="Resultados" hidden></ul></div>
<button type="button" id="soloTomado" class="b-solo" aria-pressed="false">Solo lo que se toma</button>
<button type="button" id="editar" class="b-tema" aria-pressed="false">Editar</button>
<button type="button" id="foco" class="b-tema">Pantalla completa</button>
<button type="button" id="accesibilidad" class="b-tema">Accesibilidad</button>
<button type="button" id="tema" class="b-tema">Modo día</button>
</header>
${MENU}
<div class="marco">
<aside class="lado">
<nav aria-label="Secciones de la materia"><ul class="nav">${nav}</ul></nav>
${indice}
</aside>
<main id="contenido" class="hoja${pagina === 'machete' ? ' machete' : ''}"${reportable ? ' data-reportable' : ''}>
${cuerpo}
</main>
</div>
${pieConAviso(esc(materia.pie), '../')}
</body>
</html>
`;
}

const tieneSol = (e) => Boolean(e.sol.length || e.conSol);
const entraEnEmergencia = (e) => valeViejo || planDe(e) === 'nuevo';

// Proposed answers: on the exercise page with the protocol on or off (Ignacio, 3/11), always marked as not verified,
// and never next to an official resolution. A «sin» note, why there is none, shows only with the protocol on.
function leerPropuestas() {
  const todas = fs.existsSync(path.join(fuente, 'propuestas.json')) ? JSON.parse(leer('propuestas.json')) : {};
  for (const [s, p] of Object.entries(todas)) {
    const e = ejercicios.find((x) => x.slug === s);
    if (!e) throw new Error(`propuestas.json: el ejercicio «${s}» no existe`);
    const conMd = typeof p?.md === 'string' && p.md.trim();
    const conSin = typeof p?.sin === 'string' && p.sin.trim();
    if (Boolean(conMd) === Boolean(conSin)) throw new Error(`propuestas.json: «${s}» tiene que traer «md» o «sin»`);
    if (conMd && tieneSol(e)) throw new Error(`propuestas.json: «${s}» ya tiene resolución oficial y no puede tener propuesta`);
    if (conMd && e.enlace) throw new Error(`propuestas.json: «${s}» no tiene página propia`);
    // «sin» on an exercise with an official answer adds nothing: the official answer rules.
    if (conSin && tieneSol(e)) delete todas[s];
    if (conMd && !entraEnEmergencia(e)) throw new Error(`propuestas.json: «${s}» no es de plan nuevo`);
  }
  return todas;
}
const propuestas = leerPropuestas();

const estadoDe = (e) => {
  if (tieneSol(e)) return e.quien === 'alumno' ? { id: 'alumno', t: 'Resolución no oficial' } : { id: 'oficial', t: 'Respuesta oficial' };
  return propuestas[e.slug]?.md ? { id: 'propuesta', t: 'Propuesta sin verificar' } : { id: 'sin', t: 'Sin respuesta' };
};

function seccionPropuesta(e) {
  const p = propuestas[e.slug];
  if (!p) return '';
  if (p.sin) return `<section class="sec em-solo"><h2 id="propuesta">Sin respuesta</h2><p>${renderLinea(p.sin)}</p></section>`;
  return `<section class="sec em-propuesta"><h2 id="propuesta">Propuesta de respuesta</h2><p class="em-sin-verificar">${SIN_VERIFICAR}</p><div class="em-md">${armar(bloques(p.md)).html.replace(/<figure(?![^>]*\stabindex=)/g, '<figure tabindex="0"')}</div><p class="em-sin-verificar-fin">${SIN_VERIFICAR_FIN}</p>${p.base ? `<p class="bloque-fuente">Se armó con ${renderLinea(p.base)}</p>` : ''}${p.dudas ? `<p class="bloque-fuente">Quedó en duda: ${renderLinea(p.dudas)}</p>` : ''}<div class="em-votos" data-m="${materia.slug}" data-e="${esc(e.slug)}" hidden></div></section>`;
}

const GRUPOS = (materia.grupos || [{ id: 'p1', t: '1° parcial', baja: '' }, { id: 'p2', t: '2° parcial', baja: '' }, { id: 'fin', t: 'Final', baja: '' }]).filter((g) => ejercicios.some((e) => e.grupo === g.id));
const fechaLinda = (f) => (/^\d{4}-\d{2}-\d{2}$/.test(f) ? f.split('-').reverse().join('/') : f);
const temasLindos = (t) => t.join(', ');
const nombreGrupo = (id) => GRUPOS.find((g) => g.id === id).t;
const idGrupo = (g) => (g.id === 'fin' ? 'final' : /^p\d$/.test(g.id) ? `parcial-${g.id[1]}` : g.id);

// ----- Exam mode (plantilla/examen.js). Only a real exam can be taken with a clock: not a TP, a class exercise or a
// list of questions. An entry counts when its title or its instance names an exam.
const NO_ES_EXAMEN = /^(tp\b|trabajo|consigna|requerimientos|cuestionario|ejercicio de clase|preguntas frecuentes|diccionario)/i;
const NOMBRA_EXAMEN = /parcial|final|global|recuperator|regulariz|aprobaci|examen|evaluaci|formativa|autotest/i;
const esExamen = (e) => !e.enlace && !NO_ES_EXAMEN.test(e.titulo) && (NOMBRA_EXAMEN.test(e.titulo) || NOMBRA_EXAMEN.test(nombreGrupo(e.grupo)));
const minutosDe = (e) => EXAMEN.minutosSugeridos(e.titulo, nombreGrupo(e.grupo));
const normalTema = (t) => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// The questions with options that came out of an exam: their «origen» names its date. When two exams share the date
// (theory and practice, or the final and the globalizador), the one whose title shares more words with it keeps it;
// a tie keeps both, as with the two halves of one exam.
const fechasEn = (s) =>
  [...String(s || '').matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})\b/g)].map((m) => `${m[3].length === 2 ? `20${m[3]}` : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`);
const palabrasDe = (s) => new Set(normalTema(s).split(' ').filter((w) => w.length >= 3 && !/^\d+$/.test(w)));
function preguntasPorExamen(examenes) {
  const porFecha = new Map();
  for (const e of examenes) if (/^\d{4}-\d{2}-\d{2}$/.test(e.fecha)) porFecha.set(e.fecha, [...(porFecha.get(e.fecha) || []), e]);
  const res = new Map();
  for (const q of preguntas) {
    if (q.tipo === 'abierta' || !q.origen || !Array.isArray(q.opciones)) continue;
    for (const f of new Set(fechasEn(q.origen))) {
      let cand = porFecha.get(f) || [];
      if (cand.length > 1) {
        const p = palabrasDe(q.origen);
        const puntos = cand.map((e) => [...palabrasDe(`${e.titulo} ${nombreGrupo(e.grupo)}`)].filter((w) => p.has(w)).length);
        const max = Math.max(...puntos);
        cand = cand.filter((_, i) => puntos[i] === max);
      }
      for (const e of cand) if (!(res.get(e.slug) || []).includes(q)) res.set(e.slug, [...(res.get(e.slug) || []), q]);
    }
  }
  return res;
}

// Where to review each topic of an exam: the section a quiz question on that topic points to, a section whose title
// says it, or one whose text does. If nothing says it, the study page of that instance.
const seccionesTeoria = [];
const VACIAS = new Set(['de', 'del', 'la', 'el', 'lo', 'los', 'las', 'y', 'e', 'en', 'a', 'al', 'con', 'por', 'para', 'un', 'una', 'o', 'u', 'que', 'se', 'su', 'sus']);
const clavePalabras = (t) => normalTema(t).split(' ').filter(Boolean).map(singular);
const significativas = (t) => clavePalabras(t).filter((w) => !VACIAS.has(w));
function sumarTeoria(p, html) {
  for (const s of html.split(/(?=<h[23] id=)/)) {
    const m = /^<h[23] id="([^"]+)">([\s\S]*?)<\/h[23]>/.exec(s);
    if (!m) continue;
    const titulo = sinMathml(m[2]).replace(/<[^>]+>/g, '').trim();
    seccionesTeoria.push({ href: `${p.archivo}#${m[1]}`, pagina: p.nombre, titulo, clave: clavePalabras(titulo).join(' '), pal: new Set(significativas(titulo)), texto: ` ${clavePalabras(texto(s)).join(' ')} ` });
  }
}
function enlaceTema(tema, grupo) {
  const k = clavePalabras(tema).join(' ');
  if (!k) return null;
  const veces = new Map();
  for (const q of preguntas) if (q.enlace && clavePalabras(q.tema || '').join(' ') === k) veces.set(q.enlace, (veces.get(q.enlace) || 0) + 1);
  if (veces.size) {
    const href = [...veces.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const pag = materia.paginas.find((p) => p.archivo === href.split('#')[0]);
    if (pag) return { href, pagina: pag.nombre, titulo: seccionesTeoria.find((s) => s.href === href)?.titulo || pag.nombre };
  }
  const pal = significativas(tema);
  const exacta = seccionesTeoria.find((s) => s.clave === k);
  if (exacta) return exacta;
  const todas = pal.length ? seccionesTeoria.filter((s) => pal.every((w) => s.pal.has(w))).sort((a, b) => a.pal.size - b.pal.size)[0] : null;
  if (todas) return todas;
  const largas = pal.filter((w) => w.length >= 3);
  let mejor = null;
  let n = 0;
  for (const s of seccionesTeoria) {
    const c = largas.filter((w) => s.pal.has(w)).length;
    if (c > n) [mejor, n] = [s, c];
  }
  if (mejor && n / largas.length >= 0.5) return mejor;
  const enTexto = seccionesTeoria.find((s) => s.texto.includes(` ${k} `));
  if (enTexto) return enTexto;
  const g = GRUPOS.find((x) => x.id === grupo);
  const pag = g && materia.paginas.find((p) => p.id === idGrupo(g) && p.tipo === 'estudio');
  return pag ? { href: pag.archivo, pagina: pag.nombre, titulo: pag.nombre } : null;
}

const OPCIONES_TEMA = [
  ['bien', 'Me salió'],
  ['medio', 'Más o menos'],
  ['mal', 'No me salió'],
];
function seccionCorregir(e, conPreguntas) {
  const filas = [...new Set(e.temas)].map((t, n) => {
    const l = enlaceTema(t, e.grupo);
    const teoria = l ? `<span class="ex-t-teoria"><a href="${esc(l.href)}">${esc(l.titulo)}</a>${l.titulo !== l.pagina ? `, en ${esc(l.pagina)}` : ''}</span>` : '';
    const ops = OPCIONES_TEMA.map(([v, txt]) => `<label class="ex-op" data-v="${v}"><input type="radio" name="exT${n}r" value="${v}"><span>${txt}</span></label>`).join('');
    return `<li class="ex-tema" data-tema="${esc(t)}"${l ? ` data-enlace="${esc(l.href)}" data-donde="${esc(l.pagina)}"` : ''}><div class="ex-t-cab"><span class="ex-t-nom" id="exT${n}">${esc(t)}</span>${teoria}</div><div class="ex-opciones" role="radiogroup" aria-labelledby="exT${n}">${ops}</div></li>`;
  });
  return `<section class="sec ex-corregir" id="exCorregir" hidden><h2 id="corregir">¿Cómo te fue?</h2>
<p class="ex-baja">Marcá cada tema del examen.${conPreguntas ? ' Las preguntas con opciones ya se corrigieron solas.' : ''}</p>
<ul class="ex-temas">${filas.join('')}</ul>
<p class="ex-c-fin"><button type="button" class="b-pri" id="exVer">Ver cómo me fue</button> <span class="ex-falta" id="exFalta" role="status"></span></p></section>`;
}

// The cover of the subject: the newest exam of each instance, ready to be taken.
function seccionRendir() {
  const ultimos = GRUPOS.map((g) =>
    ejercicios
      .filter((e) => e.grupo === g.id && esExamen(e) && entraEnEmergencia(e) && /^\d{4}-\d{2}-\d{2}$/.test(e.fecha))
      .sort((a, b) => b.fecha.localeCompare(a.fecha))[0],
  ).filter(Boolean);
  if (!ultimos.length) return { html: '', toc: [] };
  const tarjeta = (e) => `<li><a class="ex-ultimo" href="ej-${esc(e.slug)}.html#rendir"><span class="vh">Rendir con reloj el </span><span class="ex-u-inst">${esc(nombreGrupo(e.grupo))}</span><span class="vh"> del </span><span class="ex-u-fecha">${esc(fechaLinda(e.fecha))}</span>${icono('reloj', 'ex-u-i')}</a></li>`;
  return {
    html: `<section class="sec ex-entrada"><h2 id="rendir">Rendí un examen viejo</h2>
<p>Elegís uno real y lo hacés con reloj, sin ver la resolución. Al entregar te corregís y ves qué repasar.</p>
<ul class="ex-ultimos">${ultimos.map(tarjeta).join('')}</ul>
<p class="ex-otros"><a href="ejercicios.html">Elegir otro en Ejercicios</a></p></section>`,
    toc: [{ n: 2, t: 'Rendí un examen viejo', id: 'rendir' }],
  };
}
const hayExamenes = ejercicios.some(esExamen);

function paginaEjercicios(p) {
  const fila = (e) => `<li class="ej-fila" data-slug="${esc(e.slug)}" data-temas="${esc(e.temas.join(' '))}" data-sol="${e.sol.length || e.conSol ? 1 : 0}" data-viejo="${!valeViejo && planDe(e) !== 'nuevo' ? 1 : 0}"><a href="${e.enlace || `ej-${e.slug}.html`}"><span class="ej-nom">${esc(e.titulo)}${valeViejo ? '' : { viejo: ' <em class="viejo">Plan viejo</em>', 'sin-fecha': ' <em class="viejo">Sin fecha, puede ser plan viejo</em>' }[planDe(e)] || ''}</span><span class="ej-fecha">${esc(fechaLinda(e.fecha))}</span><span class="ej-temas">${esc(temasLindos(e.temas))}</span><span class="ej-marca">${e.quien === 'alumno' ? 'Resolución no oficial' : e.sol.length || e.conSol ? 'Con resolución' : ''}</span></a>${esExamen(e) ? `<a class="ex-rendir" href="ej-${esc(e.slug)}.html#rendir" aria-label="Rendirlo con reloj: ${esc(e.titulo)}">${icono('reloj', 'ex-rendir-i')}Rendirlo con reloj</a>` : ''}</li>`;
  const toc = GRUPOS.map((g) => ({ n: 2, t: g.t, id: idGrupo(g) }));
  const grupos = GRUPOS.map((g) => `<section class="sec ej-grupo"><h2 id="${idGrupo(g)}">${esc(g.t)}</h2><p class="ej-baja">${esc(g.baja)}</p><ul class="ej-lista">${ejercicios.filter((e) => e.grupo === g.id).sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || ''))).map(fila).join('')}</ul></section>`).join('\n');
  const cuenta = new Map();
  ejercicios.forEach((e) => e.temas.forEach((x) => cuenta.set(x, (cuenta.get(x) || 0) + 1)));
  const filtros = materia.filtros || [...cuenta.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7).map(([x]) => x);
  const chips = ['', ...filtros].map((t) => `<button type="button" class="b-filtro" data-tema="${t}" aria-pressed="${t ? 'false' : 'true'}">${t || 'Todos'}</button>`).join('');
  return {
    toc,
    html: `<div class="ej-filtros" role="group" aria-label="Filtrar ejercicios">${chips}<span class="ej-sep"></span><button type="button" id="ejSol" class="b-filtro" aria-pressed="false">Solo con resolución</button>${!valeViejo && ejercicios.some((e) => planDe(e) !== 'nuevo') ? '<button type="button" id="ejNuevo" class="b-filtro" aria-pressed="false">Solo plan nuevo</button>' : ''}</div><p class="ej-cuenta" id="ejCuenta" aria-live="polite"></p>\n${grupos}`,
  };
}

function paginaEjercicio(e, i, lista) {
  const links = e.links.map((l) => `<a href="${esc(l.u)}" target="_blank" rel="noopener">${esc(l.t)}</a>`).join('');
  const caso = e.caso ? `<p class="ex-fuera">El caso completo está en <a href="ej-${esc(e.caso)}.html">${esc(ejercicios.find((x) => x.slug === e.caso).titulo)}</a>.</p>` : '';
  const hojas = e.sol.filter((s) => s.tipo === 'img');
  const partes = e.sol
    .map((s) => {
      if (s.tipo === 'img') {
        const n = hojas.indexOf(s) + 1;
        return `<a class="sol-img" href="${s.src}" aria-label="Abrir la hoja ${n} de la resolución en grande"><img src="${s.src}" width="${s.w}" height="${s.h}" loading="lazy" alt="Hoja ${n} de la resolución, tal como está en el Drive"></a>`;
      }
      return `<p class="sol-t">${esc(s.titulo)}</p><div class="sol-bloque"><pre class="codigo"><code>${s.lang === undefined || (s.lang && hljs.getLanguage(s.lang)) ? hljs.highlight(s.code, { language: s.lang || 'sql' }).value : esc(s.code)}</code></pre></div>`;
    })
    .join('');
  const origenSol = { alumno: 'La escribió un alumno. No es oficial y puede tener errores. Confirmala con la cátedra.', catedra: 'Es de la cátedra.', propuesta: 'Dice «solución propuesta».', campus: 'Es la corrección automática del campus o del aula virtual.', 'carpeta-oficial': 'Está en el Drive junto al examen, sin firma. La hoja no dice que sea de la cátedra.' }[e.quien];
  const ayuda = hojas.length || origenSol ? `<p class="sol-ayuda">${origenSol ? `${origenSol} ` : ''}${hojas.length ? 'Son las hojas originales. Tocá una para verla en grande.' : ''}</p>` : '';
  const resolucion = e.sol.length
    ? `<section class="sec" id="resolucion-s"><h2 id="resolucion">${e.quien === 'alumno' ? 'Resolución no oficial' : 'Resolución'}</h2><details class="sol-grande${e.quien === 'alumno' ? ' sol-prosa' : ''}"><summary>${e.quien === 'alumno' ? 'Ver la resolución no oficial' : 'Ver la resolución'}: ${esc(e.cubre)}</summary>${ayuda}${partes}</details></section>`
    : '';
  const ant = lista[i - 1];
  const sig = lista[i + 1];
  const paso = `<nav class="ej-paso" aria-label="Otros ejercicios">${ant ? `<a href="ej-${ant.slug}.html">Anterior: ${esc(ant.titulo)}</a>` : '<span></span>'}${sig ? `<a href="ej-${sig.slug}.html">Siguiente: ${esc(sig.titulo)}</a>` : ''}</nav>`;
  const f = fechaLinda(e.fecha);
  const hojasDe = (x, de) => (x.hojas || []).map((s, n) => `<a class="sol-img" href="${s.src}" aria-label="Abrir la hoja ${n + 1} ${de} en grande"><img src="${s.src}" width="${s.w}" height="${s.h}" loading="lazy" alt="Hoja ${n + 1} ${de}, tal como está en el Drive. El texto completo está en el enlace al Drive."></a>`).join('');
  // Exam mode: the button, the case when the exam is split in parts, its questions with options and the topics to mark.
  // They stay hidden until examen.js shows them.
  const examen = esExamen(e);
  const g = GRUPOS.find((x) => x.id === e.grupo);
  const rendir = examen ? `<button type="button" class="b-pri ex-ir" data-ex-ir data-slug="${esc(e.slug)}" data-titulo="${esc(e.titulo)}" data-min="${minutosDe(e)}" data-otro="ejercicios.html#${idGrupo(g)}" data-sol="${estadoDe(e).id}">${icono('reloj', 'ex-ir-i')}Rendirlo con reloj</button>` : '';
  const delCaso = examen && e.caso ? ejercicios.find((x) => x.slug === e.caso) : null;
  const caso2 = delCaso ? `<section class="sec ej-texto ex-caso" id="exCaso" hidden><h2 id="ex-caso">El caso</h2>${hojasDe(delCaso, 'del caso')}${md.parse(delCaso.enunciado || '')}</section>` : '';
  const qs = examen ? preguntasExamen.get(e.slug) || [] : [];
  const adaptadas = qs.filter((q) => /adaptad/i.test(q.origen)).length;
  const deDonde = !adaptadas ? 'Salen de este examen.' : adaptadas === qs.length ? 'Salen de este examen, adaptadas.' : 'Salen de este examen, algunas adaptadas.';
  const conOpciones = qs.length
    ? `<section class="sec ex-preguntas" id="exPreguntas" hidden><h2 id="ex-preguntas">Preguntas con opciones</h2><p class="ex-baja">${deDonde} Dejalas para el final, porque las opciones pueden dar pistas.</p><ol class="qs">${qs.map((q, n) => pregunta(q, n, 'ex')).join('')}</ol></section>`
    : '';
  return `<p class="em-solo em-volver"><a href="emergencia.html">Volver a emergencia</a></p>
<h1>${esc(e.titulo)}</h1>
<p class="bajada">${esc(nombreGrupo(e.grupo))}${f ? `, ${esc(f)}` : ''}</p>${valeViejo ? '' : { viejo: '<p class="aviso-viejo">Este examen es de 2022 o antes, del plan anterior. Puede no coincidir con lo que se toma hoy.</p>', 'sin-fecha': '<p class="aviso-viejo">Este examen no tiene fecha. Puede ser del plan anterior.</p>' }[planDe(e)] || ''}
<div class="ej-acciones">${rendir}<button type="button" id="ejHecho" class="b-sec" data-slug="${esc(e.slug)}" aria-pressed="false">Marcar como hecho</button>${links}</div>
${caso}
${caso2}
<section class="sec ej-texto"><h2 id="enunciado">Enunciado</h2>${hojasDe(e, 'del enunciado')}${md.parse(e.enunciado || '')}</section>
${conOpciones}
${resolucion}
${seccionPropuesta(e)}
${examen ? seccionCorregir(e, qs.length > 0) : ''}
${paso}`;
}

// What falls most, from the topics of each exam on this site. One exam split in parts counts once.
const SIN_TEMA = new Set(['verdadero o falso', 'multiple choice', 'multiple opcion']);
const singular = (w) => {
  if (w.length <= 3) return w;
  if (/[lnrdj]es$/.test(w)) return w.slice(0, -2);
  return w.endsWith('s') ? w.slice(0, -1) : w;
};
const claveTema = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().split(' ').map(singular).join(' ');
const CAE_MIN_EXAMENES = 3;
const CAE_MIN_REPETIDOS = 2;
const CAE_TOPE = 6;

function caeMas() {
  const instancias = [];
  for (const g of GRUPOS) {
    const lista = ejercicios.filter((e) => e.grupo === g.id && entraEnEmergencia(e) && e.temas.length);
    const examenes = new Set(lista.map((e) => e.caso || e.slug)).size;
    if (examenes < CAE_MIN_EXAMENES) continue;
    const temas = new Map();
    for (const e of lista) {
      for (const t of e.temas) {
        if (SIN_TEMA.has(t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim())) continue;
        const k = claveTema(t);
        if (!temas.has(k)) temas.set(k, { formas: new Map(), examenes: new Set(), lista: [] });
        const x = temas.get(k);
        x.formas.set(t, (x.formas.get(t) || 0) + 1);
        x.examenes.add(e.caso || e.slug);
        if (!x.lista.includes(e)) x.lista.push(e);
      }
    }
    const repetidos = [...temas.values()].filter((x) => x.examenes.size >= 2).sort((a, b) => b.examenes.size - a.examenes.size);
    if (repetidos.length < CAE_MIN_REPETIDOS) continue;
    instancias.push({ g, examenes, temas: repetidos.slice(0, CAE_TOPE).map((x) => ({ nombre: [...x.formas.entries()].sort((a, b) => b[1] - a[1])[0][0], n: x.examenes.size, lista: x.lista })) });
  }
  return instancias;
}

// Rows are text first. The bar repeats the number, and its full width is every exam of that instance.
function seccionCae(enEmergencia) {
  const instancias = caeMas();
  if (!instancias.length) return { html: '', toc: [] };
  const enlace = (e) => {
    const nombre = esc(e.titulo);
    if (e.enlace) return enEmergencia ? `<span>${nombre}</span>` : `<a href="${esc(e.enlace)}">${nombre}</a>`;
    return `<a href="ej-${esc(e.slug)}.html">${nombre}</a>`;
  };
  const bloque = ({ g, examenes, temas }) => `<h3 id="cae-${idGrupo(g)}">${esc(g.t)}</h3>
<p class="cae-de">Sale de ${examenes} exámenes de este sitio.</p>
<ul class="cae-lista">${temas.map((t) => `<li><details class="cae-tema"><summary><span class="cae-nom">${esc(t.nombre)}</span><span class="cae-barra" aria-hidden="true"><span style="width:${Math.round((t.n / examenes) * 100)}%"></span></span><span class="cae-num">en ${t.n} de ${examenes}</span></summary><ul class="cae-ex">${t.lista.map((e) => `<li>${enlace(e)}</li>`).join('')}</ul></details></li>`).join('')}</ul>`;
  return {
    html: `<section class="sec cae"><h2 id="que-cae">Qué cae más</h2>
<p class="cae-baja">El sitio no tiene todos los exámenes que se tomaron, así que esto es una pista y no una promesa. Tocá un tema para ver en qué exámenes salió.</p>
${instancias.map(bloque).join('\n')}</section>`,
    toc: [{ n: 2, t: 'Qué cae más', id: 'que-cae' }],
  };
}

function paginaEmergencia() {
  const propio = fs.existsSync(path.join(fuente, 'emergencia.md'));
  const origen = propio ? 'emergencia.md' : 'machete.md';
  let a;
  try {
    a = fs.existsSync(path.join(fuente, origen)) ? armar(bloques(leer(origen))) : { html: '', toc: [] };
  } catch (e) {
    e.message = `${origen}: ${e.message}`;
    throw e;
  }
  let necesario = a.html.replace(/^\s*<h1>[\s\S]*?<\/h1>\s*/, '');
  // The source's own lead sentence stays on top. The review sheet's talks about printing, so it goes.
  const bajadaFuente = /^\s*<p class="bajada">[\s\S]*?<\/p>/.exec(necesario)?.[0] || '';
  necesario = necesario.slice(bajadaFuente.length);
  const bajada = propio && bajadaFuente ? bajadaFuente : '<p class="bajada">Lo necesario para rendir y los exámenes con su respuesta.</p>';
  const elegibles = ejercicios.filter(entraEnEmergencia);
  const grupos = GRUPOS.map((g) => ({ g, lista: elegibles.filter((e) => e.grupo === g.id).sort((x, y) => String(y.fecha || '').localeCompare(String(x.fecha || ''))) })).filter((x) => x.lista.length);
  const fila = (e) => {
    const est = estadoDe(e);
    const datos = `<span class="em-nom">${esc(e.titulo)}</span><span class="ej-fecha">${esc(fechaLinda(e.fecha))}</span><span class="em-estado" data-estado="${est.id}">${est.t}</span>`;
    if (e.enlace) {
      const donde = materia.paginas.find((p) => p.archivo === e.enlace.split('#')[0]);
      return `<li class="em-fila"><div>${datos}<span class="em-nota">Está en ${esc(donde?.nombre || 'otra página')}. Para verlo, apagá el protocolo.</span></div></li>`;
    }
    const motivo = propuestas[e.slug]?.sin ? `<span class="em-nota">${renderLinea(propuestas[e.slug].sin)}</span>` : '';
    return `<li class="em-fila"><a href="ej-${esc(e.slug)}.html">${datos}${motivo}</a></li>`;
  };
  const examenes = grupos.length
    ? `<section class="sec em-examenes"><h2 id="examenes">Exámenes</h2>
<p class="em-leyenda">«Respuesta oficial» es lo que está en el Drive. «Propuesta sin verificar» es una respuesta armada con inteligencia artificial que ningún docente revisó.</p>
${grupos.map(({ g, lista }) => `<h3 id="ex-${idGrupo(g)}">${esc(g.t)}</h3><ul class="em-lista">${lista.map(fila).join('')}</ul>`).join('\n')}</section>`
    : '<section class="sec em-examenes"><h2 id="examenes">Exámenes</h2><p>No hay exámenes de plan nuevo en el Drive para esta materia.</p></section>';
  const cae = seccionCae(true);
  const toc = [...a.toc.filter((t) => t.n === 2), ...cae.toc, { n: 2, t: 'Exámenes', id: 'examenes' }, ...grupos.map(({ g }) => ({ n: 3, t: g.t, id: `ex-${idGrupo(g)}` }))];
  const salto = '<p class="em-salto"><a href="#examenes">Ir a los exámenes</a></p>';
  const cuerpo = `<h1>Protocolo de emergencia</h1>
${bajada}
${propio ? '' : '<p class="nivel">Esta materia todavía no tiene su resumen de emergencia. Mientras tanto, acá va la hoja de repaso.</p>'}
${salto}
${necesario}
${cae.html}
${examenes}`;
  return { cuerpo, toc };
}

const niveles = leerNiveles(aqui);
const esPasada = leerPasadas(aqui).includes(materia.slug);
const destino = path.join(salida, materia.slug);
fs.mkdirSync(destino, { recursive: true });
const interactivosPropios = nombresDeInteractivos(path.join(fuente, 'interactivos.js'));
// interactivos.js is copied even when no page uses it: the summary maker loads it for the subject's simulators.
const hayInteractivos = prepararInteractivos(fuente, destino);
const creador = validarCreador(materia.creador, interactivosPropios);
const indiceBusqueda = [];
// The subject's cover also carries the link to the whole subject in PDF, right under the lead sentence.
const ESTRELLAS = `<p class="pdf-ir em-fuera"><a class="b-sec" href="pdf.html">${icono('pdf', 'pdf-ir-i')}Descargar en PDF</a></p><div id="sinInternet" class="si em-fuera" hidden></div><div class="es-materia" data-estrellas-materia="${materia.slug}" hidden></div>`;
const conEstrellas = (html) => {
  if (/<p class="bajada">[\s\S]*?<\/p>/.test(html)) return html.replace(/<p class="bajada">[\s\S]*?<\/p>/, (m) => m + ESTRELLAS);
  if (html.includes('</h1>')) return html.replace('</h1>', () => `</h1>${ESTRELLAS}`);
  return ESTRELLAS + html;
};
const marcasNivel = (p) => {
  const nivel = nivelDe(niveles, materia.slug, p.id);
  return `<p class="nivel" data-nivel="${nivel}">${esc(NIVELES[nivel].texto)}</p>${esRapida(niveles, materia.slug) ? `<p class="nivel nivel-rapido" data-rapida="1">${esc(CAMBIO_RAPIDO)}</p>` : ''}${esPasada ? `<p class="nivel nivel-rapido">${esc(PASADA)}</p>` : ''}`;
};

// ----- The whole subject in PDF: pdf.html gathers the summary and its parts on clean sheets, and the browser saves
// it from its print window. No quizzes, exercise lists, proposals or emergency page. Each part's ids get its prefix
// so they do not repeat, and links between parts stay inside the file.
const ENTRAN_EN_PDF = materia.paginas.filter((p) => TIPOS_CON_NIVEL.includes(p.tipo) && p.fuente);
const idEnPdf = new Map(ENTRAN_EN_PDF.map((p) => [p.archivo, p.id]));
const partesPdf = [];
function partePdf(p, html) {
  const pre = `${p.id}-`;
  let h = html
    // The cover already has the subject's name: a part titled like it takes its own name from the menu.
    .replace(/^\s*<h1>([\s\S]*?)<\/h1>/, (m, t) => (texto(t) === materia.nombre ? `<h1>${esc(p.nombre)}</h1>` : m))
    .replace(/(\s(?:id|for))="([^"]+)"/g, (_, a, v) => `${a}="${pre}${v}"`)
    .replace(/(\saria-(?:labelledby|describedby))="([^"]+)"/g, (_, a, v) => `${a}="${v.split(/\s+/).map((x) => pre + x).join(' ')}"`)
    .replace(/url\(#([^)\s]+)\)/g, (_, v) => `url(#${pre}${v})`)
    .replace(/href="([^"]*)"/g, (m, u) => {
      if (u.startsWith('#')) return `href="#${pre}${u.slice(1)}"`;
      const [archivo, ancla] = u.split('#');
      if (!idEnPdf.has(archivo)) return m;
      return `href="#${ancla ? `${idEnPdf.get(archivo)}-${ancla}` : `pdf-${idEnPdf.get(archivo)}`}"`;
    })
    // On paper everything shows: answers and solutions open, and every picture loaded before printing.
    .replace(/<details(?![^>]*\sopen)/g, '<details open')
    .replace(/<summary>Ver la resolución del Drive<\/summary>/g, '<summary>Resolución del Drive</summary>')
    .replace(/\sloading="lazy"/g, '');
  if (valeViejo ? p.tipo === 'inicio' : /class="viejo"/.test(h)) h = conAviso(h);
  if (materia.teoriaDeAlumnos === true) h = conAvisoAlumnos(h);
  h = conNivel(h, marcasNivel(p));
  return `<section class="pdf-parte" id="pdf-${p.id}" data-pagina="${esc(p.archivo.replace(/\.html$/, ''))}" aria-label="${esc(p.nombre)}"><p class="pdf-de">${esc(materia.nombre)}</p>${h}</section>`;
}

function paginaPdf() {
  const conW = partesPdf.some((x) => x.includes(' data-w="'));
  const conInteractivos = hayInteractivos && partesPdf.some((x) => x.includes(' data-w="interactivo"'));
  const indice = ENTRAN_EN_PDF.map((p) => `<li><a href="#pdf-${p.id}">${esc(p.nombre)}</a></li>`).join('');
  return `<!doctype html>
<html lang="es" data-pdf>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(materia.nombre)} en PDF. El Santo Resumen</title>
<meta name="description" content="${esc(`El resumen entero de ${materia.nombre}, para guardar como PDF.`)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=IBM+Plex+Mono:wght@400;500&family=Shantell+Sans:wght@400;600&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap">
<link rel="stylesheet" href="${materia.assets}/katex/katex.min.css">
<link rel="stylesheet" href="${materia.assets}/utn.css">
${conW ? `<link rel="stylesheet" href="${materia.assets}/w.css">
` : ''}<link rel="stylesheet" href="${materia.assets}/pdf.css">
${conW ? `<script src="${materia.assets}/expr.js" defer></script>
<script src="${materia.assets}/w.js" defer></script>
` : ''}${conInteractivos ? `<script src="interactivos.js" defer></script>
` : ''}<script src="${materia.assets}/piezas.js" defer></script>
<script src="${materia.assets}/editar.js" defer></script>
<script src="${materia.assets}/pdf.js" defer></script>
</head>
<body class="pdf" data-materia="${materia.slug}" data-pagina="pdf">
<a class="saltar" href="#contenido">Saltar al contenido</a>
<header class="pdf-barra">
<a class="pdf-volver" href="index.html">Volver a ${esc(materia.nombre)}</a>
<div class="pdf-accion"><button type="button" id="pdfGuardar" class="b-pri">Guardar como PDF</button><p class="pdf-ayuda">En la ventana de imprimir, elegí Guardar como PDF.</p><p id="pdfEstado" class="pdf-estado" role="status">Preparando los gráficos.</p></div>
</header>
<main id="contenido" class="hoja pdf-hoja">
<section class="pdf-portada" aria-labelledby="pdfTitulo">
<p class="pdf-marca">El Santo Resumen</p>
<h1 id="pdfTitulo">${esc(materia.nombre)}</h1>
<p class="pdf-carrera">Ingeniería en Sistemas, UTN</p>
<div class="pdf-indice"><p class="pdf-rotulo">Qué tiene</p><ol>${indice}</ol></div>
<div class="pdf-origen"><p class="pdf-rotulo">De dónde sale</p><p>${esc(materia.pie)}</p><p>Los quiz, los ejercicios de examen y las figuras que se mueven están en la web.</p></div>
</section>
${partesPdf.join('\n')}
</main>
${pieConAviso(esc(materia.pie), '../')}
</body>
</html>
`;
}

for (const p of materia.paginas) {
  let cuerpoHtml = '';
  let toc = [];
  if (p.fuente) {
    let a;
    figurasEnCurso = [];
    try {
      a = armar(bloques(leer(p.fuente)));
    } catch (e) {
      e.message = `${p.fuente}: ${e.message}`;
      throw e;
    }
    for (const f of figurasEnCurso) figurasCatalogo.push({ ...f, pagina: p.nombre });
    figurasEnCurso = null;
    cuerpoHtml = a.html;
    toc = a.toc;
    if (idEnPdf.has(p.archivo)) partesPdf.push(partePdf(p, a.html));
    if (p.tipo === 'estudio') sumarTeoria(p, a.html);
    for (const s of a.html.split(/(?=<h[23] id=)/)) {
      const m = /^<h[23] id="([^"]+)">([\s\S]*?)<\/h[23]>/.exec(s);
      if (m) indiceBusqueda.push({ p: p.archivo, pn: p.nombre, id: m[1], t: sinMathml(m[2]).replace(/<[^>]+>/g, ''), x: texto(s).slice(0, 900) });
    }
  }
  if (p.tipo === 'estudio') {
    const qs = preguntas.filter((q) => q.en.includes(p.id));
    if (qs.length) {
      cuerpoHtml += quiz(p.id, qs, p.tituloQuiz || 'Probá lo que sabés', 'Elegí una opción para ver la explicación. Las que dicen «Se tomó» salieron de exámenes reales.');
      toc.push({ n: 2, t: 'Quiz', id: 'quiz' });
    }
  }
  if (p.tipo === 'ejercicios') {
    const hechos = paginaEjercicios(p);
    cuerpoHtml += hechos.html;
    toc = hechos.toc;
  }
  if (p.tipo === 'practicar') {
    const qs = preguntas.filter((q) => q.tipo !== 'abierta');
    const abiertas = preguntas.filter((q) => q.tipo === 'abierta');
    const cards = tarjetas
      .map((c, i) => `<li class="tarjeta" data-i="${i}" hidden><div class="t-frente">${renderLinea(c.frente)}</div><div class="t-dorso" tabindex="-1" hidden>${render(c.dorso)}</div></li>`)
      .join('');
    cuerpoHtml += `<section class="sec" id="simulacro"><h2 id="sim-t">Simulacro</h2>
<p>Te toca una mezcla al azar del banco de ${qs.length} preguntas, sin ver la explicación hasta que entregás. Al final te dice qué temas repasar.</p>
<div class="sim-ctl"><label for="simN">Cantidad</label> <select id="simN"><option>10</option><option selected>15</option><option>20</option></select> <label for="simT">Tiempo</label> <select id="simT"><option value="0">Sin reloj</option><option value="15" selected>15 minutos</option><option value="25">25 minutos</option></select> <button type="button" id="simIr" class="b-pri">Empezar simulacro</button></div><span id="simReloj" class="reloj" role="timer" hidden></span>
<div id="simBanco" data-materia="${materia.slug}" hidden><ol class="qs">${qs.map((q, i) => pregunta(q, i, 'sim')).join('')}</ol></div>
<p><button type="button" id="simFin" class="b-pri" hidden>Entregar</button></p>
<div id="simRes" aria-live="polite"></div>
</section>
<section class="sec" id="tarjetas-s"><h2 id="tar-t">Tarjetas</h2>
<p>Pensá la respuesta, dá vuelta y decí si la sabías. Las que no sabías vuelven a salir.</p>
<p class="t-estado" id="tEstado" aria-live="polite"></p>
<ol id="tarjetas" class="tarjetas">${cards}</ol>
<p class="t-ctl"><button type="button" id="tVuelta" class="b-pri">Dar vuelta</button> <button type="button" id="tSi" class="b-sec" hidden>La sabía</button> <button type="button" id="tNo" class="b-sec" hidden>No la sabía</button> <button type="button" id="tOtra" class="b-sec">Empezar de nuevo</button></p>
</section>
<section class="sec quiz" id="abiertas" data-quiz="abiertas" data-materia="${materia.slug}"><h2 id="ab-t">Preguntas para escribir</h2>
<p class="quiz-baja">El teórico se responde con tus palabras. Escribila en una hoja antes de abrir lo que dice el material.</p>
${BOTON_REPASO}
<ol class="qs">${abiertas.map((q, i) => pregunta(q, i, 'ab')).join('')}</ol>
<p class="quiz-fin"><span class="quiz-res"></span> <button type="button" class="b-sec quiz-reset">Empezar de nuevo</button></p>
</section>`;
    toc = [
      { n: 2, t: 'Simulacro', id: 'simulacro' },
      { n: 2, t: 'Tarjetas', id: 'tarjetas-s' },
      { n: 2, t: 'Preguntas para escribir', id: 'abiertas' },
    ];
  }
  if (valeViejo ? ['inicio', 'ejercicios'].includes(p.tipo) : /class="viejo"/.test(cuerpoHtml)) cuerpoHtml = conAviso(cuerpoHtml);
  if (materia.teoriaDeAlumnos === true && p.tipo !== 'ejercicios') cuerpoHtml = conAvisoAlumnos(cuerpoHtml);
  if (TIPOS_CON_NIVEL.includes(p.tipo)) cuerpoHtml = conNivel(cuerpoHtml, marcasNivel(p));
  if (p.tipo === 'inicio') {
    const cae = seccionCae(false);
    const rendir = seccionRendir();
    if (cae.html || rendir.html) {
      const antes = cuerpoHtml.indexOf('<section class="sec">');
      const extra = cae.html + rendir.html;
      cuerpoHtml = antes < 0 ? cuerpoHtml + extra : cuerpoHtml.slice(0, antes) + extra + cuerpoHtml.slice(antes);
      toc = [...cae.toc, ...rendir.toc, ...toc];
    }
    cuerpoHtml = conEstrellas(cuerpoHtml);
  }
  fs.writeFileSync(path.join(destino, p.archivo), layout({ pagina: p.id, titulo: p.nombre, cuerpo: cuerpoHtml, toc, desc: p.desc || materia.nombre, reportable: !['ejercicios', 'practicar'].includes(p.tipo), examen: hayExamenes && ['inicio', 'ejercicios'].includes(p.tipo), estudio: TIPOS_CON_NIVEL.includes(p.tipo) }));
}

const conPagina = ejercicios.filter((e) => !e.enlace);
const preguntasExamen = preguntasPorExamen(conPagina.filter(esExamen));
conPagina.forEach((e, i) => {
  const cuerpo = paginaEjercicio(e, i, conPagina);
  const toc = [{ n: 2, t: 'Enunciado', id: 'enunciado' }];
  if (e.sol.length) toc.push({ n: 2, t: e.quien === 'alumno' ? 'Resolución no oficial' : 'Resolución', id: 'resolucion' });
  const archivo = `ej-${e.slug}.html`;
  if (propuestas[e.slug]) toc.push(propuestas[e.slug].md ? { n: 2, t: 'Propuesta de respuesta', id: 'propuesta' } : { n: 2, t: 'Sin respuesta', id: 'propuesta', clase: 'em-solo' });
  fs.writeFileSync(path.join(destino, archivo), layout({ pagina: 'ejercicios', titulo: e.titulo, cuerpo, toc, desc: `Ejercicio de examen: ${e.titulo}.`, em: 'ver', examen: esExamen(e) }));
  indiceBusqueda.push({ p: archivo, pn: 'Ejercicios', id: 'enunciado', t: e.titulo, x: texto(md.parse(e.enunciado)).slice(0, 900) });
});
const emergencia = paginaEmergencia();
fs.writeFileSync(path.join(destino, 'emergencia.html'), layout({ pagina: 'emergencia', titulo: 'Emergencia', cuerpo: emergencia.cuerpo, toc: emergencia.toc, desc: `Lo necesario para rendir ${materia.nombre}.`, em: 'solo', reportable: true }));
fs.writeFileSync(path.join(destino, 'pdf.html'), paginaPdf());
if (fs.existsSync(path.join(fuente, 'img'))) fs.cpSync(path.join(fuente, 'img'), path.join(destino, 'img'), { recursive: true });

// What edit mode and the summary maker offer: the formula kinds and simulators of «creador», and each page graph once
// (the same settings drawn as a curve and as a surface are two graphs).
const vistas = new Set();
const figurasPaginas = figurasCatalogo.filter((f) => {
  const k = `${f.tipo}:${JSON.stringify(f.cfg)}`;
  if (vistas.has(k)) return false;
  vistas.add(k);
  return true;
});
fs.writeFileSync(path.join(destino, 'figuras.json'), JSON.stringify({ formula: creador.formula, figuras: [...figurasPaginas, ...creador.interactivos] }));
fs.writeFileSync(path.join(destino, 'buscar.js'), `window.UTN_BUSCAR=${JSON.stringify(indiceBusqueda)};\n`);

const assets = path.join(salida, '_');
fs.mkdirSync(path.join(assets, 'katex'), { recursive: true });
copiarServicio(aqui, assets);
for (const f of ['utn.css', 'utn.js', 'tema.js', 'piezas.js', 'editar.js', 'ajustes.js', 'menu.js', 'expr.js', 'w.js', 'w.css', 'pdf.css', 'pdf.js', 'sin-internet.js', 'examen.js', 'voz.js', 'senaladores.js']) fs.copyFileSync(path.join(aqui, 'plantilla', f), path.join(assets, f));
fs.cpSync(path.join(aqui, 'plantilla', 'three'), path.join(assets, 'three'), { recursive: true });
const katexDist = path.dirname(createRequire(import.meta.url).resolve('katex/dist/katex.min.css'));
fs.copyFileSync(path.join(katexDist, 'katex.min.css'), path.join(assets, 'katex', 'katex.min.css'));
// The bank draws the formulas of uploaded HTML in the page (banco.js), only when a summary has them.
fs.copyFileSync(path.join(katexDist, 'katex.min.js'), path.join(assets, 'katex', 'katex.min.js'));
fs.copyFileSync(path.join(katexDist, 'contrib', 'auto-render.min.js'), path.join(assets, 'katex', 'auto-render.min.js'));
fs.mkdirSync(path.join(assets, 'katex', 'fonts'), { recursive: true });
for (const f of fs.readdirSync(path.join(katexDist, 'fonts')).filter((x) => x.endsWith('.woff2'))) fs.copyFileSync(path.join(katexDist, 'fonts', f), path.join(assets, 'katex', 'fonts', f));

console.log(`${materia.nombre}: ${materia.paginas.length} páginas, ${preguntas.length} preguntas, ${tarjetas.length} tarjetas`);
