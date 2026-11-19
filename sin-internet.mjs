// «Guardar para leer sin internet»: the list of what each subject needs to be read with no connection, in
// <subject>/sin-internet.json. Its own files (pages, exercises, emergency protocol, figures and pictures) without the
// PDF page, the shared ones its pages load (styles, scripts, KaTeX and its woff2 letters), the scripts the figures load
// later, and the map of subjects. The version is a hash of all of it, so a saved subject knows when it changed.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const FUERA = new Set(['pdf.html', 'sin-internet.json']);
// Loaded later by piezas.js and the figures, so no page names them.
const SIEMPRE = ['_/w.js', '_/expr.js', '_/w.css', 'materias.html'];

const archivosDe = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? archivosDe(p) : [p];
  });

// The local files a page or a style sheet points to, as paths inside the site.
const referencias = (salida, archivo) => {
  const texto = fs.readFileSync(archivo, 'utf8');
  const dir = path.dirname(archivo);
  const encontrados = [];
  const sumar = (ref) => {
    if (!ref || /^(https?:|data:|mailto:|#|\/)/.test(ref)) return;
    const limpio = ref.split(/[?#]/)[0];
    const p = path.resolve(dir, decodeURIComponent(limpio));
    if (p.startsWith(salida) && fs.existsSync(p) && fs.statSync(p).isFile()) encontrados.push(p);
  };
  if (archivo.endsWith('.html')) {
    for (const m of texto.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)) sumar(m[1]);
    for (const m of texto.matchAll(/<link[^>]*\srel="stylesheet"[^>]*\shref="([^"]+)"/g)) sumar(m[1]);
  } else if (archivo.endsWith('.css')) {
    // Only the woff2 letters: every browser that runs a service worker reads them, and they are the first ones listed.
    for (const m of texto.matchAll(/url\(\s*["']?([^"')]+\.woff2)["']?\s*\)/g)) sumar(m[1]);
  }
  return encontrados;
};

export function armarSinInternet(salida, materias) {
  for (const m of materias) {
    const dir = path.join(salida, m.slug);
    if (!fs.existsSync(dir)) continue;
    const todos = new Set(archivosDe(dir).filter((f) => !FUERA.has(path.basename(f)) || path.dirname(f) !== dir));
    for (const f of SIEMPRE) if (fs.existsSync(path.join(salida, f))) todos.add(path.join(salida, f));
    // Pages and the style sheets they bring, until nothing new turns up.
    const revisar = [...todos].filter((f) => /\.(html|css)$/.test(f));
    while (revisar.length) {
      for (const r of referencias(salida, revisar.pop())) {
        if (todos.has(r)) continue;
        todos.add(r);
        if (r.endsWith('.css')) revisar.push(r);
      }
    }
    const lista = [...todos].map((f) => path.relative(salida, f).split(path.sep).join('/')).sort();
    const hash = crypto.createHash('sha256');
    let bytes = 0;
    for (const rel of lista) {
      const contenido = fs.readFileSync(path.join(salida, rel));
      bytes += contenido.length;
      hash.update(rel).update(contenido);
    }
    // The folder itself («<subject>/», as the map opens it) is its index.html for the service worker.
    fs.writeFileSync(path.join(dir, 'sin-internet.json'), JSON.stringify({ v: hash.digest('hex').slice(0, 16), bytes, archivos: lista }));
  }
}
