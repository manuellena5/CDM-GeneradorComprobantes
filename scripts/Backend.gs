/* ═══════════════════════════════════════════════════════════════════
   CDM Gestión Fútbol Mayor — Backend unificado (Google Apps Script)

   INSTRUCCIONES DE CONFIGURACIÓN:
   1. Abrí script.google.com → Nuevo proyecto (standalone)
   2. Borrá todo el contenido y pegá este código
   3. Reemplazá SPREADSHEET_ID con el ID de tu planilla maestra
      (el ID está en la URL de la planilla: /d/ESTE_ES_EL_ID/edit)
   4. Guardá (Ctrl+S)
   5. Implementar → Nueva implementación → Aplicación web
      - Ejecutar como: Yo
      - Quién tiene acceso: Cualquier persona
   6. Autorizás → copiás la URL /exec
   7. Pegás esa URL en cualquier módulo de la app (pestaña Config)
      — se comparte automáticamente entre todos los módulos

   TRIGGERS DE FORMULARIO (configurar manualmente):
   - En Activadores (reloj) → Agregar activador:
     * onFormSubmitAsistencias → Al enviar formulario (Form de asistencias)
     * onFormSubmitPartidos    → Al enviar formulario (Form de partidos)
═══════════════════════════════════════════════════════════════════ */

// ← REEMPLAZÁ con el ID de tu planilla maestra
const SPREADSHEET_ID = '1ioj2irKPi6U54WSbrcMHRYfykqTA7BdwhdBnE_hdTtQ';

// Nombres de las pestañas en la planilla
const SHEETS = {
  movimientos:    'MOVIMIENTOS',
  comprobantes:   'COMPROBANTES',
  jugadores:      'JUGADORES',
  adhesiones:     'ADHESIONES',
  asistRaw:       'Asistencias_Raw',
  asistData:      'Asistencias_Data',
  partidosRaw:    'Partidos_Raw',
  partidosData:   'Partidos_Data',
};


/* ──────────────────────────────────────────────
   PUNTO DE ENTRADA HTTP
   ────────────────────────────────────────────── */

function doPost(e) {
  try {
    const data   = JSON.parse(e.postData.contents);
    const result = handleAction(data);
    return jsonResponse(result);
  } catch(err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

function doGet() {
  return jsonResponse({ ok: true, msg: 'CDM API activa' });
}


/* ──────────────────────────────────────────────
   DISPATCHER PRINCIPAL
   ────────────────────────────────────────────── */

function handleAction(data) {
  switch (data.action) {

    // ── TESORERÍA (acepta nombres nuevos y aliases del formato anterior) ──
    case 'saveMovimiento':
    case 'save':             return saveMovimiento(data.mov);
    case 'listMovimientos':
    case 'list':             return listMovimientos();

    // ── COMPROBANTES ───────────────────────────
    case 'saveComprobante':  return saveComprobante(data.comp);
    case 'listComprobantes': return listComprobantes(data.limit);

    // ── ASISTENCIAS ────────────────────────────
    case 'getAsistencias':   return getAsistencias(data.filtros);

    // ── PARTIDOS ───────────────────────────────
    case 'getPartidos':      return getPartidos(data.filtros);

    // ── JUGADORES ──────────────────────────────
    case 'getJugadores':     return getJugadores();

    // ── ADHESIONES ─────────────────────────────
    case 'getAdhesiones':    return getAdhesiones();
    case 'saveAdhesion':     return saveAdhesion(data.adhesion);
    case 'updateAdhesion':   return updateAdhesion(data.fila, data.adhesion);

    // ── REGISTRO DE ASISTENCIA (web app PF) ────
    case 'saveAsistencia':   return saveAsistencia(data.asistencia);

    default:
      return { ok: false, error: 'Acción desconocida: ' + data.action };
  }
}


/* ──────────────────────────────────────────────
   TESORERÍA
   ────────────────────────────────────────────── */

function saveMovimiento(m) {
  const sh = getOrCreateSheet(SHEETS.movimientos, [
    'MES','Fecha','Cod. Rubro','Rubro','Concepto',
    '#EGRESOS','#INGRESOS','SALDO','Cuenta','Método','Observaciones','Entidad'
  ]);
  sh.appendRow([
    m.mes           || '',
    m.fecha         || '',
    m.codRubro      || '',
    m.rubro         || '',
    m.concepto      || '',
    m.egreso  !== '' && m.egreso  !== undefined ? Number(m.egreso)  : '',
    m.ingreso !== '' && m.ingreso !== undefined ? Number(m.ingreso) : '',
    '',   // SALDO — fórmula en el Sheet
    m.cuenta        || '',
    m.metodo        || '',
    m.observaciones || '',
    m.entidad       || '',
  ]);
  return { ok: true };
}

function listMovimientos() {
  const sh   = getOrCreateSheet(SHEETS.movimientos);
  const all  = sh.getDataRange().getValues();
  const rows = all.slice(1);
  const movimientos = rows
    .filter(r => r[1])
    .map(r => ({
      mes:           String(r[0]  || ''),
      fecha:         formatFecha(r[1]),
      codRubro:      String(r[2]  || ''),
      rubro:         String(r[3]  || ''),
      concepto:      String(r[4]  || ''),
      egreso:        r[5] !== '' ? Number(r[5]) : '',
      ingreso:       r[6] !== '' ? Number(r[6]) : '',
      saldo:         r[7] !== '' ? Number(r[7]) : '',
      cuenta:        String(r[8]  || ''),
      metodo:        String(r[9]  || ''),
      observaciones: String(r[10] || ''),
      entidad:       String(r[11] || ''),
    }))
    .reverse();
  return { ok: true, movimientos };
}


/* ──────────────────────────────────────────────
   COMPROBANTES
   ────────────────────────────────────────────── */

function saveComprobante(c) {
  const sh = getOrCreateSheet(SHEETS.comprobantes, [
    'Timestamp','Numero','Fecha','TipoDoc','Nombre','DNI',
    'Periodo','Items','Total','MetodoPago','Observaciones'
  ]);
  sh.appendRow([
    new Date(),
    c.numero        || '',
    c.fecha         || '',
    c.tipoDoc       || '',
    c.nombre        || '',
    c.dni           || '',
    c.periodo       || '',
    c.items         || '',
    c.total !== undefined ? Number(c.total) : '',
    c.metodoPago    || '',
    c.observaciones || '',
  ]);
  return { ok: true };
}

function listComprobantes(limit) {
  const sh   = getOrCreateSheet(SHEETS.comprobantes);
  const all  = sh.getDataRange().getValues();
  if (all.length <= 1) return { ok: true, comprobantes: [] };
  let rows = all.slice(1).filter(r => r[1]);
  rows = rows.reverse();
  if (limit) rows = rows.slice(0, Number(limit));
  const comprobantes = rows.map(r => ({
    timestamp:     formatFecha(r[0]),
    numero:        String(r[1]  || ''),
    fecha:         formatFecha(r[2]),
    tipoDoc:       String(r[3]  || ''),
    nombre:        String(r[4]  || ''),
    dni:           String(r[5]  || ''),
    periodo:       String(r[6]  || ''),
    items:         String(r[7]  || ''),
    total:         r[8] !== '' ? Number(r[8]) : '',
    metodoPago:    String(r[9]  || ''),
    observaciones: String(r[10] || ''),
  }));
  return { ok: true, comprobantes };
}


/* ──────────────────────────────────────────────
   ASISTENCIAS
   ────────────────────────────────────────────── */

function getAsistencias(filtros) {
  const sh  = getOrCreateSheet(SHEETS.asistData);
  const all = sh.getDataRange().getValues();
  if (all.length <= 1) return { ok: true, asistencias: [] };
  let rows = all.slice(1).filter(r => r[0]);
  if (filtros && filtros.jugador) {
    const q = filtros.jugador.toLowerCase();
    rows = rows.filter(r => String(r[1]).toLowerCase().includes(q));
  }
  if (filtros && filtros.fechaDesde) {
    rows = rows.filter(r => formatFecha(r[0]) >= filtros.fechaDesde);
  }
  if (filtros && filtros.fechaHasta) {
    rows = rows.filter(r => formatFecha(r[0]) <= filtros.fechaHasta);
  }
  const asistencias = rows.map(r => ({
    fecha:         formatFecha(r[0]),
    jugador:       String(r[1] || ''),
    estado:        normalizeEstado(r[2]),
    litros:        r[3] !== '' ? Number(r[3]) : 0,
    vianda:        String(r[4] || 'NO'),
    remis:         String(r[5] || 'NO'),
    montoRemis:    r[6] !== '' ? Number(r[6]) : 0,
    observacion:   String(r[7] || ''),
    fechaRegistro: r[8] ? formatFecha(r[8]) : '',
  }));
  return { ok: true, asistencias };
}

// Normaliza valores de estado tanto del form antiguo como del nuevo
function normalizeEstado(v) {
  const s = String(v || '').trim();
  if (s === 'Local'    || s === 'Presente')         return 'Presente';
  if (s === 'Afuera'   || s === 'Entrenó Afuera')   return 'Entrenó Afuera';
  if (s === 'AusenteAviso' || s === 'Ausente c/Aviso') return 'Ausente c/Aviso';
  if (s === 'Ausente')                               return 'Ausente';
  return s;
}

// Guardado directo desde la web app del preparador físico
function saveAsistencia(a) {
  if (!a || !a.fecha) return { ok: false, error: 'Fecha requerida' };

  const ss      = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh      = getOrCreateSheet(SHEETS.asistData, [
    'Fecha','Jugador','Estado','Litros','Vianda','Remis','Monto Remis','Observacion','Fecha Registro'
  ]);
  const hojaJug = ss.getSheetByName(SHEETS.jugadores);

  // Mapa de beneficios por jugador
  const mapaJug = {};
  if (hojaJug) {
    hojaJug.getDataRange().getValues().slice(1).forEach(r => {
      const nombre    = String(r[0]  || '').trim();
      const jugCt     = String(r[12] || '').trim();
      const clave     = jugCt || nombre;
      const datos     = {
        litros:     safeNum(r[1]),
        vianda:     (r[2] || 'NO').toString().trim().toUpperCase(),
        remis:      (r[3] || 'NO').toString().trim().toUpperCase(),
        montoRemis: safeNum(r[4]),
      };
      if (clave)                      mapaJug[clave]  = datos;
      if (nombre && nombre !== clave) mapaJug[nombre] = datos;
    });
  }

  // Borrar registros previos para esta fecha (permite reenvío)
  const all = sh.getDataRange().getValues();
  for (let i = all.length; i >= 2; i--) {
    if (formatFecha(all[i - 1][0]) === a.fecha) sh.deleteRow(i);
  }

  // Construir filas (todas las marcaciones se guardan, incluso Ausente)
  const fechaDate = new Date(a.fecha + 'T12:00:00');
  const fechaReg  = new Date();
  const filas = [];
  (a.jugadores || []).forEach(j => {
    if (!j.nombre) return;
    const d     = mapaJug[j.nombre] || {};
    const obs   = j.notas || '';
    if (j.estado === 'Presente') {
      filas.push([fechaDate, j.nombre, 'Presente',        0,          'NO',     'NO',    0,            obs, fechaReg]);
    } else if (j.estado === 'Afuera') {
      filas.push([fechaDate, j.nombre, 'Entrenó Afuera',  d.litros,   d.vianda, d.remis, d.montoRemis, obs, fechaReg]);
    } else if (j.estado === 'AusenteAviso') {
      filas.push([fechaDate, j.nombre, 'Ausente c/Aviso', 0,          'NO',     'NO',    0,            obs, fechaReg]);
    } else {
      filas.push([fechaDate, j.nombre, 'Ausente',         0,          'NO',     'NO',    0,            obs, fechaReg]);
    }
  });

  if (filas.length > 0) {
    sh.getRange(sh.getLastRow() + 1, 1, filas.length, 9).setValues(filas);
  }
  return { ok: true, guardados: filas.length };
}

// Trigger: vincular este activador al Form de asistencias en Apps Script
function onFormSubmitAsistencias(e) {
  generarAsistenciasData();
}

function generarAsistenciasData() {
  const ss         = SpreadsheetApp.openById(SPREADSHEET_ID);
  const hojaResp   = ss.getSheetByName(SHEETS.asistRaw);
  const hojaJug    = ss.getSheetByName(SHEETS.jugadores);
  const hojaDash   = getOrCreateSheet(SHEETS.asistData, [
    'Fecha','Jugador','Estado','Litros','Vianda','Remis','Monto Remis','Observacion','Fecha Registro'
  ]);

  hojaDash.clearContents();
  hojaDash.appendRow(['Fecha','Jugador','Estado','Litros','Vianda','Remis','Monto Remis','Observacion','Fecha Registro']);

  if (!hojaResp || !hojaJug) return;

  const respuestas = hojaResp.getDataRange().getValues();
  const jugadores  = hojaJug.getDataRange().getValues();

  // Mapa nombre/JUGADOR_CT → beneficios
  const mapaJug = {};
  for (let i = 1; i < jugadores.length; i++) {
    const nombre    = jugadores[i][0].toString().trim();
    const jugadorCt = (jugadores[i][12] || '').toString().trim();
    const clave     = jugadorCt || nombre;
    const datos     = {
      litros:     safeNum(jugadores[i][1]),
      vianda:     (jugadores[i][2] || 'NO').toString().trim().toUpperCase(),
      remis:      (jugadores[i][3] || 'NO').toString().trim().toUpperCase(),
      montoRemis: safeNum(jugadores[i][4]),
    };
    if (clave)                          mapaJug[clave]  = datos;
    if (nombre && nombre !== clave)     mapaJug[nombre] = datos;
  }

  // Detectar si un jugador es "de afuera" por sus beneficios
  function esAfuera(d) {
    return d.litros > 0 || d.vianda === 'SI' || d.remis === 'SI';
  }

  // Estructura del nuevo form:
  // Col B (índice 1) → Fecha entrenamiento
  // Col C (índice 2) → Jugadores (presentes)
  // Col D (índice 3) → Ausentes de afuera con aviso
  // Col E (índice 4) → Ausentes locales con aviso
  const filas = [];
  for (let i = 1; i < respuestas.length; i++) {
    const fecha           = respuestas[i][1];
    const presentes       = respuestas[i][2];
    const ausentesAfuera  = respuestas[i][3];
    const ausentesLocales = respuestas[i][4];
    if (!fecha) continue;

    // Jugadores presentes → tipo según configuración en JUGADORES
    if (presentes) {
      for (const n of presentes.toString().split(',')) {
        const nombre = n.trim();
        if (!nombre) continue;
        const d = mapaJug[nombre] || {};
        if (esAfuera(d)) {
          filas.push([fecha, nombre, 'Entrenó Afuera',
            d.litros, d.vianda, d.remis, d.montoRemis, '', '']);
        } else {
          filas.push([fecha, nombre, 'Presente', 0, 'NO', 'NO', 0, '', '']);
        }
      }
    }

    // "Ausentes de afuera con aviso" y "Ausentes locales con aviso" son observaciones
    // de texto libre → no se procesan, solo sirven como nota en Asistencias_Raw
  }

  if (filas.length > 0) {
    hojaDash.getRange(2, 1, filas.length, 9).setValues(filas);
  }
}


/* ──────────────────────────────────────────────
   PARTIDOS
   ────────────────────────────────────────────── */

function getPartidos(filtros) {
  const sh  = getOrCreateSheet(SHEETS.partidosData);
  const all = sh.getDataRange().getValues();
  if (all.length <= 1) return { ok: true, partidos: [] };
  let rows = all.slice(1).filter(r => r[0]);
  if (filtros && filtros.jugador) {
    const q = filtros.jugador.toLowerCase();
    rows = rows.filter(r => String(r[4]).toLowerCase().includes(q));
  }
  if (filtros && filtros.fechaDesde) {
    rows = rows.filter(r => formatFecha(r[0]) >= filtros.fechaDesde);
  }
  if (filtros && filtros.fechaHasta) {
    rows = rows.filter(r => formatFecha(r[0]) <= filtros.fechaHasta);
  }
  const partidos = rows.map(r => ({
    fecha:       formatFecha(r[0]),
    rival:       String(r[1] || ''),
    resultado:   String(r[2] || ''),
    vallaInvicta:String(r[3] || ''),
    jugador:     String(r[4] || ''),
    rol:         String(r[5] || ''),
    goles:       r[6] !== '' ? Number(r[6]) : 0,
  }));
  return { ok: true, partidos };
}

// Trigger: vincular este activador al Form de partidos en Apps Script
function onFormSubmitPartidos(e) {
  generarPartidosData();
}

function generarPartidosData() {
  const ss       = SpreadsheetApp.openById(SPREADSHEET_ID);
  const hojaResp = ss.getSheetByName(SHEETS.partidosRaw);
  const hojaDash = getOrCreateSheet(SHEETS.partidosData, [
    'Fecha','Rival','Resultado','Valla Invicta','Jugador','Rol','Goles'
  ]);

  hojaDash.clearContents();
  hojaDash.appendRow(['Fecha','Rival','Resultado','Valla Invicta','Jugador','Rol','Goles']);

  if (!hojaResp) return;

  const respuestas  = hojaResp.getDataRange().getValues();
  const encabezados = respuestas[0];

  const mapaParticipacion = {};
  const mapaGoles = {};
  for (let c = 0; c < encabezados.length; c++) {
    const col = encabezados[c].toString().trim();
    const mp  = col.match(/^Participacion en el partido \[(.+)\]$/i);
    const mg  = col.match(/^Goles \[(.+)\]$/i);
    if (mp) mapaParticipacion[mp[1].trim()] = c;
    if (mg) mapaGoles[mg[1].trim()] = c;
  }

  const jugadores = Object.keys(mapaParticipacion);
  const filas = [];

  for (let i = 1; i < respuestas.length; i++) {
    const fila      = respuestas[i];
    const fecha     = fila[1];
    const rival     = fila[2];
    const resultado = fila[3];
    const vallaInv  = fila[4];
    if (!fecha) continue;

    for (const jugador of jugadores) {
      const rol   = mapaParticipacion[jugador] !== undefined
        ? fila[mapaParticipacion[jugador]].toString().trim() : '';
      const goles = mapaGoles[jugador] !== undefined
        ? fila[mapaGoles[jugador]].toString().trim() : '';
      if (!rol && !goles) continue;

      // Extraer número de cualquier formato: "1 gol", "2 goles", "2", "Dos (2)", etc.
      const numMatch = goles.match(/\d+/);
      const cantGoles = numMatch ? parseInt(numMatch[0], 10) : 0;

      filas.push([fecha, rival, resultado, vallaInv, jugador, rol, cantGoles]);
    }
  }

  if (filas.length > 0) {
    hojaDash.getRange(2, 1, filas.length, 7).setValues(filas);
  }
}


/* ──────────────────────────────────────────────
   JUGADORES
   ────────────────────────────────────────────── */

// Columnas JUGADORES (orden actual en la planilla):
// A(0)  Nombre                        → Apellido y nombre completo
// B(1)  Litros                        → Litros combustible en partidos de visitante
// C(2)  Vianda                        → SI/NO — vianda en viajes
// D(3)  Remis                         → SI/NO — paga remis en vez de combustible
// E(4)  MontoRemis                    → Monto fijo del remis
// F(5)  Posicion                      → Posición / tipo (Arquero, Defensor, Refuerzo…)
// G(6)  Activo                        → SI/NO — aparece en dropdowns si es SI
// H(7)  MontoPorPartidoTitular        → Monto si jugó de titular
// I(8)  PremioPorGol                  → Premio extra por gol
// J(9)  PremioVallaInvicta            → Premio si el equipo no recibió goles
// K(10) TipoCobro                     → Mensual / Quincenal / Por Partido / Por Fecha
// L(11) CBU                           → CBU para transferencia
// M(12) JUGADOR_CT                    → Nombre tal como figura en el Google Form
// N(13) Apellido                      → Solo el apellido
// O(14) Nombre_Display                → Solo el nombre de pila
// P(15) Rol                           → JUGADOR / CT (cuerpo técnico)
// Q(16) MontoPorPartidoSuplenteConMinutos → Monto si ingresó como suplente con minutos
// R(17) MontoPorPartidoSuplente       → Monto si fue suplente sin ingresar
function getJugadores() {
  const sh  = getOrCreateSheet(SHEETS.jugadores, [
    'Nombre','Litros','Vianda','Remis','MontoRemis','Posicion','Activo',
    'MontoPorPartidoTitular','PremioPorGol','PremioVallaInvicta','TipoCobro','CBU',
    'JUGADOR_CT','Apellido','Nombre_Display','Rol',
    'MontoPorPartidoSuplenteConMinutos','MontoPorPartidoSuplente'
  ]);
  const all = sh.getDataRange().getValues();
  if (all.length <= 1) return { ok: true, jugadores: [] };
  const jugadores = all.slice(1)
    .filter(r => r[0])
    .map(r => ({
      nombre:                          String(r[0]  || ''),
      litros:                          safeNum(r[1]),
      vianda:                          String(r[2]  || 'NO'),
      remis:                           String(r[3]  || 'NO'),
      montoRemis:                      safeNum(r[4]),
      posicion:                        String(r[5]  || ''),
      activo:                          r[6]  !== '' ? String(r[6])  : 'SI',
      montoPorPartidoTitular:          safeNum(r[7]),
      premioPorGol:                    safeNum(r[8]),
      premioVallaInvicta:              safeNum(r[9]),
      tipoCobro:                       String(r[10] || ''),
      cbu:                             String(r[11] || ''),
      jugadorCt:                       String(r[12] || ''),
      apellido:                        String(r[13] || ''),
      nombreDisplay:                   String(r[14] || ''),
      rol:                             String(r[15] || ''),
      montoPorPartidoSuplenteConMin:   safeNum(r[16]),
      montoPorPartidoSuplente:         safeNum(r[17]),
    }));
  return { ok: true, jugadores };
}


/* ──────────────────────────────────────────────
   ADHESIONES
   ────────────────────────────────────────────── */

// Columnas ADHESIONES:
// A=Nombre B=RazonSocial C=Categoria D=CuotaPrometida E=Activo F=CBU G=Telefono H=Observaciones
function getAdhesiones() {
  const sh  = getOrCreateSheet(SHEETS.adhesiones, [
    'Nombre','Razón Social','Categoría','Cuota Prometida','Activo','CBU','Teléfono','Observaciones'
  ]);
  const all = sh.getDataRange().getValues();
  if (all.length <= 1) return { ok: true, adhesiones: [] };
  const adhesiones = all.slice(1)
    .filter(r => r[0])
    .map((r, i) => ({
      fila:           i + 2,  // fila real en el Sheet (para edición)
      nombre:         String(r[0] || ''),
      razonSocial:    String(r[1] || ''),
      categoria:      String(r[2] || ''),
      cuotaPrometida: r[3] !== '' ? Number(r[3]) : 0,
      activo:         r[4] !== '' ? String(r[4]) : 'SI',
      cbu:            String(r[5] || ''),
      telefono:       String(r[6] || ''),
      observaciones:  String(r[7] || ''),
    }));
  return { ok: true, adhesiones };
}

function saveAdhesion(a) {
  const sh = getOrCreateSheet(SHEETS.adhesiones, [
    'Nombre','Razón Social','Categoría','Cuota Prometida','Activo','CBU','Teléfono','Observaciones'
  ]);
  sh.appendRow([
    a.nombre        || '',
    a.razonSocial   || '',
    a.categoria     || '',
    a.cuotaPrometida !== undefined ? Number(a.cuotaPrometida) : '',
    a.activo        || 'SI',
    a.cbu           || '',
    a.telefono      || '',
    a.observaciones || '',
  ]);
  return { ok: true };
}

function updateAdhesion(fila, a) {
  const sh = getOrCreateSheet(SHEETS.adhesiones);
  sh.getRange(fila, 1, 1, 8).setValues([[
    a.nombre        || '',
    a.razonSocial   || '',
    a.categoria     || '',
    a.cuotaPrometida !== undefined ? Number(a.cuotaPrometida) : '',
    a.activo        || 'SI',
    a.cbu           || '',
    a.telefono      || '',
    a.observaciones || '',
  ]]);
  return { ok: true };
}


/* ──────────────────────────────────────────────
   UTILIDADES
   ────────────────────────────────────────────── */

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh   = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    if (headers && headers.length > 0) {
      const hr = sh.getRange(1, 1, 1, headers.length);
      hr.setValues([headers]);
      hr.setBackground('#0f2540');
      hr.setFontColor('#ffffff');
      hr.setFontWeight('bold');
      sh.setFrozenRows(1);
    }
  }
  return sh;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Parsea números en formato argentino ("120.000", "120,5") o estándar
function safeNum(v) {
  if (v === '' || v === null || v === undefined) return 0;
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  const s = String(v).trim()
    .replace(/\$/g, '')          // quitar símbolo $
    .replace(/\s/g, '')          // quitar espacios
    .replace(/\./g, '')          // quitar puntos de miles (formato arg: 120.000 → 120000)
    .replace(',', '.');          // convertir coma decimal a punto (120,5 → 120.5)
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function formatFecha(val) {
  if (!val) return '';
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Formato DD/MM/YYYY (form argentino)
  const ddmm = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmm) return ddmm[3] + '-' + ddmm[2].padStart(2,'0') + '-' + ddmm[1].padStart(2,'0');
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }
  return s;
}
