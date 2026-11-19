// The search index for the whole degree, built from each subject's own index. It is a separate file, downloaded on first use.
// The subject indexes never include proposed answers, and this checks it again: a leak here would show unverified answers
// with the protocol off.
import fs from 'node:fs';
import path from 'node:path';

const TEXTO = 260;

const llano = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Proposal text as it would come out of a page: Markdown marks and formulas removed, so a long plain stretch can be compared.
const muestrasDePropuestas = (fuente, slug) => {
  const f = path.join(fuente, slug, 'propuestas.json');
  if (!fs.existsSync(f)) return [];
  return Object.values(JSON.parse(fs.readFileSync(f, 'utf8')))
    .filter((p) => p.md)
    .flatMap((p) => llano(p.md.replace(/\$[^$]*\$/g, ' ').replace(/[#*`|_]/g, ' ')).split(' ').reduce((trozos, w, i) => {
      if (i % 12 === 0) trozos.push([]);
      trozos.at(-1).push(w);
      return trozos;
    }, []).filter((t) => t.length === 12).map((t) => t.join(' ')))
    // A proposal may quote the subject's own pages word for word (theorems and definitions go literal). That text is
    // already public, so it is not a leak.
    .filter((t) => !publico(fuente, slug).includes(t));
};

// Plain text of the subject's pages that show with the protocol off: every Markdown file except the emergency one.
const publicos = new Map();
const publico = (fuente, slug) => {
  if (!publicos.has(slug)) {
    const dir = path.join(fuente, slug);
    // Twice, with and without formulas: a lone «$» (a price) pairs with the next one and would swallow the text between.
    const textos = fs.readdirSync(dir).filter((a) => a.endsWith('.md') && a !== 'emergencia.md').map((a) => fs.readFileSync(path.join(dir, a), 'utf8'));
    publicos.set(slug, llano([...textos.map((t) => t.replace(/\$[^$]*\$/g, ' ')), ...textos].join(' ').replace(/[#*`|_]/g, ' ')));
  }
  return publicos.get(slug);
};

export function armarIndice(materias, fuente, salida) {
  publicos.clear();
  const datos = [];
  const muestras = [];
  for (const m of materias) {
    const f = path.join(salida, m.slug, 'buscar.js');
    if (!fs.existsSync(f)) continue;
    const crudo = fs.readFileSync(f, 'utf8').trim().replace(/^window\.UTN_BUSCAR=/, '').replace(/;$/, '');
    const entradas = JSON.parse(crudo);
    if (entradas.some((e) => e.id === 'propuesta')) throw new Error(`Índice de búsqueda: ${m.slug} trae una propuesta`);
    datos.push({ s: m.slug, n: m.nombre, e: entradas.map((e) => [e.p, e.pn, e.id, e.t, e.x.slice(0, TEXTO)]) });
    muestras.push(...muestrasDePropuestas(fuente, m.slug));
  }
  const json = JSON.stringify(datos);
  const comparar = llano(json);
  const fuga = muestras.find((t) => comparar.includes(t));
  if (fuga) throw new Error(`Índice de búsqueda: trae texto de una propuesta («${fuga}»)`);
  fs.mkdirSync(path.join(salida, '_'), { recursive: true });
  fs.writeFileSync(path.join(salida, '_', 'indice-carrera.json'), json);
  return Buffer.byteLength(json);
}
