#!/usr/bin/env node
// Builds the UTN study site into public/utn (git ignores it) so that vite copies it to dist and the CSP plugin
// covers it. It runs by itself before `npm run build`. Nothing on the main site links to it.
// Fails if a page comes out without its noindex or closing notice, or with formula internals showing as text.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { armarSinInternet } from './sin-internet.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
// The panel builds into public/utn. The open source copy passes its own folder: node armar.mjs dist
const salida = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(aqui, '../../public/utn');
const fuente = path.join(aqui, 'fuente');
const lista = path.join(aqui, 'materias.json');
const SIMULTANEAS = 6;

const correr = (script, args) =>
  new Promise((resolve, reject) => {
    const hijo = spawn(process.execPath, [path.join(aqui, script), ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
    let errores = '';
    hijo.stderr.on('data', (d) => {
      errores += d;
    });
    hijo.on('error', reject);
    hijo.on('close', (codigo) => (codigo === 0 ? resolve() : reject(new Error(`${script} ${args[0]}: ${errores.slice(-1500)}`))));
  });

const paginas = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) return paginas(f);
    return e.name.endsWith('.html') ? [f] : [];
  });

const revisar = (f) => {
  const t = fs.readFileSync(f, 'utf8');
  const problemas = [];
  if (!/<meta name="robots" content="noindex/.test(t)) problemas.push('sin noindex');
  if (!t.includes('class="aviso-final"')) problemas.push('sin aviso final');
  const visible = t.replace(/<(script|style|textarea|pre|code)\b[\s\S]*?<\/\1>/g, ' ').replace(/<[^<>]*>/g, ' ');
  if (/"\/>|&quot;\/&gt;|<path\b/.test(visible)) problemas.push('código de una fórmula a la vista');
  return problemas.map((p) => `${path.relative(salida, f)}: ${p}`);
};

const materias = JSON.parse(fs.readFileSync(lista, 'utf8'));
fs.rmSync(salida, { recursive: true, force: true });
const pendientes = materias.map((m) => m.slug);
await Promise.all(
  Array.from({ length: SIMULTANEAS }, async () => {
    while (pendientes.length) {
      const slug = pendientes.shift();
      await correr('construir.mjs', [path.join(fuente, slug), salida]);
    }
  }),
);
await correr('hub.mjs', [lista, fuente, salida]);

// The list of subjects and pages the service accepts.
const generador = path.join(aqui, 'generar-paginas.mjs');
if (fs.existsSync(generador)) (await import(pathToFileURL(generador).href)).generarPaginas();

// Reading without internet: what each subject needs, and the service worker that answers from it (scope /utn/).
armarSinInternet(salida, materias);
fs.copyFileSync(path.join(aqui, 'plantilla', 'sw.js'), path.join(salida, 'sw.js'));

const todas = paginas(salida);
const problemas = todas.flatMap(revisar);
// Pages the emergency protocol and the bank depend on. Proposals may only sit in an exam page, behind the protocol.
const obligatorias = ['banco.html', 'privacidad.html', ...materias.map((m) => path.join(m.slug, 'emergencia.html'))];
for (const f of obligatorias) if (!fs.existsSync(path.join(salida, f))) problemas.push(`${f}: falta`);
for (const f of todas) {
  if (!fs.readFileSync(f, 'utf8').includes('em-propuesta')) continue;
  if (!/^ej-/.test(path.basename(f))) problemas.push(`${path.relative(salida, f)}: propuesta fuera de la página de un examen`);
}
if (problemas.length) {
  console.error(`Apuntes UTN con problemas:\n${problemas.slice(0, 30).join('\n')}`);
  process.exit(1);
}
console.log(`Apuntes UTN: ${materias.length} materias, ${todas.length} páginas.`);
