"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Pencil, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { saveTeamAction } from "@/app/admin/actions";
import { TeamCrest } from "@/components/team-crest";
import type { TeamScheduleData } from "@/lib/teams";

type TeamForm = {
  name: string;
  countryName: string;
  teamType: TeamScheduleData["teamType"];
  gender: "men" | "women";
  shieldUrl: string;
};

const emptyForm: TeamForm = {
  name: "",
  countryName: "",
  teamType: "club",
  gender: "men",
  shieldUrl: "",
};

export function AdminTeamsManager({ teams }: { teams: TeamScheduleData[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TeamScheduleData | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState(false);

  function startNew() {
    setEditing(null);
    setCreating(true);
    setForm(emptyForm);
    setMessage("");
  }

  function startEditing(team: TeamScheduleData) {
    setEditing(team);
    setCreating(false);
    setForm({
      name: team.name,
      countryName: team.countryName ?? "",
      teamType: team.teamType,
      gender: team.gender === "women" ? "women" : "men",
      shieldUrl: team.shieldUrl ?? "",
    });
    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const result = await saveTeamAction({
      id: editing?.id ?? null,
      name: form.name,
      countryName: form.countryName,
      teamType: form.teamType,
      gender: form.gender,
      shieldUrl: form.shieldUrl,
    });
    setPending(false);
    setMessage(result.message);
    setMessageError(!result.success);
    if (result.success) {
      setEditing(null);
      setCreating(false);
      setForm(emptyForm);
      router.refresh();
    }
  }

  const filteredTeams = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    if (!query) return teams;
    return teams.filter((team) => [team.name, team.officialName, team.countryCode ?? "", team.countryName ?? "", ...team.nameAliases]
      .some((value) => value.toLocaleLowerCase("pt-BR").includes(query)));
  }, [search, teams]);
  const countryNames = useMemo(
    () => [...new Set(["Singapura", ...teams.map((team) => team.countryName?.trim()).filter((name): name is string => Boolean(name))])]
      .sort((a, b) => a.localeCompare(b, "pt-BR")),
    [teams],
  );

  return (
    <section className="admin-workspace admin-teams-workspace">
      <section className="admin-list-panel">
        <header className="admin-list-panel__heading">
          <div>
            <p className="eyebrow">Cadastro de times</p>
          <h2>Catálogo de equipes e escudos</h2>
          </div>
          <button className="primary-button" onClick={startNew} type="button">
            <Plus aria-hidden="true" size={19} />
            Adicionar time
          </button>
        </header>

        <p className="admin-teams-workspace__hint">
          Os IDs dos jogos permanecem ligados a esta identidade. Os nomes, países, categorias e referências das fontes
          ajudam a separar clubes homônimos, seleções, equipes femininas e reservas.
        </p>

        <label className="admin-team-search">
          <Search aria-hidden="true" size={18} />
          <span className="sr-only">Buscar time por nome ou país</span>
          <input onChange={(event) => setSearch(event.currentTarget.value)} placeholder="Buscar por nome ou país" type="search" value={search} />
        </label>

        <div className="admin-team-list">
          {filteredTeams.slice(0, 100).map((team) => (
            <article className="admin-team-row" key={team.id}>
              <TeamCrest className="admin-team-row__crest" shieldUrl={team.shieldUrl} />
              <div className="admin-team-row__main">
                <h3>{team.name}</h3>
                <p>{team.countryName ?? team.countryCode ?? "País não informado"} ({team.countryCode ?? "—"}) · {team.teamType === "national_team" ? "Seleção" : "Clube"} · {team.gender === "women" ? "Feminino" : team.gender === "men" ? "Masculino" : "Misto"} · {team.squadType}</p>
                {team.externalProvider && team.externalId && (
                  <p>ID de origem: {team.externalProvider} · {team.externalId}</p>
                )}
                {team.shieldUrl ? <p>Escudo: {team.shieldStatus}</p> : <p>Escudo pendente</p>}
              </div>
              <button
                aria-label={"Editar " + team.name}
                className="icon-button"
                onClick={() => startEditing(team)}
                title="Editar time e escudo"
                type="button"
              >
                <Pencil aria-hidden="true" size={18} />
              </button>
            </article>
          ))}
          {filteredTeams.length === 0 && <p className="admin-teams-workspace__empty">Nenhum time encontrado.</p>}
          {filteredTeams.length > 100 && <p className="admin-teams-workspace__empty">Mostrando 100 de {filteredTeams.length}. Refine a busca por nome ou país.</p>}
        </div>

        {(creating || editing) && (
          <form className="admin-team-form" onSubmit={handleSubmit}>
            <h3>{editing ? "Editar time" : "Novo time"}</h3>
            <div className="admin-team-form__grid">
              <label>
                Nome do time
                <input
                  maxLength={80}
                  onChange={(event) => {
                    const name = event.currentTarget.value;
                    setForm((current) => ({ ...current, name }));
                  }}
                  required
                  value={form.name}
                />
              </label>
              <label>
                País do time
                <input
                  list="team-country-options"
                  maxLength={80}
                  onChange={(event) => {
                    const countryName = event.currentTarget.value;
                    setForm((current) => ({ ...current, countryName }));
                  }}
                  required
                  value={form.countryName}
                />
              </label>
              <label>
                Tipo de equipe
                <select onChange={(event) => {
                  const teamType = event.currentTarget.value as TeamForm["teamType"];
                  setForm((current) => ({ ...current, teamType }));
                }} required value={form.teamType}>
                  <option value="club">Clube</option>
                  <option value="national_team">Seleção</option>
                </select>
              </label>
              <label>
                Categoria
                <select onChange={(event) => {
                  const gender = event.currentTarget.value as TeamForm["gender"];
                  setForm((current) => ({ ...current, gender }));
                }} required value={form.gender}>
                  <option value="men">Masculino</option>
                  <option value="women">Feminino</option>
                </select>
              </label>
              <label className="admin-team-form__wide">
                Escudo
                <input
                  maxLength={2048}
                  onChange={(event) => {
                    const shieldUrl = event.currentTarget.value;
                    setForm((current) => ({ ...current, shieldUrl }));
                  }}
                  placeholder="https://exemplo.com/escudos/time.png ou /escudos/time.png"
                  type="text"
                  value={form.shieldUrl}
                />
              </label>
            </div>
            <datalist id="team-country-options">
              {countryNames.map((countryName) => <option key={countryName} value={countryName} />)}
            </datalist>
            {message && <p className={messageError ? "form-error" : "form-success"} role="status">{message}</p>}
            <footer className="admin-team-form__footer">
              <button className="secondary-button" onClick={() => { setEditing(null); setCreating(false); }} type="button">Cancelar</button>
              <button className="primary-button" disabled={pending} type="submit">
                {pending ? "Salvando…" : "Salvar time"}
              </button>
            </footer>
          </form>
        )}
        {message && !creating && !editing && (
          <p className={messageError ? "form-error" : "form-success"} role="status">{message}</p>
        )}
      </section>
    </section>
  );
}
