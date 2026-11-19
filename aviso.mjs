// Closing notice at the very bottom of every page. It stays visible in full screen and when printing.
export const AVISO_FINAL = 'Este contenido se basa en el material disponible en el Drive de la carrera. No reemplaza bajo ningún concepto lo dado por los docentes en cada aula, y los resúmenes no están verificados por ellos. Se recomienda fuertemente verificarlos con el material que brindan tus profesores y adaptarlos para tu uso personal o grupal con el botón Editar, en la barra de arriba de cada resumen.';

export const pieConAviso = (pie, raiz = '') => `<footer><div class="pie"><p>${pie} <a href="${raiz}privacidad.html">Tu privacidad</a></p></div><p class="aviso-final">${AVISO_FINAL}</p></footer>`;
