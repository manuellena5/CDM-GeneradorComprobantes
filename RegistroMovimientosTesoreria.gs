/* ═══════════════════════════════════════════════════════════════
   TESORERÍA — Club Deportivo Mitre — Google Apps Script

   INSTRUCCIONES:
   1. Abrí script.google.com → Nuevo proyecto
   2. Borrá todo y pegá este código
   3. Cambiá SHEET_NAME si tu hoja tiene otro nombre
   4. Guardá (Ctrl+S)
   5. Implementar → Nueva implementación → Aplicación web
      - Ejecutar como: Yo
      - Quién tiene acceso: Cualquier persona
   6. Implementar → autorizás → copiás la URL /exec
   7. Pegás esa URL en la app (pestaña Config)
═══════════════════════════════════════════════════════════════ */

const SHEET_NAME = 'MOVIMIENTOS'; // ← Cambiá si tu hoja tiene otro nombre

// Columnas en orden exacto del Sheet
// A=MES B=Fecha C=Cod.Rubro D=Rubro E=Concepto
// F=#EGRESOS G=#INGRESOS H=SALDO(fórmula) I=Cuenta J=Método K=Observaciones
const COL_COUNT = 11;

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
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, msg: 'Tesorería CDM API activa' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleAction(data) {
  const sheet = getSheet();

  switch(data.action) {

    case 'save': {
      const m = data.mov;
      sheet.appendRow([
        m.mes        || '',
        m.fecha      || '',
        m.codRubro   || '',
        m.rubro      || '',
        m.concepto   || '',
        m.egreso  !== '' && m.egreso  !== undefined ? Number(m.egreso)  : '',
        m.ingreso !== '' && m.ingreso !== undefined ? Number(m.ingreso) : '',
        '',   // SALDO — se calcula con fórmula en el Sheet, no lo escribimos
        m.cuenta      || '',
        m.metodo      || '',
        m.observaciones || '',
      ]);
      return { ok: true };
    }

    case 'list': {
      const all  = sheet.getDataRange().getValues();
      const rows = all.slice(1); // saltar encabezado
      const movimientos = rows
        .filter(r => r[1]) // debe tener fecha
        .map(r => ({
          mes:          String(r[0]  || ''),
          fecha:        formatFecha(r[1]),
          codRubro:     String(r[2]  || ''),
          rubro:        String(r[3]  || ''),
          concepto:     String(r[4]  || ''),
          egreso:       r[5] !== '' ? Number(r[5]) : '',
          ingreso:      r[6] !== '' ? Number(r[6]) : '',
          saldo:        r[7] !== '' ? Number(r[7]) : '',
          cuenta:       String(r[8]  || ''),
          metodo:       String(r[9]  || ''),
          observaciones:String(r[10] || ''),
        }))
        .reverse(); // más recientes primero
      return { ok: true, movimientos };
    }

    default:
      return { ok: false, error: 'Acción desconocida: ' + data.action };
  }
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh   = ss.getSheetByName(SHEET_NAME);

  // Si no existe la hoja, la crea con encabezados
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    const header = sh.getRange(1, 1, 1, COL_COUNT);
    header.setValues([['MES','Fecha','Cod. Rubro','Rubro','Concepto','#EGRESOS','#INGRESOS','SALDO','Cuenta','Método','Observaciones']]);
    header.setBackground('#0f2540');
    header.setFontColor('#ffffff');
    header.setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.setColumnWidth(4, 220); // Rubro más ancho
    sh.setColumnWidth(5, 200); // Concepto más ancho
  }

  return sh;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
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
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }
  return s;
}