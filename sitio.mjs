// What the site has, in one place: the general pages, the home cards and the menu at the top left of every page.
// The menu is built from the home cards (secciones/inicio.json) and SECCIONES, so a new card shows up in it by itself.
import fs from 'node:fs';
import { icono } from './iconos.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// General pages next to the map. «discreto» ones go at the bottom of the menu, smaller.
export const SECCIONES = [
  { archivo: 'plan.html', nombre: 'Plan de estudios', icono: 'plan' },
  { archivo: 'mesas.html', nombre: 'Mesas de examen', icono: 'calendario' },
  { archivo: 'docentes.html', nombre: 'Mails de docentes', icono: 'sobre' },
  { archivo: 'agradecimientos.html', nombre: 'Agradecimientos', icono: 'gracias', discreto: true },
  { archivo: 'banco.html', nombre: 'Banco de resúmenes', icono: 'pila' },
  { archivo: 'consejos.html', nombre: 'Consejos', icono: 'foco' },
  { archivo: 'sysacad-lindo.html', nombre: 'Sysacad Lindo', icono: 'pieza' },
  { archivo: 'privacidad.html', nombre: 'Privacidad', icono: 'candado', discreto: true },
  { archivo: 'novedades.html', nombre: 'Notas del parche', icono: 'curita', discreto: true },
];
// Pages reached from another one, outside the list of sections.
export const APARTE = [{ archivo: 'subir.html', nombre: 'Subir un resumen', icono: 'subir' }, { archivo: 'crear.html', nombre: 'Armar un resumen', icono: 'lapiz' }];

// Only same-site paths or https links: the file is edited by hand, and a typo must not become a script link.
export const enlace = (href) => {
  if (/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/[^\s"<>]*)?$/i.test(href)) return href;
  if (/^[a-z0-9][a-z0-9./?=&#_-]*$/i.test(href) && !href.includes('..')) return href;
  throw new Error(`secciones/inicio.json: enlace no válido ${href}`);
};

export const entradasInicio = () => {
  const entradas = JSON.parse(fs.readFileSync(new URL('./secciones/inicio.json', import.meta.url), 'utf8'));
  for (const e of entradas) {
    if (!e.titulo || !e.texto || !e.href) throw new Error('secciones/inicio.json: cada entrada lleva titulo, texto y href');
    enlace(e.href);
  }
  return entradas;
};

// The row of links at the foot of the home, the map and each section: the sections and, right after Sysacad Lindo,
// the tools of other sites from the home cards (Super CVG). sin leaves out the page that shows the row.
export const filaEnlaces = (sin) => {
  const fuera = entradasInicio().filter((e) => e.href.startsWith('https://')).map((e) => `<a href="${esc(e.href)}" rel="noopener">${esc(e.titulo)}</a>`);
  return SECCIONES.flatMap((s) => {
    const propio = s === sin ? [] : [`<a href="${s.archivo}">${esc(s.nombre)}</a>`];
    return s.archivo === 'sysacad-lindo.html' ? [...propio, ...fuera] : propio;
  }).join('');
};

// The order Ignacio chose. A home card that is not here goes right after the other cards, and a new section before
// the discreet ones.
const ORDEN = ['index.html', 'materias.html', 'emergencia', 'banco.html', 'subir.html', 'crear.html', 'consejos.html', 'sysacad-lindo.html', 'plan.html', 'mesas.html', 'docentes.html'];
const TRAS_TARJETAS = ORDEN.indexOf('sysacad-lindo.html') + 0.5;

const entradasMenu = () => {
  const todas = [
    { clave: 'index.html', href: 'index.html', nombre: 'Inicio', icono: 'casa' },
    ...entradasInicio().map((e) => ({ clave: e.accion === 'emergencia' ? 'emergencia' : e.href, href: e.href, nombre: e.titulo, icono: e.icono, emergencia: e.accion === 'emergencia', tarjeta: true })),
    ...[...APARTE, ...SECCIONES].map((s) => ({ clave: s.archivo, href: s.archivo, nombre: s.nombre, icono: s.icono, discreto: s.discreto })),
  ];
  const vistas = new Set();
  const unicas = todas.filter((x) => !vistas.has(x.clave) && vistas.add(x.clave));
  const lugar = (x) => {
    const i = ORDEN.indexOf(x.clave);
    if (i >= 0) return i;
    return x.tarjeta ? TRAS_TARJETAS : ORDEN.length;
  };
  return {
    principales: unicas.filter((x) => !x.discreto).sort((a, b) => lugar(a) - lugar(b)),
    discretas: unicas.filter((x) => x.discreto),
  };
};

// The button that opens the menu goes first in every header.barra. menu.js wires it.
export const botonMenu = `<button type="button" class="b-tema b-menu" id="menuAbrir" aria-label="Menú" aria-haspopup="dialog" aria-expanded="false" aria-controls="menu">${icono('menu', 'b-menu-i')}</button>`;

// The drawer itself, right after the header. base: '' at the root, '../' in a subject. actual: this page's file.
export const menu = ({ base = '', actual = '' } = {}) => {
  const { principales, discretas } = entradasMenu();
  const dibujo = (x) => icono(x.icono, 'mn-icono');
  const fila = (x) => {
    if (x.emergencia) {
      const ir = x.href.startsWith('https://') ? x.href : base + x.href;
      return `<li class="mn-em em-fuera"><button type="button" class="mn-fila" data-em-prender data-em-ir="${esc(ir)}">${dibujo(x)}<span>${esc(x.nombre)}</span></button></li>`
        + `<li class="mn-em em-solo"><button type="button" class="mn-fila" data-em-apagar>${dibujo(x)}<span>Apagar emergencia</span></button></li>`;
    }
    if (x.href.startsWith('https://')) return `<li><a class="mn-fila" href="${esc(x.href)}" rel="noopener">${dibujo(x)}<span>${esc(x.nombre)}</span></a></li>`;
    return `<li><a class="mn-fila" href="${esc(base + x.href)}"${x.href === actual ? ' aria-current="page"' : ''}>${dibujo(x)}<span>${esc(x.nombre)}</span></a></li>`;
  };
  return `<dialog class="menu" id="menu" aria-label="Menú"><div class="mn-fondo"></div><div class="mn-panel">
<div class="mn-cabeza"><p class="mn-marca">El Santo Resumen</p><button type="button" class="b-tema mn-cerrar" data-menu-cerrar aria-label="Cerrar el menú">${icono('cerrar', 'b-menu-i')}</button></div>
<nav class="mn-nav" aria-label="Todo el sitio"><ul class="mn-lista">${principales.map(fila).join('')}</ul><ul class="mn-lista mn-discreta">${discretas.map(fila).join('')}</ul></nav>
</div></dialog>`;
};
