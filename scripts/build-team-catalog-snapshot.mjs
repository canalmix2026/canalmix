import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRepos = [
  { name: "austria", priority: 0 },
  { name: "belgium", priority: 0 },
  { name: "deutschland", priority: 0 },
  { name: "england", priority: 0 },
  { name: "espana", priority: 0 },
  { name: "italy", priority: 0 },
  { name: "europe", priority: 1 },
  { name: "south-america", priority: 1 },
  { name: "world", priority: 2 },
];

const countryCodes = {
  albania: "ALB", algeria: "DZA", argentina: "ARG", armenia: "ARM", australia: "AUS",
  austria: "AUT", belarus: "BLR", belgium: "BEL", bolivia: "BOL", brazil: "BRA",
  canada: "CAN", chile: "CHL", china: "CHN", colombia: "COL", "costa-rica": "CRI",
  croatia: "HRV", cyprus: "CYP", czechia: "CZE", "czech-republic": "CZE", ecuador: "ECU",
  egypt: "EGY", england: "ENG", estonia: "EST", finland: "FIN", france: "FRA", georgia: "GEO",
  germany: "DEU", ghana: "GHA", greece: "GRC", hungary: "HUN", iceland: "ISL", india: "IND",
  indonesia: "IDN", ireland: "IRL", israel: "ISR", italy: "ITA", japan: "JPN", kazakhstan: "KAZ",
  kenya: "KEN", latvia: "LVA", lithuania: "LTU", malawi: "MWI", mexico: "MEX", montenegro: "MNE",
  morocco: "MAR", netherlands: "NLD", nigeria: "NGA", norway: "NOR", panama: "PAN",
  paraguay: "PRY", peru: "PER", poland: "POL", portugal: "PRT", "south-africa": "ZAF",
  "saudi-arabia": "SAU", scotland: "SCO", senegal: "SEN", serbia: "SRB", "south-korea": "KOR",
  sweden: "SWE", switzerland: "CHE", tanzania: "TZA", turkey: "TUR", türkiye: "TUR",
  uganda: "UGA", uruguay: "URY", "united-states": "USA", usa: "USA", venezuela: "VEN",
  wales: "WAL", zambia: "ZMB", zimbabwe: "ZWE", rwanda: "RWA", "faroe-islands": "FRO",
  "northern-ireland": "NIR", "new-zealand": "NZL", fiji: "FJI", "solomon-islands": "SLB",
  "new-caledonia": "NCL", tahiti: "PYF", "papua-new-guinea": "PNG", vanuatu: "VUT",
  "cook-islands": "COK",
};

const directCountry = {
  austria: "AUT", belgium: "BEL", deutschland: "DEU", england: "ENG", espana: "ESP", italy: "ITA",
};

const countryNames = {
  ALB: "Albânia", DZA: "Argélia", ARG: "Argentina", ARM: "Armênia", AUS: "Austrália", AUT: "Áustria",
  BLR: "Belarus", BEL: "Bélgica", BOL: "Bolívia", BRA: "Brasil", CAN: "Canadá", CHL: "Chile",
  CHN: "China", COL: "Colômbia", CRI: "Costa Rica", HRV: "Croácia", CYP: "Chipre", CZE: "Tchéquia", ESP: "Espanha",
  ECU: "Equador", EGY: "Egito", ENG: "Inglaterra", EST: "Estônia", FIN: "Finlândia", FRA: "França",
  GEO: "Geórgia", DEU: "Alemanha", GHA: "Gana", GRC: "Grécia", HUN: "Hungria", ISL: "Islândia",
  IND: "Índia", IDN: "Indonésia", IRL: "Irlanda", ISR: "Israel", ITA: "Itália", JPN: "Japão",
  KAZ: "Cazaquistão", KEN: "Quênia", LVA: "Letônia", LTU: "Lituânia", MWI: "Malawi", MEX: "México",
  MNE: "Montenegro", MAR: "Marrocos", NLD: "Países Baixos", NGA: "Nigéria", NOR: "Noruega", PAN: "Panamá",
  PRY: "Paraguai", PER: "Peru", POL: "Polônia", PRT: "Portugal", ZAF: "África do Sul", SAU: "Arábia Saudita",
  SCO: "Escócia", SEN: "Senegal", SRB: "Sérvia", KOR: "Coreia do Sul", SWE: "Suécia", CHE: "Suíça",
  TZA: "Tanzânia", TUR: "Turquia", UGA: "Uganda", URY: "Uruguai", USA: "Estados Unidos", VEN: "Venezuela",
  WAL: "País de Gales", ZMB: "Zâmbia", ZWE: "Zimbábue", RWA: "Ruanda", FRO: "Ilhas Faroé", NIR: "Irlanda do Norte",
  NZL: "Nova Zelândia", FJI: "Fiji", SLB: "Ilhas Salomão", NCL: "Nova Caledônia", PYF: "Taiti",
  PNG: "Papua-Nova Guiné", VUT: "Vanuatu", COK: "Ilhas Cook",
};

function normalize(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en")
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function slug(value) {
  return normalize(value).replace(/ /g, "-").slice(0, 100) || "team";
}

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

function seasonYear(relativePath) {
  const years = [...relativePath.matchAll(/20\d{2}/g)].map(([year]) => Number(year));
  return years.length ? Math.max(...years) : null;
}

function countryForFile(repoName, relativePath) {
  if (directCountry[repoName]) return directCountry[repoName];
  const parts = relativePath.split(path.sep);
  if (repoName === "europe" || repoName === "south-america") {
    return countryCodes[parts[0]?.toLocaleLowerCase("en")] ?? null;
  }
  if (repoName === "world") {
    const region = parts[0]?.toLocaleLowerCase("en");
    const country = parts[1]?.toLocaleLowerCase("en");
    if (region === "north-america" && country === "major-league-soccer") return "USA_MLS";
    return countryCodes[country] ?? null;
  }
  return null;
}

function competitionKey(relativePath) {
  const parts = relativePath.split(path.sep);
  const withoutSeasonFolders = parts.filter((part) => !/^20\d{2}(?:-20\d{2}|-\d{2})?$/.test(part));
  const file = withoutSeasonFolders.pop() ?? relativePath;
  const cleanFile = file.replace(/^20\d{2}(?:-20\d{2}|-\d{2})?[_-]/, "").replace(/\.txt$/i, "");
  return [...withoutSeasonFolders, cleanFile].join("/").toLocaleLowerCase("en");
}

function isEligibleSourceFile(relativePath, year) {
  if (!relativePath.toLocaleLowerCase("en").endsWith(".txt") || year < 2024) return false;
  if (/(^|[\\/])(?:rsssf|cup|cups|champions-league|copa-libertadores|copa-sudamericana|worldcup|friendlies)(?:[\\/._-]|$)/i.test(relativePath)) return false;
  if (/cup|\bfull\b|friendly|play.?off|qualifying/i.test(relativePath)) return false;
  return true;
}

function sourcePriority(repoName, fallbackPriority) {
  if (directCountry[repoName]) return 0;
  return fallbackPriority;
}

function competitionRank(countryCode, competition) {
  if (countryCode !== "BEL") return 1;
  const value = competition.toLocaleLowerCase("en");
  if (value.endsWith("/be1") || value === "be1") return 1;
  if (value.includes("d1_acff")) return 3;
  if (value.includes("d2_acff")) return 4;
  if (value.includes("d3_acff")) return 5;
  if (value.includes("1_prov")) return 6;
  if (value.includes("2_prov")) return 7;
  if (value.includes("3_prov")) return 8;
  if (value.includes("4_prov")) return 9;
  return 10;
}

function parseFixtures(contents) {
  const teams = new Set();
  for (const line of contents.split(/\r?\n/)) {
    const delimiter = line.match(/\s+v\s+/i);
    if (!delimiter || line.trimStart().startsWith("#")) continue;
    const index = delimiter.index;
    if (index === undefined) continue;
    let home = line.slice(0, index).trim().replace(/^\d{1,2}:\d{2}\s+/, "").trim();
    let away = line.slice(index + delimiter[0].length).trim();
    away = away.replace(/\s{2,}\d+-\d+(?:\s|$).*$/, "").trim();
    if (home.length >= 2 && away.length >= 2 && !/^\d{1,2}:\d{2}$/.test(home)) {
      teams.add(home);
      teams.add(away);
    }
  }
  return [...teams];
}

async function parseClubAliases(files) {
  const aliases = new Map();
  const ambiguousAliases = new Set();
  const candidates = new Map();
  for (const file of files) {
    if (!file.toLowerCase().endsWith(".clubs.txt")) continue;
    const relative = path.relative(path.join(projectRoot, "tmp", "openfootball-clubs"), file);
    const parts = relative.split(path.sep);
    const code = countryCodes[parts[1]?.toLocaleLowerCase("en")] ?? null;
    if (!code) continue;
    const contents = await fs.readFile(file, "utf8");
    let canonical = null;
    for (const line of contents.split(/\r?\n/)) {
      if (!line || line.startsWith("=") || line.startsWith("#") || line.startsWith("==")) continue;
      if (/^\s*\|/.test(line)) {
        const alias = line.replace(/^\s*\|\s*/, "").split(/\s+#/)[0].trim();
        if (canonical && alias) addAliasCandidate(candidates, code, alias, canonical);
        continue;
      }
      if (/^\s/.test(line)) continue;
      const first = line.split(",")[0].trim();
      if (first.length >= 2) {
        canonical = first;
        addAliasCandidate(candidates, code, canonical, canonical);
      }
    }
  }
  for (const [key, names] of candidates) {
    if (names.size === 1) aliases.set(key, [...names][0]);
    else ambiguousAliases.add(key);
  }
  return { aliases, ambiguousAliases };
}

function addAliasCandidate(map, code, alias, canonical) {
  const key = `${code}:${normalize(alias)}`;
  const set = map.get(key) ?? new Set();
  set.add(canonical);
  map.set(key, set);
}

function squadTypeFor(name) {
  if (/\b(?:u(?:1[89]|2[0-3])|under ?(?:1[89]|2[0-3]))\b/i.test(name)) {
    return /\bu(?:1[89]|20|21)\b/i.test(name) ? "youth" : "development";
  }
  if (/\b(?:reserves?|reserve team|b team|ii|second xi)\b/i.test(name)) return "reserve";
  return "first";
}

function genderFor(title, relativePath) {
  return /women|female|frauen|feminine|femminile|women's|ladies/i.test(`${title} ${relativePath}`)
    ? "women"
    : "men";
}

function sourceTitle(contents, fallback) {
  return contents.split(/\r?\n/).find((line) => line.trim().startsWith("="))?.replace(/^\s*=+\s*/, "").trim() || fallback;
}

function repoCommit(directory) {
  try {
    return execFileSync("git", ["-C", directory, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

async function main() {
  const repoFiles = new Map();
  const repositoryRefs = {};
  for (const repo of sourceRepos) {
    const directory = path.join(projectRoot, "tmp", `openfootball-${repo.name}`);
    try {
      const files = await walk(directory);
      repoFiles.set(repo.name, files);
      repositoryRefs[repo.name] = {
        commit: repoCommit(directory),
        url: `https://github.com/openfootball/${repo.name}`,
        license: "CC0-1.0",
      };
    } catch {
      throw new Error(`Clone a fonte antes de gerar o snapshot: ${directory}`);
    }
  }

  const clubFiles = await walk(path.join(projectRoot, "tmp", "openfootball-clubs"));
  repositoryRefs.clubs = {
    commit: repoCommit(path.join(projectRoot, "tmp", "openfootball-clubs")),
    url: "https://github.com/openfootball/clubs",
    license: "CC0-1.0",
  };
  const { aliases, ambiguousAliases } = await parseClubAliases(clubFiles.filter((file) => file.toLowerCase().endsWith(".clubs.txt")));

  const latestCompetitionFiles = new Map();
  for (const repo of sourceRepos) {
    const directory = path.join(projectRoot, "tmp", `openfootball-${repo.name}`);
    for (const file of repoFiles.get(repo.name) ?? []) {
      const relativePath = path.relative(directory, file);
      const year = seasonYear(relativePath);
      const countryCode = countryForFile(repo.name, relativePath);
      if (!countryCode || !year || !isEligibleSourceFile(relativePath, year)) continue;
      const key = `${countryCode}:${competitionKey(relativePath)}`;
      const candidate = {
        repo: repo.name,
        relativePath,
        absolutePath: file,
        countryCode,
        year,
        priority: sourcePriority(repo.name, repo.priority),
        key,
      };
      const existing = latestCompetitionFiles.get(key);
      if (!existing || candidate.year > existing.year || (candidate.year === existing.year && candidate.priority < existing.priority)) {
        latestCompetitionFiles.set(key, candidate);
      }
    }
  }

  const imported = new Map();
  const sourceSeasonRanges = new Map();
  for (const candidate of [...latestCompetitionFiles.values()].sort((a, b) =>
    competitionRank(a.countryCode, competitionKey(a.relativePath)) - competitionRank(b.countryCode, competitionKey(b.relativePath)) ||
    a.key.localeCompare(b.key),
  )) {
    const contents = await fs.readFile(candidate.absolutePath, "utf8");
    const title = sourceTitle(contents, path.basename(candidate.relativePath, ".txt"));
    const gender = genderFor(title, candidate.relativePath);
    const sourceDataUrl = `${repositoryRefs[candidate.repo].url}/blob/${repositoryRefs[candidate.repo].commit}/${candidate.relativePath.split(path.sep).join("/")}`;
    const names = parseFixtures(contents);
    const countryNamesInFixture = new Map([
      ["USA_MLS", "Estados Unidos e Canadá"],
    ]);
    for (const rawName of names) {
      const teamCountry = candidate.countryCode === "USA_MLS"
        ? (/montreal|toronto|vancouver whitecaps/i.test(rawName) ? "CAN" : "USA")
        : candidate.countryCode;
      const aliasKey = `${teamCountry}:${normalize(rawName)}`;
      const ambiguousAlias = ambiguousAliases.has(aliasKey);
      const canonical = aliases.get(aliasKey) ?? rawName;
      const squadType = squadTypeFor(rawName);
      const identityQualifier = ambiguousAlias ? candidate.key : "";
      const identity = `${teamCountry}:${gender}:${squadType}:${normalize(canonical)}:${identityQualifier}`;
      const current = imported.get(identity);
      const record = {
        countryCode: teamCountry,
        countryName: countryNames[teamCountry] ?? countryNamesInFixture.get(candidate.countryCode) ?? teamCountry,
        name: canonical,
        officialName: canonical,
        teamType: "club",
        gender,
        squadType,
        sourceDataName: `OpenFootball ${title}`,
        sourceDataUrl,
        sourceLicense: "CC0-1.0",
        sourceCompetitionKey: candidate.key,
        sourceSeasonYear: candidate.year,
        nameAliases: rawName === canonical ? [] : [rawName],
        identityQualifier,
        catalogNote: ambiguousAlias
          ? `Nome de fonte ambíguo na base de clubes; mantido separado por competição (${candidate.key}) para evitar mesclar homônimos.`
          : undefined,
      };
      if (!current) {
        imported.set(identity, record);
      } else {
        current.nameAliases = [...new Set([...(current.nameAliases ?? []), ...(rawName === current.name ? [] : [rawName])])];
      }
      const range = sourceSeasonRanges.get(teamCountry) ?? new Set();
      range.add(candidate.year);
      sourceSeasonRanges.set(teamCountry, range);
    }
  }

  const manualEntries = [
    ...[
      ["Auckland City FC", "NZL"], ["Auckland FC Reserves", "NZL"], ["Auckland United", "NZL"],
      ["Bay Olympic", "NZL"], ["Birkenhead United", "NZL"], ["Eastern Suburbs", "NZL"],
      ["East Coast Bays", "NZL"], ["Fencibles United", "NZL"], ["Manukau United", "NZL"],
      ["Melville United", "NZL"], ["Tauranga City", "NZL"], ["Western Springs", "NZL"],
      ["FC Western", "NZL"], ["Island Bay United", "NZL"], ["Miramar Rangers", "NZL"],
      ["Napier City Rovers", "NZL"], ["Petone FC", "NZL"], ["Wellington Olympic", "NZL"],
      ["Wellington Phoenix Reserves", "NZL"], ["Upper Hutt City Football", "NZL"],
      ["Waterside Karori", "NZL"], ["Western Suburbs", "NZL"], ["Cashmere Technical", "NZL"],
      ["Christchurch United", "NZL"], ["Coastal Spirit", "NZL"], ["Dunedin City Royals", "NZL"],
      ["Ferrymead Bays", "NZL"], ["Nelson Suburbs", "NZL"], ["Nomads United", "NZL"],
      ["Northern AFC", "NZL"], ["Wanaka FC", "NZL"], ["Selwyn United", "NZL"],
    ].map(([name, countryCode]) => ({
      name, countryCode, countryName: "Nova Zelândia", teamType: "club", gender: "men",
      squadType: squadTypeFor(name), sourceDataName: "New Zealand Football — Dettol National League 2026",
      sourceDataUrl: "https://www.nzfootball.co.nz/newsarticle/162811?newsfeedPageNum=5",
      sourceLicense: "official-factual-record", sourceCompetitionKey: "nzf-national-league-2026-men",
      sourceSeasonYear: 2026,
    })),
    ...[
      "Auckland United", "West Coast Rangers", "Eastern Suburbs", "Waterside Karori", "Fencibles",
      "SU University of Otago", "Wellington United", "Wellington Phoenix Reserves", "Mainland Pride",
    ].map((name) => ({
      name, countryCode: "NZL", countryName: "Nova Zelândia", teamType: "club", gender: "women",
      squadType: squadTypeFor(name), sourceDataName: "New Zealand Football — Dettol National League Championship 2026 feminino",
      sourceDataUrl: "https://www.nzfootball.co.nz/newsarticle/170010?newsfeedId=671503",
      sourceLicense: "official-factual-record", sourceCompetitionKey: "nzf-national-league-2026-women",
      sourceSeasonYear: 2026,
    })),
    ...[
      ["Auckland City FC", "NZL"], ["Central Coast FC", "SLB"], ["AS Venus", "PYF"],
      ["AS Tiga Sport", "NCL"], ["Rewa FC", "FJI"], ["Lae City FC", "PNG"],
      ["Galaxy FC", "VUT"], ["Tupapa Maraerenga FC", "COK"],
    ].map(([name, countryCode]) => ({
      name, countryCode, countryName: countryNames[countryCode], teamType: "club", gender: "men",
      squadType: squadTypeFor(name), sourceDataName: "OFC Men’s Champions League 2026 — clubs participantes",
      sourceDataUrl: "https://www.oceaniafootball.com/draw-confirmed-for-ofc-mens-champions-league-2026/",
      sourceLicense: "official-factual-record", sourceCompetitionKey: "ofc-mens-champions-league-2026",
      sourceSeasonYear: 2026,
    })),
  ];

  for (const record of manualEntries) {
    const key = `${record.countryCode}:${record.gender}:${record.squadType}:${normalize(record.name)}:`;
    const existing = imported.get(key);
    if (!existing) imported.set(key, { ...record, officialName: record.name });
    const range = sourceSeasonRanges.get(record.countryCode) ?? new Set();
    range.add(record.sourceSeasonYear);
    sourceSeasonRanges.set(record.countryCode, range);
  }

  const allRecords = [...imported.values()];
  const belgiumEntries = allRecords.filter((record) => record.countryCode === "BEL")
    .sort((a, b) => competitionRank("BEL", a.sourceCompetitionKey.split(":").slice(1).join(":")) - competitionRank("BEL", b.sourceCompetitionKey.split(":").slice(1).join(":")) || a.name.localeCompare(b.name));
  const recordIdentity = (record) => `${record.gender}:${record.squadType}:${normalize(record.name)}:${record.identityQualifier ?? ""}`;
  const acceptedBelgianKeys = new Set(belgiumEntries.slice(0, 210).map(recordIdentity));
  const data = allRecords.filter((record) => record.countryCode !== "BEL" || acceptedBelgianKeys.has(recordIdentity(record))).map((record) => {
    const qualifier = record.identityQualifier ? `:source:${slug(record.identityQualifier)}` : "";
    const importKey = `canalmix:v1:${record.countryCode}:${record.gender}:${record.squadType}:${slug(record.name)}${qualifier}`;
    return {
      ...record,
      importKey,
      externalProvider: null,
      externalId: null,
      sourceDataLicense: record.sourceLicense,
      nameAliases: [...new Set(record.nameAliases ?? [])],
      catalogNote: [record.catalogNote, "A fonte não fornece identificador estável por clube; import_key é uma chave local idempotente. O ID externo permanece vazio."].filter(Boolean).join(" "),
      shieldUrl: null,
      shieldStatus: "pending",
      shieldSourceUrl: null,
      shieldLicense: null,
      nameIsManual: false,
    };
  }).sort((a, b) => a.countryCode.localeCompare(b.countryCode) || a.name.localeCompare(b.name));

  const summary = Object.groupBy(data, (item) => item.countryCode);
  const snapshot = {
    generatedAt: new Date().toISOString(),
    dataLicense: "CC0-1.0 for OpenFootball sourced records; official federation/OFC pages are referenced for the explicitly identified 2026 Oceania participant lists.",
    shieldPolicy: "No crest is supplied unless its exact asset and reuse license are independently verified. All unverified crests remain pending.",
    repositories: repositoryRefs,
    records: data,
    countries: Object.entries(summary).map(([code, records]) => ({
      countryCode: code,
      countryName: countryNames[code] ?? code,
      total: records.length,
      men: records.filter((record) => record.gender === "men").length,
      women: records.filter((record) => record.gender === "women").length,
      reserveOrYouth: records.filter((record) => record.squadType !== "first").length,
      below200: records.length < 200,
      seasonYears: [...(sourceSeasonRanges.get(code) ?? [])].sort((a, b) => a - b),
    })).sort((a, b) => a.countryName.localeCompare(b.countryName, "pt-BR")),
  };
  const output = path.join(projectRoot, "data", "team-catalog", "openfootball-teams-2026-11-15.json");
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  process.stdout.write(`${data.length} clubes em ${snapshot.countries.length} países; arquivo ${path.relative(projectRoot, output)}\n`);
  for (const country of snapshot.countries) {
    process.stdout.write(`${country.countryCode} ${country.countryName}: ${country.total}${country.below200 ? " (abaixo de 200)" : ""}\n`);
  }
}

await main();
