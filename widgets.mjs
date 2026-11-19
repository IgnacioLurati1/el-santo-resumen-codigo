// Validates the :::grafico, :::grafico3d, :::calculadora and :::interactivo blocks and writes their <figure>.
// A mistake stops the build with a message that says what to fix. The browser part is plantilla/w.js.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const E = createRequire(import.meta.url)('./plantilla/expr.js');
const LEYENDA = 'Sirve para chequear un resultado. En el examen va el desarrollo que pide la cátedra.';
export const NOMBRES_BLOQUES = ['grafico', 'grafico3d', 'calculadora', 'interactivo'];
const INTERNOS = new Set(['matriz', 'tabla-verdad']);

const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/=/g, '&#61;');

const PROHIBIDO_INTERACTIVOS = [
  [/\beval\b/, 'eval'],
  [/\bnew\s+Function\b/, 'new Function'],
  [/\bFunction\s*\(/, 'Function('],
  [/\bfetch\b/, 'fetch'],
  [/\bXMLHttpRequest\b/, 'XMLHttpRequest'],
  [/\bWebSocket\b/, 'WebSocket'],
  [/\bimport\s*\(/, 'import('],
  [/\binnerHTML\b/, 'innerHTML'],
  [/\bouterHTML\b/, 'outerHTML'],
  [/document\s*\.\s*write/, 'document.write'],
  [/document\s*\.\s*cookie/, 'document.cookie'],
  [/\blocalStorage\b/, 'localStorage'],
  [/\bsessionStorage\b/, 'sessionStorage'],
  [/\bpostMessage\b/, 'postMessage'],
  [/http:\/\//, 'http://'],
  [/https:\/\//, 'https://'],
  [/\\u[0-9a-fA-F{]|\\x[0-9a-fA-F]/, 'escapes como \\u o \\x (escribí el carácter directo)'],
];
const MAX_INTERACTIVOS = 60 * 1024;

/** What a subject's interactivos.js may not contain, as a list of messages. */
export function problemasInteractivos(archivo) {
  const crudo = fs.readFileSync(archivo);
  const out = [];
  if (crudo.length > MAX_INTERACTIVOS) out.push(`pesa ${Math.ceil(crudo.length / 1024)} KB y el tope son 60 KB`);
  const texto = crudo.toString('utf8');
  for (const [re, nombre] of PROHIBIDO_INTERACTIVOS) if (re.test(texto)) out.push(`usa ${nombre}, que no está permitido`);
  return out;
}

/** Names registered in the subject's interactivos.js with UTN.interactivo('name', …). */
export function nombresDeInteractivos(archivo) {
  if (!fs.existsSync(archivo)) return new Set();
  return new Set([...fs.readFileSync(archivo, 'utf8').matchAll(/UTN\s*\.\s*interactivo\s*\(\s*['"]([a-z0-9-]+)['"]/g)].map((m) => m[1]));
}

const TIPOS_FORMULA = ['grafico', 'grafico3d'];

/** What a subject offers in the summary maker («creador» in materia.json), checked against its simulators. A missing key
 * offers nothing (the graphs of its pages are still listed). Fails with what to fix. */
export function validarCreador(creador, propios) {
  const falla = (m) => {
    throw new Error(`materia.json, «creador»: ${m}`);
  };
  if (creador === undefined) return { formula: [], interactivos: [] };
  if (creador === null || typeof creador !== 'object' || Array.isArray(creador)) falla('tiene que ser un objeto { "formula": [ … ], "interactivos": [ … ] }.');
  for (const k of Object.keys(creador)) if (!['formula', 'interactivos'].includes(k)) falla(`no conozco la clave «${k}». Las que van son: formula, interactivos.`);
  const formula = creador.formula ?? [];
  if (!Array.isArray(formula)) falla('«formula» es una lista, como ["grafico", "grafico3d"].');
  for (const t of formula) if (!TIPOS_FORMULA.includes(t)) falla(`«formula» no conoce «${t}». Los que hay son: grafico (curva en el plano) y grafico3d (superficie en 3D).`);
  if (new Set(formula).size !== formula.length) falla('«formula» tiene un tipo repetido.');
  const lista = creador.interactivos ?? [];
  if (!Array.isArray(lista)) falla('«interactivos» es una lista de { "nombre", "titulo", "desc" }.');
  const vistos = new Set();
  const interactivos = lista.map((x, i) => {
    const donde = `interactivo ${i + 1}`;
    if (x === null || typeof x !== 'object' || Array.isArray(x)) falla(`${donde} tiene que ser un objeto { "nombre", "titulo", "desc" }.`);
    for (const k of Object.keys(x)) if (!['nombre', 'titulo', 'desc'].includes(k)) falla(`${donde}: no conozco la clave «${k}». Las que van son: nombre, titulo, desc.`);
    const { nombre, titulo, desc } = x;
    if (typeof nombre !== 'string' || !/^[a-z0-9-]{1,40}$/.test(nombre)) falla(`${donde}: «nombre» va en minúsculas y con guiones, hasta 40 letras, como proximo-evento.`);
    if (!INTERNOS.has(nombre) && !propios.has(nombre)) falla(`${donde}: no existe el interactivo «${nombre}». Los que hay son: ${[...INTERNOS, ...propios].join(', ')}. Los propios se registran en interactivos.js con UTN.interactivo('${nombre}', …).`);
    if (vistos.has(nombre)) falla(`${donde}: «${nombre}» está repetido.`);
    vistos.add(nombre);
    if (typeof titulo !== 'string' || !titulo.trim()) falla(`${donde} («${nombre}»): falta «titulo», el nombre que ve el alumno en la lista.`);
    if (titulo.length > 200) falla(`${donde} («${nombre}»): «titulo» pasa de 200 caracteres.`);
    if (typeof desc !== 'string' || desc.trim().length < 20) falla(`${donde} («${nombre}»): falta «desc», una descripción con palabras de lo que muestra, para quien no puede ver la figura (al menos 20 caracteres).`);
    if (desc.length > 800) falla(`${donde} («${nombre}»): «desc» pasa de 800 caracteres.`);
    return { tipo: 'interactivo', nombre, titulo: titulo.trim(), desc: desc.trim() };
  });
  return { formula, interactivos };
}

export function prepararInteractivos(fuente, destino) {
  const archivo = path.join(fuente, 'interactivos.js');
  if (!fs.existsSync(archivo)) return false;
  const prob = problemasInteractivos(archivo);
  if (prob.length) throw new Error(`interactivos.js no se puede usar: ${prob.join('; ')}.`);
  fs.copyFileSync(archivo, path.join(destino, 'interactivos.js'));
  return true;
}

function revisor(cartel) {
  const falla = (m) => {
    throw new Error(`${cartel}: ${m}`);
  };
  const lista = (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
  const claves = (o, validas, donde) => {
    if (o === null || typeof o !== 'object' || Array.isArray(o)) falla(`${donde} tiene que ser un objeto { … }.`);
    for (const k of Object.keys(o)) if (!validas.includes(k)) falla(`${donde}: no conozco la clave «${k}». Las que van son: ${validas.join(', ')}.`);
  };
  const expr = (src, vars, donde) => {
    if (typeof src !== 'string' && typeof src !== 'number') falla(`${donde}: falta la fórmula.`);
    if (typeof src === 'number') return () => src;
    const m = E.revisar(src, vars);
    if (m) falla(`${donde}: «${src}». ${m}`);
    return E.compilar(src, vars);
  };
  const numero = (src, vars, donde, esc = {}) => {
    const v = expr(src, vars, donde)(esc);
    if (!Number.isFinite(v)) falla(`${donde}: «${src}» no da un número.`);
    return v;
  };
  const rango = (par, vars, donde, esc) => {
    if (!Array.isArray(par) || par.length !== 2) falla(`${donde}: se escribe [desde, hasta].`);
    const a = numero(par[0], vars, `${donde}, desde`, esc);
    const b = numero(par[1], vars, `${donde}, hasta`, esc);
    if (!(a < b)) falla(`${donde}: «desde» tiene que ser menor que «hasta».`);
    return [a, b];
  };
  const param = (ps, ocupados) => {
    const esc = Object.create(null);
    const ids = [];
    lista(ps).forEach((p, i) => {
      const donde = `param ${i + 1}`;
      claves(p, ['id', 'etq', 'min', 'max', 'paso', 'valor'], donde);
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(p.id || '')) falla(`${donde}: «id» tiene que ser un nombre corto, como a o k1.`);
      if (E.esReservado(p.id) || ocupados.includes(p.id)) falla(`${donde}: «${p.id}» ya significa otra cosa en las fórmulas. Elegí otro nombre.`);
      if (ids.includes(p.id)) falla(`${donde}: «${p.id}» está repetido.`);
      if (!String(p.etq || '').trim()) falla(`${donde}: falta «etq», el texto que acompaña al control.`);
      const [min, max, valor] = [numero(p.min, [], `${donde}, min`), numero(p.max, [], `${donde}, max`), numero(p.valor, [], `${donde}, valor`)];
      if (!(min < max)) falla(`${donde}: «min» tiene que ser menor que «max».`);
      if (valor < min || valor > max) falla(`${donde}: «valor» tiene que estar entre min y max.`);
      if (p.paso !== undefined && !(numero(p.paso, [], `${donde}, paso`) > 0)) falla(`${donde}: «paso» tiene que ser mayor que cero.`);
      esc[p.id] = valor;
      ids.push(p.id);
    });
    return { ids, esc };
  };
  const algunValor = (fn, donde, n, muestra) => {
    for (let i = 0; i <= n; i += 1) {
      muestra(i / n);
      if (Number.isFinite(fn())) return;
    }
    falla(`${donde} no da ningún valor real en ese rango. Revisá la fórmula o el rango.`);
  };
  return { falla, lista, claves, expr, numero, rango, param, algunValor };
}

function validarGrafico(cfg, r) {
  r.claves(cfg, ['x', 'y', 'igual', 'marcasX', 'ejeX', 'ejeY', 'curvas', 'param', 'puntos', 'vectores', 'verticales', 'area', 'tangente'], 'El cuerpo');
  const [x0, x1] = r.rango(cfg.x, [], '«x»');
  if (cfg.y !== undefined) r.rango(cfg.y, [], '«y»');
  if (cfg.marcasX !== undefined && cfg.marcasX !== 'pi') r.falla('«marcasX» solo puede ser "pi".');
  const { ids, esc } = r.param(cfg.param, ['x', 'y', 't', 'u', 'v', 'z']);
  r.lista(cfg.curvas).forEach((c, i) => {
    const donde = `curva ${i + 1}`;
    r.claves(c, ['f', 'xt', 'yt', 'r', 't', 'etq'], donde);
    if (c.f !== undefined) {
      const f = r.expr(c.f, [...ids, 'x'], `${donde}, f`);
      r.algunValor(() => f(esc), donde, 240, (k) => {
        esc.x = x0 + (x1 - x0) * k;
      });
      return;
    }
    const [t0, t1] = r.rango(c.t, ids, `${donde}, t`, esc);
    if (c.r !== undefined) {
      const f = r.expr(c.r, [...ids, 't'], `${donde}, r`);
      r.algunValor(() => f(esc), donde, 240, (k) => {
        esc.t = t0 + (t1 - t0) * k;
      });
      return;
    }
    if (c.xt === undefined || c.yt === undefined) r.falla(`${donde}: tiene que tener «f», o «xt» e «yt» con «t», o «r» con «t».`);
    const fx = r.expr(c.xt, [...ids, 't'], `${donde}, xt`);
    const fy = r.expr(c.yt, [...ids, 't'], `${donde}, yt`);
    r.algunValor(() => fx(esc) + fy(esc), donde, 240, (k) => {
      esc.t = t0 + (t1 - t0) * k;
    });
  });
  r.lista(cfg.puntos).forEach((p, i) => {
    r.claves(p, ['x', 'y', 'etq', 'abierto'], `punto ${i + 1}`);
    r.expr(p.x, ids, `punto ${i + 1}, x`);
    r.expr(p.y, ids, `punto ${i + 1}, y`);
  });
  r.lista(cfg.vectores).forEach((v, i) => {
    r.claves(v, ['de', 'a', 'etq'], `vector ${i + 1}`);
    if (!Array.isArray(v.a) || v.a.length !== 2) r.falla(`vector ${i + 1}: «a» se escribe [x, y].`);
    if (v.de !== undefined && (!Array.isArray(v.de) || v.de.length !== 2)) r.falla(`vector ${i + 1}: «de» se escribe [x, y].`);
    [...v.a, ...(v.de || [])].forEach((s) => r.expr(s, ids, `vector ${i + 1}`));
  });
  r.lista(cfg.verticales).forEach((v, i) => {
    r.claves(v, ['x', 'etq'], `vertical ${i + 1}`);
    r.expr(v.x, ids, `vertical ${i + 1}, x`);
  });
  r.lista(cfg.area).forEach((a, i) => {
    r.claves(a, ['f', 'g', 'de', 'a', 'etq'], `área ${i + 1}`);
    r.expr(a.f, [...ids, 'x'], `área ${i + 1}, f`);
    if (a.g !== undefined) r.expr(a.g, [...ids, 'x'], `área ${i + 1}, g`);
    r.expr(a.de, ids, `área ${i + 1}, de`);
    r.expr(a.a, ids, `área ${i + 1}, a`);
  });
  r.lista(cfg.tangente).forEach((t, i) => {
    r.claves(t, ['f', 'en', 'etq'], `tangente ${i + 1}`);
    r.expr(t.f, [...ids, 'x'], `tangente ${i + 1}, f`);
    r.expr(t.en, ids, `tangente ${i + 1}, en`);
  });
  const hay = ['curvas', 'puntos', 'vectores', 'verticales', 'area', 'tangente'].some((k) => r.lista(cfg[k]).length);
  if (!hay) r.falla('no hay nada para dibujar. Poné «curvas», «puntos», «vectores», «verticales», «area» o «tangente».');
}

function validarGrafico3d(cfg, r) {
  r.claves(cfg, ['x', 'y', 'z', 'igual', 'ejeX', 'ejeY', 'ejeZ', 'superficies', 'planos', 'vectores', 'puntos', 'curvas', 'param'], 'El cuerpo');
  const [x0, x1] = r.rango(cfg.x, [], '«x»');
  const [y0, y1] = r.rango(cfg.y, [], '«y»');
  if (cfg.z !== undefined) r.rango(cfg.z, [], '«z»');
  const { ids, esc } = r.param(cfg.param, ['x', 'y', 't', 'u', 'v', 'z']);
  r.lista(cfg.superficies).forEach((s, i) => {
    const donde = `superficie ${i + 1}`;
    r.claves(s, ['z', 'xuv', 'yuv', 'zuv', 'u', 'v', 'n', 'etq'], donde);
    if (s.n !== undefined && !(Number.isInteger(s.n) && s.n >= 8 && s.n <= 90)) r.falla(`${donde}: «n» es un entero entre 8 y 90.`);
    if (s.z !== undefined) {
      const f = r.expr(s.z, [...ids, 'x', 'y'], `${donde}, z`);
      r.algunValor(() => f(esc), donde, 120, (k) => {
        esc.x = x0 + (x1 - x0) * k;
        esc.y = y0 + (y1 - y0) * ((k * 37) % 1);
      });
      return;
    }
    if (s.xuv === undefined || s.yuv === undefined || s.zuv === undefined) r.falla(`${donde}: tiene que tener «z», o «xuv», «yuv» y «zuv» con «u» y «v».`);
    const [u0, u1] = r.rango(s.u, ids, `${donde}, u`, esc);
    const [v0, v1] = r.rango(s.v, ids, `${donde}, v`, esc);
    const fs3 = ['xuv', 'yuv', 'zuv'].map((k) => r.expr(s[k], [...ids, 'u', 'v'], `${donde}, ${k}`));
    r.algunValor(() => fs3.reduce((t, f) => t + f(esc), 0), donde, 120, (k) => {
      esc.u = u0 + (u1 - u0) * k;
      esc.v = v0 + (v1 - v0) * ((k * 37) % 1);
    });
  });
  r.lista(cfg.planos).forEach((p, i) => {
    const donde = `plano ${i + 1}`;
    r.claves(p, ['a', 'b', 'c', 'd', 'etq'], donde);
    const vals = ['a', 'b', 'c', 'd'].map((k) => r.numero(p[k], ids, `${donde}, ${k}`, esc));
    if (!vals[0] && !vals[1] && !vals[2]) r.falla(`${donde}: «a», «b» y «c» no pueden ser cero a la vez (es ax + by + cz = d).`);
  });
  r.lista(cfg.vectores).forEach((v, i) => {
    r.claves(v, ['de', 'a', 'etq'], `vector ${i + 1}`);
    if (!Array.isArray(v.a) || v.a.length !== 3) r.falla(`vector ${i + 1}: «a» se escribe [x, y, z].`);
    if (v.de !== undefined && (!Array.isArray(v.de) || v.de.length !== 3)) r.falla(`vector ${i + 1}: «de» se escribe [x, y, z].`);
    [...v.a, ...(v.de || [])].forEach((s) => r.expr(s, ids, `vector ${i + 1}`));
  });
  r.lista(cfg.puntos).forEach((p, i) => {
    r.claves(p, ['x', 'y', 'z', 'etq'], `punto ${i + 1}`);
    ['x', 'y', 'z'].forEach((k) => r.expr(p[k], ids, `punto ${i + 1}, ${k}`));
  });
  r.lista(cfg.curvas).forEach((c, i) => {
    const donde = `curva ${i + 1}`;
    r.claves(c, ['xt', 'yt', 'zt', 't', 'etq'], donde);
    r.rango(c.t, ids, `${donde}, t`, esc);
    ['xt', 'yt', 'zt'].forEach((k) => r.expr(c[k], [...ids, 't'], `${donde}, ${k}`));
  });
  const hay = ['superficies', 'planos', 'vectores', 'puntos', 'curvas'].some((k) => r.lista(cfg[k]).length);
  if (!hay) r.falla('no hay nada para dibujar. Poné «superficies», «planos», «vectores», «puntos» o «curvas».');
}

function validarCalculadora(cfg, r) {
  r.claves(cfg, ['entradas', 'salidas'], 'El cuerpo');
  const entradas = r.lista(cfg.entradas);
  const salidas = r.lista(cfg.salidas);
  if (!entradas.length) r.falla('falta «entradas».');
  if (!salidas.length) r.falla('falta «salidas».');
  const esc = Object.create(null);
  const ids = [];
  entradas.forEach((en, i) => {
    const donde = `entrada ${i + 1}`;
    r.claves(en, ['id', 'etq', 'valor', 'unidad', 'min', 'max'], donde);
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(en.id || '')) r.falla(`${donde}: «id» tiene que ser un nombre corto, como m o v0.`);
    if (E.esReservado(en.id)) r.falla(`${donde}: «${en.id}» ya significa otra cosa en las fórmulas. Elegí otro nombre.`);
    if (ids.includes(en.id)) r.falla(`${donde}: «${en.id}» está repetido.`);
    if (!String(en.etq || '').trim()) r.falla(`${donde}: falta «etq».`);
    if (typeof en.valor !== 'number' || !Number.isFinite(en.valor)) r.falla(`${donde}: «valor» tiene que ser un número.`);
    if (en.min !== undefined && typeof en.min !== 'number') r.falla(`${donde}: «min» tiene que ser un número.`);
    if (en.max !== undefined && typeof en.max !== 'number') r.falla(`${donde}: «max» tiene que ser un número.`);
    if ((en.min !== undefined && en.valor < en.min) || (en.max !== undefined && en.valor > en.max)) r.falla(`${donde}: «valor» está fuera de min y max.`);
    esc[en.id] = en.valor;
    ids.push(en.id);
  });
  salidas.forEach((s, i) => {
    const donde = `salida ${i + 1}`;
    r.claves(s, ['etq', 'f', 'unidad', 'dec', 'id'], donde);
    if (!String(s.etq || '').trim()) r.falla(`${donde}: falta «etq».`);
    if (s.dec !== undefined && !(Number.isInteger(s.dec) && s.dec >= 0 && s.dec <= 12)) r.falla(`${donde}: «dec» es un entero entre 0 y 12.`);
    const v = r.expr(s.f, ids, `${donde}, f`)(esc);
    if (!Number.isFinite(v)) r.falla(`${donde}: con los valores de ejemplo «${s.f}» no da un número.`);
    if (s.id) {
      if (ids.includes(s.id) || E.esReservado(s.id)) r.falla(`${donde}: «${s.id}» ya está usado.`);
      esc[s.id] = v;
      ids.push(s.id);
    }
  });
}

/** Turns one block into its figure. ctx: { renderLinea, esc, interactivos: Set of names of this subject }. */
export function bloqueWidget(n, ctx) {
  const partes = n.args.split('|').map((s) => s.trim());
  const interactivo = n.nombre === 'interactivo';
  const nombre = interactivo ? partes[0] : '';
  const titulo = interactivo ? partes[1] : partes[0];
  const fuente = (interactivo ? partes[2] : partes[1]) || '';
  const cartel = `:::${n.nombre} «${titulo || nombre || 'sin título'}»`;
  const r = revisor(cartel);
  if (!titulo) r.falla(interactivo ? 'se escribe «:::interactivo nombre | Título».' : `falta el título. Se escribe «:::${n.nombre} Título | Fuente».`);
  if (!interactivo && !fuente) r.falla(`falta la fuente. Se escribe «:::${n.nombre} Título | Fuente»: de qué apunte y página sale.`);
  if (n.lineas.some((l) => typeof l !== 'string')) r.falla('el cuerpo es solo JSON, sin otro bloque adentro.');
  const crudo = n.lineas.join('\n').trim();
  if (!crudo && !interactivo) r.falla('falta el cuerpo en JSON, con «desc» y los datos.');
  let datos;
  try {
    datos = JSON.parse(crudo || '{}');
  } catch (e) {
    r.falla(`el JSON está roto (${e.message}). Revisá comas y comillas: las claves y los textos van entre comillas dobles.`);
  }
  if (datos === null || typeof datos !== 'object' || Array.isArray(datos)) r.falla('el cuerpo tiene que ser un objeto JSON { … }.');
  const { desc, ...cfg } = datos;
  if (typeof desc !== 'string' || desc.trim().length < 20) r.falla('falta «desc», una descripción con palabras de lo que se ve y qué enseña, para quien no puede ver la figura.');
  if (n.nombre === 'grafico') validarGrafico(cfg, r);
  else if (n.nombre === 'grafico3d') validarGrafico3d(cfg, r);
  else if (n.nombre === 'calculadora') validarCalculadora(cfg, r);
  else if (!/^[a-z0-9-]+$/.test(nombre)) r.falla('el nombre va en minúsculas y con guiones, como tabla-verdad.');
  else if (!INTERNOS.has(nombre) && !ctx.interactivos.has(nombre)) r.falla(`no existe el interactivo «${nombre}». Los que hay son: ${[...INTERNOS, ...ctx.interactivos].join(', ')}. Los propios se registran en interactivos.js con UTN.interactivo('${nombre}', …).`);

  const fuenteTxt = fuente.replace(/^fuente:\s*/i, '');
  const leyenda = n.nombre === 'calculadora' ? `<p class="w-nota">${ctx.esc(LEYENDA)}</p>` : '';
  const atributoNombre = interactivo ? ` data-nombre="${escAttr(nombre)}"` : '';
  return `<figure class="w w-${n.nombre}" data-w="${n.nombre}"${atributoNombre} data-cfg="${escAttr(JSON.stringify(cfg))}"><figcaption><span class="w-t">${ctx.renderLinea(titulo)}</span>${fuenteTxt ? `<span class="w-f">Fuente: ${ctx.esc(fuenteTxt)}</span>` : ''}</figcaption><div class="w-lienzo"></div>${leyenda}<div class="w-desc">${ctx.renderLinea(desc)}</div></figure>\n`;
}
