/* ═══════════════════════════════════════════════
   CDM Gestión Fútbol Mayor — Navegación compartida
   ═══════════════════════════════════════════════ */

(function () {
  const MODULES = [
    { id: 'comprobantes', label: 'Comprobantes', icon: '📄', href: 'comprobantes.html' },
    { id: 'tesoreria',    label: 'Tesorería',    icon: '💰', href: 'tesoreria.html'    },
    { id: 'asistencias',  label: 'Asistencias',  icon: '👥', href: 'asistencias.html'  },
    { id: 'partidos',     label: 'Partidos',      icon: '⚽', href: 'partidos.html'     },
    { id: 'reportes',     label: 'Reportes',      icon: '📊', href: 'reportes.html'     },
  ];

  function getCurrentModule() {
    const path = window.location.pathname.toLowerCase();
    for (const m of MODULES) {
      if (path.endsWith(m.href.toLowerCase())) return m.id;
    }
    return null;
  }

  function renderNav() {
    const active = getCurrentModule();
    const nav = document.createElement('nav');
    nav.className = 'bnav-modules';
    nav.setAttribute('aria-label', 'Navegación principal');

    for (const m of MODULES) {
      const a = document.createElement('a');
      a.className = 'nb-btn' + (m.id === active ? ' active' : '');
      a.href = m.href;
      a.setAttribute('aria-label', m.label);
      a.innerHTML =
        `<span class="nb-icon">${m.icon}</span>` +
        `<span class="nb-lbl">${m.label}</span>`;
      nav.appendChild(a);
    }

    // Insertar en el placeholder si existe, o al final del body
    const placeholder = document.getElementById('bottom-nav');
    if (placeholder) {
      placeholder.replaceWith(nav);
    } else {
      document.body.appendChild(nav);
    }
  }

  // Ejecutar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderNav);
  } else {
    renderNav();
  }
})();
