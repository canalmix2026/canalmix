import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const countryCode = "ESP";
const countryName = "Espanha";
const divisions = [
  {
    key: "ESP:laliga-ea-sports:2026-27",
    name: "LALIGA EA SPORTS",
    url: "https://www.laliga.com/en-FR/laliga-easports/clubs",
    groups: { "Grupo único": [
      "Athletic Club", "Atlético de Madrid", "CA Osasuna", "Celta", "Deportivo Alavés",
      "Elche CF", "FC Barcelona", "Getafe CF", "Levante UD", "Málaga CF", "R. Racing Club",
      "Rayo Vallecano", "RC Deportivo", "RCD Espanyol de Barcelona", "Real Betis", "Real Madrid",
      "Real Sociedad", "Sevilla FC", "Valencia CF", "Villarreal CF",
    ] },
    catalogNames: {
      "Atlético de Madrid": "Club Atlético de Madrid", "Celta": "RC Celta de Vigo",
      "R. Racing Club": "Real Racing Club de Santander", "Rayo Vallecano": "Rayo Vallecano de Madrid",
      "RC Deportivo": "RC Deportivo La Coruña", "Real Betis": "Real Betis Balompié",
      "Real Madrid": "Real Madrid CF", "Real Sociedad": "Real Sociedad de Fútbol",
    },
  },
  {
    key: "ESP:laliga-hypermotion:2026-27",
    name: "LALIGA HYPERMOTION",
    url: "https://www.laliga.com/en-US/laliga-hypermotion/clubs",
    groups: { "Grupo único": [
      "AD Ceuta FC", "Albacete BP", "Burgos CF", "Cádiz CF", "CD Castellón", "CD Eldense",
      "CD Leganés", "CD Tenerife", "CE Sabadell", "Celta Fortuna", "Córdoba CF", "FC Andorra",
      "Girona FC", "Granada CF", "R. Sociedad B", "RCD Mallorca", "Real Oviedo", "Real Sporting",
      "Real Valladolid CF", "SD Eibar", "UD Almería", "UD Las Palmas",
    ] },
    catalogNames: {
      "Albacete BP": "Albacete", "R. Sociedad B": "Real Sociedad B", "Real Sporting": "Sporting Gijón",
      "Real Valladolid CF": "Real Valladolid",
    },
  },
  {
    key: "ESP:primera-federacion:2026-27",
    name: "Primera Federación",
    url: "https://rfef.es/es/noticias/aprobados-los-grupos-de-primera-federacion-para-la-temporada-202627",
    groups: {
      "Grupo 1": [
        "AD Mérida", "Arenas Club", "Athletic Club B", "Barakaldo CF", "CD Coria", "CD Extremadura",
        "CD Lugo", "CD Mirandés", "CP Cacereño", "CyD Leonesa", "Pontevedra CF", "Racing Club Ferrol",
        "RC Deportivo Fabril", "Real Avilés Industrial", "Real Unión Club", "SD Ponferradina", "UD Logroñés",
        "UD Ourense", "Unionistas de Salamanca CF", "Zamora CF",
      ],
      "Grupo 2": [
        "AD Alcorcón", "Águilas FC", "Algeciras CF", "Antequera CCF", "Atlético Madrileño", "CD Teruel",
        "CE Europa", "CF Rayo Majadahonda", "FC Cartagena", "Gimnàstic de Tarragona", "Hércules de Alicante CF",
        "Juventud de Torremolinos CF", "Real Jaén CF", "Real Madrid Castilla", "Real Murcia CF", "Real Zaragoza",
        "SD Huesca", "UD Ibiza", "UE Sant Andreu", "Villarreal CF B",
      ],
    },
  },
  {
    key: "ESP:segunda-federacion:2026-27",
    name: "Segunda Federación",
    url: "https://rfef.es/es/noticias/previa-sin-filtros",
    groupUrls: {
      "Grupo 1": "https://rfef.es/sites/default/files/segunda_federacion_grupo_i.pdf",
      "Grupo 2": "https://rfef.es/sites/default/files/segunda_federacion_grupo_ii.pdf",
      "Grupo 3": "https://rfef.es/sites/default/files/segunda_federacion_grupo_iii.pdf",
      "Grupo 4": "https://rfef.es/sites/default/files/segunda_federacion_grupo_iv.pdf",
      "Grupo 5": "https://rfef.es/sites/default/files/segunda_federacion_grupo_v.pdf",
    },
    groups: {
      "Grupo 1": [
        "Deportivo Alavés B", "Coruxo FC", "Atlético Astorga FC", "Club Portugalete", "SD Compostela",
        "Club Marino de Luanco", "SD Gernika Club", "Bergantiños FC", "Ourense CF", "CD Basconia",
        "Real Oviedo Vetusta", "SD Eibar B", "RS Gimnástica de Torrelavega", "UD Llanera", "Rayo Cantabria",
        "Sestao River Club", "SD Amorebieta", "Arosa SC",
      ],
      "Grupo 2": [
        "CD Arnedo", "CE Manresa", "FC Barcelona Atlètic", "Náxara CD", "UE Olot", "CD Ebro", "Peña Sport FC",
        "Utebo FC", "Reus FC Reddis", "Club Atlético Osasuna B", "SD Logroñés", "RCD Espanyol de Barcelona B",
        "CF Calamocha", "Terrassa FC", "CD Tudelano", "UD Logroñés B", "UD Barbastro", "Girona FC B",
      ],
      "Grupo 3": [
        "CD Alcoyano", "CD Cieza", "U.D. Castellonense", "UCAM Universidad Católica de Murcia CF", "CF La Nucía", "UD Poblense",
        "CF Lorca Deportiva", "Elche Ilicitano", "CD Minera", "SCR Peña Deportiva", "Real Murcia Imperial",
        "Orihuela CF", "CD Castellón B", "CF Intercity", "Valencia Mestalla", "RCD Mallorca B",
        "Yeclano Deportivo", "CD Atlético Baleares",
      ],
      "Grupo 4": [
        "Club Atlético Antoniano", "CD Don Benito", "Salerm Cosmetics Puente Genil FC", "Club Polideportivo Mijas Las Lagunas",
        "CD Badajoz", "CD Tenerife B", "Club Atlético Central", "RC Recreativo de Huelva",
        "CD Estepona Fútbol Sénior", "Xerez CD", "Linares Deportivo", "CD Ciudad de Lucena", "Las Palmas Atlético",
        "Betis Deportivo Balompié", "Marbella FC", "Atlético Sanluqueño CF", "UD Tamaraceite", "Sevilla Atlético",
      ],
      "Grupo 5": [
        "Real Madrid CF C", "Atlético Albacete", "Club Atlético de Madrid C", "Real Ávila CF", "CD Atlético Paso",
        "CD Numancia de Soria", "CD Guadalajara", "Salamanca CF UDS", "Calvo Sotelo Puertollano CF",
        "Gimnástica Segoviana CF", "RSD Alcalá", "CF Talavera de la Reina", "Real Valladolid Promesas",
        "CDA Navalcarnero", "Atlético Tordesillas", "UD San Sebastián de los Reyes", "UB Conquense", "Getafe CF B",
      ],
    },
  },
];

function normalize(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en")
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

const reserveNames = new Set([
  "Athletic Club B", "RC Deportivo Fabril", "Atlético Madrileño", "Real Madrid Castilla", "Villarreal CF B",
  "Celta Fortuna", "R. Sociedad B", "Deportivo Alavés B", "SD Eibar B", "FC Barcelona Atlètic",
  "Club Atlético Osasuna B", "RCD Espanyol de Barcelona B", "UD Logroñés B", "Girona FC B",
  "Elche Ilicitano", "Real Murcia Imperial", "CD Castellón B", "Valencia-Mestalla", "RCD Mallorca B",
  "CD Tenerife B", "Las Palmas Atlético", "Betis Deportivo Balompié", "Sevilla Atlético", "Real Madrid C",
  "Real Madrid CF C", "Club Atlético de Madrid C", "Atlético Albacete", "Real Valladolid Promesas", "Getafe CF B",
].map(normalize));

const sourceNameAliases = {
  "R. Racing Club": "Racing Santander",
  "RC Deportivo": "Deportivo La Coruña",
  "CyD Leonesa": "Cultural Leonesa",
};

function squadType(name) {
  return reserveNames.has(normalize(name)) ? "reserve" : "first";
}

const records = [];
const leagueCoverage = [];
for (const division of divisions) {
  let expectedParticipants = 0;
  const groupCounts = {};
  const seen = new Set();
  for (const [group, names] of Object.entries(division.groups)) {
    groupCounts[group] = names.length;
    expectedParticipants += names.length;
    for (const officialName of names) {
      const name = sourceNameAliases[officialName] ?? division.catalogNames?.[officialName] ?? officialName;
      const category = squadType(officialName);
      const normalized = normalize(name);
      const identity = `${category}:${normalized}`;
      if (seen.has(identity)) throw new Error(`${division.name}: participante duplicado ${name}.`);
      seen.add(identity);
      const importKey = `canalmix:v1:${countryCode}:men:${category}:${normalized.replace(/ /g, "-").slice(0, 100)}`;
      records.push({
        countryCode, countryName, name, officialName, teamType: "club", gender: "men", squadType: category,
        sourceDataName: division.name, sourceDataUrl: division.groupUrls?.[group] ?? division.url, sourceDataLicense: null,
        sourceCompetitionKey: division.key, sourceSeasonYear: 2026,
        nameAliases: [], importKey, externalProvider: null, externalId: null,
        shieldUrl: null, shieldStatus: "pending", shieldSourceUrl: null, shieldLicense: null,
        nameIsManual: false,
        catalogNote: "Participante da temporada 2026/27 confirmado na fonte oficial; escudo sem URL confirmada neste lote.",
      });
    }
  }
  leagueCoverage.push({
    countryCode, countryName, competition: division.name, competitionKey: division.key, season: "2026/27",
    sourceUrl: division.url, expectedParticipants, sourceEntries: expectedParticipants,
    verifiedParticipants: expectedParticipants, groupCounts, notes: [],
  });
}

for (const row of leagueCoverage) {
  const sum = Object.values(row.groupCounts).reduce((total, count) => total + count, 0);
  if (sum !== row.expectedParticipants) throw new Error(`${row.competition}: soma de grupos divergente.`);
}

const snapshot = {
  generatedAt: new Date().toISOString(), target: "Supabase local only", countries: [{
    countryCode, countryName, total: records.length, men: records.length, women: 0, reserveOrYouth: records.filter((item) => item.squadType === "reserve").length,
    below200: records.length < 200, seasonYears: [2026],
  }],
  repositories: { "LaLiga": "https://www.laliga.com/", "RFEF": "https://rfef.es/" },
  leagueCoverage, records,
};
const target = path.join(root, "data", "team-catalog", "spain-2026-27-team-snapshot.json");
await fs.writeFile(target, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
process.stdout.write(`Gerado ${path.relative(root, target)}: ${records.length} registros, ${leagueCoverage.length} competições.\n`);
