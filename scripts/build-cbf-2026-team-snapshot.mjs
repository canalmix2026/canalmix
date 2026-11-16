import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const divisions = [
  { key: "serie-a", competition: "Campeonato Brasileiro Série A", expected: 20, groups: { "Grupo único": 20 } },
  { key: "serie-b", competition: "Campeonato Brasileiro Série B", expected: 20, groups: { "Grupo único": 20 } },
  { key: "serie-c", competition: "Campeonato Brasileiro Série C", expected: 20, groups: { "Primeira fase": 20 } },
  { key: "serie-d", competition: "Campeonato Brasileiro Série D", expected: 96, groups: Object.fromEntries(Array.from({ length: 16 }, (_, index) => [`Grupo A${index + 1}`, 6])) },
];

function decodeHtml(value) {
  return value
    .replace(/<!--[^]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slug(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Map official CBF spellings to the local records already used by the catalog
// and game links. The source spelling remains in officialName/nameAliases.
const existingCanonicalNames = {
  "Flamengo - RJ": "CR Flamengo",
  "Vasco da Gama Saf - RJ": "CR Vasco da Gama",
  "Cruzeiro - MG": "Cruzeiro EC",
  "Bahia - BA": "EC Bahia",
  "Vitória - BA": "EC Vitória",
  "Fluminense - RJ": "Fluminense FC",
  "Grêmio - RS": "Grêmio FBPA",
  "Mirassol - SP": "Mirassol FC",
  "Red Bull Bragantino - SP": "RB Bragantino",
  "São Paulo - SP": "São Paulo FC",
  "Corinthians - SP": "SC Corinthians Paulista",
  "Internacional - RS": "SC Internacional",
  "Palmeiras - SP": "SE Palmeiras",
  "Remo - PA": "Clube do Remo",
  "Coritiba SAF - PR": "Coritiba FBC",
  "Amazonas SAF - AM": "Amazonas FC",
  "Athletic SAF - MG": "Athletic MG",
  "Atlético Goianiense Saf - GO": "Atlético Goianiense",
  "CRB - AL": "CR Brasil AL",
  "Gremio Novorizontino - Saf - SP": "Grêmio Novorizontino SP",
  "Operário - PR": "Operário Ferroviário PR",
  "Barra Futebol Clube - SC": "Barra",
  "Botafogo Pb Saf - PB": "Botafogo PB",
  "Fortaleza SAF - CE": "Fortaleza EC",
  "ITUANO FC SAF - SP": "Ituano",
  "Juventude - RS": "Juventude EC",
  "Londrina SAF - PR": "Londrina",
  "Maringá FC SAF - PR": "Maringá",
  "São Bernardo SAF - SP": "São Bernardo FC",
  "Sport Recife - PE": "SC Sport Recife",
};

async function collect(division) {
  const sourceUrl = `https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/${division.key}/2026`;
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error(`${division.key}: CBF respondeu HTTP ${response.status}`);
  const html = await response.text();
  const pattern = /<a[^>]+href="([^\"]*\/futebol-brasileiro\/times\/campeonato-brasileiro\/serie-[a-z]\/2026\/(\d+))"[^>]*>[\s\S]*?<strong>([\s\S]*?)<\/strong>[\s\S]*?<\/a>/g;
  const raw = [];
  for (const match of html.matchAll(pattern)) {
    if (raw.some((team) => team.externalId === match[2])) continue;
    raw.push({ externalId: match[2], listedName: decodeHtml(match[3]) });
  }

  let teams = raw;
  const notes = [];
  if (division.key === "serie-c") {
    const legacyItuano = raw.find((team) => team.externalId === "20281");
    const currentItuano = raw.find((team) => team.externalId === "64742");
    if (!legacyItuano || !currentItuano || raw.length !== 21) {
      throw new Error("Série C: a duplicidade de cadastro do Ituano mudou; interrompi para revisão manual.");
    }
    teams = raw.filter((team) => team.externalId !== legacyItuano.externalId);
    currentItuano.aliases = [legacyItuano.listedName];
    notes.push("A listagem CBF expõe Ituano em dois registros (IDs 20281 e 64742); tratados como um clube, preservado o registro SAF 64742, para corresponder aos 20 participantes oficiais.");
  }
  if (teams.length !== division.expected) {
    throw new Error(`${division.key}: esperava ${division.expected} participantes e encontrei ${teams.length}.`);
  }

  return {
    division,
    rawCount: raw.length,
    notes,
    sourceUrl,
    teams: teams.map((team) => {
      const officialName = team.listedName;
      const canonicalName = existingCanonicalNames[officialName] ?? officialName;
      const shorterName = officialName.replace(/\s+-\s+[A-Z]{2}$/, "").trim();
      const nameAliases = [...new Set([
        ...(team.aliases ?? []),
        ...(shorterName !== officialName ? [shorterName] : []),
        ...(canonicalName !== officialName ? [officialName] : []),
      ])];
      return {
        countryCode: "BRA",
        countryName: "Brasil",
        name: canonicalName,
        officialName,
        teamType: "club",
        gender: "men",
        squadType: "first",
        importKey: `canalmix:v1:BRA:men:first:${slug(canonicalName)}`,
        nameAliases,
        externalProvider: "CBF",
        externalId: team.externalId,
        sourceDataName: division.competition,
        sourceDataUrl: `${teamProfileUrl(division.key, team.externalId)}`,
        sourceDataLicense: "official-factual-record",
        sourceCompetitionKey: `BRA:${division.key}:2026`,
        sourceSeasonYear: 2026,
        shieldUrl: `https://conteudo.cbf.com.br/clubes/${team.externalId}/escudo.jpg`,
        shieldStatus: "pending",
        shieldSourceUrl: teamProfileUrl(division.key, team.externalId),
        shieldLicense: null,
        nameIsManual: false,
        catalogNote: "Participante confirmado na lista oficial CBF de 2026. Escudo CBF identificado; licença de reutilização pendente de validação.",
      };
    }),
  };
}

function teamProfileUrl(divisionKey, externalId) {
  return `https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/${divisionKey}/2026/${externalId}`;
}

const collected = [];
for (const division of divisions) collected.push(await collect(division));
const records = collected.flatMap((item) => item.teams);
const snapshot = {
  generatedAt: new Date().toISOString(),
  target: "Importação para o Supabase local somente",
  dataLicense: "Official factual participant lists from the Confederação Brasileira de Futebol (CBF); team marks are referenced for identification with reuse license pending.",
  shieldPolicy: "CBF shield URLs are stored as pending until reuse permissions are reviewed; existing approved shields and manual entries are preserved by the importer.",
  records,
  countries: [{ countryCode: "BRA", countryName: "Brasil", total: records.length, men: records.length, women: 0, reserveOrYouth: 0, below200: true, seasonYears: [2026] }],
  leagueCoverage: collected.map(({ division, rawCount, notes, sourceUrl, teams }) => ({
    countryCode: "BRA",
    countryName: "Brasil",
    competition: division.competition,
    competitionKey: `BRA:${division.key}:2026`,
    season: 2026,
    sourceUrl,
    expectedParticipants: division.expected,
    sourceEntries: rawCount,
    verifiedParticipants: teams.length,
    groupCounts: division.groups,
    notes,
  })),
};

const out = path.join(projectRoot, "data", "team-catalog", "cbf-2026-team-snapshot.json");
await fs.writeFile(out, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.log(`${records.length} records from ${collected.length} CBF competitions: ${collected.map((item) => `${item.division.key} ${item.teams.length}/${item.division.expected}`).join(", ")}`);
console.log(path.relative(projectRoot, out));
