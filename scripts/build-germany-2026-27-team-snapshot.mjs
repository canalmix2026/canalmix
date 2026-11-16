import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const countryCode = "DEU";
const countryName = "Alemanha";
const divisions = [
  {
    key: "DEU:bundesliga:2026-27", name: "Bundesliga", source: "https://datencenter.dfb.de/competitions/12/seasons/current/teams",
    groups: { "Grupo único": [
      "1. FC Köln", "1. FC Union Berlin", "1. FSV Mainz 05", "Bayer Leverkusen", "Borussia Dortmund", "Borussia Mönchengladbach",
      "Eintracht Frankfurt", "FC Augsburg", "FC Bayern München", "FC Schalke 04", "Hamburger SV", "RB Leipzig", "SC Freiburg",
      "SC Paderborn 07", "SV Elversberg", "TSG Hoffenheim", "VfB Stuttgart", "Werder Bremen",
    ] },
  },
  {
    key: "DEU:2-bundesliga:2026-27", name: "2. Bundesliga", source: "https://datencenter.dfb.de/competitions/3/seasons/current/teams",
    groups: { "Grupo único": [
      "1. FC Heidenheim", "1. FC Kaiserslautern", "1. FC Magdeburg", "1. FC Nürnberg", "Arminia Bielefeld", "Dynamo Dresden",
      "Eintracht Braunschweig", "Energie Cottbus", "FC St. Pauli", "Hannover 96", "Hertha BSC", "Holstein Kiel", "Karlsruher SC",
      "SpVgg Greuther Fürth", "SV Darmstadt 98", "VfL Bochum", "VfL Osnabrück", "VfL Wolfsburg",
    ] },
  },
  {
    key: "DEU:3-liga:2026-27", name: "3. Liga", source: "https://www.dfb.de/news/teilnehmerfeld-der-3-liga-steht-fest-havelse-rueckt-fuer-1860-nach",
    groups: { "Grupo único": [
      "Fortuna Düsseldorf", "SC Preußen Münster", "Rot-Weiss Essen", "MSV Duisburg", "F.C. Hansa Rostock", "SC Verl", "Alemannia Aachen",
      "SV Wehen Wiesbaden", "SV Waldhof Mannheim", "FC Viktoria Köln", "FC Ingolstadt", "SSV Jahn Regensburg", "VfB Stuttgart II",
      "1. FC Saarbrücken", "TSG Hoffenheim II", "TSV Havelse", "SV Meppen", "SC Fortuna Köln", "SG Sonnenhof Großaspach", "FC Würzburger Kickers",
    ] },
  },
  {
    key: "DEU:regionalliga-nord:2026-27", name: "Regionalliga Nord",
    source: "https://www.nordfv.de/fileadmin/Spielplaene/260707_RLN-Spielplan_2026-2027.pdf",
    groups: { "Regionalliga Nord": [
      "SV Werder Bremen II", "VfB Oldenburg", "Bremer SV", "Hannover 96 II", "FC Eintracht Norderstedt", "SV Atlas Delmenhorst", "SSV Jeddeloh",
      "FSV Schöningen", "HSC Hannover", "BSV Kickers Emden", "VfB Lübeck", "SC Weiche Flensburg", "SV Todesfelde", "FC St. Pauli II",
      "SV Drochtersen/Assel", "1. FC Phönix Lübeck", "Eimsbütteler TV", "Hamburger SV II",
    ] },
  },
  {
    key: "DEU:regionalliga-nordost:2026-27", name: "Regionalliga Nordost",
    source: "https://www.nofv-online.de/index.php/regionalliga-nordost.html",
    groups: { "Regionalliga Nordost": [
      "FC Erzgebirge Aue", "Hertha BSC II", "BFC Dynamo", "VSG Altglienicke", "SV Tasmania Berlin", "BFC Preussen", "Chemnitzer FC",
      "FC Rot-Weiß Erfurt", "Greifswalder FC", "Hallescher FC", "FC Carl Zeiss Jena", "1. FC Lokomotive Leipzig", "BSG Chemie Leipzig",
      "FSV 63 Luckenwalde", "1. FC Magdeburg II", "SV Babelsberg 03", "RSV Eintracht 1949", "FSV Zwickau",
    ] },
  },
  {
    key: "DEU:regionalliga-west:2026-27", name: "Regionalliga West",
    source: "https://wdfv.de/spielbetrieb/herren-regionalliga-west",
    groups: { "Regionalliga West": [
      "SV Bergisch Gladbach 09", "1. FC Bocholt", "VfL Bochum U23", "Bonner SC", "Borussia Dortmund U23", "FC Gütersloh", "VfB 03 Hilden",
      "1. FC Köln U23", "VfL Sportfreunde Lotte", "Borussia Mönchengladbach U23", "SC Rot-Weiß Oberhausen", "SC Paderborn 07 U23",
      "SV Westfalia Rhynern", "SV Rödinghausen", "FC Schalke 04 U23", "Sportfreunde Siegen", "SG Wattenscheid 09", "SC Wiedenbrück",
    ] },
  },
  {
    key: "DEU:regionalliga-bayern:2026-27", name: "Regionalliga Bayern",
    source: "https://www.bfv.de/spielbetrieb-verbandsleben/ligabetrieb/regionalliga-bayern",
    groups: { "Regionalliga Bayern": [
      "1. FC Nürnberg II", "1. FC Schweinfurt 05", "DJK Vilzing", "FC Augsburg II", "FC Bayern München II", "FC Memmingen", "FV Illertissen",
      "SC Eltersdorf", "SpVgg Ansbach", "SpVgg Bayreuth", "SpVgg Greuther Fürth II", "SpVgg Unterhaching", "SV Wacker Burghausen",
      "TSV 1860 München", "TSV 1882 Landsberg", "TSV Aubstadt", "TSV Buchbach", "TSV Schwaben Augsburg", "VfB Eichstätt",
    ] },
  },
  {
    key: "DEU:regionalliga-suedwest:2026-27", name: "Regionalliga Südwest",
    source: "https://www.regionalliga-suedwest.de/Spielbetrieb/Vereine/",
    groups: { "Regionalliga Südwest": [
      "1. FSV Mainz 05 II", "SSV Ulm 1846 Fußball", "1. FC Kaiserslautern II", "VfR Aalen", "FC 08 Homburg", "SV Sandhausen", "VfR Mannheim",
      "FC-Astoria Walldorf", "FSV Frankfurt", "KSV Hessen Kassel", "Kickers Offenbach", "SC Freiburg II", "SG Barockstadt Fulda-Lehnerz",
      "SGV Heilbronn-Freiberg", "SV Eintracht-Trier", "SV Stuttgarter Kickers", "Eintracht Frankfurt II", "TSV Steinbach Haiger",
    ] },
  },
];

const canonicalNames = {
  "SV Elversberg": "SV 07 Elversberg", "TSG Hoffenheim": "TSG 1899 Hoffenheim",
  "SV Waldhof Mannheim": "Waldhof Mannheim", "SV Wacker Burghausen": "Wacker Burghausen",
  "TSG Hoffenheim II": "1899 Hoffenheim II", "SC Fortuna Köln": "Fortuna Köln",
  "Bayer Leverkusen": "Bayer 04 Leverkusen", "FC Bayern München": "FC Bayern München", "Werder Bremen": "SV Werder Bremen",
  "1. FC Heidenheim": "1. FC Heidenheim 1846", "F.C. Hansa Rostock": "Hansa Rostock", "FC Ingolstadt": "FC Ingolstadt 04",
  "FC Viktoria Köln": "Viktoria Köln", "1. FC Lokomotive Leipzig": "1. FC Lok Leipzig", "FC Rot-Weiß Erfurt": "Rot-Weiß Erfurt",
  "FC Schalke 04 U23": "FC Schalke 04 II", "1. FC Köln U23": "1. FC Köln II", "VfL Bochum U23": "VfL Bochum II",
  "Borussia Dortmund U23": "Borussia Dortmund II", "Borussia Mönchengladbach U23": "Bor. Mönchengladbach II",
  "VfL Sportfreunde Lotte": "SF Lotte", "SC Rot-Weiß Oberhausen": "Rot-Weiß Oberhausen", "SV Westfalia Rhynern": "Westfalia Rhynern",
  "SC Paderborn 07 U23": "SC Paderborn 07 II", "FC Schalke 04 U23": "FC Schalke 04 II", "FC Schalke 04 II": "FC Schalke 04 II",
  "SV Werder Bremen II": "Werder Bremen II", "Hannover 96 II": "Hannover 96 II", "Hamburger SV II": "Hamburger SV II",
  "FC St. Pauli II": "FC St. Pauli II", "1. FC Phönix Lübeck": "1. FC Phönix Lübeck", "1. FC Magdeburg II": "1. FC Magdeburg II",
  "FC Erzgebirge Aue": "Erzgebirge Aue", "BFC Dynamo": "BFC Dynamo Berlin", "SV Tasmania Berlin": "SV Tasmania Berlin",
  "BFC Preussen": "BFC Preussen", "VfL Bochum": "VfL Bochum", "SV 07 Elversberg": "SV 07 Elversberg",
  "SpVgg Greuther Fürth": "SpVgg Greuther Fürth", "F.C. Hansa Rostock": "Hansa Rostock", "FC Würzburger Kickers": "Würzburger Kickers",
  "SC Preußen Münster": "Preußen Münster", "SSV Jahn Regensburg": "Jahn Regensburg", "SV Waldhof Mannheim": "SV Waldhof Mannheim",
  "SG Sonnenhof Großaspach": "SG Sonnenhof Großaspach", "1. FC Saarbrücken": "1. FC Saarbrücken",
  "SSV Ulm 1846 Fußball": "SSV Ulm 1846", "SV Eintracht-Trier": "Eintracht Trier", "SV Stuttgarter Kickers": "Stuttgarter Kickers",
  "SGV Heilbronn-Freiberg": "SGV Freiberg", "VfL Sportfreunde Lotte": "SF Lotte", "SV Bergisch Gladbach 09": "SV Bergisch Gladbach 09",
  "FC Eintracht Norderstedt": "Eintracht Norderstedt", "SC Weiche Flensburg": "SC Weiche Flensburg 08", "BSV Kickers Emden": "Kickers Emden",
  "Hannover 96 II (U23)": "Hannover 96 II", "SV Atlas Delmenhorst": "SV Atlas Delmenhorst", "SV Werder Bremen II": "Werder Bremen II",
  "FC Eintracht Bamberg": "FC Eintracht Bamberg", "VfB 03 Hilden": "VfB 03 Hilden", "1. FC Bocholt": "1. FC Bocholt",
  "SV Rödinghausen": "SV Rödinghausen", "Bonner SC": "Bonner SC", "SC Wiedenbrück": "SC Wiedenbrück",
  "FC Gütersloh": "FC Gütersloh", "SG Wattenscheid 09": "SG Wattenscheid 09", "FC 08 Homburg": "FC 08 Homburg",
  "TSV Steinbach Haiger": "TSV Steinbach Haiger", "KSV Hessen Kassel": "KSV Hessen Kassel", "FC-Astoria Walldorf": "FC-Astoria Walldorf",
  "Eintracht Frankfurt II": "Eintracht Frankfurt II", "1. FSV Mainz 05 II": "1. FSV Mainz 05 II", "1. FC Kaiserslautern II": "1. FC Kaiserslautern II",
  "FC Augsburg II": "FC Augsburg II", "FC Bayern München II": "Bayern München II", "SpVgg Greuther Fürth II": "SpVgg Greuther Fürth II",
  "1. FC Nürnberg II": "1. FC Nürnberg II", "FC Memmingen": "FC Memmingen", "VfB Eichstätt": "VfB Eichstätt",
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
      const isReserve = /\b(II|U23)\b/i.test(officialName);
      const sourceDataName = division.name;
      records.push({
        countryCode, countryName, name, officialName, teamType: "club", gender: "men", squadType: isReserve ? "reserve" : "first",
        sourceDataName, sourceDataUrl: division.source, sourceDataLicense: null, sourceCompetitionKey: division.key,
        sourceSeasonYear: 2026, nameAliases: [],
        importKey: `canalmix:v1:${countryCode}:men:${isReserve ? "reserve" : "first"}:${normalized.replace(/ /g, "-").slice(0, 100)}`,
        externalProvider: null, externalId: null, shieldUrl: null, shieldStatus: "pending", shieldSourceUrl: null, shieldLicense: null,
        nameIsManual: false, catalogNote: "Participante confirmado na temporada 2026/27; URL de escudo não foi fornecida neste lote.",
      });
    }
    groupCounts[group] = officialNames.length;
    total += officialNames.length;
  }
  leagueCoverage.push({ countryCode, countryName, competition: division.name, competitionKey: division.key, season: "2026/27",
    sourceUrl: division.source, expectedParticipants: total, sourceEntries: total, verifiedParticipants: total, groupCounts, notes: [] });
}

const snapshot = {
  generatedAt: new Date().toISOString(), target: "Supabase local only", countries: [{ countryCode, countryName, total: records.length,
    men: records.length, women: 0, reserveOrYouth: records.filter((record) => record.squadType !== "first").length,
    below200: records.length < 200, seasonYears: [2026] }], repositories: { DFB: "https://www.dfb.de/", NFV: "https://www.nordfv.de/",
    NOFV: "https://www.nofv-online.de/", WDFV: "https://wdfv.de/", BFV: "https://www.bfv.de/", RegionalligaSuedwest: "https://www.regionalliga-suedwest.de/" },
  leagueCoverage, records,
};
const target = path.join(root, "data", "team-catalog", "germany-2026-27-team-snapshot.json");
await fs.writeFile(target, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
process.stdout.write(`Gerado ${path.relative(root, target)}: ${records.length} participantes em ${leagueCoverage.length} competições.\n`);
