import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const countryCode = "ENG";
const countryName = "Inglaterra";
const divisions = [
  {
    key: "ENG:premier-league:2026-27", name: "Premier League",
    url: "https://www.premierleague.com/en/news/4365156/new-to-the-premier-league-heres-all-you-need-to-know",
    teams: [
      "AFC Bournemouth", "Arsenal", "Aston Villa", "Brentford", "Brighton & Hove Albion", "Chelsea", "Coventry City",
      "Crystal Palace", "Everton", "Fulham", "Hull City", "Ipswich Town", "Leeds United", "Liverpool", "Manchester City",
      "Manchester United", "Newcastle United", "Nottingham Forest", "Sunderland", "Tottenham Hotspur",
    ],
  },
  {
    key: "ENG:championship:2026-27", name: "Sky Bet Championship",
    url: "https://www.efl.com/competitions/efl-championship/",
    teams: [
      "Middlesbrough", "Swansea City", "West Ham United", "Wolverhampton Wanderers", "West Bromwich Albion", "Southampton",
      "Birmingham City", "Queens Park Rangers", "Stoke City", "Blackburn Rovers", "Portsmouth", "Sheffield United",
      "Millwall", "Bristol City", "Lincoln City", "Cardiff City", "Wrexham", "Bolton Wanderers", "Charlton Athletic",
      "Norwich City", "Watford", "Burnley", "Derby County", "Preston North End",
    ],
  },
  {
    key: "ENG:league-one:2026-27", name: "Sky Bet League One",
    url: "https://www.efl.com/news/2026/october/31/sky-bet-league-one-results--table---stats/",
    teams: [
      "Huddersfield Town", "Stockport County", "Oxford United", "Bradford City", "Plymouth Argyle", "Reading", "Cambridge United",
      "Luton Town", "Sheffield Wednesday", "Mansfield Town", "Leicester City", "Burton Albion", "Stevenage", "MK Dons",
      "Wycombe Wanderers", "Leyton Orient", "AFC Wimbledon", "Doncaster Rovers", "Notts County", "Blackpool", "Peterborough United",
      "Bromley", "Barnsley", "Wigan Athletic",
    ],
  },
  {
    key: "ENG:league-two:2026-27", name: "Sky Bet League Two",
    url: "https://www.efl.com/news/2026/september/12/sky-bet-league-two--barnet-hit-top-spot/",
    teams: [
      "Salford City", "Barnet", "Cheltenham Town", "Crewe Alexandra", "York City", "Walsall", "Chesterfield", "Exeter City",
      "Accrington Stanley", "Shrewsbury Town", "Grimsby Town", "Gillingham", "Tranmere Rovers", "Swindon Town", "Bristol Rovers",
      "Newport County", "Rochdale", "Fleetwood Town", "Northampton Town", "Oldham Athletic", "Colchester United", "Rotherham United",
      "Port Vale", "Crawley Town",
    ],
  },
];

const catalogNames = {
  Arsenal: "Arsenal FC", "Aston Villa": "Aston Villa FC", Brentford: "Brentford FC",
  "Brighton & Hove Albion": "Brighton & Hove Albion FC", Chelsea: "Chelsea FC", "Coventry City": "Coventry City FC",
  "Crystal Palace": "Crystal Palace FC",
  Everton: "Everton FC", Fulham: "Fulham FC", "Hull City": "Hull City AFC", "Ipswich Town": "Ipswich Town FC",
  "Leeds United": "Leeds United FC", Liverpool: "Liverpool FC", "Manchester City": "Manchester City FC",
  "Manchester United": "Manchester United FC", "Newcastle United": "Newcastle United FC", "Nottingham Forest": "Nottingham Forest FC",
  Sunderland: "Sunderland AFC", "Tottenham Hotspur": "Tottenham Hotspur FC", Middlesbrough: "Middlesbrough FC",
  "Swansea City": "Swansea City AFC", "West Ham United": "West Ham United FC", "Wolverhampton Wanderers": "Wolverhampton Wanderers FC",
  "West Bromwich Albion": "West Bromwich Albion FC", Southampton: "Southampton FC", "Birmingham City": "Birmingham City FC",
  "Queens Park Rangers": "Queens Park Rangers FC", "Stoke City": "Stoke City FC", "Blackburn Rovers": "Blackburn Rovers FC",
  Portsmouth: "Portsmouth FC", "Sheffield United": "Sheffield United FC", "Millwall": "Millwall FC", "Bristol City": "Bristol City FC",
  "Lincoln City": "Lincoln City", "Cardiff City": "Cardiff City", Wrexham: "Wrexham AFC", "Bolton Wanderers": "Bolton Wanderers",
  "Charlton Athletic": "Charlton Athletic FC", "Norwich City": "Norwich City FC", Watford: "Watford FC", Burnley: "Burnley FC",
  "Derby County": "Derby County FC", "Preston North End": "Preston North End FC", Reading: "Reading FC", Stevenage: "Stevenage FC",
  "MK Dons": "Milton Keynes Dons", "Leyton Orient": "Leyton Orient FC", "Notts County": "Notts County FC", Blackpool: "Blackpool FC",
  "Peterborough United": "Peterborough United FC", Bromley: "Bromley FC", Barnet: "Barnet FC", Walsall: "Walsall FC",
  Chesterfield: "Chesterfield FC", Gillingham: "Gillingham FC", Rochdale: "Rochdale AFC", "Fleetwood Town": "Fleetwood Town FC",
  "Port Vale": "Port Vale FC", "Crawley Town": "Crawley Town FC", Barnsley: "Barnsley FC",
};

function normalize(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en")
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

const records = [];
const leagueCoverage = [];
for (const division of divisions) {
  const seen = new Set();
  for (const officialName of division.teams) {
    const name = catalogNames[officialName] ?? officialName;
    const normalized = normalize(name);
    if (seen.has(normalized)) throw new Error(`${division.name}: participante duplicado ${officialName}.`);
    seen.add(normalized);
    records.push({
      countryCode, countryName, name, officialName, teamType: "club", gender: "men", squadType: "first",
      sourceDataName: division.name, sourceDataUrl: division.url, sourceDataLicense: null,
      sourceCompetitionKey: division.key, sourceSeasonYear: 2026,
      nameAliases: [], importKey: `canalmix:v1:${countryCode}:men:first:${normalized.replace(/ /g, "-").slice(0, 100)}`,
      externalProvider: null, externalId: null, shieldUrl: null, shieldStatus: "pending", shieldSourceUrl: null,
      shieldLicense: null, nameIsManual: false,
      catalogNote: "Participante de 2026/27 confirmado na lista oficial; escudo sem URL confirmada neste lote.",
    });
  }
  leagueCoverage.push({
    countryCode, countryName, competition: division.name, competitionKey: division.key, season: "2026/27",
    sourceUrl: division.url, expectedParticipants: division.teams.length, sourceEntries: division.teams.length,
    verifiedParticipants: division.teams.length, groupCounts: { "Grupo único": division.teams.length }, notes: [],
  });
}

const snapshot = {
  generatedAt: new Date().toISOString(), target: "Supabase local only", countries: [{
    countryCode, countryName, total: records.length, men: records.length, women: 0, reserveOrYouth: 0,
    below200: records.length < 200, seasonYears: [2026],
  }], repositories: { PremierLeague: "https://www.premierleague.com/", EFL: "https://www.efl.com/" },
  leagueCoverage, records,
};
const target = path.join(root, "data", "team-catalog", "england-2026-27-team-snapshot.json");
await fs.writeFile(target, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
process.stdout.write(`Gerado ${path.relative(root, target)}: ${records.length} registros, ${leagueCoverage.length} competições.\n`);
