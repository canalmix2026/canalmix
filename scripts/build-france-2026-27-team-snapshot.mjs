import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const countryCode = "FRA";
const countryName = "França";
const divisions = [
  {
    key: "FRA:ligue-1:2026-27", name: "Ligue 1 McDonald's",
    url: "https://ligue1.com/fr/articles/l1_article_5293-les-dates-de-reprise-des-clubs-de-l1-2627",
    groups: { "Grupo único": [
      "Angers SCO", "AJ Auxerre", "Stade Brestois 29", "Le Havre AC", "Le Mans FC", "RC Lens", "FC Lorient", "LOSC",
      "Olympique Lyonnais", "Olympique de Marseille", "AS Monaco", "OGC Nice", "Paris FC", "Paris Saint-Germain",
      "Stade Rennais FC", "RC Strasbourg Alsace", "Toulouse FC", "ESTAC Troyes",
    ] },
  },
  {
    key: "FRA:ligue-2:2026-27", name: "Ligue 2 BKT",
    url: "https://www.lfp.fr/article/ligue-2-bkt-le-calendrier-de-la-saison-2026-2027",
    groups: { "Grupo único": [
      "FC Annecy", "US Boulogne CO", "Clermont Foot 63", "Dijon FCO", "USL Dunkerque", "Grenoble Foot 38",
      "EA Guingamp", "Stade Lavallois MFC", "FC Metz", "Montpellier Hérault SC", "AS Nancy Lorraine", "FC Nantes",
      "Pau FC", "Red Star FC", "Stade de Reims", "Rodez Aveyron Football", "AS Saint-Étienne", "FC Sochaux-Montbéliard",
    ] },
  },
  {
    key: "FRA:ligue-3:2026-27", name: "Ligue 3",
    url: "https://www.fff.fr/article/17022-le-calendrier-2026-2027-est-servi.html",
    groups: { "Grupo único": [
      "Amiens SC", "SC Aubagne Air Bel", "SC Bastia", "Football Bourg-en-Bresse Péronnas 01", "SM Caen", "AS Cannes",
      "US Concarneau", "FC Fleury 91", "VFC La-Roche-sur-Yon", "Le Puy-en-Velay FC", "US Orléans LF", "Paris 13 Atletico",
      "Quevilly Rouen Métropole", "FC Rouen 1899", "US Thionville Lusitanos", "Valenciennes FC", "FC Versailles", "FC Villefranche-Beaujolais",
    ] },
  },
  {
    key: "FRA:national-1:2026-27", name: "National 1",
    url: "https://media.fff.fr/uploads/files/0f970dceb376ec92701eb10d77fb71f0.pdf",
    groupUrls: [
      "https://media.fff.fr/uploads/files/0f970dceb376ec92701eb10d77fb71f0.pdf",
      "https://media.fff.fr/uploads/files/1cc34ac835dcddc9a11438fa4a9670fd.pdf",
      "https://media.fff.fr/uploads/files/dbb1799e9a559d97b61e29ab4d6d5efa.pdf",
    ],
    groups: {
      "Groupe A": [
        "AS Biesheim", "US Lusitanos Saint-Maur", "US Chantilly", "FC Montlouis", "US Créteil Football", "SR Colmar",
        "AS Furiani-Agliani", "Entente Feignies Aulnoye", "FCSR Haguenau", "FC Chambly Oise", "SA Épinal", "FC Dieppe",
        "Saint-Pryvé Saint-Hilaire FC", "FC Borgo", "US Le Pays du Valois", "Racing Club de France Football",
      ],
      "Groupe B": [
        "Angoulême Charente FC", "Dinan Léhon FC", "Voltigeurs de Châteaubriant", "US Avranches Mont-Saint-Michel", "Stade Briochin",
        "Vendée Le Poiré-sur-Vie Football", "Saint-Colomban Locminé", "Vendée Les Herbiers Football", "FC Lorient B", "FC Chauray",
        "US Saint-Malo", "GSI Pontivy", "US Granville", "Aviron Bayonnais FC", "Olympique Saumur FC", "Tarbes Pyrénées Football",
      ],
      "Groupe C": [
        "Andrézieux-Bouthéon FC", "Bourges FC", "Canet Roussillon FC", "La Berrichonne de Châteauroux", "Étoile FC Fréjus Saint-Raphaël",
        "Chasselay GOAL FC", "Hauts Lyonnais", "Hyères FC", "Istres FC", "FC Limonest Dardilly Saint-Didier", "Lyon-La Duchère",
        "Nîmes Olympique", "GFA Rumilly Vallières", "AS Saint-Priest", "Sporting Club de Toulon", "ESTAC Troyes B",
      ],
    },
  },
];

const canonicalNames = {
  "ESTAC Troyes": "ES Troyes AC",
  "RC Lens": "Racing Club de Lens", LOSC: "Lille OSC", "AS Monaco": "AS Monaco FC", "Le Havre AC": "Le Havre AC",
  "Stade Rennais FC": "Stade Rennais FC", "US Boulogne": "US Boulogne", "Stade Lavallois": "Stade Lavallois",
  "AS Nancy-Lorraine": "AS Nancy Lorraine", "Rodez AF": "Rodez AF", "US Lusitanos Saint-Maur": "US Saint-Maur Lusitanos",
  "US Boulogne CO": "US Boulogne", "Stade Lavallois MFC": "Stade Lavallois", "Montpellier Hérault SC": "Montpellier HSC",
  "Rodez Aveyron Football": "Rodez AF", "FC Sochaux-Montbéliard": "FC Sochaux-Montbéliard",
  "AS Biesheim": "Biesheim ASC", "SR Colmar": "Colmar SRFA", "AS Furiani-Agliani": "AS Furiani Agliani",
  "Entente Feignies Aulnoye": "Feignies Aulnoye EFC", "US Créteil Football": "US Créteil Football",
  "Saint-Pryvé Saint-Hilaire FC": "Saint-Pryvé Saint-Hilaire FC", "US Le Pays du Valois": "US Pays du Valois",
  "Racing Club de France Football": "Racing CFF", "US Avranches Mont-Saint-Michel": "US Avranches MSM",
  "Vendée Le Poiré-sur-Vie Football": "Le Poiré-sur-Vie", "Saint-Colomban Locminé": "Locminé Saint-Colomban",
  "Vendée Les Herbiers Football": "Les Herbiers", "FC Lorient B": "FC Lorient B", "US Saint-Malo": "US Saint-Malo",
  "GSI Pontivy": "GSI Pontivy", "Aviron Bayonnais FC": "Aviron Bayonnais", "Olympique Saumur FC": "Olympique Saumur FC",
  "Tarbes Pyrénées Football": "Tarbes Pyrénées Football", "Andrézieux-Bouthéon FC": "Andrézieux-Bouthéon FC",
  "Canet Roussillon FC": "Canet Roussillon FC", "La Berrichonne de Châteauroux": "Châteauroux", "Étoile FC Fréjus Saint-Raphaël": "Fréjus Saint-Raphaël",
  "Chasselay GOAL FC": "GOAL FC", "FC Limonest Dardilly Saint-Didier": "Limonest", "Lyon-La Duchère": "Lyon La Duchère",
  "Nîmes Olympique": "Nîmes Olympique", "GFA Rumilly Vallières": "Rumilly Vallières", "Sporting Club de Toulon": "Toulon",
  "ESTAC Troyes B": "ESTAC Troyes B", "FC Villefranche-Beaujolais": "Villefranche Beaujolais",
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
      const isReserve = /\b(B|2|II)\b/i.test(officialName) && division.name === "National 1";
      records.push({
        countryCode, countryName, name, officialName, teamType: "club", gender: "men", squadType: isReserve ? "reserve" : "first",
        sourceDataName: division.name, sourceDataUrl: division.groupUrls?.[Object.keys(division.groups).indexOf(group)] ?? division.url,
        sourceDataLicense: null, sourceCompetitionKey: division.key, sourceSeasonYear: 2026, nameAliases: [],
        importKey: `canalmix:v1:${countryCode}:men:${isReserve ? "reserve" : "first"}:${normalized.replace(/ /g, "-").slice(0, 100)}`,
        externalProvider: null, externalId: null, shieldUrl: null, shieldStatus: "pending", shieldSourceUrl: null,
        shieldLicense: null, nameIsManual: false,
        catalogNote: "Participante confirmado na temporada 2026/27; URL de escudo não foi fornecida neste lote.",
      });
    }
    groupCounts[group] = officialNames.length;
    total += officialNames.length;
  }
  const sources = division.groupUrls ?? [division.url];
  leagueCoverage.push({
    countryCode, countryName, competition: division.name, competitionKey: division.key, season: "2026/27",
    sourceUrl: sources[0], sourceUrls: sources, expectedParticipants: total, sourceEntries: total, verifiedParticipants: total,
    groupCounts, notes: [],
  });
}

const snapshot = {
  generatedAt: new Date().toISOString(), target: "Supabase local only", countries: [{
    countryCode, countryName, total: records.length, men: records.length, women: 0,
    reserveOrYouth: records.filter((record) => record.squadType !== "first").length, below200: records.length < 200, seasonYears: [2026],
  }],
  repositories: { LFP: "https://ligue1.com/", FFF: "https://www.fff.fr/" }, leagueCoverage, records,
};
const target = path.join(root, "data", "team-catalog", "france-2026-27-team-snapshot.json");
await fs.writeFile(target, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
process.stdout.write(`Gerado ${path.relative(root, target)}: ${records.length} participantes em ${leagueCoverage.length} competições.\n`);
