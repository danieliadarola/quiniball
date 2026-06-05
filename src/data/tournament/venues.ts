/**
 * Las 16 sedes del Mundial 2026 (11 en EE. UU., 3 en México, 2 en Canadá).
 *
 * Dato estable y oficial. Editar aquí si cambiara algún recinto.
 * La `timezone` se usa para calcular correctamente la hora de cierre de
 * predicciones de cada partido según su sede.
 */
import type { Venue } from "./types";

export const VENUES: Venue[] = [
  // --- México ---
  { id: "mexico-city-azteca", city: "Ciudad de México", stadium: "Estadio Azteca",      country: "MEX", timezone: "America/Mexico_City" },
  { id: "guadalajara-akron",  city: "Guadalajara",      stadium: "Estadio Akron",       country: "MEX", timezone: "America/Mexico_City" },
  { id: "monterrey-bbva",     city: "Monterrey",        stadium: "Estadio BBVA",        country: "MEX", timezone: "America/Monterrey" },

  // --- Canadá ---
  { id: "toronto-bmo",        city: "Toronto",          stadium: "BMO Field",           country: "CAN", timezone: "America/Toronto" },
  { id: "vancouver-bcplace",  city: "Vancouver",        stadium: "BC Place",            country: "CAN", timezone: "America/Vancouver" },

  // --- Estados Unidos ---
  { id: "atlanta-mercedes",   city: "Atlanta",          stadium: "Mercedes-Benz Stadium", country: "USA", timezone: "America/New_York" },
  { id: "boston-gillette",    city: "Boston",           stadium: "Gillette Stadium",    country: "USA", timezone: "America/New_York" },
  { id: "dallas-att",         city: "Dallas",           stadium: "AT&T Stadium",        country: "USA", timezone: "America/Chicago" },
  { id: "houston-nrg",        city: "Houston",          stadium: "NRG Stadium",         country: "USA", timezone: "America/Chicago" },
  { id: "kansas-city-arrowhead", city: "Kansas City",   stadium: "Arrowhead Stadium",   country: "USA", timezone: "America/Chicago" },
  { id: "los-angeles-sofi",   city: "Los Ángeles",      stadium: "SoFi Stadium",        country: "USA", timezone: "America/Los_Angeles" },
  { id: "miami-hardrock",     city: "Miami",            stadium: "Hard Rock Stadium",   country: "USA", timezone: "America/New_York" },
  { id: "new-york-metlife",   city: "Nueva York/NJ",    stadium: "MetLife Stadium",     country: "USA", timezone: "America/New_York" },
  { id: "philadelphia-lincoln", city: "Filadelfia",     stadium: "Lincoln Financial Field", country: "USA", timezone: "America/New_York" },
  { id: "san-francisco-levis", city: "San Francisco",   stadium: "Levi's Stadium",      country: "USA", timezone: "America/Los_Angeles" },
  { id: "seattle-lumen",      city: "Seattle",          stadium: "Lumen Field",         country: "USA", timezone: "America/Los_Angeles" },
];

export const getVenue = (id: string): Venue | undefined =>
  VENUES.find((v) => v.id === id);
