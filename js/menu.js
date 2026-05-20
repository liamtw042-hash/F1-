// Menu System
class Menu {
    constructor(game) {
        this.game = game;
        this.screen = 'main'; // main | setup | results | championship
        this.selectedTrack = 'monaco';
        this.selectedTeam = 0;
        this.selectedLaps = 5;
        this.selectedWeather = 'DRY';
        this.selectedDifficulty = 'MEDIUM';
        this.playerCount = 1;
        this._render();
    }

    _render() {
        const menu = document.getElementById('menu');
        menu.innerHTML = '';
        switch (this.screen) {
            case 'main':        this._renderMain(menu); break;
            case 'setup':       this._renderSetup(menu); break;
            case 'results':     this._renderResults(menu); break;
            case 'championship':this._renderChampionship(menu); break;
        }
    }

    _renderMain(el) {
        el.innerHTML = `
        <div class="menu-logo">
            <div class="logo-f1">F1</div>
            <div class="logo-sub">RACING CHAMPIONSHIP</div>
        </div>
        <div class="menu-buttons">
            <button class="btn btn-primary" id="btnQuickRace">QUICK RACE</button>
            <button class="btn btn-secondary" id="btnCustomRace">CUSTOM RACE</button>
            <button class="btn btn-secondary" id="btn2Player">2 PLAYERS (LOCAL)</button>
            <button class="btn btn-secondary" id="btnChampionship">CHAMPIONSHIP</button>
        </div>
        <div class="menu-controls">
            <div class="ctrl-title">CONTROLS</div>
            <div class="ctrl-row"><span class="ctrl-key">W/S</span> Throttle / Brake</div>
            <div class="ctrl-row"><span class="ctrl-key">A/D</span> Steer</div>
            <div class="ctrl-row"><span class="ctrl-key">SPACE</span> DRS</div>
            <div class="ctrl-row"><span class="ctrl-key">SHIFT</span> ERS Boost</div>
            <div class="ctrl-row"><span class="ctrl-key">P</span> Pit Stop</div>
            <div class="ctrl-row"><span class="ctrl-key">ESC</span> Pause</div>
        </div>`;

        el.querySelector('#btnQuickRace').onclick = () => {
            this.playerCount = 1;
            this.game.startRace('monaco', 5, 'DRY', 1);
        };
        el.querySelector('#btnCustomRace').onclick = () => {
            this.screen = 'setup';
            this._render();
        };
        el.querySelector('#btn2Player').onclick = () => {
            this.playerCount = 2;
            this.screen = 'setup';
            this._render();
        };
        el.querySelector('#btnChampionship').onclick = () => {
            this.game.championship.active = true;
            this.game.championship.round = 0;
            this.game.championship.standings = CONFIG.DRIVERS.map(d => ({
                name: d.name, team: CONFIG.TEAMS[d.team].shortName, points: 0
            }));
            this.screen = 'championship';
            this._render();
        };
    }

    _renderSetup(el) {
        const tracks = [
            { key: 'monaco', name: 'Monaco', flag: '🇲🇨' },
            { key: 'spa', name: 'Spa-Francorchamps', flag: '🇧🇪' },
            { key: 'silverstone', name: 'Silverstone', flag: '🇬🇧' },
            { key: 'monza', name: 'Monza', flag: '🇮🇹' },
            { key: 'suzuka', name: 'Suzuka', flag: '🇯🇵' }
        ];
        const lapOptions = [3, 5, 10, 20, 50];
        const weathers = ['DRY', 'LIGHT_RAIN', 'HEAVY_RAIN', 'CHANGING'];
        const difficulties = ['EASY', 'MEDIUM', 'HARD', 'EXPERT'];

        el.innerHTML = `
        <div class="setup-panel">
            <h2 class="setup-title">RACE SETUP</h2>
            <div class="setup-grid">
                <div class="setup-col">
                    <div class="setup-label">CIRCUIT</div>
                    <div class="track-list" id="trackList">
                        ${tracks.map(t => `
                        <div class="track-item ${t.key === this.selectedTrack ? 'selected' : ''}" data-key="${t.key}">
                            <span class="track-flag">${t.flag}</span> ${t.name}
                        </div>`).join('')}
                    </div>
                </div>
                <div class="setup-col">
                    <div class="setup-label">TEAM</div>
                    <div class="team-list" id="teamList">
                        ${CONFIG.TEAMS.map((t, i) => `
                        <div class="team-item ${i === this.selectedTeam ? 'selected' : ''}" data-idx="${i}"
                             style="border-left: 4px solid ${t.primaryColor}">
                            ${t.name}
                            <span class="team-driver">${t.drivers[0]}</span>
                        </div>`).join('')}
                    </div>
                </div>
                <div class="setup-col">
                    <div class="setup-label">LAPS</div>
                    <div class="option-group">
                        ${lapOptions.map(l => `
                        <div class="option-btn ${l === this.selectedLaps ? 'selected' : ''}" data-val="${l}"
                             id="lap_${l}">${l}</div>`).join('')}
                    </div>
                    <div class="setup-label mt">WEATHER</div>
                    <div class="option-group">
                        ${weathers.map(w => `
                        <div class="option-btn ${w === this.selectedWeather ? 'selected' : ''}" data-w="${w}"
                             id="wx_${w}">${CONFIG.WEATHER_TYPES[w].name}</div>`).join('')}
                    </div>
                    <div class="setup-label mt">AI DIFFICULTY</div>
                    <div class="option-group">
                        ${difficulties.map(d => `
                        <div class="option-btn ${d === this.selectedDifficulty ? 'selected' : ''}" data-d="${d}"
                             id="diff_${d}">${d}</div>`).join('')}
                    </div>
                </div>
            </div>
            <div class="setup-actions">
                <button class="btn btn-back" id="btnBack">BACK</button>
                <button class="btn btn-primary btn-large" id="btnStartRace">START RACE</button>
            </div>
        </div>`;

        // Track selection
        el.querySelector('#trackList').addEventListener('click', e => {
            const item = e.target.closest('.track-item');
            if (item) {
                this.selectedTrack = item.dataset.key;
                el.querySelectorAll('.track-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
            }
        });

        // Team selection
        el.querySelector('#teamList').addEventListener('click', e => {
            const item = e.target.closest('.team-item');
            if (item) {
                this.selectedTeam = parseInt(item.dataset.idx);
                el.querySelectorAll('.team-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
            }
        });

        // Lap options
        lapOptions.forEach(l => {
            el.querySelector(`#lap_${l}`).onclick = () => {
                this.selectedLaps = l;
                el.querySelectorAll('[data-val]').forEach(b => b.classList.remove('selected'));
                el.querySelector(`#lap_${l}`).classList.add('selected');
            };
        });

        // Weather options
        weathers.forEach(w => {
            el.querySelector(`#wx_${w}`).onclick = () => {
                this.selectedWeather = w;
                el.querySelectorAll('[data-w]').forEach(b => b.classList.remove('selected'));
                el.querySelector(`#wx_${w}`).classList.add('selected');
            };
        });

        // Difficulty
        difficulties.forEach(d => {
            el.querySelector(`#diff_${d}`).onclick = () => {
                this.selectedDifficulty = d;
                el.querySelectorAll('[data-d]').forEach(b => b.classList.remove('selected'));
                el.querySelector(`#diff_${d}`).classList.add('selected');
            };
        });

        el.querySelector('#btnBack').onclick = () => { this.screen = 'main'; this._render(); };
        el.querySelector('#btnStartRace').onclick = () => {
            // Apply team to player
            const team = CONFIG.TEAMS[this.selectedTeam];
            this.game.startRace(this.selectedTrack, this.selectedLaps, this.selectedWeather, this.playerCount);
            if (this.game.playerCars[0]) {
                this.game.playerCars[0].team = team;
                this.game.playerCars[0].primaryColor = team.primaryColor;
                this.game.playerCars[0].secondaryColor = team.secondaryColor;
                this.game.playerCars[0].driverName = team.drivers[0];
            }
        };
    }

    showResults(results) {
        this.screen = 'results';
        this.lastResults = results;
        this._render();
    }

    _renderResults(el) {
        const results = this.lastResults || [];
        const podium = results.slice(0, 3);

        el.innerHTML = `
        <div class="results-panel">
            <div class="results-title">RACE RESULTS</div>
            <div class="podium">
                ${podium.map((r, i) => `
                <div class="podium-step pos-${i + 1}">
                    <div class="podium-pos">P${r.position}</div>
                    <div class="podium-name ${r.isPlayer ? 'player-result' : ''}">${r.driverName}</div>
                    <div class="podium-team">${r.team}</div>
                    <div class="podium-time">${Utils.formatTime(r.totalTime)}</div>
                    <div class="podium-pts">+${r.points} pts</div>
                </div>`).join('')}
            </div>
            <div class="results-table">
                ${results.map(r => `
                <div class="results-row ${r.isPlayer ? 'player-row' : ''}">
                    <span class="res-pos">P${r.position}</span>
                    <span class="res-name">${r.driverName}</span>
                    <span class="res-team">${r.team}</span>
                    <span class="res-time">${Utils.formatTime(r.bestLap)}</span>
                    <span class="res-pts">${r.points}</span>
                </div>`).join('')}
            </div>
            <div class="results-actions">
                <button class="btn btn-primary" id="btnRaceAgain">RACE AGAIN</button>
                <button class="btn btn-secondary" id="btnBackMenu">MAIN MENU</button>
            </div>
        </div>`;

        el.querySelector('#btnRaceAgain').onclick = () => { this.screen = 'setup'; this._render(); };
        el.querySelector('#btnBackMenu').onclick = () => { this.screen = 'main'; this._render(); };
    }

    _renderChampionship(el) {
        const calendar = CONFIG.CALENDAR;
        const round = this.game.championship.round;
        const nextRace = calendar[round % calendar.length];
        const trackKey = nextRace.trackKey || 'monaco';
        const standings = this.game.championship.standings;

        el.innerHTML = `
        <div class="champ-panel">
            <div class="champ-title">CHAMPIONSHIP</div>
            <div class="champ-round">ROUND ${round + 1} / ${calendar.length}</div>
            <div class="champ-next">
                <div class="next-label">NEXT RACE</div>
                <div class="next-name">${nextRace.name}</div>
                <div class="next-track">${nextRace.track}</div>
            </div>
            ${standings.length > 0 ? `
            <div class="champ-standings">
                <div class="standings-header">DRIVER STANDINGS</div>
                ${standings.slice(0, 10).map((s, i) => `
                <div class="standing-row">
                    <span class="st-pos">${i + 1}</span>
                    <span class="st-name">${s.name}</span>
                    <span class="st-team">${s.team}</span>
                    <span class="st-pts">${s.points} pts</span>
                </div>`).join('')}
            </div>` : ''}
            <div class="champ-actions">
                <button class="btn btn-primary" id="btnNextRound">RACE</button>
                <button class="btn btn-secondary" id="btnExitChamp">EXIT CHAMPIONSHIP</button>
            </div>
        </div>`;

        el.querySelector('#btnNextRound').onclick = () => {
            this.selectedTrack = trackKey;
            this.selectedLaps = 10;
            this.game.startRace(trackKey, 10, 'DRY', 1);
        };
        el.querySelector('#btnExitChamp').onclick = () => {
            this.game.championship.active = false;
            this.screen = 'main';
            this._render();
        };
    }
}
