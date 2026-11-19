// Pen drawings in the notebook's line, shared by the home cards and the menu. Drawn on a 48 grid with strokes only,
// so they take the text color. The CSS of each place sets the size and the stroke width.
export const ICONOS = {
  mapa: '<path d="M5 11l12-5 14 5 12-5v31l-12 5-14-5-12 5z"/><path d="M17 6v31M31 11v31"/><path d="M9 30c4-2 6 2 10-1s5-9 10-8 4 5 9 3" stroke-dasharray="2.5 3"/>',
  pila: '<path d="M15 5h22l5 5v26H15z"/><path d="M37 5v5h5"/><path d="M10 11v31h26"/><path d="M20 16h12M20 21h16M20 26h10"/>',
  foco: '<path d="M24 6a12 12 0 0 0-7 21.8V32h14v-4.2A12 12 0 0 0 24 6z"/><path d="M18 37h12M20 42h8"/><path d="M24 32v-8l-3-3M24 24l3-3"/>',
  sirena: '<path d="M15 35V25a9 9 0 0 1 18 0v10"/><path d="M10 35h28v6H10z"/><path d="M24 4v5M9 11l3.5 3.5M39 11l-3.5 3.5M4 24h4M40 24h4"/><path d="M20 25a4 4 0 0 1 4-4"/>',
  pieza: '<path d="M10 16h8a5 5 0 1 1 10 0h8v8a5 5 0 1 1 0 10v8h-8a5 5 0 1 0-10 0h-8v-8a5 5 0 1 0 0-10z"/>',
  casa: '<path d="M5 23L24 7l19 16"/><path d="M10 19v23h28V19"/><path d="M20 42V30h8v12"/><path d="M32 12V7h4v8.4"/>',
  subir: '<path d="M24 32V7"/><path d="M15 16l9-9 9 9"/><path d="M7 29v12h34V29"/>',
  lapiz: '<path d="M9 39l4-12L32 8l8 8-19 19z"/><path d="M28 12l8 8"/><path d="M13 27l8 8"/>',
  plan: '<path d="M5 7h13v9H5zM30 7h13v9H30zM17.5 32h13v9h-13z"/><path d="M11.5 16v7h25v-7M24 23v9"/>',
  calendario: '<path d="M6 10h36v32H6z"/><path d="M6 19h36"/><path d="M15 5v9M33 5v9"/><path d="M13 26h4M22 26h4M31 26h4M13 34h4M22 34h4"/>',
  sobre: '<path d="M5 11h38v27H5z"/><path d="M5 12l19 15 19-15"/><path d="M5 37l14-12M43 37L29 25"/>',
  gracias: '<path d="M24 41C11 32 5 24 6 16.5 7 11 11 7.5 15.8 7.5c3.6 0 6.4 2 8.2 5.2 1.8-3.2 4.6-5.2 8.2-5.2C37 7.5 41 11 42 16.5 43 24 37 32 24 41z"/><path d="M16 15.5c-2 .5-3.4 2.2-3.6 4.3"/>',
  candado: '<path d="M10 22h28v20H10z"/><path d="M16 22v-6a8 8 0 0 1 16 0v6"/><path d="M24 29v6"/>',
  curita: '<path d="M9 31L31 9a5.7 5.7 0 0 1 8 0a5.7 5.7 0 0 1 0 8L17 39a5.7 5.7 0 0 1-8 0a5.7 5.7 0 0 1 0-8z"/><path d="M18.5 22.5l7 7M22.5 18.5l7 7"/><path d="M23 24h.01M25 22h.01M25 26h.01M27 24h.01"/>',
  birrete: '<path d="M4 18l20-9 20 9-20 9z"/><path d="M12 22v9c0 3.3 5.4 6 12 6s12-2.7 12-6v-9"/><path d="M44 18v12"/>',
  pdf: '<path d="M11 5h18l8 8v30H11z"/><path d="M29 5v8h8"/><path d="M24 19v15"/><path d="M18 28l6 6 6-6"/>',
  reloj: '<circle cx="24" cy="27" r="15"/><path d="M24 18v9l6 4"/><path d="M19 5h10M24 5v7"/><path d="M36 14l3-3"/>',
  menu: '<path d="M8 14h32M8 24h32M8 34h20"/>',
  cerrar: '<path d="M13 13l22 22M35 13L13 35"/>',
};

export const icono = (nombre, clase) => (ICONOS[nombre] ? `<svg class="${clase}" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${ICONOS[nombre]}</svg>` : '');
