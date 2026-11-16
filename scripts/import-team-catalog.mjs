import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultSnapshot = path.join(projectRoot, "data", "team-catalog", "openfootball-teams-2026-11-15.json");
const batchSize = 100;

function argsFrom(argv) {
  const options = { country: null, dryRun: false, snapshot: defaultSnapshot, updateSourceMembership: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--update-source-membership") options.updateSourceMembership = true;
    else if (arg === "--country") options.country = argv[++index]?.trim().toUpperCase() ?? "";
    else if (arg.startsWith("--country=")) options.country = arg.slice("--country=".length).trim().toUpperCase();
    else if (arg === "--snapshot") options.snapshot = path.resolve(projectRoot, argv[++index] ?? "");
    else if (arg.startsWith("--snapshot=")) options.snapshot = path.resolve(projectRoot, arg.slice("--snapshot=".length));
    else throw new Error(`Opção desconhecida: ${arg}`);
  }
  return options;
}

function localStatus() {
  const output = execSync("npm exec -- supabase status --network-id canal-mix-local", {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const jsonStart = output.indexOf("{");
  if (jsonStart < 0) throw new Error("O Supabase CLI não retornou status JSON.");
  const status = JSON.parse(output.slice(jsonStart));
  const apiUrl = status.API_URL ?? status.api_url ?? status.apiUrl;
  const serviceRoleKey = status.SERVICE_ROLE_KEY ?? status.service_role_key ?? status.serviceRoleKey;
  if (status.linked_project !== null) {
    throw new Error("A importação exige linked_project:null e o Supabase local sem vínculo remoto.");
  }
  let hostname = "";
  try {
    hostname = new URL(apiUrl).hostname;
  } catch {
    throw new Error("Não foi possível validar a URL do Supabase local.");
  }
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname)) {
    throw new Error("A importação foi bloqueada porque a API do Supabase não é loopback local.");
  }
  if (!serviceRoleKey) throw new Error("A chave local de service role não está disponível.");
  return { apiUrl, serviceRoleKey };
}

function normalize(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en")
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function identityKey(team, name = team.name) {
  return [team.country_code ?? "", team.team_type, team.gender, team.squad_type, normalize(name)].join("\u0000");
}

function sourceIdentityKeys(team) {
  if (!team.source_competition_key) return [];
  const names = new Set([team.name, team.official_name, ...(team.name_aliases ?? [])].filter(Boolean));
  return [...names].map((name) => [team.country_code ?? "", team.team_type, team.gender, team.squad_type, normalize(name), team.source_competition_key].join("\u0000"));
}

function indexTeams(teams) {
  const byImportKey = new Map();
  const byIdentity = new Map();
  const bySourceIdentity = new Map();
  const byExternalIdentity = new Map();
  const add = (map, key, team) => {
    if (!key) return;
    const matches = map.get(key) ?? [];
    if (!matches.some((match) => match.id === team.id)) map.set(key, [...matches, team]);
  };
  for (const team of teams) {
    if (team.import_key) byImportKey.set(team.import_key, team);
    const names = new Set([team.name, team.official_name, ...(team.name_aliases ?? [])].filter(Boolean));
    for (const name of names) {
      add(byIdentity, identityKey(team, name), team);
      for (const sourceKey of sourceIdentityKeys({ ...team, name })) add(bySourceIdentity, sourceKey, team);
    }
    if (team.external_provider && team.external_id) {
      add(byExternalIdentity, `${team.external_provider}\u0000${team.external_id}`, team);
    }
  }
  return { byImportKey, byIdentity, bySourceIdentity, byExternalIdentity, add };
}

function matchExisting(record, indexes) {
  const keyed = indexes.byImportKey.get(record.importKey);
  if (keyed) return { team: keyed, ambiguous: [] };
  const externalKey = record.externalProvider && record.externalId
    ? `${record.externalProvider}\u0000${record.externalId}`
    : null;
  const externalMatches = externalKey ? indexes.byExternalIdentity.get(externalKey) ?? [] : [];
  if (externalMatches.length === 1) return { team: externalMatches[0], ambiguous: [] };
  if (externalMatches.length > 1) return { team: null, ambiguous: externalMatches };

  const names = new Set([record.name, record.officialName].filter(Boolean));
  const sourceMatches = new Set();
  for (const name of names) {
    const sourceKey = [record.countryCode, record.teamType, record.gender, record.squadType, normalize(name), record.sourceCompetitionKey].join("\u0000");
    for (const team of indexes.bySourceIdentity.get(sourceKey) ?? []) sourceMatches.add(team);
  }
  if (sourceMatches.size === 1) return { team: [...sourceMatches][0], ambiguous: [] };
  if (sourceMatches.size > 1) return { team: null, ambiguous: [...sourceMatches] };

  const matches = new Set();
  for (const name of names) {
    const key = [record.countryCode, record.teamType, record.gender, record.squadType, normalize(name)].join("\u0000");
    for (const team of indexes.byIdentity.get(key) ?? []) matches.add(team);
  }
  if (matches.size === 1) return { team: [...matches][0], ambiguous: [] };
  return { team: null, ambiguous: matches.size > 1 ? [...matches] : [] };
}

function toRow(record, existing, updateSourceMembership) {
  const preserveManual = Boolean(existing?.name_is_manual);
  const aliases = [...new Set([...(existing?.name_aliases ?? []), ...(record.nameAliases ?? [])])]
    .filter((alias) => alias !== (preserveManual ? existing?.name : record.name));
  const hasCurrentShield = Boolean(existing?.shield_url);
  return {
    ...(existing?.id ? { id: existing.id } : {}),
    name: preserveManual ? existing.name : record.name,
    official_name: preserveManual ? existing.official_name : record.officialName,
    country_code: existing?.country_code ?? record.countryCode,
    country_name: existing?.country_name ?? record.countryName,
    team_type: existing?.team_type ?? record.teamType,
    gender: existing?.gender ?? record.gender,
    squad_type: existing?.squad_type ?? record.squadType,
    external_provider: existing?.external_provider ?? record.externalProvider,
    external_id: existing?.external_id ?? record.externalId,
    import_key: record.importKey,
    name_aliases: aliases,
    shield_url: existing?.shield_url ?? record.shieldUrl,
    shield_status: hasCurrentShield ? existing.shield_status : record.shieldStatus,
    shield_source_url: existing?.shield_source_url ?? record.shieldSourceUrl,
    shield_license: existing?.shield_license ?? record.shieldLicense,
    source_data_name: updateSourceMembership ? record.sourceDataName : existing?.source_data_name ?? record.sourceDataName,
    source_data_url: updateSourceMembership ? record.sourceDataUrl : existing?.source_data_url ?? record.sourceDataUrl,
    source_data_license: updateSourceMembership ? record.sourceDataLicense : existing?.source_data_license ?? record.sourceDataLicense,
    source_competition_key: updateSourceMembership ? record.sourceCompetitionKey : existing?.source_competition_key ?? record.sourceCompetitionKey,
    source_season_year: updateSourceMembership ? record.sourceSeasonYear : existing?.source_season_year ?? record.sourceSeasonYear,
    name_is_manual: preserveManual,
    catalog_note: existing?.catalog_note ?? record.catalogNote,
  };
}

async function readTeams(supabase) {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from("teams").select("*").order("id").range(offset, offset + 499);
    if (error) throw new Error(`Não foi possível ler o catálogo local (${error.code ?? "erro"}).`);
    rows.push(...(data ?? []));
    if (!data || data.length < 500) break;
  }
  return rows;
}

async function main() {
  const options = argsFrom(process.argv.slice(2));
  const status = localStatus();
  const snapshot = JSON.parse(await fs.readFile(options.snapshot, "utf8"));
  if (!Array.isArray(snapshot.records) || !Array.isArray(snapshot.countries)) {
    throw new Error("O snapshot não possui listas de times e cobertura por país.");
  }
  const records = options.country
    ? snapshot.records.filter((record) => record.countryCode === options.country)
    : snapshot.records;
  if (options.country && records.length === 0) throw new Error(`O snapshot não tem registros para ${options.country}.`);

  const supabase = createClient(status.apiUrl, status.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const existingRows = await readTeams(supabase);
  const indexes = indexTeams(existingRows);
  const grouped = Object.groupBy(records, (record) => record.countryCode);
  const results = [];

  for (const [countryCode, countryRecords] of Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))) {
    let added = 0;
    let updated = 0;
    let pendingShields = 0;
    let filledShields = 0;
    const manualReview = [];
    const competitionResults = new Map();
    for (let start = 0; start < countryRecords.length; start += batchSize) {
      const batch = countryRecords.slice(start, start + batchSize);
      const byKey = [];
      const byId = [];
      const planned = [];
      const batchManualReview = [];
      for (const record of batch) {
        const match = matchExisting(record, indexes);
        const existing = match.team;
        if (match.ambiguous.length) {
          const review = {
            name: record.name,
            externalId: record.externalId ?? null,
            sourceCompetitionKey: record.sourceCompetitionKey ?? null,
            candidateTeamIds: match.ambiguous.map((team) => team.id),
            candidateNames: match.ambiguous.map((team) => team.name),
          };
          manualReview.push(review);
          batchManualReview.push(review);
          continue;
        }
        const row = toRow(record, existing, options.updateSourceMembership);
        planned.push({ record, existing, row });
        const key = record.sourceCompetitionKey ?? "unassigned";
        const competition = competitionResults.get(key) ?? {
          competitionKey: key,
          competitionName: record.sourceDataName ?? key,
          season: record.sourceSeasonYear ?? null,
          existingBefore: 0,
          added: 0,
          manualReview: 0,
          addedTeams: [],
          updatedTeams: [],
          withoutShield: [],
          shieldPending: [],
        };
        if (existing) {
          competition.existingBefore += 1;
          competition.updatedTeams.push(record.name);
        } else {
          competition.added += 1;
          competition.addedTeams.push(record.name);
        }
        if (!row.shield_url) competition.withoutShield.push(record.name);
        else if (row.shield_status !== "approved") competition.shieldPending.push(record.name);
        competitionResults.set(key, competition);
        if (existing) byId.push(row);
        else byKey.push(row);
      }

      if (!options.dryRun && byKey.length) {
        const { error } = await supabase.from("teams").upsert(byKey, { onConflict: "import_key" });
        if (error) throw new Error(`${countryCode}: falha no lote ${Math.floor(start / batchSize) + 1} (${error.code ?? "erro"}: ${error.message ?? error.details ?? "sem detalhes"}).`);
      }
      if (!options.dryRun && byId.length) {
        const { error } = await supabase.from("teams").upsert(byId, { onConflict: "id" });
        if (error) throw new Error(`${countryCode}: falha ao vincular registros legados (${error.code ?? "erro"}: ${error.message ?? error.details ?? "sem detalhes"}).`);
      }

      for (const { record, existing, row } of planned) {
        if (existing) updated += 1;
        else added += 1;
        if (row.shield_url && row.shield_status === "approved") filledShields += 1;
        else pendingShields += 1;
        const saved = { ...existing, ...row, id: existing?.id ?? `planned:${record.importKey}` };
        if (record.importKey) indexes.byImportKey.set(record.importKey, saved);
        const names = new Set([saved.name, saved.official_name].filter(Boolean));
        for (const name of names) {
          indexes.add(indexes.byIdentity, identityKey(saved, name), saved);
          for (const sourceKey of sourceIdentityKeys({ ...saved, name, name_aliases: [] })) indexes.add(indexes.bySourceIdentity, sourceKey, saved);
        }
        if (saved.external_provider && saved.external_id) {
          indexes.add(indexes.byExternalIdentity, `${saved.external_provider}\u0000${saved.external_id}`, saved);
        }
      }
      for (const review of batchManualReview) {
        const key = review.sourceCompetitionKey ?? "unassigned";
        const competition = competitionResults.get(key) ?? {
          competitionKey: key,
          competitionName: key,
          season: null,
          existingBefore: 0,
          added: 0,
          manualReview: 0,
          addedTeams: [],
          updatedTeams: [],
          withoutShield: [],
          shieldPending: [],
        };
        competition.manualReview += 1;
        competitionResults.set(key, competition);
      }
      process.stdout.write(`${countryCode}: lote ${Math.floor(start / batchSize) + 1}, ${batch.length} registros${options.dryRun ? " (simulação)" : " gravados"}\n`);
    }
    const coverage = snapshot.countries.find((country) => country.countryCode === countryCode);
    results.push({
      countryCode,
      countryName: coverage?.countryName ?? countryCode,
      total: countryRecords.length,
      added,
      updated,
      manualReview,
      competitions: [...competitionResults.values()].map((competition) => {
        const expected = snapshot.leagueCoverage?.find((item) => item.competitionKey === competition.competitionKey);
        return {
          ...competition,
          expectedParticipants: expected?.expectedParticipants ?? null,
          groupCounts: expected?.groupCounts ?? null,
          missingAfterImport: expected?.expectedParticipants == null
            ? null
            : Math.max(0, expected.expectedParticipants - competition.existingBefore - competition.added),
          participantSourceUrl: expected?.sourceUrl ?? null,
        };
      }),
      shieldsFilled: filledShields,
      shieldsPending: pendingShields,
      below200: (coverage?.total ?? countryRecords.length) < 200,
      seasons: coverage?.seasonYears ?? [],
    });
    for (const competition of results.at(-1).competitions) {
      process.stdout.write(`${competition.competitionName} ${competition.season ?? ""}: ${competition.existingBefore} existentes, ${competition.added} novos, ${competition.manualReview} revisar, ${competition.expectedParticipants ?? "?"} esperados, ${competition.withoutShield.length} sem escudo, ${competition.shieldPending.length} escudos pendentes\n`);
    }
    process.stdout.write(`${countryCode}: adicionados ${added}, atualizados ${updated}, revisão manual ${manualReview.length}, escudos preenchidos ${filledShields}, pendentes ${pendingShields}\n`);
  }

  const total = results.reduce((sum, row) => sum + row.total, 0);
  if (!options.dryRun) {
    const reportPath = path.join(projectRoot, "data", "team-catalog", "latest-import-run.json");
    await fs.writeFile(reportPath, `${JSON.stringify({
      executedAt: new Date().toISOString(),
      target: "Supabase local em loopback; linked_project:null",
      snapshot: path.relative(projectRoot, options.snapshot).split(path.sep).join("/"),
      total,
      leagueCoverage: snapshot.leagueCoverage ?? [],
      countries: results,
      totalAdded: results.reduce((sum, row) => sum + row.added, 0),
      totalUpdated: results.reduce((sum, row) => sum + row.updated, 0),
      totalManualReview: results.reduce((sum, row) => sum + row.manualReview.length, 0),
      shieldsFilled: results.reduce((sum, row) => sum + row.shieldsFilled, 0),
      shieldsPending: results.reduce((sum, row) => sum + row.shieldsPending, 0),
      below200Countries: results.filter((row) => row.below200).map((row) => row.countryCode),
    }, null, 2)}\n`, "utf8");
  }
  process.stdout.write(`${options.dryRun ? "Simulação" : "Importação local"}: ${total} equipes em ${results.length} países. Nenhuma conexão remota foi usada.\n`);
}

await main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Falha na importação do catálogo."}\n`);
  process.exitCode = 1;
});
