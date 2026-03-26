/* ═══════════════════════════════════════════════
   CDM Gestión Fútbol Mayor — API compartida
   ═══════════════════════════════════════════════ */

const CDM_API_KEY = 'cdm-api-url';

function getApiUrl() {
  return localStorage.getItem(CDM_API_KEY) || '';
}

function setApiUrl(url) {
  localStorage.setItem(CDM_API_KEY, url.trim());
}

/**
 * Envía una acción al backend de Apps Script.
 * @param {string} action  - Nombre de la acción (ej: 'saveMovimiento')
 * @param {object} payload - Datos adicionales para la acción
 * @returns {Promise<object>} - Respuesta del backend { ok, ... }
 */
async function apiPost(action, payload = {}) {
  const url = getApiUrl();
  if (!url) throw new Error('URL del script no configurada');

  const body = JSON.stringify({ action, ...payload });

  const resp = await fetch(url, {
    method: 'POST',
    // text/plain evita el preflight CORS en Apps Script
    headers: { 'Content-Type': 'text/plain' },
    body,
  });

  if (!resp.ok) throw new Error('Error HTTP ' + resp.status);
  const data = await resp.json();
  if (!data.ok) throw new Error(data.error || 'Error del servidor');
  return data;
}

/**
 * Muestra un toast de feedback.
 * @param {string}  msg  - Mensaje a mostrar
 * @param {boolean} ok   - true = éxito (verde), false = error (rojo)
 * @param {number}  ms   - Duración en milisegundos (default 2400)
 */
function showToast(msg, ok = true, ms = 2400) {
  let el = document.getElementById('cdm-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'cdm-toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = 'toast ' + (ok ? 'ok' : 'err');
  // Forzar reflow para reiniciar animación si ya estaba visible
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), ms);
}
