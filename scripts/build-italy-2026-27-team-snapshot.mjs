import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const countryCode = "ITA";
const countryName = "Itália";
const divisions = [
  {
    key: "ITA:serie-a:2026-27", name: "Serie A Enilive",
    url: "https://www.legaseriea.it/serie-a/classifica?lang=en", groups: { "Girone unico": [
      "Atalanta", "Bologna", "Cagliari", "Como", "Fiorentina", "Frosinone", "Genoa", "Inter", "Juventus", "Lazio",
      "Lecce", "Milan", "Monza", "Napoli", "Parma", "Roma", "Sassuolo", "Torino", "Udinese", "Venezia",
    ] },
  },
  {
    key: "ITA:serie-b:2026-27", name: "Serie BKT",
    url: "https://www.legab.it/seriebkt/squadre", groups: { "Girone unico": [
      "Arezzo", "Ascoli", "Avellino", "Benevento", "Carrarese", "Catanzaro", "Cesena", "Cremonese", "Empoli", "Hellas Verona",
      "Juve Stabia", "L.R. Vicenza", "Mantova", "Modena", "Padova", "Palermo", "Pisa", "Sampdoria", "Südtirol", "Virtus Entella",
    ] },
  },
  {
    key: "ITA:serie-c:2026-27", name: "Serie C Sky Wifi",
    groupUrls: ["https://www.seriec.com/gironi/girone-a", "https://www.seriec.com/gironi/girone-b", "https://www.seriec.com/gironi/girone-c"],
    groups: {
      "Girone A": [
        "Cittadella", "Union Brescia", "Trento", "Ospitaletto", "Arzignano Valchiampo", "Treviso", "Lecco", "Alcione Milano",
        "Pergolettese", "AlbinoLeffe", "Pro Vercelli", "Lumezzane", "Desenzano", "Novara", "Juventus Next Gen", "Carpi",
        "Giana Erminio", "Renate", "Dolomiti Bellunesi", "Folgore Caratese",
      ],
      "Girone B": [
        "Spezia", "Ravenna", "Pescara", "Grosseto", "Torres", "Reggiana", "Guidonia Montecelio", "Livorno", "Campobasso",
        "Atalanta U23", "Latina", "Pineto", "Perugia", "Vado", "Forlì", "Pianese", "Gubbio", "Sambenedettese", "Ostiamare", "Vis Pesaro",
      ],
      "Girone C": [
        "Potenza", "Bari", "Catania", "Scafatese", "Audace Cerignola", "Monopoli", "Inter U23", "Sorrento", "Casertana", "Cavese",
        "Picerno", "Barletta", "Salernitana", "Casarano", "Altamura", "Giugliano", "Foggia", "Savoia", "Cosenza", "Crotone",
      ],
    },
  },
];

const canonicalNames = {
  Empoli: "Empoli FC", Altamura: "Team Altamura",
  Atalanta: "Atalanta BC", Bologna: "Bologna FC", Cagliari: "Cagliari Calcio", Como: "Como 1907", Fiorentina: "ACF Fiorentina", Frosinone: "Frosinone Calcio",
  Genoa: "Genoa CFC", Inter: "FC Internazionale Milano", Juventus: "Juventus FC", Lazio: "SS Lazio", Lecce: "US Lecce", Milan: "AC Milan",
  Monza: "AC Monza", Napoli: "SSC Napoli", Parma: "Parma Calcio 1913", Roma: "AS Roma", Sassuolo: "US Sassuolo Calcio", Torino: "Torino FC", Udinese: "Udinese Calcio", Venezia: "Venezia FC",
  Arezzo: "US Arezzo", Avellino: "US Avellino", Benevento: "Benevento Calcio", Carrarese: "Carrarese Calcio", Cesena: "Cesena FC",
  Catanzaro: "US Catanzaro", "Hellas Verona": "Hellas Verona", "L.R. Vicenza": "L.R. Vicenza", Mantova: "Mantova 1911 SSD", Modena: "Modena FC",
  Padova: "Calcio Padova", Palermo: "Palermo FC", Südtirol: "FC Südtirol", "Virtus Entella": "Virtus Entella", Cittadella: "AS Cittadella",
  "Union Brescia": "Union Brescia", Trento: "Trento Calcio 1921", "Ospitaletto": "ACD Ospitaletto", "Arzignano Valchiampo": "Arzignano Valchiampo",
  Treviso: "Treviso", Lecco: "Calcio Lecco", "Alcione Milano": "ASC Alcione", Pergolettese: "US Pergolettese", AlbinoLeffe: "UC AlbinoLeffe",
  "Pro Vercelli": "Pro Vercelli", Lumezzane: "FC Lumezzane", Desenzano: "Desenzano FC", Novara: "Novara", "Juventus Next Gen": "Juventus II",
  Carpi: "AC Carpi", Renate: "AC Renate", "Folgore Caratese": "US Folgore Caratese", Spezia: "Spezia Calcio", Ravenna: "Ravenna FC",
  Pescara: "Pescara", Torres: "SEF Torres 1903", Reggiana: "AC Reggiana 1919", Livorno: "US Livorno 1915", "Atalanta U23": "Atalanta II",
  Latina: "Latina Calcio", Pineto: "ASD Pineto Calcio", Perugia: "AC Perugia Calcio", Forlì: "Forli FC", Pianese: "US Pianese", Gubbio: "AS Gubbio",
  Sambenedettese: "US Sambenedettese", "Ostiamare": "AS Ostiamare Lido Calcio", "Vis Pesaro": "Vis Pesaro", Bari: "SSC Bari", Catania: "Calcio Catania",
  "Audace Cerignola": "Audace Cerignola", Monopoli: "SS Monopoli 1966", "Inter U23": "Inter II", Sorrento: "Sorrento Calcio", Casertana: "Casertana FC",
  Cavese: "Cavese", Picerno: "AZ Picerno", Potenza: "Potenza", Foggia: "Foggia Calcio", Cosenza: "Cosenza Calcio", Crotone: "FC Crotone",
  "Juve Stabia": "SS Juve Stabia", "FC Internazionale Milano": "FC Internazionale Milano", "Sampdoria": "Sampdoria",
};

function normalize(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en")
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

const records = [];
const leagueCoverage = [];
for (const division of divisions) {
  let total = 0;
  const groupCounts = {};
  for (const [group, officialNames] of Object.entries(division.groups)) {
    const seen = new Set();
    for (const officialName of officialNames) {
      const name = canonicalNames[officialName] ?? officialName;
      const normalized = normalize(name);
      if (seen.has(normalized)) throw new Error(`${division.name}/${group}: participante duplicado ${officialName}`);
      seen.add(normalized);
      const isReserve = /\b(II|U23|Next Gen)\b/i.test(officialName);
      records.push({
        countryCode, countryName, name, officialName, teamType: "club", gender: "men", squadType: isReserve ? "reserve" : "first",
        sourceDataName: division.name, sourceDataUrl: division.groupUrls?.[Object.keys(division.groups).indexOf(group)] ?? division.url,
        sourceDataLicense: null, sourceCompetitionKey: division.key, sourceSeasonYear: 2026, nameAliases: [],
        importKey: `canalmix:v1:${countryCode}:men:${isReserve ? "reserve" : "first"}:${normalized.replace(/ /g, "-").slice(0, 100)}`,
        externalProvider: null, externalId: null, shieldUrl: null, shieldStatus: "pending", shieldSourceUrl: null, shieldLicense: null,
        nameIsManual: false, catalogNote: "Participante confirmado na temporada 2026/27; URL de escudo não foi fornecida neste lote.",
      });
    }
    groupCounts[group] = officialNames.length;
    total += officialNames.length;
  }
  const sources = division.groupUrls ?? [division.url];
  leagueCoverage.push({ countryCode, countryName, competition: division.name, competitionKey: division.key, season: "2026/27",
    sourceUrl: sources[0], sourceUrls: sources, expectedParticipants: total, sourceEntries: total, verifiedParticipants: total, groupCounts, notes: [] });
}

const snapshot = {
  generatedAt: new Date().toISOString(), target: "Supabase local only", countries: [{ countryCode, countryName, total: records.length,
    men: records.length, women: 0, reserveOrYouth: records.filter((record) => record.squadType !== "first").length,
    below200: records.length < 200, seasonYears: [2026] }], repositories: { LegaSerieA: "https://www.legaseriea.it/",
    LegaB: "https://www.legab.it/", LegaPro: "https://www.seriec.com/" }, leagueCoverage, records,
};
const target = path.join(root, "data", "team-catalog", "italy-2026-27-team-snapshot.json");
await fs.writeFile(target, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
process.stdout.write(`Gerado ${path.relative(root, target)}: ${records.length} participantes em ${leagueCoverage.length} competições.\n`);
