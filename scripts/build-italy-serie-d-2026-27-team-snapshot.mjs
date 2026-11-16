import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const countryCode = "ITA";
const countryName = "Itália";
const sourceUrl = "https://lnd.it/seried/attivita-interregionale/i-gironi-del-campionato-2026-2027/";
const groups = {
  "Girone A": [
    "Alessandria", "Asti", "Biellese", "Borgosesia", "Bra", "Chisola", "Derthona", "Gozzano", "Lascaris", "Saluzzo",
    "Valenzana Mado", "Celle Varazze", "Fezzanese", "Imperia", "Ligorna", "Millesimo", "Sanremese", "Sestri Levante",
  ],
  "Girone B": [
    "Brusaporto", "Club Milano", "Leon", "Milan Futuro", "Palazzolo", "Pavonese", "Real Calepina", "Rovato",
    "Scanzorosciate", "Tritium", "Villa Valle", "Virtus Ciseranobergamo", "Caldiero Terme", "Chievoverona",
    "Virtus Verona", "Fiorenzuola", "Nibbiano e Valtidone", "Piacenza",
  ],
  "Girone C": [
    "Brian Lignano", "Cjarlins Muzane", "LME", "Triestina", "Obermais", "Virtus Bolzano", "Bassano", "Calvi Noale",
    "Campodarsego", "Conegliano", "Este", "Legnago Salus", "La Rocca Altavilla", "Luparense", "Mestre", "Sandona",
    "Schio", "Union Clodiense Chioggia",
  ],
  "Girone D": [
    "Città di Pontedera", "Pistoiese", "Cittadella Modena", "Correggese", "Lentigione", "Tropical Coriano",
    "Arconatese", "Aurora Pro Patria", "Castellanzese", "Crema", "Casatese Merate", "Oltrepò", "Pavia", "Pro Sesto",
    "Sant’Angelo", "Solbiatese", "Varese", "Varesina",
  ],
  "Girone E": [
    "Flaminia Civitacastellana", "Aquila Montevarchi", "Follonica Gavorrano", "Ghiviborgo", "Grassina", "Lucchese",
    "Prato", "Rondinella Marzocco", "San Donato Tavarnelle", "Scandicci", "Seravezza", "Siena", "Tau Altopascio",
    "Terranuova Traiana", "Nuova Ternana", "Mezzolara", "Progresso", "Sasso Marconi",
  ],
  "Girone F": [
    "Ancona", "Atletico Ascoli", "Forsempronese", "Maceratese", "Montecchio Gallo", "Recanatese", "Vigor Senigallia",
    "Città di Lanciano", "Giulianova", "L’Aquila", "Notaresco", "Santegidiese", "Teramo", "Angelana", "Foligno",
    "Pietralunghese", "Sporting Trestina", "Termoli",
  ],
  "Girone G": [
    "Budoni", "Cos Sarrabus Ogliastra", "Monastir", "Ossese", "Sassari Lattedolce", "Albalonga", "Anzio", "Aranova",
    "Atletico Lodigiani", "Certosa V. Campagnano", "Città di Anagni", "Trastevere", "Unipomezia", "Afragolese",
    "Gelbison", "Paganese", "Sarnese", "Venafro",
  ],
  "Girone H": [
    "Bisceglie", "Brindisi", "Fidelis Andria", "Gravina", "Manfredonia", "Martina", "Nardò", "Virtus Francavilla",
    "Francavilla", "Melfi", "Flegrea Puteolana", "Ischia Isola Verde", "Nocerina", "Palmese", "Puteoli Real Normanna",
    "Real Forio", "Ebolitana", "Gladiator",
  ],
  "Girone I": [
    "Athletic Palermo", "Avola", "Castrumfavara", "Enna", "Gela", "Licata", "Milazzo", "Modica", "Nissa",
    "Nuova Igea Virtus", "Ragusa", "Siracusa", "Trapani", "Digiesse Praiatortora", "Reggina", "Sambiase", "Vibonese",
    "Vigor Lamezia",
  ],
};

const canonicalNames = {
  "Union Clodiense Chioggia": "Clodiense SSD",
  "Milan Futuro": "AC Milan II",
  "Triestina": "US Triestina",
  "Legnago Salus": "FC Legnago Salus",
  "Città di Pontedera": "US Pontedera",
  "Nuova Ternana": "Ternana",
  "Sestri Levante": "USD Sestri Levante",
  "Aurora Pro Patria": "Aurora Pro Patria",
  "Caldiero Terme": "Caldiero Terme",
  "Virtus Verona": "Virtus Verona",
  "Fiorenzuola": "Fiorenzuola",
  "Lucchese": "Lucchese",
  "Ancona": "Ancona",
  "Trapani": "Trapani Calcio",
  "Salernitana": "Salernitana",
};

function normalize(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en")
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

const records = [];
const leagueCoverage = [];
for (const [group, officialNames] of Object.entries(groups)) {
  if (officialNames.length !== 18) throw new Error(`${group}: esperado 18, recebido ${officialNames.length}`);
  const seen = new Set();
  for (const officialName of officialNames) {
    const name = canonicalNames[officialName] ?? officialName;
    const normalized = normalize(name);
    if (seen.has(normalized)) throw new Error(`${group}: participante duplicado ${officialName}`);
    seen.add(normalized);
    const isReserve = officialName === "Milan Futuro";
    records.push({
      countryCode, countryName, name, officialName, teamType: "club", gender: "men", squadType: isReserve ? "reserve" : "first",
      sourceDataName: "Serie D", sourceDataUrl: sourceUrl, sourceDataLicense: null,
      sourceCompetitionKey: `ITA:serie-d-2026-27:${group.toLowerCase().replace(/ /g, "-")}`,
      sourceSeasonYear: 2026, nameAliases: [],
      importKey: `canalmix:v1:${countryCode}:men:${isReserve ? "reserve" : "first"}:${normalized.replace(/ /g, "-").slice(0, 100)}`,
      externalProvider: null, externalId: null, shieldUrl: null, shieldStatus: "pending", shieldSourceUrl: null, shieldLicense: null,
      nameIsManual: false, catalogNote: "Participante confirmado na Serie D 2026/27; URL de escudo não foi fornecida neste lote.",
    });
  }
  leagueCoverage.push({ countryCode, countryName, competition: "Serie D", competitionKey: `ITA:serie-d-2026-27:${group.toLowerCase().replace(/ /g, "-")}`,
    season: "2026/27", sourceUrl, expectedParticipants: 18, sourceEntries: 18, verifiedParticipants: 18, groupCounts: { [group]: 18 }, notes: [] });
}

const snapshot = {
  generatedAt: new Date().toISOString(), target: "Supabase local only", countries: [{ countryCode, countryName, total: records.length,
    men: records.length, women: 0, reserveOrYouth: records.filter((record) => record.squadType !== "first").length,
    below200: records.length < 200, seasonYears: [2026] }],
  repositories: { LegaNazionaleDilettanti: "https://lnd.it/" }, leagueCoverage, records,
};
const target = path.join(root, "data", "team-catalog", "italy-serie-d-2026-27-team-snapshot.json");
await fs.writeFile(target, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
process.stdout.write(`Gerado ${path.relative(root, target)}: ${records.length} participantes em ${leagueCoverage.length} grupos.\n`);
