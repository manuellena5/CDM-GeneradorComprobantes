function generarDashboardPartidos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaResp = ss.getSheetByName("Respuestas de formulario");
  const hojaDash = ss.getSheetByName("Dashboard_Data");

  hojaDash.clearContents();
  hojaDash.appendRow([
    "Fecha", "Rival", "Resultado", "Valla Invicta",
    "Jugador", "Rol", "Goles"
  ]);

  const respuestas = hojaResp.getDataRange().getValues();
  const encabezados = respuestas[0];

  const mapaParticipacion = {};
  const mapaGoles = {};

  for (let c = 0; c < encabezados.length; c++) {
    const col = encabezados[c].toString().trim();
    const matchPart = col.match(/^Participacion en el partido \[(.+)\]$/i);
    const matchGol  = col.match(/^Goles \[(.+)\]$/i);
    if (matchPart) mapaParticipacion[matchPart[1].trim()] = c;
    if (matchGol)  mapaGoles[matchGol[1].trim()] = c;
  }

  const jugadores = Object.keys(mapaParticipacion);
  const filas = [];

  for (let i = 1; i < respuestas.length; i++) {
    const fila = respuestas[i];
    const fecha     = fila[1];
    const rival     = fila[2];
    const resultado = fila[3];
    const vallaInv  = fila[4];

    if (!fecha) continue;

    for (const jugador of jugadores) {
      const rol   = mapaParticipacion[jugador] !== undefined ? fila[mapaParticipacion[jugador]].toString().trim() : "";
      const goles = mapaGoles[jugador]         !== undefined ? fila[mapaGoles[jugador]].toString().trim()         : "";

      if (!rol && !goles) continue;

      let cantGoles = 0;
      if (goles === "1 gol")   cantGoles = 1;
      if (goles === "2 goles") cantGoles = 2;
      if (goles === "3 goles") cantGoles = 3;

      filas.push([fecha, rival, resultado, vallaInv, jugador, rol, cantGoles]);
    }
  }

  if (filas.length > 0) {
    hojaDash.getRange(2, 1, filas.length, 7).setValues(filas);
  }

  Logger.log("Dashboard_Data generado: " + filas.length + " filas");
}

function onFormSubmit() {
  generarDashboardPartidos();
}