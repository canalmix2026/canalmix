# Atualização local do catálogo de times — 16/11/2026

## Escopo e resultado

A importação foi gravada somente no Supabase local do CanalMix (API loopback; linked_project nulo). Não houve deploy, push nem escrita em produção.

Foram importadas 931 participações confirmadas nos seis países definidos. Comparando com a base anterior de 1.929 registros e resolvendo nomes oficiais, aliases e categoria, 402 identidades já existiam e 529 eram novas. A primeira contagem literal foi 393 existentes e 538 novas; nove casos foram reclassificados após a normalização de aliases conhecidos. Na repetição dos sete snapshots, todas as execuções deram 0 inclusões e 0 ambiguidades.

| País | Participantes | Já existiam | Novos | Faltando | Sem URL de escudo | Pendentes de licença |
|---|---:|---:|---:|---:|---:|---:|
| Brasil | 156 | 34 | 122 | 0 | 0 | 156 |
| Alemanha | 147 | 120 | 27 | 0 | 122 | 147 |
| Inglaterra | 92 | 89 | 3 | 0 | 67 | 92 |
| Espanha | 172 | 38 | 134 | 0 | 161 | 172 |
| França | 102 | 34 | 68 | 0 | 96 | 102 |
| Itália | 262 | 87 | 175 | 0 | 244 | 262 |
| **Total** | **931** | **402** | **529** | **0** | **690** | **931** |

## Conferência por divisão

A coluna Já existiam compara país, tipo, categoria e nome oficial/canônico com a base anterior, incluindo aliases reconciliados. Novos é o restante da lista oficial. Faltando conta as chaves do snapshot que não têm registro local após a importação. Sem URL usa o ícone padrão. O status pendente significa que a licença/origem do escudo ainda precisa de revisão.

| País | Divisão | Edição | Grupos oficiais | Participantes | Já existiam | Novos | Faltando | Sem URL de escudo | Pend. licença | Fonte |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Brasil | Campeonato Brasileiro Série A | 2026 | grupo único | 20 | 18 | 2 | 0 | 0 | 20 | [fonte oficial](https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026) |
| Brasil | Campeonato Brasileiro Série B | 2026 | grupo único | 20 | 12 | 8 | 0 | 0 | 20 | [fonte oficial](https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-b/2026) |
| Brasil | Campeonato Brasileiro Série C | 2026 | grupo único | 20 | 4 | 16 | 0 | 0 | 20 | [fonte oficial](https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-c/2026) |
| Brasil | Campeonato Brasileiro Série D | 2026 | 16 grupos × 6 | 96 | 0 | 96 | 0 | 0 | 96 | [fonte oficial](https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-d/2026) |
| Alemanha | 2. Bundesliga | 2026/27 | grupo único | 18 | 18 | 0 | 0 | 14 | 18 | [fonte oficial](https://datencenter.dfb.de/competitions/3/seasons/current/teams) |
| Alemanha | 3. Liga | 2026/27 | grupo único | 20 | 20 | 0 | 0 | 17 | 20 | [fonte oficial](https://www.dfb.de/news/teilnehmerfeld-der-3-liga-steht-fest-havelse-rueckt-fuer-1860-nach) |
| Alemanha | Bundesliga | 2026/27 | grupo único | 18 | 18 | 0 | 0 | 11 | 18 | [fonte oficial](https://datencenter.dfb.de/competitions/12/seasons/current/teams) |
| Alemanha | Regionalliga Bayern | 2026/27 | grupo regional: 19 | 19 | 14 | 5 | 0 | 16 | 19 | [fonte oficial](https://www.bfv.de/spielbetrieb-verbandsleben/ligabetrieb/regionalliga-bayern) |
| Alemanha | Regionalliga Nord | 2026/27 | grupo regional: 18 | 18 | 12 | 6 | 0 | 17 | 18 | [fonte oficial](https://www.nordfv.de/fileadmin/Spielplaene/260707_RLN-Spielplan_2026-2027.pdf) |
| Alemanha | Regionalliga Nordost | 2026/27 | grupo regional: 18 | 18 | 14 | 4 | 0 | 17 | 18 | [fonte oficial](https://www.nofv-online.de/index.php/regionalliga-nordost.html) |
| Alemanha | Regionalliga Südwest | 2026/27 | grupo regional: 18 | 18 | 14 | 4 | 0 | 15 | 18 | [fonte oficial](https://www.regionalliga-suedwest.de/Spielbetrieb/Vereine/) |
| Alemanha | Regionalliga West | 2026/27 | grupo regional: 18 | 18 | 10 | 8 | 0 | 15 | 18 | [fonte oficial](https://wdfv.de/spielbetrieb/herren-regionalliga-west) |
| Inglaterra | Premier League | 2026/27 | grupo único | 20 | 20 | 0 | 0 | 3 | 20 | [fonte oficial](https://www.premierleague.com/en/news/4365156/new-to-the-premier-league-heres-all-you-need-to-know) |
| Inglaterra | Sky Bet Championship | 2026/27 | grupo único | 24 | 24 | 0 | 0 | 22 | 24 | [fonte oficial](https://www.efl.com/competitions/efl-championship/) |
| Inglaterra | Sky Bet League One | 2026/27 | grupo único | 24 | 21 | 3 | 0 | 21 | 24 | [fonte oficial](https://www.efl.com/news/2026/october/31/sky-bet-league-one-results--table---stats/) |
| Inglaterra | Sky Bet League Two | 2026/27 | grupo único | 24 | 24 | 0 | 0 | 21 | 24 | [fonte oficial](https://www.efl.com/news/2026/september/12/sky-bet-league-two--barnet-hit-top-spot/) |
| Espanha | LALIGA EA SPORTS | 2026/27 | grupo único | 20 | 20 | 0 | 0 | 13 | 20 | [fonte oficial](https://www.laliga.com/en-FR/laliga-easports/clubs) |
| Espanha | LALIGA HYPERMOTION | 2026/27 | grupo único | 22 | 14 | 8 | 0 | 19 | 22 | [fonte oficial](https://www.laliga.com/en-US/laliga-hypermotion/clubs) |
| Espanha | Primera Federación | 2026/27 | 2 grupos × 20 | 40 | 4 | 36 | 0 | 39 | 40 | [fonte oficial](https://rfef.es/es/noticias/aprobados-los-grupos-de-primera-federacion-para-la-temporada-202627) |
| Espanha | Segunda Federación | 2026/27 | 5 grupos × 18 | 90 | 0 | 90 | 0 | 90 | 90 | [grupo 1](https://rfef.es/sites/default/files/segunda_federacion_grupo_i.pdf), [grupo 2](https://rfef.es/sites/default/files/segunda_federacion_grupo_ii.pdf), [grupo 3](https://rfef.es/sites/default/files/segunda_federacion_grupo_iii.pdf), [grupo 4](https://rfef.es/sites/default/files/segunda_federacion_grupo_iv.pdf), [grupo 5](https://rfef.es/sites/default/files/segunda_federacion_grupo_v.pdf) |
| França | Ligue 1 McDonald's | 2026/27 | grupo único | 18 | 18 | 0 | 0 | 14 | 18 | [fonte oficial](https://ligue1.com/fr/articles/l1_article_5293-les-dates-de-reprise-des-clubs-de-l1-2627) |
| França | Ligue 2 BKT | 2026/27 | grupo único | 18 | 14 | 4 | 0 | 16 | 18 | [fonte oficial](https://www.lfp.fr/article/ligue-2-bkt-le-calendrier-de-la-saison-2026-2027) |
| França | Ligue 3 | 2026/27 | grupo único | 18 | 2 | 16 | 0 | 18 | 18 | [fonte oficial](https://www.fff.fr/article/17022-le-calendrier-2026-2027-est-servi.html) |
| França | National 1 | 2026/27 | 3 grupos × 16 | 48 | 0 | 48 | 0 | 48 | 48 | [grupo 1](https://media.fff.fr/uploads/files/0f970dceb376ec92701eb10d77fb71f0.pdf), [grupo 2](https://media.fff.fr/uploads/files/1cc34ac835dcddc9a11438fa4a9670fd.pdf), [grupo 3](https://media.fff.fr/uploads/files/dbb1799e9a559d97b61e29ab4d6d5efa.pdf) |
| Itália | Serie A Enilive | 2026/27 | grupo único | 20 | 20 | 0 | 0 | 15 | 20 | [fonte oficial](https://www.legaseriea.it/serie-a/classifica?lang=en) |
| Itália | Serie BKT | 2026/27 | grupo único | 20 | 17 | 3 | 0 | 18 | 20 | [fonte oficial](https://www.legab.it/seriebkt/squadre) |
| Itália | Serie C Sky Wifi | 2026/27 | 3 grupos × 20 | 60 | 38 | 22 | 0 | 53 | 60 | [grupo 1](https://www.seriec.com/gironi/girone-a), [grupo 2](https://www.seriec.com/gironi/girone-b), [grupo 3](https://www.seriec.com/gironi/girone-c) |
| Itália | Serie D | 2026/27 | 9 grupos × 18 | 162 | 12 | 150 | 0 | 158 | 162 | [fonte oficial](https://lnd.it/seried/attivita-interregionale/i-gironi-del-campionato-2026-2027/) |

Dos 931 participantes, 690 ainda não têm URL de escudo. Os outros 241 têm URL, mas todos os 931 registros deste lote seguem pendentes de revisão/licença; a licença dos dados de participantes não concede licença para marcas ou logotipos.

### Times sem URL de escudo

- Alemanha — 2. Bundesliga: Arminia Bielefeld, Dynamo Dresden, Eintracht Braunschweig, Energie Cottbus, FC St. Pauli, Hannover 96, Hertha BSC, Holstein Kiel, Karlsruher SC, SpVgg Greuther Fürth, SV Darmstadt 98, VfL Bochum, VfL Osnabrück, VfL Wolfsburg.
- Alemanha — 3. Liga: Fortuna Düsseldorf, Preußen Münster, Rot-Weiss Essen, MSV Duisburg, SC Verl, Alemannia Aachen, SV Wehen Wiesbaden, SV Waldhof Mannheim, Viktoria Köln, FC Ingolstadt 04, Jahn Regensburg, VfB Stuttgart II, TSV Havelse, SV Meppen, Fortuna Köln, SG Sonnenhof Großaspach, Würzburger Kickers.
- Alemanha — Bundesliga: Borussia Dortmund, Borussia Mönchengladbach, Eintracht Frankfurt, FC Augsburg, FC Schalke 04, Hamburger SV, SC Freiburg, SV 07 Elversberg, TSG 1899 Hoffenheim, VfB Stuttgart, SV Werder Bremen.
- Alemanha — Regionalliga Bayern: DJK Vilzing, FC Augsburg II, FC Memmingen, FV Illertissen, SC Eltersdorf, SpVgg Ansbach, SpVgg Bayreuth, SpVgg Greuther Fürth II, SpVgg Unterhaching, Wacker Burghausen, TSV 1860 München, TSV 1882 Landsberg, TSV Aubstadt, TSV Buchbach, TSV Schwaben Augsburg, VfB Eichstätt.
- Alemanha — Regionalliga Nord: Werder Bremen II, VfB Oldenburg, Bremer SV, Hannover 96 II, Eintracht Norderstedt, SV Atlas Delmenhorst, SSV Jeddeloh, FSV Schöningen, HSC Hannover, Kickers Emden, VfB Lübeck, SC Weiche Flensburg 08, SV Todesfelde, FC St. Pauli II, SV Drochtersen/Assel, Eimsbütteler TV, Hamburger SV II.
- Alemanha — Regionalliga Nordost: Erzgebirge Aue, Hertha BSC II, BFC Dynamo Berlin, VSG Altglienicke, SV Tasmania Berlin, BFC Preussen, Chemnitzer FC, Rot-Weiß Erfurt, Greifswalder FC, Hallescher FC, FC Carl Zeiss Jena, BSG Chemie Leipzig, FSV 63 Luckenwalde, 1. FC Magdeburg II, SV Babelsberg 03, RSV Eintracht 1949, FSV Zwickau.
- Alemanha — Regionalliga Südwest: SSV Ulm 1846, 1. FC Kaiserslautern II, VfR Aalen, FC 08 Homburg, SV Sandhausen, VfR Mannheim, FSV Frankfurt, KSV Hessen Kassel, Kickers Offenbach, SC Freiburg II, SGV Freiberg, Eintracht Trier, Stuttgarter Kickers, Eintracht Frankfurt II, TSV Steinbach Haiger.
- Alemanha — Regionalliga West: SV Bergisch Gladbach 09, VfL Bochum II, Bonner SC, Borussia Dortmund II, FC Gütersloh, VfB 03 Hilden, SF Lotte, Bor. Mönchengladbach II, Rot-Weiß Oberhausen, Westfalia Rhynern, SV Rödinghausen, FC Schalke 04 II, Sportfreunde Siegen, SG Wattenscheid 09, SC Wiedenbrück.
- Inglaterra — Premier League: Coventry City FC, Crystal Palace FC, Sunderland AFC.
- Inglaterra — Sky Bet Championship: Middlesbrough FC, Swansea City AFC, West Ham United FC, Wolverhampton Wanderers FC, West Bromwich Albion FC, Southampton FC, Birmingham City FC, Queens Park Rangers FC, Stoke City FC, Blackburn Rovers FC, Portsmouth FC, Sheffield United FC, Millwall FC, Bristol City FC, Lincoln City, Cardiff City, Wrexham AFC, Bolton Wanderers, Norwich City FC, Watford FC, Burnley FC, Preston North End FC.
- Inglaterra — Sky Bet League One: Huddersfield Town, Stockport County, Oxford United, Bradford City, Plymouth Argyle, Reading FC, Cambridge United, Luton Town, Sheffield Wednesday, Mansfield Town, Leicester City, Burton Albion, Stevenage FC, Milton Keynes Dons, Wycombe Wanderers, Leyton Orient FC, Doncaster Rovers, Notts County FC, Blackpool FC, Bromley FC, Barnsley FC.
- Inglaterra — Sky Bet League Two: Salford City, Barnet FC, Cheltenham Town, Crewe Alexandra, York City, Walsall FC, Chesterfield FC, Exeter City, Shrewsbury Town, Grimsby Town, Gillingham FC, Tranmere Rovers, Swindon Town, Bristol Rovers, Newport County, Rochdale AFC, Fleetwood Town FC, Northampton Town, Colchester United, Rotherham United, Crawley Town FC.
- Espanha — LALIGA EA SPORTS: RC Celta de Vigo, Deportivo Alavés, Elche CF, FC Barcelona, Getafe CF, Málaga CF, Deportivo La Coruña, RCD Espanyol de Barcelona, Real Betis Balompié, Real Madrid CF, Real Sociedad de Fútbol, Sevilla FC, Villarreal CF.
- Espanha — LALIGA HYPERMOTION: Albacete, Burgos CF, Cádiz CF, CD Castellón, CD Eldense, CD Leganés, CD Tenerife, CE Sabadell, Celta Fortuna, Córdoba CF, FC Andorra, Girona FC, Granada CF, Real Sociedad B, RCD Mallorca, Real Oviedo, Sporting Gijón, SD Eibar, UD Almería.
- Espanha — Primera Federación: AD Mérida, Arenas Club, Athletic Club B, Barakaldo CF, CD Coria, CD Extremadura, CD Lugo, CD Mirandés, CP Cacereño, Pontevedra CF, Racing Club Ferrol, RC Deportivo Fabril, Real Avilés Industrial, Real Unión Club, SD Ponferradina, UD Logroñés, UD Ourense, Unionistas de Salamanca CF, Zamora CF, AD Alcorcón, Águilas FC, Algeciras CF, Antequera CCF, Atlético Madrileño, CD Teruel, CE Europa, CF Rayo Majadahonda, FC Cartagena, Gimnàstic de Tarragona, Hércules de Alicante CF, Juventud de Torremolinos CF, Real Jaén CF, Real Madrid Castilla, Real Murcia CF, Real Zaragoza, SD Huesca, UD Ibiza, UE Sant Andreu, Villarreal CF B.
- Espanha — Segunda Federación: Deportivo Alavés B, Coruxo FC, Atlético Astorga FC, Club Portugalete, SD Compostela, Club Marino de Luanco, SD Gernika Club, Bergantiños FC, Ourense CF, CD Basconia, Real Oviedo Vetusta, SD Eibar B, RS Gimnástica de Torrelavega, UD Llanera, Rayo Cantabria, Sestao River Club, SD Amorebieta, Arosa SC, CD Arnedo, CE Manresa, FC Barcelona Atlètic, Náxara CD, UE Olot, CD Ebro, Peña Sport FC, Utebo FC, Reus FC Reddis, Club Atlético Osasuna B, SD Logroñés, RCD Espanyol de Barcelona B, CF Calamocha, Terrassa FC, CD Tudelano, UD Logroñés B, UD Barbastro, Girona FC B, CD Alcoyano, CD Cieza, U.D. Castellonense, UCAM Universidad Católica de Murcia CF, CF La Nucía, UD Poblense, CF Lorca Deportiva, Elche Ilicitano, CD Minera, SCR Peña Deportiva, Real Murcia Imperial, Orihuela CF, CD Castellón B, CF Intercity, Valencia Mestalla, RCD Mallorca B, Yeclano Deportivo, CD Atlético Baleares, Club Atlético Antoniano, CD Don Benito, Salerm Cosmetics Puente Genil FC, Club Polideportivo Mijas Las Lagunas, CD Badajoz, CD Tenerife B, Club Atlético Central, RC Recreativo de Huelva, CD Estepona Fútbol Sénior, Xerez CD, Linares Deportivo, CD Ciudad de Lucena, Las Palmas Atlético, Betis Deportivo Balompié, Marbella FC, Atlético Sanluqueño CF, UD Tamaraceite, Sevilla Atlético, Real Madrid CF C, Atlético Albacete, Club Atlético de Madrid C, Real Ávila CF, CD Atlético Paso, CD Numancia de Soria, CD Guadalajara, Salamanca CF UDS, Calvo Sotelo Puertollano CF, Gimnástica Segoviana CF, RSD Alcalá, CF Talavera de la Reina, Real Valladolid Promesas, CDA Navalcarnero, Atlético Tordesillas, UD San Sebastián de los Reyes, UB Conquense, Getafe CF B.
- França — Ligue 1 McDonald's: Angers SCO, Stade Brestois 29, Le Havre AC, Le Mans FC, Racing Club de Lens, FC Lorient, Lille OSC, Olympique Lyonnais, AS Monaco FC, OGC Nice, Stade Rennais FC, RC Strasbourg Alsace, Toulouse FC, ES Troyes AC.
- França — Ligue 2 BKT: FC Annecy, US Boulogne, Clermont Foot 63, Dijon FCO, USL Dunkerque, Grenoble Foot 38, EA Guingamp, FC Metz, Montpellier HSC, AS Nancy Lorraine, FC Nantes, Pau FC, Red Star FC, Stade de Reims, Rodez AF, FC Sochaux-Montbéliard.
- França — Ligue 3: Amiens SC, SC Aubagne Air Bel, SC Bastia, Football Bourg-en-Bresse Péronnas 01, SM Caen, AS Cannes, US Concarneau, FC Fleury 91, VFC La-Roche-sur-Yon, Le Puy-en-Velay FC, US Orléans LF, Paris 13 Atletico, Quevilly Rouen Métropole, FC Rouen 1899, US Thionville Lusitanos, Valenciennes FC, FC Versailles, Villefranche Beaujolais.
- França — National 1: Biesheim ASC, US Saint-Maur Lusitanos, US Chantilly, FC Montlouis, US Créteil Football, Colmar SRFA, AS Furiani Agliani, Feignies Aulnoye EFC, FCSR Haguenau, FC Chambly Oise, SA Épinal, FC Dieppe, Saint-Pryvé Saint-Hilaire FC, FC Borgo, US Pays du Valois, Racing CFF, Angoulême Charente FC, Dinan Léhon FC, Voltigeurs de Châteaubriant, US Avranches MSM, Stade Briochin, Le Poiré-sur-Vie, Locminé Saint-Colomban, Les Herbiers, FC Lorient B, FC Chauray, US Saint-Malo, GSI Pontivy, US Granville, Aviron Bayonnais, Olympique Saumur FC, Tarbes Pyrénées Football, Andrézieux-Bouthéon FC, Bourges FC, Canet Roussillon FC, Châteauroux, Fréjus Saint-Raphaël, GOAL FC, Hauts Lyonnais, Hyères FC, Istres FC, Limonest, Lyon La Duchère, Nîmes Olympique, Rumilly Vallières, AS Saint-Priest, Toulon, ESTAC Troyes B.
- Itália — Serie A Enilive: Atalanta BC, Bologna FC, Cagliari Calcio, Como 1907, Frosinone Calcio, Genoa CFC, SS Lazio, US Lecce, SSC Napoli, Parma Calcio 1913, AS Roma, US Sassuolo Calcio, Torino FC, Udinese Calcio, Venezia FC.
- Itália — Serie BKT: US Arezzo, Ascoli, US Avellino, Benevento Calcio, Carrarese Calcio, US Catanzaro, Cesena FC, Cremonese, Empoli FC, Hellas Verona, SS Juve Stabia, L.R. Vicenza, Modena FC, Palermo FC, Pisa, Sampdoria, FC Südtirol, Virtus Entella.
- Itália — Serie C Sky Wifi: AS Cittadella, Union Brescia, Trento Calcio 1921, ACD Ospitaletto, Treviso, Calcio Lecco, ASC Alcione, US Pergolettese, UC AlbinoLeffe, Pro Vercelli, FC Lumezzane, Desenzano FC, Giana Erminio, Dolomiti Bellunesi, US Folgore Caratese, Spezia Calcio, Ravenna FC, Pescara, Grosseto, SEF Torres 1903, Guidonia Montecelio, US Livorno 1915, Campobasso, Atalanta II, Latina Calcio, ASD Pineto Calcio, Vado, Forli FC, US Pianese, AS Gubbio, US Sambenedettese, AS Ostiamare Lido Calcio, Vis Pesaro, Potenza, SSC Bari, Calcio Catania, Scafatese, Audace Cerignola, SS Monopoli 1966, Inter II, Sorrento Calcio, Casertana FC, Cavese, AZ Picerno, Barletta, Salernitana, Casarano, Team Altamura, Giugliano, Foggia Calcio, Savoia, Cosenza Calcio, FC Crotone.
- Itália — Serie D: Alessandria, Asti, Biellese, Borgosesia, Bra, Chisola, Derthona, Gozzano, Lascaris, Saluzzo, Valenzana Mado, Celle Varazze, Fezzanese, Imperia, Ligorna, Millesimo, Sanremese, Brusaporto, Club Milano, Leon, Palazzolo, Pavonese, Real Calepina, Rovato, Scanzorosciate, Tritium, Villa Valle, Virtus Ciseranobergamo, Caldiero Terme, Chievoverona, Virtus Verona, Fiorenzuola, Nibbiano e Valtidone, Piacenza, Brian Lignano, Cjarlins Muzane, LME, US Triestina, Obermais, Virtus Bolzano, Bassano, Calvi Noale, Campodarsego, Conegliano, Este, La Rocca Altavilla, Luparense, Mestre, Sandona, Schio, Clodiense SSD, Pistoiese, Cittadella Modena, Correggese, Lentigione, Tropical Coriano, Arconatese, Aurora Pro Patria, Castellanzese, Crema, Casatese Merate, Oltrepò, Pavia, Pro Sesto, Sant’Angelo, Solbiatese, Varese, Varesina, Flaminia Civitacastellana, Aquila Montevarchi, Follonica Gavorrano, Ghiviborgo, Grassina, Lucchese, Prato, Rondinella Marzocco, San Donato Tavarnelle, Scandicci, Seravezza, Siena, Tau Altopascio, Terranuova Traiana, Ternana, Mezzolara, Progresso, Sasso Marconi, Ancona, Atletico Ascoli, Forsempronese, Maceratese, Montecchio Gallo, Recanatese, Vigor Senigallia, Città di Lanciano, Giulianova, L’Aquila, Notaresco, Santegidiese, Teramo, Angelana, Foligno, Pietralunghese, Sporting Trestina, Termoli, Budoni, Cos Sarrabus Ogliastra, Monastir, Ossese, Sassari Lattedolce, Albalonga, Anzio, Aranova, Atletico Lodigiani, Certosa V. Campagnano, Città di Anagni, Trastevere, Unipomezia, Afragolese, Gelbison, Paganese, Sarnese, Venafro, Bisceglie, Brindisi, Fidelis Andria, Gravina, Manfredonia, Martina, Nardò, Virtus Francavilla, Francavilla, Melfi, Flegrea Puteolana, Ischia Isola Verde, Nocerina, Palmese, Puteoli Real Normanna, Real Forio, Ebolitana, Gladiator, Athletic Palermo, Avola, Castrumfavara, Enna, Gela, Licata, Milazzo, Modica, Nissa, Nuova Igea Virtus, Ragusa, Siracusa, Trapani Calcio, Digiesse Praiatortora, Reggina, Sambiase, Vibonese, Vigor Lamezia.

## Demais países cadastrados

As listas oficiais completas das duas primeiras divisões não foram verificadas para os países abaixo neste lote; não importei clubes adicionais deles. Também não confirmei individualmente se há uma segunda divisão oficial. Nos países com zero clubes, o catálogo contém apenas a seleção nacional.

| Código | País | Clubes existentes | Resultado da verificação |
|---|---|---:|---|
| ALB | Albânia | 10 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| ARG | Argentina | 30 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| ARM | Armênia | 11 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| AUS | Austrália | 15 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| AUT | Áustria | 60 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| BEL | Bélgica | 210 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| BLR | Belarus | 16 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| CAN | Canadá | 2 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| CHE | Suíça | 20 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| CHN | China | 17 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| COK | Ilhas Cook | 1 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| COL | Colômbia | 21 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| CRI | Costa Rica | 12 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| CUW | Curaçao | 0 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. Só há seleção nacional no catálogo. |
| CYP | Chipre | 14 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| CZE | Tchéquia | 31 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| DZA | Argélia | 27 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| ECU | Equador | 16 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| EGY | Egito | 18 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| EST | Estônia | 10 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| FIN | Finlândia | 12 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| FJI | Fiji | 1 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| FRO | Ilhas Faroé | 10 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| GEO | Geórgia | 10 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| GHA | Gana | 18 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| GRC | Grécia | 14 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| HRV | Croácia | 10 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| HUN | Hungria | 12 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| IRL | Irlanda | 10 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| ISL | Islândia | 12 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| ISR | Israel | 30 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| JPN | Japão | 20 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| KAZ | Cazaquistão | 14 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| KEN | Quênia | 18 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| LTU | Lituânia | 10 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| LVA | Letônia | 10 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| MAR | Marrocos | 16 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| MEX | México | 33 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| MNE | Montenegro | 11 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| MWI | Malawi | 16 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| NCL | Nova Caledônia | 1 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| NGA | Nigéria | 62 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| NIR | Irlanda do Norte | 12 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| NLD | Países Baixos | 35 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| NOR | Noruega | 32 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| NZL | Nova Zelândia | 41 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| PAN | Panamá | 0 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. Só há seleção nacional no catálogo. |
| PNG | Papua-Nova Guiné | 1 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| POL | Polônia | 36 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| PRT | Portugal | 35 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| PRY | Paraguai | 12 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| PYF | Taiti | 1 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| RWA | Ruanda | 18 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| SAU | Arábia Saudita | 18 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| SCO | Escócia | 12 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| SEN | Senegal | 16 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| SGP | Singapura | 0 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. Só há seleção nacional no catálogo. |
| SLB | Ilhas Salomão | 1 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| SMR | San Marino | 0 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. Só há seleção nacional no catálogo. |
| SRB | Sérvia | 16 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| SWE | Suécia | 50 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| TUR | Turquia | 18 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| TZA | Tanzânia | 16 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| UGA | Uganda | 16 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| URY | Uruguai | 4 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| USA | Estados Unidos | 28 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| VUT | Vanuatu | 1 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| WAL | País de Gales | 12 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| ZAF | África do Sul | 35 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| ZMB | Zâmbia | 18 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |
| ZWE | Zimbábue | 18 | Lista oficial completa das duas primeiras divisões não verificada; nenhum clube acrescido neste lote; existência da 2ª divisão não confirmada. |

Foram encontrados 71 países fora dos seis focados, com 4 sem clubes cadastrados.

## Seleções nacionais

As seis seleções masculinas principais já estavam cadastradas, separadas por país, tipo e categoria; nenhuma ficha foi adicionada ou substituída. Não havia ficha feminina destes seis países na consulta. As URLs HTTPS dos seis escudos responderam HTTP 200. Cinco seguem pendentes de licença; o escudo da Itália já estava aprovado.

| País | Estado antes do lote | Escudo cadastrado | Revisão | Fonte |
|---|---|---|---|---|
| Brasil | Já existia | [URL HTTPS](https://www.cbf.com.br/logo/logo-verde.svg) | Pendente de revisão/licença | [federação/escudo](https://www.cbf.com.br/selecao-brasileira/noticias/selecao-masculina/) |
| Inglaterra | Já existia | [URL HTTPS](https://cdn.englandfootball.com/-/jssmedia/EnglandFootball/Global/Nations/Crests-USE-THIS/ENGLAND_CREST-STAR_BLUE_RGB.png?h=960&iar=0&w=750&rev=b9e79376c63746b59919feed0cf24628&hash=944CF918AD77769A4CC78C0CEBFC81E7) | Pendente de revisão/licença | [federação/escudo](https://www.englandfootball.com/) |
| Espanha | Já existia | [URL HTTPS](https://rfef.es/sites/default/files/2026-07/abs_masc_menudespleg_copia_1.png?cb=4e689604) | Pendente de revisão/licença | [federação/escudo](https://rfef.es/es/selecciones/seleccion-absoluta-masculina) |
| Alemanha | Já existia | [URL HTTPS](https://assets.dfb.de/uploads/000/299/734/original_de.svg?0=) | Pendente de revisão/licença | [federação/escudo](https://datencenter.dfb.de/teams/deutschland) |
| França | Já existia | [URL HTTPS](https://fff.twic.pics/https://media.fff.fr/uploads/images/7848bf760b128284e561669ca2e33584.png?twic=v1/resize=500) | Pendente de revisão/licença | [federação/escudo](https://www.fff.fr/selection/m3/equipe-de-france.html) |
| Itália | Já existia | [URL HTTPS](https://upload.wikimedia.org/wikipedia/commons/b/bf/Logo_Italy_National_Football_Team_-_2023.svg) | Aprovado | [federação/escudo](https://upload.wikimedia.org/wikipedia/commons/b/bf/Logo_Italy_National_Football_Team_-_2023.svg) |

## Reconciliação e integridade

- Preservei IDs e vínculos de jogos. As 33 variações brasileiras já foram reconciliadas; nesta etapa, consolidei 18 registros duplicados por grafia/categoria na Europa. Real Sociedad B passou de equipe principal para reserva, e Fortuna Köln manteve o ID anterior ao atualizar a associação para a 3. Liga.
- Removi três registros antigos de partidas adiadas depois de confirmar que não tinham jogo vinculado. Permanecem registros legados com os sufixos [cancelled] ou [postponed] para revisão manual; eles não são participantes das listas atuais e nenhum tem jogo vinculado.
- O catálogo local terminou com 2.447 registros. As 931 chaves de importação estão presentes; IDs compartilhados indevidamente: 0; divergências de nome em registros não manuais: 0.
- Há 32 jogos cadastrados; jogos sem time ou com ID órfão: 0.
- A grade pública e o Modo TV responderam HTTP 200. O painel /admin/grade redirecionou para /admin/login nesta sessão; revisei estaticamente o fluxo de carregamento dos times, mas não consegui conferir visualmente os seletores autenticados.

## Artefatos locais

- Snapshots: cbf-2026-team-snapshot.json, england-2026-27-team-snapshot.json, spain-2026-27-team-snapshot.json, france-2026-27-team-snapshot.json, germany-2026-27-team-snapshot.json, italy-2026-27-team-snapshot.json e italy-serie-d-2026-27-team-snapshot.json.
- SQL local de reconciliação: reconcile-local-brazil-aliases.sql, reconcile-local-european-aliases.sql e reconcile-local-fortuna-koeln.sql.
