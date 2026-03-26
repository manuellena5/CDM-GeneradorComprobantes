// Genera la tabla plana con una fila por jugador por entrenamiento
function generarDashboardData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaRespuestas = ss.getSheetByName("Respuestas");
  const hojaJugadores = ss.getSheetByName("Jugadores");
  const hojaDashboard = ss.getSheetByName("Dashboard_Data");

  // Limpiar hoja Dashboard_Data y poner encabezados
  hojaDashboard.clearContents();
  hojaDashboard.appendRow(["Fecha", "Jugador", "Tipo", "Litros", "Vianda", "Remis", "Monto Remis"]);

  // Leer datos de Respuestas (desde fila 2 para saltar encabezados)
  const respuestas = hojaRespuestas.getDataRange().getValues();
  
  // Leer tabla de Jugadores para cruzar beneficios
  const jugadores = hojaJugadores.getDataRange().getValues();

  // Crear mapa de jugadores: nombre → {litros, vianda, remis, montoRemis}
  const mapaJugadores = {};
  for (let i = 1; i < jugadores.length; i++) {
    const nombre = jugadores[i][0].toString().trim();
    mapaJugadores[nombre] = {
      litros:     jugadores[i][1] || 0,
      vianda:     jugadores[i][2] || "NO",
      remis:      jugadores[i][3] || "NO",
      montoRemis: jugadores[i][4] || 0
    };
  }

  const filasDashboard = [];

  // Recorrer cada respuesta del formulario (fila 1 en adelante, fila 0 son encabezados)
  for (let i = 1; i < respuestas.length; i++) {
    const fecha            = respuestas[i][1]; // Columna B
    const jugadoresAfuera  = respuestas[i][2]; // Columna C
    const jugadoresLocales = respuestas[i][4]; // Columna E

    if (!fecha) continue;

    // Procesar jugadores de afuera
    if (jugadoresAfuera) {
      const lista = jugadoresAfuera.toString().split(",");
      for (const nombre of lista) {
        const nombreLimpio = nombre.trim();
        if (!nombreLimpio) continue;
        const data = mapaJugadores[nombreLimpio] || {};
        filasDashboard.push([
          fecha,
          nombreLimpio,
          "Afuera",
          data.litros     || 0,
          data.vianda     || "NO",
          data.remis      || "NO",
          data.montoRemis || 0
        ]);
      }
    }

    // Procesar jugadores locales
    if (jugadoresLocales) {
      const lista = jugadoresLocales.toString().split(",");
      for (const nombre of lista) {
        const nombreLimpio = nombre.trim();
        if (!nombreLimpio) continue;
        filasDashboard.push([
          fecha,
          nombreLimpio,
          "Local",
          0, "NO", "NO", 0
        ]);
      }
    }
  }

  // Escribir todo de una sola vez (más eficiente que appendRow en loop)
  if (filasDashboard.length > 0) {
    hojaDashboard.getRange(2, 1, filasDashboard.length, 7).setValues(filasDashboard);
  }

  Logger.log("Dashboard_Data generado: " + filasDashboard.length + " filas");
}

// Se ejecuta automáticamente cada vez que llega una respuesta nueva del Form
function onFormSubmit() {
  generarDashboardData();
}