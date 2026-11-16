"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronDown, Eye, EyeOff, Pencil, Plus, Search, X } from "lucide-react";
import {
  saveGameAction,
  setGamePublishedAction,
} from "@/app/admin/actions";
import type { ChannelCardData } from "@/lib/channels";
import type { GameBroadcastData, GameScheduleData } from "@/lib/games";
import type { TeamScheduleData } from "@/lib/teams";
import {
  BRASILIA_TIME_ZONE,
  GAME_COUNTRIES,
  brasiliaDateTimeToUtc,
  formatBrasiliaDateTime,
  utcToBrasiliaInputs,
} from "@/lib/game-schedule";

type BroadcastDraft = {
  key: string;
  id: string | null;
  countryCode: string;
  countryName: string;
  broadcasterName: string;
  channelId: string | null;
  isPrimary: boolean;
};

function draftBroadcast(broadcast: GameBroadcastData, index: number): BroadcastDraft {
  return {
    key: broadcast.id || `broadcast-${index}`,
    id: broadcast.id,
    countryCode: broadcast.countryCode,
    countryName: broadcast.countryName,
    broadcasterName: broadcast.broadcasterName,
    channelId: broadcast.channelId,
    isPrimary: broadcast.isPrimary,
  };
}

function newBroadcast(index: number): BroadcastDraft {
  return {
    key: `new-${index}-${crypto.randomUUID()}`,
    id: null,
    countryCode: "BR",
    countryName: "Brasil",
    broadcasterName: "",
    channelId: null,
    isPrimary: false,
  };
}

function SearchableChannelSelect({
  channels,
  value,
  onChange,
}: {
  channels: ChannelCardData[];
  value: string | null;
  onChange(id: string | null): void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = channels.find((channel) => channel.id === value);
  const results = channels.filter((channel) =>
    channel.name.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR")),
  );

  return (
    <div className="game-channel-select">
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className="game-channel-select__trigger"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{selected?.name ?? "Sem vínculo"}{selected && !selected.isPublished ? " · oculto" : ""}</span>
        <ChevronDown aria-hidden="true" size={17} />
      </button>
      {open && (
        <div className="game-channel-select__menu">
          <label className="game-channel-select__search">
            <Search aria-hidden="true" size={16} />
            <span className="sr-only">Buscar canal no CanalMix</span>
            <input
              autoFocus
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Buscar canal…"
              type="search"
              value={query}
            />
          </label>
          <div aria-label="Canais disponíveis" className="game-channel-select__options" role="listbox">
            <button
              aria-selected={value === null}
              onClick={() => { onChange(null); setOpen(false); setQuery(""); }}
              role="option"
              type="button"
            >
              Sem vínculo
            </button>
            {results.map((channel) => (
              <button
                aria-selected={value === channel.id}
                aria-label={`${channel.name} (${channel.slug})`}
                key={channel.id}
                onClick={() => { onChange(channel.id); setOpen(false); setQuery(""); }}
                role="option"
                type="button"
              >
                {channel.name}{!channel.isPublished ? " · oculto" : ""}
              </button>
            ))}
            {results.length === 0 && <p>Nenhum canal encontrado.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function SearchableTeamSelect({
  label,
  teams,
  value,
  valueName,
  onChange,
}: {
  label: string;
  teams: TeamScheduleData[];
  value: string | null;
  valueName: string;
  onChange(id: string | null, name: string): void;
}) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [query, setQuery] = useState(valueName);
  const selected = teams.find((team) => team.id === value);
  const searchValue = query.trim().toLocaleLowerCase("pt-BR");
  const results = teams.filter((team) => {
    if (!searchValue) return true;
    return [team.name, team.officialName, team.countryCode ?? "", team.countryName ?? "", ...team.nameAliases]
      .some((field) => field.toLocaleLowerCase("pt-BR").includes(searchValue));
  }).slice(0, 15);

  return (
    <div className="game-team-select">
      <input
        aria-label={label}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-activedescendant={open && results[activeIndex] ? `${listboxId}-option-${activeIndex}` : undefined}
        aria-controls={listboxId}
        autoComplete="off"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }
          if (event.key === "ArrowDown" && results.length) {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => Math.min(index + 1, results.length - 1));
            return;
          }
          if (event.key === "ArrowUp" && results.length) {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => Math.max(index - 1, 0));
            return;
          }
          if (event.key === "Enter" && open && results[activeIndex]) {
            event.preventDefault();
            const team = results[activeIndex];
            setQuery(team.name);
            onChange(team.id, team.name);
            setOpen(false);
          }
        }}
        onChange={(event) => {
          const name = event.currentTarget.value;
          setQuery(name);
          setActiveIndex(-1);
          onChange(null, name);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar por nome ou país"
        role="combobox"
        type="search"
        value={selected ? selected.name : query}
      />
      {open && (
        <div aria-label={`Resultados: ${label}`} className="game-team-select__menu" id={listboxId} role="listbox">
          {results.map((team, index) => (
            <button
              aria-selected={team.id === value}
              data-active={index === activeIndex}
              id={`${listboxId}-option-${index}`}
              key={team.id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setQuery(team.name);
                onChange(team.id, team.name);
                setOpen(false);
              }}
              role="option"
              type="button"
            >
              <span>{team.name}</span>
              <small>{team.countryName ?? team.countryCode ?? "País n/i"} ({team.countryCode ?? "—"}) · {team.teamType === "national_team" ? "Seleção" : "Clube"} · {team.gender === "women" ? "Feminino" : team.gender === "men" ? "Masculino" : "Misto"} · {team.squadType}</small>
            </button>
          ))}
          {results.length === 0 && <p>Nenhuma equipe encontrada. Você pode salvar esse nome como texto.</p>}
          {teams.length > results.length && <small>Digite mais letras para filtrar o catálogo.</small>}
        </div>
      )}
    </div>
  );
}

function GameForm({
  game,
  channels,
  teams,
  onClose,
  onSaved,
}: {
  game: GameScheduleData | null;
  channels: ChannelCardData[];
  teams: TeamScheduleData[];
  onClose(): void;
  onSaved(): void;
}) {
  const initialDateTime = game
    ? utcToBrasiliaInputs(game.startsAt)
    : utcToBrasiliaInputs(new Date().toISOString());
  const [homeTeam, setHomeTeam] = useState(game?.homeTeam ?? "");
  const [awayTeam, setAwayTeam] = useState(game?.awayTeam ?? "");
  const [homeTeamId, setHomeTeamId] = useState(game?.homeTeamId ?? null);
  const [awayTeamId, setAwayTeamId] = useState(game?.awayTeamId ?? null);
  const [competitionName, setCompetitionName] = useState(game?.competitionName ?? "");
  const [competitionCountryCode, setCompetitionCountryCode] = useState(game?.competitionCountryCode ?? "BR");
  const [competitionCountryName, setCompetitionCountryName] = useState(game?.competitionCountryName ?? "Brasil");
  const [externalProvider, setExternalProvider] = useState(game?.externalProvider ?? "");
  const [externalId, setExternalId] = useState(game?.externalId ?? "");
  const [sourceUrlsText, setSourceUrlsText] = useState(game?.sourceUrls.join("\n") ?? "");
  const [date, setDate] = useState(initialDateTime.date);
  const [time, setTime] = useState(initialDateTime.time);
  const [broadcasts, setBroadcasts] = useState<BroadcastDraft[]>(() =>
    game?.broadcasts.length
      ? game.broadcasts.map(draftBroadcast)
      : [newBroadcast(0)],
  );
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [pending, setPending] = useState(false);

  function updateBroadcast(key: string, changes: Partial<BroadcastDraft>) {
    setBroadcasts((current) => current.map((row) => row.key === key ? { ...row, ...changes } : row));
  }

  function setBroadcastCountry(row: BroadcastDraft, code: string) {
    const country = GAME_COUNTRIES.find((item) => item.code === code);
    updateBroadcast(row.key, {
      countryCode: code,
      countryName: code === "OTHER" ? "" : country?.name ?? row.countryName,
      isPrimary: code === row.countryCode ? row.isPrimary : false,
    });
  }

  function setBroadcastPrimary(row: BroadcastDraft, checked: boolean) {
    setBroadcasts((current) => current.map((item) =>
      item.key === row.key
        ? { ...item, isPrimary: checked }
        : checked && item.countryCode === row.countryCode
          ? { ...item, isPrimary: false }
          : item,
    ));
  }

  function setCompetitionCountry(code: string) {
    const country = GAME_COUNTRIES.find((item) => item.code === code);
    setCompetitionCountryCode(code);
    setCompetitionCountryName(code === "OTHER" ? "" : country?.name ?? "");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const startsAt = brasiliaDateTimeToUtc(date, time);
    if (!startsAt) {
      setPending(false);
      setMessage("Confira a data e o horário de Brasília.");
      setMessageIsError(true);
      return;
    }
    if (competitionCountryCode === "OTHER" && competitionCountryName.trim().length < 2) {
      setPending(false);
      setMessage("Informe o país da competição.");
      setMessageIsError(true);
      return;
    }
    if (broadcasts.some((row) => row.countryCode === "OTHER" && row.countryName.trim().length < 2)) {
      setPending(false);
      setMessage("Informe o país das emissoras marcadas como Outro país.");
      setMessageIsError(true);
      return;
    }
    if (broadcasts.some((row) => row.broadcasterName.trim().length < 2)) {
      setPending(false);
      setMessage("Informe o nome da emissora em cada linha ou remova a linha vazia.");
      setMessageIsError(true);
      return;
    }

    const result = await saveGameAction({
      id: game?.id ?? null,
      homeTeam,
      awayTeam,
      homeTeamId,
      awayTeamId,
      competitionName,
      competitionCountryCode,
      competitionCountryName,
      startsAt,
      externalProvider,
      externalId,
      sourceUrls: [...new Set(sourceUrlsText.split(/\r?\n/).map((url) => url.trim()).filter(Boolean))],
      broadcasts: broadcasts.map((row, index) => ({
        id: row.id,
        countryCode: row.countryCode,
        countryName: row.countryName,
        broadcasterName: row.broadcasterName,
        channelId: row.channelId,
        isPrimary: row.isPrimary,
        sortOrder: index,
      })),
    });
    setPending(false);
    setMessage(result.message);
    setMessageIsError(!result.success);
    if (result.success) onSaved();
  }

  return (
    <>
      <form className="game-form" onSubmit={handleSubmit}>
        <fieldset className="game-form__section">
          <legend>Dados do jogo</legend>
          <div className="game-form__grid">
            <label>
              Mandante
              <SearchableTeamSelect
                label="Buscar mandante por nome ou país"
                onChange={(id, name) => { setHomeTeamId(id); setHomeTeam(name); }}
                teams={teams}
                value={homeTeamId}
                valueName={homeTeam}
              />
            </label>
            <label>
              Visitante
              <SearchableTeamSelect
                label="Buscar visitante por nome ou país"
                onChange={(id, name) => { setAwayTeamId(id); setAwayTeam(name); }}
                teams={teams}
                value={awayTeamId}
                valueName={awayTeam}
              />
            </label>
            <label className="game-form__wide">
              Competição
              <input maxLength={120} onChange={(event) => setCompetitionName(event.currentTarget.value)} required value={competitionName} />
            </label>
            <label>
              País da competição
              <select onChange={(event) => setCompetitionCountry(event.currentTarget.value)} value={competitionCountryCode}>
                {GAME_COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
              </select>
            </label>
            {competitionCountryCode === "OTHER" && (
              <label>
                Nome do país
                <input maxLength={60} onChange={(event) => setCompetitionCountryName(event.currentTarget.value)} required value={competitionCountryName} />
              </label>
            )}
            <label>
              Data
              <input onChange={(event) => setDate(event.currentTarget.value)} required type="date" value={date} />
            </label>
            <label>
              Hora de Brasília
              <input onChange={(event) => setTime(event.currentTarget.value)} required type="time" value={time} />
              <small>Fuso horário {BRASILIA_TIME_ZONE}</small>
            </label>
          </div>
        </fieldset>

        <fieldset className="game-form__section">
          <legend>Fontes e identidade externa</legend>
          <div className="game-form__grid">
            <label>
              Provedor do ID externo
              <input
                maxLength={60}
                onChange={(event) => setExternalProvider(event.currentTarget.value)}
                placeholder="Ex.: cbf-serie-a-2026"
                value={externalProvider}
              />
            </label>
            <label>
              ID externo da partida
              <input
                maxLength={128}
                onChange={(event) => setExternalId(event.currentTarget.value)}
                placeholder="Ex.: 348"
                value={externalId}
              />
            </label>
            <label className="game-form__wide">
              Fontes de confirmação (uma URL HTTPS por linha)
              <textarea
                maxLength={20480}
                onChange={(event) => setSourceUrlsText(event.currentTarget.value)}
                placeholder="Fonte do calendário e da transmissão"
                rows={3}
                value={sourceUrlsText}
              />
              <small>Guarde as páginas que confirmam o jogo e a transmissão para revisão no painel.</small>
            </label>
          </div>
        </fieldset>

        <fieldset className="game-form__section">
          <legend>Transmissões</legend>
          <div aria-hidden="true" className="game-form__broadcast-headings">
            <span>País</span>
            <span>Emissora anunciada</span>
            <span>Canal no CanalMix</span>
            <span>Principal</span>
            <span className="sr-only">Ações</span>
          </div>
          <div className="game-form__broadcast-list">
            {broadcasts.map((row, index) => (
              <div className="game-form__broadcast-row" key={row.key}>
                <div className="game-form__country-field">
                  <label>
                    <span className="sr-only">País da emissora {index + 1}</span>
                    <select onChange={(event) => setBroadcastCountry(row, event.currentTarget.value)} value={row.countryCode}>
                      {GAME_COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
                    </select>
                  </label>
                  {row.countryCode === "OTHER" && (
                    <input
                      aria-label={`Nome do país da emissora ${index + 1}`}
                      maxLength={60}
                      onChange={(event) => updateBroadcast(row.key, { countryName: event.currentTarget.value })}
                      placeholder="Nome do país"
                      required
                      value={row.countryName}
                    />
                  )}
                </div>
                <label className="game-form__broadcaster-field">
                  <span className="sr-only">Emissora anunciada {index + 1}</span>
                  <input
                    maxLength={100}
                    onChange={(event) => updateBroadcast(row.key, { broadcasterName: event.currentTarget.value })}
                    placeholder="Ex.: SporTV 3, ge tv ou TF1"
                    required
                    value={row.broadcasterName}
                  />
                </label>
                <label className="game-form__channel-field">
                  <span className="sr-only">Canal no CanalMix {index + 1}</span>
                  <SearchableChannelSelect
                    channels={channels}
                    onChange={(channelId) => updateBroadcast(row.key, { channelId })}
                    value={row.channelId}
                  />
                </label>
                <label className="game-form__primary-field">
                  <input
                    aria-label={"Canal principal " + (index + 1)}
                    checked={row.isPrimary}
                    onChange={(event) => setBroadcastPrimary(row, event.currentTarget.checked)}
                    type="checkbox"
                  />
                  <span>Principal</span>
                </label>
                <button
                  aria-label={`Remover emissora ${index + 1}`}
                  className="icon-button icon-button--danger game-form__remove-broadcast"
                  onClick={() => setBroadcasts((current) => current.filter((item) => item.key !== row.key))}
                  title="Remover emissora"
                  type="button"
                >
                  <X aria-hidden="true" size={18} />
                </button>
              </div>
            ))}
          </div>
          <button
            className="secondary-button game-form__add-broadcast"
            onClick={() => setBroadcasts((current) => [...current, newBroadcast(current.length)])}
            type="button"
          >
            <Plus aria-hidden="true" size={17} />
            Adicionar emissora
          </button>
          {broadcasts.length === 0 && (
            <p className="channel-form__hint">Este jogo ainda não tem emissoras cadastradas.</p>
          )}
        </fieldset>

        {message && <p className={messageIsError ? "form-error" : "form-success"} role="status">{message}</p>}
        <footer className="game-form__footer">
          <button className="secondary-button" disabled={pending} onClick={onClose} type="button">Cancelar</button>
          <button className="primary-button" disabled={pending} type="submit">
            {pending ? "Salvando…" : "Salvar jogo"}
          </button>
        </footer>
      </form>
    </>
  );
}

export function AdminGamesManager({
  games,
  channels,
  teams,
}: {
  games: GameScheduleData[];
  channels: ChannelCardData[];
  teams: TeamScheduleData[];
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GameScheduleData | null>(null);
  const [dateFilter, setDateFilter] = useState("");
  const [competitionFilter, setCompetitionFilter] = useState("");
  const [message, setMessage] = useState("");
  const [pendingGameId, setPendingGameId] = useState("");
  const competitions = [...new Set(games.map((game) => game.competitionName))]
    .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
  const filteredGames = useMemo(() => games.filter((game) => {
    const formatted = utcToBrasiliaInputs(game.startsAt);
    return (!dateFilter || formatted.date === dateFilter) &&
      (!competitionFilter || game.competitionName === competitionFilter);
  }), [competitionFilter, dateFilter, games]);

  async function togglePublished(game: GameScheduleData) {
    setPendingGameId(game.id);
    setMessage("");
    const result = await setGamePublishedAction(game.id, !game.isPublished);
    setPendingGameId("");
    setMessage(result.message);
    if (result.success) router.refresh();
  }

  function startNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function startEditing(game: GameScheduleData) {
    setEditing(game);
    setFormOpen(true);
  }

  return (
    <section className="admin-workspace">
      <section className="admin-list-panel">
        <header className="admin-list-panel__heading">
          <div>
            <p className="eyebrow">Programação</p>
            <h2>Grade de jogos</h2>
          </div>
          <button className="primary-button" onClick={startNew} type="button">
            <Plus aria-hidden="true" size={19} />
            Adicionar jogo
          </button>
        </header>
        <div className="admin-filters admin-games-filters">
          <label>
            <span>Data</span>
            <input onChange={(event) => setDateFilter(event.currentTarget.value)} type="date" value={dateFilter} />
          </label>
          <label>
            <span>Competição</span>
            <select onChange={(event) => setCompetitionFilter(event.currentTarget.value)} value={competitionFilter}>
              <option value="">Todas as competições</option>
              {competitions.map((competition) => <option key={competition} value={competition}>{competition}</option>)}
            </select>
          </label>
        </div>
        {message && <p className="admin-feedback" role="status">{message}</p>}
        <div className="admin-game-list">
          {filteredGames.map((game) => (
            <article className="admin-game-row" key={game.id}>
              <div className="admin-game-row__date">
                <CalendarDays aria-hidden="true" size={18} />
                <span>{formatBrasiliaDateTime(game.startsAt)}</span>
              </div>
              <div className="admin-game-row__main">
                <h3>{game.homeTeam} <span aria-hidden="true">×</span> {game.awayTeam}</h3>
                <p>{game.competitionName} · {game.competitionCountryName}</p>
                <p>{game.broadcasts.length} {game.broadcasts.length === 1 ? "emissora" : "emissoras"}</p>
                {game.externalProvider && game.externalId && (
                  <p>ID externo ({game.externalProvider}): {game.externalId}</p>
                )}
                {game.sourceUrls.map((url, index) => {
                  let label = `Fonte ${index + 1}`;
                  try {
                    label += ` · ${new URL(url).hostname}`;
                  } catch {
                    // The server action only saves validated HTTPS URLs.
                  }
                  return <p key={url}><a href={url} rel="noreferrer" target="_blank" title={url}>{label}</a></p>;
                })}
              </div>
              <span className={`status-pill${game.isPublished ? " status-pill--published" : ""}`}>
                {game.isPublished ? "Publicado" : "Oculto"}
              </span>
              <div className="admin-game-row__actions">
                <button
                  aria-label={`Editar ${game.homeTeam} x ${game.awayTeam}`}
                  className="icon-button"
                  onClick={() => startEditing(game)}
                  title="Editar"
                  type="button"
                >
                  <Pencil aria-hidden="true" size={18} />
                </button>
                <button
                  aria-label={`${game.isPublished ? "Despublicar" : "Publicar"} ${game.homeTeam} x ${game.awayTeam}`}
                  className="icon-button"
                  disabled={pendingGameId === game.id}
                  onClick={() => void togglePublished(game)}
                  title={game.isPublished ? "Despublicar" : "Publicar"}
                  type="button"
                >
                  {game.isPublished ? <EyeOff aria-hidden="true" size={19} /> : <Eye aria-hidden="true" size={19} />}
                </button>
              </div>
            </article>
          ))}
          {filteredGames.length === 0 && (
            <div className="admin-empty">
              <div className="admin-empty__icon"><CalendarDays aria-hidden="true" size={22} /></div>
              <h3>{games.length === 0 ? "Nenhum jogo cadastrado" : "Nenhum jogo encontrado"}</h3>
              <p>{games.length === 0 ? "Adicione uma partida para começar a montar a programação." : "Ajuste os filtros selecionados."}</p>
            </div>
          )}
        </div>
      </section>
      {formOpen && (
        <div className="admin-drawer-wrap admin-drawer-wrap--wide">
          <button aria-label="Fechar formulário" className="admin-drawer-backdrop" onClick={() => setFormOpen(false)} type="button" />
          <aside aria-labelledby="game-form-title" aria-modal="true" className="admin-drawer admin-drawer--wide" role="dialog">
            <header className="admin-drawer__heading">
              <div>
                <p className="eyebrow">{editing ? "Editar programação" : "Nova programação"}</p>
                <h2 id="game-form-title">{editing ? "Editar jogo" : "Adicionar jogo"}</h2>
              </div>
              <button aria-label="Fechar formulário" className="icon-button" onClick={() => setFormOpen(false)} type="button"><X aria-hidden="true" size={22} /></button>
            </header>
            <GameForm
              channels={channels}
              game={editing}
              teams={teams}
              key={editing?.id ?? "new"}
              onClose={() => setFormOpen(false)}
              onSaved={() => { setFormOpen(false); router.refresh(); }}
            />
          </aside>
        </div>
      )}
    </section>
  );
}
