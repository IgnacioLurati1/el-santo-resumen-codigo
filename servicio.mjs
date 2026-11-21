// What every page shares for the service and the emergency protocol: scripts, the band and the buttons.
import fs from 'node:fs';
import path from 'node:path';
import { CAMBIO_RAPIDO, NIVELES } from './niveles.mjs';

export const SIN_VERIFICAR_FIN = 'Respuesta no verificada. Puede tener errores.';
export const SIN_VERIFICAR = 'Respuesta no verificada. La propuso Luta Studios con inteligencia artificial y ningún docente la revisó. Puede tener errores.';

export const banda = `<div class="em-banda em-solo" role="region" aria-label="Protocolo de emergencia" tabindex="-1"><p><b>Protocolo de emergencia prendido.</b> Cada materia queda en lo necesario para rendir, con los exámenes y su respuesta. Apagalo para volver a ver todo.</p><button type="button" class="b-sec" data-em-apagar>Apagar</button></div>`;

export const botonesEmergencia = (clase) => `<button type="button" class="${clase} em-fuera" data-em-prender><span class="em-largo">Protocolo de emergencia</span><span class="em-corto">Emergencia</span></button><button type="button" class="${clase} em-solo" data-em-apagar>Apagar emergencia</button>`;

// Hidden until cuenta.js knows there is a service.
export const botonCuenta = (clase) => `<button type="button" class="${clase}" data-cuenta hidden>Ingresar</button>`;

// progreso.js goes right after api.js on every page: it keeps the progress of a signed-in account in step (012).
export const scriptsServicio = (assets, extras = []) => ['api', 'progreso', 'uso', 'emergencia', ...extras].map((s) => `<script src="${assets}/${s}.js" defer></script>`).join('\n');

const COMPARTIDOS = ['progreso.js', 'uso.js', 'emergencia.js', 'cuenta.js', 'estrellas.js', 'banco.js', 'mis.js', 'reportar.js', 'propuesta.js', 'diagrama.js', 'consejos.js', 'crear.js'];

// The service address and its publishable key are decided at build time. Each one is a single constant.
const delArmado = () => {
  // Public values, committed on purpose. The environment overrides them, and UTN_API= (empty) builds without service.
  const fijo = JSON.parse(fs.readFileSync(new URL('./servicio.json', import.meta.url), 'utf8'));
  const base = (process.env.UTN_API ?? fijo.base).trim();
  const clave = (process.env.UTN_CLAVE ?? fijo.clave).trim();
  if (base) {
    const u = new URL(base);
    if (u.protocol !== 'https:' && !['127.0.0.1', 'localhost'].includes(u.hostname)) throw new Error(`UTN_API tiene que ser https: ${base}`);
  }
  return { BASE: base, CLAVE: clave };
};

export const copiarServicio = (aqui, assets) => {
  fs.mkdirSync(assets, { recursive: true });
  for (const f of COMPARTIDOS) fs.copyFileSync(path.join(aqui, 'plantilla', f), path.join(assets, f));
  let api = fs.readFileSync(path.join(aqui, 'plantilla', 'api.js'), 'utf8');
  for (const [nombre, valor] of Object.entries(delArmado())) {
    const marca = `const ${nombre} = '';`;
    if (!api.includes(marca)) throw new Error(`plantilla/api.js: no está la constante ${nombre}`);
    api = api.replace(marca, () => `const ${nombre} = ${JSON.stringify(valor)};`);
  }
  fs.writeFileSync(path.join(assets, 'api.js'), api);
  // Same words as the built pages, from one place.
  let niveles = fs.readFileSync(path.join(aqui, 'plantilla', 'niveles.js'), 'utf8');
  for (const [marca, valor] of [['const TEXTOS = {};', `const TEXTOS = ${JSON.stringify(NIVELES)};`], ["const RAPIDA = '';", `const RAPIDA = ${JSON.stringify(CAMBIO_RAPIDO)};`]]) {
    if (!niveles.includes(marca)) throw new Error(`plantilla/niveles.js: no está ${marca}`);
    niveles = niveles.replace(marca, () => valor);
  }
  fs.writeFileSync(path.join(assets, 'niveles.js'), niveles);
};
