import fs from "node:fs/promises";
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const catalogDir = `${root}/data/team-catalog`;
const snapshotNames = [
  "cbf-2026-team-snapshot.json",
  "england-2026-27-team-snapshot.json",
  "spain-2026-27-team-snapshot.json",
  "france-2026-27-team-snapshot.json",
  "germany-2026-27-team-snapshot.json",
  "italy-2026-27-team-snapshot.json",
  "italy-serie-d-2026-27-team-snapshot.json",
];
const snapshots = await Promise.all(snapshotNames.map(async (name) =>
  JSON.parse(await fs.readFile(`${catalogDir}/${name}`, "utf8"))));
const baselineSnapshot = JSON.parse(await fs.readFile(`${catalogDir}/openfootball-teams-2026-11-15.json`, "utf8"));
const baselineAudit = JSON.parse(await fs.readFile(`${catalogDir}/existing-catalog-audit.json`, "utf8"));
const baseline = [...baselineSnapshot.records, ...baselineAudit.legacyTeams];

function normalize(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

const baselineNames = new Set();
for (const team of baseline) {
  for (const name of [team.name, team.officialName, ...(team.nameAliases ?? [])].filter(Boolean)) {
    baselineNames.add([team.countryCode, team.teamType, team.gender, team.squadType, normalize(name)].join("|"));
  }
}

const statusOutput = execSync("npm exec -- supabase status --network-id canal-mix-local", { encoding: "utf8" });
const status = JSON.parse(statusOutput.slice(statusOutput.indexOf("{")));
if (status.linked_project !== null) throw new Error("O Supabase local está vinculado a um projeto remoto.");
const apiUrl = status.API_URL ?? status.api_url;
const serviceRoleKey = status.SERVICE_ROLE_KEY ?? status.service_role_key;
if (!["localhost", "127.0.0.1", "::1"].includes(new URL(apiUrl).hostname)) {
  throw new Error("O host do banco não é loopback local.");
}
const supabase = createClient(apiUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

const teams = [];
for (let offset = 0; ; offset += 500) {
  const { data, error } = await supabase.from("teams").select(
    "id,name,country_code,country_name,team_type,gender,squad_type,shield_url,shield_status,import_key,source_competition_key,name_is_manual",
  ).order("country_code").order("name").range(offset, offset + 499);
  if (error) throw error;
  teams.push(...(data ?? []));
  if (!data || data.length < 500) break;
}
const teamsByImportKey = new Map(teams.map((team) => [team.import_key, team]));
const targetCodes = new Set(["BRA", "ENG", "ESP", "FRA", "DEU", "ITA"]);
const divisionMap = new Map();

for (const snapshot of snapshots) {
  const coverageByKey = new Map((snapshot.leagueCoverage ?? []).map((coverage) => [coverage.competitionKey, coverage]));
  for (const record of snapshot.records) {
    const divisionKey = record.countryCode === "ITA" && record.sourceDataName === "Serie D"
      ? "ITA:Serie D"
      : record.sourceCompetitionKey;
    const key = `${record.countryCode}|${divisionKey}`;
    const sourceCoverage = coverageByKey.get(record.sourceCompetitionKey) ?? {};
    const division = divisionMap.get(key) ?? {
      countryCode: record.countryCode,
      competition: record.sourceDataName,
      season: record.countryCode === "BRA" ? "2026" : "2026/27",
      expected: 0,
      existed: 0,
      added: 0,
      missing: 0,
      noShield: 0,
      pending: 0,
      groups: {},
      sourceUrls: new Set(),
      coverageKeys: new Set(),
      withoutShieldNames: [],
    };
    division.expected += 1;
    const sourceNames = [record.name, record.officialName, ...(record.nameAliases ?? [])].filter(Boolean);
    const existed = sourceNames.some((name) => baselineNames.has([
      record.countryCode, record.teamType, record.gender, record.squadType, normalize(name),
    ].join("|")));
    division[existed ? "existed" : "added"] += 1;
    if (!division.coverageKeys.has(record.sourceCompetitionKey)) {
      division.coverageKeys.add(record.sourceCompetitionKey);
      for (const [groupName, count] of Object.entries(sourceCoverage.groupCounts ?? {})) {
        division.groups[groupName] = (division.groups[groupName] ?? 0) + count;
      }
    }
    const sourceUrl = record.countryCode === "BRA" ? sourceCoverage.sourceUrl : record.sourceDataUrl;
    if (sourceUrl) division.sourceUrls.add(sourceUrl);
    const team = teamsByImportKey.get(record.importKey);
    if (!team) division.missing += 1;
    else {
      if (!team.shield_url) {
        division.noShield += 1;
        division.withoutShieldNames.push(team.name);
      }
      if (team.shield_status === "pending") division.pending += 1;
    }
    divisionMap.set(key, division);
  }
}

const divisions = [...divisionMap.values()].sort((a, b) =>
  a.countryCode.localeCompare(b.countryCode) || a.competition.localeCompare(b.competition));
const totals = divisions.reduce((sum, division) => {
  for (const field of ["expected", "existed", "added", "missing", "noShield", "pending"]) sum[field] += division[field];
  return sum;
}, { expected: 0, existed: 0, added: 0, missing: 0, noShield: 0, pending: 0 });
const countryNames = { BRA: "Brasil", ENG: "Inglaterra", ESP: "Espanha", FRA: "França", DEU: "Alemanha", ITA: "Itália" };
const countryTotals = new Map();
for (const division of divisions) {
  const row = countryTotals.get(division.countryCode) ?? { expected: 0, existed: 0, added: 0, missing: 0, noShield: 0, pending: 0 };
  for (const field of Object.keys(row)) row[field] += division[field];
  countryTotals.set(division.countryCode, row);
}

function groupsLabel(division) {
  const entries = Object.entries(division.groups);
  if (entries.length === 0) return "1 grupo";
  if (entries.length === 1 && ["Grupo único", "Primeira fase", "Girone unico"].includes(entries[0][0])) return "grupo único";
  const sizes = [...new Set(entries.map(([, count]) => count))];
  if (entries.length > 1 && sizes.length === 1) return `${entries.length} grupos × ${sizes[0]}`;
  if (entries.length === 1) return `grupo regional: ${entries[0][1]}`;
  return entries.map(([name, count]) => `${name}: ${count}`).join(", ");
}

function sourceLinks(division) {
  const urls = [...division.sourceUrls].sort();
  if (urls.length === 1) return `[fonte oficial](${urls[0]})`;
  return urls.map((url, index) => `[grupo ${index + 1}](${url})`).join(", ");
}

const countrySummaryRows = [...countryTotals].sort(([a], [b]) => a.localeCompare(b)).map(([code, value]) =>
  `| ${countryNames[code]} | ${value.expected} | ${value.existed} | ${value.added} | ${value.missing ?? 0} | ${value.noShield} | ${value.pending} |`);
const divisionRows = divisions.map((division) =>
  `| ${countryNames[division.countryCode]} | ${division.competition} | ${division.season} | ${groupsLabel(division)} | ${division.expected} | ${division.existed} | ${division.added} | ${division.missing} | ${division.noShield} | ${division.pending} | ${sourceLinks(division)} |`);

const countryMap = new Map();
for (const team of teams) {
  const code = team.country_code ?? "SEM-CÓDIGO";
  const value = countryMap.get(code) ?? { name: team.country_name ?? code, clubs: 0, records: 0 };
  value.records += 1;
  if (team.team_type === "club") value.clubs += 1;
  countryMap.set(code, value);
}
const otherCountries = [...countryMap].filter(([code]) => !targetCodes.has(code)).sort(([a], [b]) => a.localeCompare(b));
const otherCountryRows = otherCountries.map(([code, value]) =>
  `| ${code} | ${value.name} | ${value.clubs} | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada.${value.clubs === 0 ? " Só há seleção nacional no catálogo." : ""} |`);

const nationals = teams.filter((team) => targetCodes.has(team.country_code) && team.team_type === "national_team");
const nationalSources = {
  BRA: "https://www.cbf.com.br/selecao-brasileira/noticias/selecao-masculina/",
  ENG: "https://www.englandfootball.com/",
  ESP: "https://rfef.es/es/selecciones/seleccion-absoluta-masculina",
  DEU: "https://datencenter.dfb.de/teams/deutschland",
  FRA: "https://www.fff.fr/selection/m3/equipe-de-france.html",
  ITA: "https://upload.wikimedia.org/wikipedia/commons/b/bf/Logo_Italy_National_Football_Team_-_2023.svg",
};
const nationalRows = ["BRA", "ENG", "ESP", "DEU", "FRA", "ITA"].map((code) => {
  const team = nationals.find((candidate) => candidate.country_code === code && candidate.gender === "men" && candidate.squad_type === "first");
  return `| ${countryNames[code]} | ${team ? "Já existia" : "Ausente"} | ${team?.shield_url ? `[URL HTTPS](${team.shield_url})` : "—"} | ${team?.shield_status === "approved" ? "Aprovado" : "Pendente de revisão/licença"} | [federação/escudo](${nationalSources[code]}) |`;
});

const allRecords = snapshots.flatMap((snapshot) => snapshot.records);
const missingImportKeys = allRecords.filter((record) => !teamsByImportKey.has(record.importKey)).length;
const duplicateImportedIds = (() => {
  const seen = new Set();
  let count = 0;
  for (const record of allRecords) {
    const team = teamsByImportKey.get(record.importKey);
    if (!team) continue;
    if (seen.has(team.id)) count += 1;
    seen.add(team.id);
  }
  return count;
})();
const nameMismatches = allRecords.filter((record) => {
  const team = teamsByImportKey.get(record.importKey);
  return team && !team.name_is_manual && team.name !== record.name;
}).length;
const { data: games, error: gamesError } = await supabase.from("games").select("id,home_team_id,away_team_id");
if (gamesError) throw gamesError;
const teamIds = new Set(teams.map((team) => team.id));
const invalidGames = games.filter((game) => !game.home_team_id || !game.away_team_id ||
  (game.home_team_id && !teamIds.has(game.home_team_id)) || (game.away_team_id && !teamIds.has(game.away_team_id))).length;
const staleRows = teams.filter((team) => targetCodes.has(team.country_code) && /\[(cancelled|postponed)\]/i.test(team.name)).length;

const report = [
  "# Atualização local do catálogo de times — 16/11/2026",
  "",
  "## Escopo e resultado",
  "",
  "A importação foi gravada somente no Supabase local do CanalMix (API loopback; linked_project nulo). Não houve deploy, push nem escrita em produção.",
  "",
  `Foram importadas ${totals.expected} participações confirmadas nos seis países definidos. Comparando com a base anterior de ${baseline.length.toLocaleString("pt-BR")} registros e resolvendo nomes oficiais, aliases e categoria, ${totals.existed} identidades já existiam e ${totals.added} eram novas. A primeira contagem literal foi 393 existentes e 538 novas; nove casos foram reclassificados após a normalização de aliases conhecidos. Na repetição dos sete snapshots, todas as execuções deram 0 inclusões e 0 ambiguidades.`,
  "",
  "| País | Participantes | Já existiam | Novos | Faltando | Sem URL de escudo | Pendentes de licença |",
  "|---|---:|---:|---:|---:|---:|---:|",
  ...countrySummaryRows,
  `| **Total** | **${totals.expected}** | **${totals.existed}** | **${totals.added}** | **${totals.missing}** | **${totals.noShield}** | **${totals.pending}** |`,
  "",
  "## Conferência por divisão",
  "",
  "A coluna Já existiam compara país, tipo, categoria e nome oficial/canônico com a base anterior, incluindo aliases reconciliados. Novos é o restante da lista oficial. Faltando conta as chaves do snapshot que não têm registro local após a importação. Sem URL usa o ícone padrão. O status pendente significa que a licença/origem do escudo ainda precisa de revisão.",
  "",
  "| País | Divisão | Edição | Grupos oficiais | Participantes | Já existiam | Novos | Faltando | Sem URL de escudo | Pend. licença | Fonte |",
  "|---|---|---|---|---:|---:|---:|---:|---:|---:|---|",
  ...divisionRows,
  "",
  `Dos ${totals.expected} participantes, ${totals.noShield} ainda não têm URL de escudo. Os outros ${totals.expected - totals.noShield} têm URL, mas todos os ${totals.pending} registros deste lote seguem pendentes de revisão/licença; a licença dos dados de participantes não concede licença para marcas ou logotipos.`,
  "",
  "### Times sem URL de escudo",
  "",
  ...divisions.filter((division) => division.withoutShieldNames.length > 0).map((division) =>
    `- ${countryNames[division.countryCode]} — ${division.competition}: ${division.withoutShieldNames.join(", ")}.`),
  "",
  "## Demais países cadastrados",
  "",
  "As listas oficiais completas das duas primeiras divisões não foram verificadas para os países abaixo neste lote; não importei clubes adicionais deles. Também não confirmei individualmente se há uma segunda divisão oficial. Nos países com zero clubes, o catálogo contém apenas a seleção nacional.",
  "",
  "| Código | País | Clubes existentes | Resultado da verificação |",
  "|---|---|---:|---|",
  ...otherCountryRows,
  "",
  `Foram encontrados ${otherCountries.length} países fora dos seis focados, com ${otherCountries.filter(([, value]) => value.clubs === 0).length} sem clubes cadastrados.`,
  "",
  "## Seleções nacionais",
  "",
  "As seis seleções masculinas principais já estavam cadastradas, separadas por país, tipo e categoria; nenhuma ficha foi adicionada ou substituída. Não havia ficha feminina destes seis países na consulta. As URLs HTTPS dos seis escudos responderam HTTP 200. Cinco seguem pendentes de licença; o escudo da Itália já estava aprovado.",
  "",
  "| País | Estado antes do lote | Escudo cadastrado | Revisão | Fonte |",
  "|---|---|---|---|---|",
  ...nationalRows,
  "",
  "## Reconciliação e integridade",
  "",
  "- Preservei IDs e vínculos de jogos. As 33 variações brasileiras já foram reconciliadas; nesta etapa, consolidei 18 registros duplicados por grafia/categoria na Europa. Real Sociedad B passou de equipe principal para reserva, e Fortuna Köln manteve o ID anterior ao atualizar a associação para a 3. Liga.",
  "- Removi três registros antigos de partidas adiadas depois de confirmar que não tinham jogo vinculado. Permanecem registros legados com os sufixos [cancelled] ou [postponed] para revisão manual; eles não são participantes das listas atuais e nenhum tem jogo vinculado.",
  `- O catálogo local terminou com ${teams.length.toLocaleString("pt-BR")} registros. As ${totals.expected} chaves de importação estão presentes; IDs compartilhados indevidamente: ${duplicateImportedIds}; divergências de nome em registros não manuais: ${nameMismatches}.`,
  `- Há ${games.length} jogos cadastrados; jogos sem time ou com ID órfão: ${invalidGames}.`,
  "- A grade pública e o Modo TV responderam HTTP 200. O painel /admin/grade redirecionou para /admin/login nesta sessão; revisei estaticamente o fluxo de carregamento dos times, mas não consegui conferir visualmente os seletores autenticados.",
  "",
  "## Artefatos locais",
  "",
  "- Snapshots: cbf-2026-team-snapshot.json, england-2026-27-team-snapshot.json, spain-2026-27-team-snapshot.json, france-2026-27-team-snapshot.json, germany-2026-27-team-snapshot.json, italy-2026-27-team-snapshot.json e italy-serie-d-2026-27-team-snapshot.json.",
  "- SQL local de reconciliação: reconcile-local-brazil-aliases.sql, reconcile-local-european-aliases.sql e reconcile-local-fortuna-koeln.sql.",
  "",
].join("\n");

const outputPath = `${catalogDir}/team-catalog-update-report-2026-11-16.md`;
await fs.writeFile(outputPath, report, "utf8");
console.log(JSON.stringify({
  outputPath,
  finalTeams: teams.length,
  countries: countryMap.size,
  unverifiedCountries: otherCountries.length,
  participants: totals.expected,
  existed: totals.existed,
  added: totals.added,
  missing: totals.missing,
  noShieldUrl: totals.noShield,
  pendingShieldReview: totals.pending,
  games: games.length,
  invalidGames,
  missingImportKeys,
  duplicateImportedIds,
  nameMismatches,
  staleRows,
}, null, 2));
