// How far each summary can be trusted, chosen by hand in niveles.json. Anything missing counts as not judged.
import fs from 'node:fs';
import path from 'node:path';

export const NIVELES = {
  fuerte: { nombre: 'Fuerte', texto: 'Resumen fuerte. Alcanza para estudiar todo sin depender del material original.' },
  normal: { nombre: 'Normal', texto: 'Resumen normal. Se puede estudiar de acá, pero conviene constatar con el material original.' },
  debil: { nombre: 'Débil', texto: 'Resumen débil. Da un pantallazo general. No se recomienda como fuente única.' },
  'no-juzgado': { nombre: 'No juzgado', texto: 'Resumen no juzgado. Todavía nadie evaluó si alcanza para estudiar solo con esto.' },
};
export const CAMBIO_RAPIDO = 'Materia de cambio rápido. El temario cambia seguido. Confirmá con tu comisión qué entra este año.';
export const TIPOS_CON_NIVEL = ['inicio', 'estudio'];
export const PASADA = 'Materia del pasado. Ya no está en el plan de estudios.';

export const leerNiveles = (aqui) => {
  const f = path.join(aqui, 'niveles.json');
  if (!fs.existsSync(f)) return {};
  const todo = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const [slug, m] of Object.entries(todo)) {
    for (const [id, v] of Object.entries(m.resumenes || {})) {
      if (!NIVELES[v]) throw new Error(`niveles.json, ${slug}, ${id}: «${v}» no es un nivel. Usá fuerte, normal, debil o no-juzgado.`);
    }
  }
  return todo;
};

export const leerPasadas = (aqui) => JSON.parse(fs.readFileSync(path.join(aqui, 'secciones', 'pasadas.json'), 'utf8'));
export const nivelDe = (todo, slug, id) => todo[slug]?.resumenes?.[id] || 'no-juzgado';
export const esRapida = (todo, slug) => todo[slug]?.cambioRapido === true;
