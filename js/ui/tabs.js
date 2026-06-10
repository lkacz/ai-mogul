// All tab views + action handlers.

import { GPUS, FACILITIES, DATASETS, STAFF, FUNDING, MARIO_QUOTES } from '../core/data.js';
import { RESEARCH, ERA_NAMES, RESEARCH_BY_ID } from '../core/research.js';
import { MILESTONES, MAIN_QUEST, rewardText } from '../core/milestones.js';
import { BAL, capabilityFor, trainCompute, optimalTokens, chinchillaPenalty, capTier } from '../core/balance.js';
import { GPU_BY_ID, gpuPrice } from '../core/state.js';
import * as E from '../core/engine.js';
import { fmtMoney, fmtNum, fmtFlops, fmtFlop, fmtPower, fmtDur, fmtPct, fmtDate, clamp, log10 } from '../core/util.js';
import { game, toast, showModal, closeModal, set, setBar, bar, esc, renderAll, switchTab } from './ui.js';

export const ACTIONS = {};
export const INPUTS = {};

const FACILITY_EMOJI = ['🏠', '🏢', '🗄️', '🏭', '🌆'];

function doAction(fn, ...args) {
  const r = fn(game.s, ...args);
  toast(r.msg, r.ok ? '' : 'err');
  renderAll();
  return r;
}

// ════════════════════════ LAB (overview) ════════════════════════
let quoteIdx = Math.floor(Math.random() * MARIO_QUOTES.length);
setInterval(() => { quoteIdx = (quoteIdx + 1) % MARIO_QUOTES.length; }, 25000);

const labTab = {
  id: 'lab', label: '🏠 Lab',
  sig: (s, sel) => [s.phase, s.runs.length, s.models.length, s.news.length, sel.deployed?.id, quoteIdx].join('|'),
  build(s, sel) {
    const dots = Math.min(sel.gpuCount, 160);
    const runsHtml = s.runs.length ? s.runs.map(r => {
      return `<div class="run-card">
        <div class="row" style="justify-content:space-between">
          <span class="rname">🚂 ${esc(r.name)}</span>
          <span class="muted">${fmtNum(r.N)} params · ${fmtNum(r.D)} tokens</span>
        </div>
        ${bar('runbar_' + r.id, 'thin')}
        <div class="bar-label"><span id="runpct_${r.id}"></span><span id="runeta_${r.id}"></span></div>
      </div>`;
    }).join('') : `<div class="muted">No training runs active. Head to the <a href="#" data-act="tab" data-arg="train" style="color:var(--accent)">Training tab</a> to start one.</div>`;

    const dep = sel.deployed;
    const marketHtml = dep ? `
      <div class="stat-row"><span class="k">Serving</span><span class="stat-v cyan">${esc(dep.name)} (cap ${dep.cap.toFixed(1)})</span></div>
      <div class="stat-row"><span class="k">Price / request</span><span class="stat-v" id="lab-price"></span></div>
      <div class="stat-row"><span class="k">Revenue</span><span class="stat-v good" id="lab-rev"></span></div>
      <div class="stat-row"><span class="k">Demand potential</span><span class="stat-v" id="lab-pot"></span></div>
      <div style="margin-top:6px" class="faint">Market adoption (customers discover you over time — sales staff speed this up):</div>
      ${bar('lab-adoptbar', 'thin')}
      <div class="bar-label"><span id="lab-adopt"></span><span id="lab-served"></span></div>`
      : `<div class="muted">No model deployed. Train one, then deploy it from the Models tab. Revenue = min(market adoption, serving capacity).</div>`;

    return `<div class="grid2">
      <div>
        <div class="card">
          <div class="row" style="gap:14px">
            <div style="font-size:40px">🧑‍🔬</div>
            <div>
              <b>Mario Damodei</b> <span class="muted">· Founder, Mogul AI</span>
              <div class="muted" style="font-style:italic; margin-top:3px">“${esc(MARIO_QUOTES[quoteIdx])}”</div>
            </div>
          </div>
        </div>
        <div class="card facility-art">
          <div class="femoji">${FACILITY_EMOJI[s.phase]}</div>
          <div><b>${esc(sel.fac.name)}</b></div>
          <div class="faint">${esc(sel.fac.desc)}</div>
          <div class="gpu-grid">${'<span class="gpu-dot"></span>'.repeat(dots)}</div>
          ${sel.gpuCount > dots ? `<div class="faint">+ ${fmtNum(sel.gpuCount - dots)} more accelerators</div>` : ''}
        </div>
        <div class="card">
          <h3>Side hustle</h3>
          <div class="row">
            <button class="act big" id="gig-btn" data-act="gig">💼 Do a fine-tuning gig</button>
            <div class="muted">Consulting pays the power bill. Pay scales with your best model.</div>
          </div>
        </div>
        <div class="card">
          <h3>Event log</h3>
          <div id="lab-log" class="small" style="display:flex; flex-direction:column-reverse; gap:4px; max-height:220px; overflow-y:auto">
            ${s.news.slice(-14).map(n => `<div><span class="faint">[${fmtDate(n.h)}]</span> ${esc(n.txt)}</div>`).join('')}
          </div>
        </div>
      </div>
      <div>
        <div class="card">
          <h3>Compute allocation <span class="faint" title="Your cluster splits between training new models, serving the API (revenue), and research experiments (RP).">ⓘ</span></h3>
          ${['train', 'inf', 'res'].map(k => {
            const labels = { train: '🚂 Training', inf: '🌐 Inference (API)', res: '🔬 Research' };
            return `<div style="margin-bottom:7px">
              <div class="row" style="justify-content:space-between">
                <span class="muted">${labels[k]}</span><span class="stat-v" id="alloc-v-${k}">${Math.round(s.alloc[k] * 100)}%</span>
              </div>
              <input type="range" min="0" max="100" step="1" value="${Math.round(s.alloc[k] * 100)}" data-input="alloc" data-key="${k}">
            </div>`;
          }).join('')}
          <div class="faint" id="alloc-detail"></div>
        </div>
        <div class="card">
          <h3>API & market</h3>
          ${marketHtml}
        </div>
        <div class="card">
          <h3>Training runs</h3>
          ${runsHtml}
        </div>
      </div>
    </div>`;
  },
  update(s, sel) {
    // gig button cooldown
    const btn = document.getElementById('gig-btn');
    if (btn) {
      const left = Math.ceil((game.gigReadyAt - Date.now()) / 1000);
      btn.disabled = left > 0;
      btn.textContent = left > 0 ? `💼 Gig in ${left}s…` : '💼 Do a fine-tuning gig';
    }
    for (const r of s.runs) {
      const frac = r.physDone / r.physNeed;
      setBar('runbar_' + r.id, frac);
      set('runpct_' + r.id, fmtPct(frac, 1) + ' · ' + fmtFlop(r.physDone));
      set('runeta_' + r.id, 'ETA ' + fmtDur(E.runEtaH(sel, r.N, r.physNeed - r.physDone, s.runs.length)));
    }
    for (const k of ['train', 'inf', 'res']) set('alloc-v-' + k, Math.round(s.alloc[k] * 100) + '%');
    set('alloc-detail', `Training ${fmtFlops(sel.trainRate)} effective · Inference ${fmtFlops(sel.infFlops)} · Research +${fmtNum(sel.rpPerHour)} RP/h`);
    if (sel.deployed) {
      set('lab-price', fmtMoney(sel.price, 4) + ' (cap-priced)');
      set('lab-rev', fmtMoney(sel.revenue) + '/s');
      set('lab-pot', fmtMoney(sel.potential) + '/s');
      setBar('lab-adoptbar', sel.potential > 0 ? s.adoption / sel.potential : 0);
      set('lab-adopt', fmtMoney(s.adoption) + '/s adopted of ' + fmtMoney(sel.potential) + '/s potential');
      set('lab-served', sel.served >= 0.999 ? '⚠ serving at capacity — allocate more inference' : 'serving ' + fmtPct(sel.served) + ' of capacity');
    }
  },
};

ACTIONS.gig = () => {
  if (Date.now() < game.gigReadyAt) return;
  game.gigReadyAt = Date.now() + BAL.GIG_COOLDOWN_S * 1000;
  doAction(E.doGig);
};
INPUTS.alloc = (val, el) => {
  E.setAlloc(game.s, el.dataset.key, (+val) / 100);
  const s = game.s;
  // refresh the other two sliders without rebuilding
  document.querySelectorAll('[data-input=alloc]').forEach(inp => {
    if (inp !== el) inp.value = Math.round(s.alloc[inp.dataset.key] * 100);
    set('alloc-v-' + inp.dataset.key, Math.round(s.alloc[inp.dataset.key] * 100) + '%');
  });
};

// ════════════════════════ TRAINING ════════════════════════
const trainUI = { logN: null, logRatio: 0, auto: true };

function trainEstimates(s, sel) {
  const N = Math.pow(10, trainUI.logN);
  const ratio = Math.pow(10, trainUI.logRatio);
  const D = optimalTokens(N) * (trainUI.auto ? 1 : ratio);
  return { N, D };
}

const trainTab = {
  id: 'train', label: '🚂 Training',
  sig: (s, sel) => [s.phase, s.runs.length, sel.maxRuns, s.dataTier, Math.round(log10(sel.maxParams) * 10), s.research.length, s.autoRetrain].join('|'),
  build(s, sel) {
    if (trainUI.logN === null) {
      const sug = E.suggestRun(s);
      trainUI.logN = log10(sug.N);
    }
    const maxLogN = Math.max(6.05, log10(Math.min(sel.maxParams, sel.dataset.tokens / BAL.CHINCHILLA_RATIO * 10)));
    trainUI.logN = clamp(trainUI.logN, 6, maxLogN);
    const runsHtml = s.runs.map(r => `
      <div class="run-card">
        <div class="row" style="justify-content:space-between">
          <span class="rname">🚂 ${esc(r.name)}</span>
          <button class="act sub" data-act="cancelRun" data-arg="${r.id}">Cancel</button>
        </div>
        <div class="muted">${fmtNum(r.N)} params · ${fmtNum(r.D)} tokens · needs ${fmtFlop(r.physNeed)}</div>
        ${bar('trunbar_' + r.id, 'thin')}
        <div class="bar-label"><span id="trunpct_${r.id}"></span><span id="truneta_${r.id}"></span></div>
      </div>`).join('');

    return `<div class="grid2">
      <div class="card">
        <h3>Configure a training run</h3>
        <p class="muted">Training compute follows <b>C = 6·N·D</b> FLOPs — N parameters, D tokens.
        Chinchilla-optimal data is <b>≈20 tokens per parameter</b>. Bigger effective compute ⇒ higher capability.</p>
        <div style="margin:12px 0 4px" class="row" style="justify-content:space-between">
          <span>Model size <b class="cyan" id="tr-n">?</b> <span class="muted">parameters</span></span>
        </div>
        <input type="range" min="6" max="${maxLogN.toFixed(2)}" step="0.01" value="${trainUI.logN}" data-input="trN">
        <div class="bar-label"><span>1M</span><span>VRAM limit: ${fmtNum(sel.maxParams)}</span></div>

        <label class="chk" style="margin:10px 0 4px">
          <input type="checkbox" ${trainUI.auto ? 'checked' : ''} data-input="trAuto">
          Chinchilla-optimal tokens (20 × N)
        </label>
        <div id="tr-ratio-wrap" style="${trainUI.auto ? 'display:none' : ''}">
          <input type="range" min="-1" max="1" step="0.02" value="${trainUI.logRatio}" data-input="trRatio">
          <div class="bar-label"><span>0.1× (undertrained)</span><span>10× (overtrained)</span></div>
        </div>

        <div class="card" style="background:var(--card2); margin:12px 0">
          <div class="stat-row"><span class="k">Data</span><span class="stat-v" id="tr-d">?</span></div>
          <div class="stat-row"><span class="k">Training compute</span><span class="stat-v" id="tr-c">?</span></div>
          <div class="stat-row"><span class="k">Est. duration</span><span class="stat-v" id="tr-t">?</span></div>
          <div class="stat-row"><span class="k">Cluster utilization</span><span class="stat-v" id="tr-util">?</span></div>
          <div class="stat-row"><span class="k">Data-budget quality</span><span class="stat-v" id="tr-chin">?</span></div>
          <div class="stat-row"><span class="k">Predicted capability</span><span class="stat-v gold" id="tr-cap">?</span></div>
        </div>
        <div class="muted small" id="tr-warn" style="min-height:18px"></div>
        <div class="row" style="margin-top:8px">
          <button class="act big" data-act="startRun">🚀 Start training</button>
          <button class="act sub" data-act="suggestRun">✨ Suggest frontier config</button>
        </div>
      </div>
      <div>
        <div class="card">
          <h3>Active runs (${s.runs.length}/${sel.maxRuns})</h3>
          ${runsHtml || '<div class="muted">Idle clusters earn nothing. Start a run.</div>'}
          ${sel.fx.unlocks.has('autoRetrain') ? `
            <label class="chk" style="margin-top:8px">
              <input type="checkbox" ${s.autoRetrain ? 'checked' : ''} data-input="autoRetrain">
              🔁 AutoML: respawn completed runs automatically
            </label>` : ''}
          <label class="chk" style="margin-top:6px">
            <input type="checkbox" ${s.autoDeploy ? 'checked' : ''} data-input="autoDeploy">
            ⤴ Auto-deploy new best models
          </label>
        </div>
        <div class="card">
          <h3>How capability works</h3>
          <div class="small muted">
            <p>📐 <b>Effective compute</b> = physical FLOPs × algorithmic efficiency (×${fmtNum(sel.algoEff)})
            × data quality (×${sel.dataQ.toFixed(2)}) × data-budget fit.</p>
            <p>🧮 Your run rate: <b>${fmtFlops(sel.trainRate)}</b> = cluster ${fmtFlops(sel.flops)} × MFU ${fmtPct(sel.mfu)} × ${fmtPct(s.alloc.train)} allocation${s.runs.length ? ` ÷ ${s.runs.length + 1} runs` : ''}.</p>
            <p>🔗 <b>Batch-size limit:</b> one run can absorb at most ${fmtFlops(sel.ppRate)} per parameter — small models can't use a giant cluster. Parallelism research raises this.</p>
          </div>
        </div>
      </div>
    </div>`;
  },
  update(s, sel) {
    const { N, D } = trainEstimates(s, sel);
    const C = trainCompute(N, D);
    const nRuns = s.runs.length + 1;
    const etaH = E.runEtaH(sel, N, C, nRuns);
    const rate = Math.min(sel.trainRate / nRuns, N * sel.ppRate);
    const util = sel.trainRate > 0 ? rate / (sel.trainRate / nRuns) : 0;
    const chin = chinchillaPenalty(N, D);
    const cap = capabilityFor(C, sel.algoEff, sel.dataQ, N, D);
    set('tr-n', fmtNum(N));
    set('tr-d', fmtNum(D) + ' tokens (have ' + fmtNum(sel.dataset.tokens) + ')');
    set('tr-c', fmtFlop(C));
    set('tr-t', fmtDur(etaH) + ` at ${fmtFlops(rate)}`);
    set('tr-util', fmtPct(util));
    set('tr-chin', fmtPct(chin) + (chin > 0.97 ? ' ✓' : ''));
    set('tr-cap', cap.toFixed(1) + ' — ' + capTier(cap) + (cap > s.bestCap ? '  (new best!)' : ''));
    const warns = [];
    if (N > sel.maxParams) warns.push('⛔ Won\'t fit in VRAM (~18 bytes/param). Buy GPUs or research ZeRO.');
    if (D > sel.dataset.tokens) warns.push('⛔ Not enough data — acquire a bigger dataset (Company tab).');
    if (util < 0.6 && sel.trainRate > 0) warns.push(`⚠ Model too small for the cluster — ${fmtPct(1 - util)} of your training FLOPs would idle.`);
    if (chin < 0.8) warns.push('⚠ Far from Chinchilla-optimal — quality suffers.');
    if (s.runs.length >= sel.maxRuns) warns.push('⛔ All run slots busy.');
    const w = document.getElementById('tr-warn'); if (w) w.innerHTML = warns.join('<br>');
    for (const r of s.runs) {
      setBar('trunbar_' + r.id, r.physDone / r.physNeed);
      set('trunpct_' + r.id, fmtPct(r.physDone / r.physNeed, 1));
      set('truneta_' + r.id, 'ETA ' + fmtDur(E.runEtaH(sel, r.N, r.physNeed - r.physDone, s.runs.length)));
    }
  },
};

INPUTS.trN = (v) => { trainUI.logN = +v; trainTab.update(game.s, game.sel); };
INPUTS.trRatio = (v) => { trainUI.logRatio = +v; trainTab.update(game.s, game.sel); };
INPUTS.trAuto = (v, el) => {
  trainUI.auto = el.checked;
  const wrap = document.getElementById('tr-ratio-wrap');
  if (wrap) wrap.style.display = el.checked ? 'none' : '';
  trainTab.update(game.s, game.sel);
};
INPUTS.autoRetrain = (v, el) => { game.s.autoRetrain = el.checked; };
INPUTS.autoDeploy = (v, el) => { game.s.autoDeploy = el.checked; };
ACTIONS.startRun = () => {
  const { N, D } = trainEstimates(game.s, game.sel);
  doAction(E.startRun, Math.round(N), Math.round(D));
};
ACTIONS.suggestRun = () => {
  const sug = E.suggestRun(game.s);
  trainUI.logN = log10(sug.N);
  trainUI.auto = true;
  game.builtTab = null; // rebuild to refresh slider positions
  renderAll();
};
ACTIONS.cancelRun = (id) => doAction(E.cancelRun, id);

// ════════════════════════ HARDWARE ════════════════════════
const hwTab = {
  id: 'hw', label: '🖥️ Hardware',
  sig: (s, sel) => [s.phase, JSON.stringify(s.gpus), s.research.length, Math.round(sel.gpuPriceBuff * 100)].join('|'),
  build(s, sel) {
    const next = FACILITIES[s.phase + 1];
    const facHtml = `<div class="card">
      <h3>Facility — ${esc(sel.fac.name)} ${FACILITY_EMOJI[s.phase]}</h3>
      <div class="muted">${esc(sel.fac.desc)}</div>
      <div style="margin:8px 0 2px" class="bar-label"><span>Power (IT load)</span><span id="hw-power"></span></div>
      ${bar('hw-powerbar')}
      <div style="margin:8px 0 2px" class="bar-label"><span>Rack slots</span><span id="hw-slots"></span></div>
      ${bar('hw-slotbar')}
      <div class="stat-row" style="margin-top:8px"><span class="k">Cooling overhead (PUE)</span><span class="stat-v">${sel.fac.pue.toFixed(2)}×</span></div>
      <div class="stat-row"><span class="k">Electricity</span><span class="stat-v">$${sel.fac.elecPrice.toFixed(3)}/kWh</span></div>
      <div class="stat-row"><span class="k">Electricity bill</span><span class="stat-v" id="hw-elec"></span></div>
      <div class="stat-row"><span class="k">Upkeep</span><span class="stat-v">${fmtMoney(sel.fac.upkeep)}/h</span></div>
      ${next ? `<div style="margin-top:12px" class="row">
        <button class="act gold" data-act="buyFacility" id="hw-upgrade">⬆ Upgrade: ${esc(next.name)} — ${fmtMoney(next.cost)}</button>
      </div>
      <div class="faint" style="margin-top:4px">${fmtNum(next.slots)} slots · ${fmtPower(next.powerW)} · PUE ${next.pue} · $${next.elecPrice}/kWh · staff ${fmtNum(next.staffMax)}</div>`
      : '<div class="gold" style="margin-top:10px">This is the endgame facility. 6 GW of pure thought.</div>'}
    </div>`;

    const gpuCards = GPUS.map(g => {
      const owned = s.gpus[g.id] || 0;
      const locked = g.phase > s.phase || (g.research && !s.research.includes(g.research));
      const lockMsg = g.phase > s.phase ? `Requires ${FACILITIES[g.phase].name}` : (g.research && !s.research.includes(g.research)) ? 'Requires research: Custom Training Silicon' : '';
      const price = gpuPrice(s, sel, g);
      return `<div class="res-card ${locked ? 'locked' : ''}">
        <div class="row" style="justify-content:space-between">
          <span class="rn">${esc(g.name)}</span>
          <span class="gold num">${fmtMoney(price)}${sel.gpuPriceBuff !== 1 ? ' <span class="faint">(market!)</span>' : ''}</span>
        </div>
        <div class="muted small">${esc(g.desc)}</div>
        <div class="faint">⚡ ${fmtNum(g.tflops)} TFLOPS · 🔌 ${g.watts} W · 💾 ${g.vram} GB</div>
        <div class="row" style="justify-content:space-between; margin-top:4px">
          <span class="stat-v">Owned: ${fmtNum(owned)}</span>
          ${locked ? `<span class="faint">🔒 ${lockMsg}</span>` : `<span class="row" style="gap:4px">
            <button class="act" data-act="buyGpu" data-arg='${JSON.stringify({ id: g.id, n: 1 })}'>+1</button>
            <button class="act" data-act="buyGpu" data-arg='${JSON.stringify({ id: g.id, n: 10 })}'>+10</button>
            <button class="act" data-act="buyGpu" data-arg='${JSON.stringify({ id: g.id, n: 1000 })}'>+1k</button>
            <button class="act sub" data-act="buyGpuMax" data-arg="${g.id}">Max</button>
            ${owned ? `<button class="act warn" data-act="sellGpu" data-arg='${JSON.stringify({ id: g.id, n: owned })}' title="Sell all at ${Math.round(BAL.SELL_RATIO * 100)}%">Sell</button>` : ''}
          </span>`}
        </div>
      </div>`;
    }).join('');

    return facHtml + `<div class="card"><h3>Accelerator market</h3>
      <p class="muted small">FLOPS win training races; VRAM bounds model size (~18 B/param); watts hit the power budget and the bill.</p>
      <div class="grid3">${gpuCards}</div></div>`;
  },
  update(s, sel) {
    set('hw-power', `${fmtPower(sel.powerUsed)} / ${fmtPower(sel.powerCap)}`);
    setBar('hw-powerbar', sel.powerUsed / sel.powerCap, sel.powerUsed / sel.powerCap > 0.92);
    set('hw-slots', `${fmtNum(sel.gpuCount)} / ${fmtNum(sel.fac.slots)}`);
    setBar('hw-slotbar', sel.gpuCount / sel.fac.slots, sel.gpuCount / sel.fac.slots > 0.92);
    set('hw-elec', fmtMoney(sel.elecPerHour) + '/h');
    const up = document.getElementById('hw-upgrade');
    if (up) up.disabled = s.money < FACILITIES[s.phase + 1].cost;
  },
};

ACTIONS.buyGpu = (arg) => { const { id, n } = JSON.parse(arg); doAction(E.buyGpu, id, n); };
ACTIONS.buyGpuMax = (id) => {
  const n = E.maxAffordableGpu(game.s, id);
  if (n <= 0) { toast('Can\'t fit or afford any more of these.', 'err'); return; }
  doAction(E.buyGpu, id, n);
};
ACTIONS.sellGpu = (arg) => { const { id, n } = JSON.parse(arg); doAction(E.sellGpu, id, n); };
ACTIONS.buyFacility = () => {
  const r = doAction(E.buyFacility, game.s.phase + 1);
  if (r.ok) {
    const f = FACILITIES[game.s.phase];
    showModal(`<h2>${FACILITY_EMOJI[game.s.phase]} ${esc(f.name)}</h2>
      <p>${esc(f.story)}</p>
      <div class="actions"><button class="act big" data-act="closeModal">Let's get to work</button></div>`);
  }
};

// ════════════════════════ MODELS ════════════════════════
const modelsTab = {
  id: 'models', label: '🤖 Models',
  sig: (s) => [s.models.length, s.models.filter(m => m.open).length, s.models.find(m => m.deployed)?.id].join('|'),
  build(s, sel) {
    const rows = [...s.models].sort((a, b) => b.cap - a.cap).map(m => `
      <tr>
        <td><b class="cyan">${esc(m.name)}</b></td>
        <td class="num">${fmtNum(m.N)}</td>
        <td class="num">${fmtNum(m.D)}</td>
        <td class="num"><b>${m.cap.toFixed(1)}</b> <span class="faint">${esc(capTier(m.cap))}</span></td>
        <td>${m.deployed ? '<span class="badge dep">SERVING</span>' : m.open ? '<span class="badge open">OPEN-SOURCE</span>' : ''}</td>
        <td class="row" style="gap:4px; justify-content:flex-end">
          ${!m.deployed && !m.open ? `<button class="act" data-act="deploy" data-arg="${m.id}">Deploy</button>
          <button class="act sub" data-act="openSource" data-arg="${m.id}" title="+${(m.cap * BAL.OPEN_SOURCE_REP).toFixed(1)} reputation">Open-source</button>` : ''}
        </td>
      </tr>`).join('');
    return `<div class="card">
      <h3>Model registry (${s.models.length})</h3>
      <p class="muted small">Deploy your best model to serve the API. Open-source older ones for reputation — the community remembers.</p>
      ${s.models.length ? `<table class="tbl">
        <tr><th>Model</th><th>Params</th><th>Tokens</th><th>Capability</th><th>Status</th><th></th></tr>${rows}</table>`
        : '<div class="muted">Nothing trained yet. Your first model awaits in the Training tab.</div>'}
    </div>`;
  },
};
ACTIONS.deploy = (id) => doAction(E.deployModel, id);
ACTIONS.openSource = (id) => doAction(E.openSourceModel, id);

// ════════════════════════ RESEARCH ════════════════════════
const resTab = {
  id: 'res', label: '🔬 Research',
  sig: (s) => [s.research.length, s.phase, Math.floor(s.bestCap)].join('|'),
  build(s, sel) {
    const fxDesc = (fx) => {
      const parts = [];
      if (fx.algo) parts.push(`×${fx.algo} algo eff`);
      if (fx.mfu) parts.push(`+${Math.round(fx.mfu * 100)}% MFU`);
      if (fx.dataQ) parts.push(`×${fx.dataQ} data quality`);
      if (fx.memEff) parts.push(`×${fx.memEff} VRAM eff`);
      if (fx.infEff) parts.push(`÷${fx.infEff} serving cost`);
      if (fx.revMult) parts.push(`×${fx.revMult} price`);
      if (fx.demandMult) parts.push(`×${fx.demandMult} demand`);
      if (fx.gigMult) parts.push(`×${fx.gigMult} gigs`);
      if (fx.rpMult) parts.push(`×${fx.rpMult} RP`);
      if (fx.powerMult) parts.push(`${Math.round((1 - fx.powerMult) * 100)}% cheaper power`);
      if (fx.maxRuns) parts.push(`+${fx.maxRuns} run slot`);
      if (fx.ppMult) parts.push(`×${fx.ppMult} batch limit`);
      if (fx.outageGuard) parts.push('outage protection');
      if (fx.unlock === 'mx1') parts.push('unlocks MX-1 chip');
      if (fx.unlock === 'synthData') parts.push('unlocks synthetic data');
      if (fx.unlock === 'autoRetrain') parts.push('unlocks AutoML');
      return parts.map(p => `<span class="fx-chip">${p}</span>`).join('');
    };
    let html = `<div class="card"><div class="row" style="justify-content:space-between">
      <h3 style="margin:0">Research — <span class="cyan num" id="res-rp"></span> RP <span class="faint">(+<span id="res-rate"></span>/h)</span></h3>
      <span class="muted small">RP comes from research scientists + compute allocated to Research.</span>
    </div></div>`;
    for (let era = 0; era < ERA_NAMES.length; era++) {
      const items = RESEARCH.filter(r => r.era === era);
      html += `<div class="era-h">Era ${era + 1} — ${ERA_NAMES[era]} ${era > s.phase ? `🔒 requires ${FACILITIES[era].name}` : ''}</div>
        <div class="grid3">` + items.map(r => {
        const done = s.research.includes(r.id);
        const depsOk = (r.deps || []).every(d => s.research.includes(d));
        const capOk = !r.reqCap || s.bestCap >= r.reqCap;
        const eraOk = r.era <= s.phase;
        const locked = !done && (!depsOk || !capOk || !eraOk);
        let lockMsg = '';
        if (!eraOk) lockMsg = `needs ${FACILITIES[r.era].name}`;
        else if (!depsOk) lockMsg = 'needs ' + (r.deps || []).filter(d => !s.research.includes(d)).map(d => RESEARCH_BY_ID[d].name).join(', ');
        else if (!capOk) lockMsg = `needs capability ${r.reqCap}`;
        return `<div class="res-card ${done ? 'done' : locked ? 'locked' : ''}">
          <div class="row" style="justify-content:space-between">
            <span class="rn">${done ? '✅ ' : ''}${esc(r.name)}</span>
            ${!done ? `<span class="num gold">${fmtNum(r.rp)} RP${r.money ? ' + ' + fmtMoney(r.money) : ''}</span>` : ''}
          </div>
          <div class="muted small">${esc(r.desc)}</div>
          <div>${fxDesc(r.fx)}</div>
          ${!done && !locked ? `<button class="act" data-act="research" data-arg="${r.id}" id="resbtn_${r.id}">Research</button>` : ''}
          ${locked ? `<div class="faint">🔒 ${esc(lockMsg)}</div>` : ''}
        </div>`;
      }).join('') + '</div>';
    }
    return html;
  },
  update(s, sel) {
    set('res-rp', fmtNum(s.rp));
    set('res-rate', fmtNum(sel.rpPerHour));
    for (const r of RESEARCH) {
      const btn = document.getElementById('resbtn_' + r.id);
      if (btn) btn.disabled = s.rp < r.rp || (r.money && s.money < r.money);
    }
  },
};
ACTIONS.research = (id) => doAction(E.buyResearch, id);

// ════════════════════════ COMPANY ════════════════════════
const coTab = {
  id: 'co', label: '🏛️ Company',
  sig: (s, sel) => [s.phase, JSON.stringify(s.staff), s.dataTier, s.funding.length, s.stats.papers, s.research.length, Math.floor(s.simHours / 24)].join('|'),
  build(s, sel) {
    const staffRows = STAFF.map(st => `
      <tr>
        <td><b>${esc(st.name)}</b><div class="faint">${esc(st.desc)}</div></td>
        <td class="num">${fmtMoney(st.wage)}/h</td>
        <td class="num"><b id="staff_${st.id}">${s.staff[st.id]}</b></td>
        <td class="row" style="gap:4px; justify-content:flex-end">
          <button class="act" data-act="hire" data-arg='${JSON.stringify({ id: st.id, n: 1 })}'>+1</button>
          <button class="act" data-act="hire" data-arg='${JSON.stringify({ id: st.id, n: 10 })}'>+10</button>
          <button class="act" data-act="hire" data-arg='${JSON.stringify({ id: st.id, n: 100 })}'>+100</button>
          <button class="act sub" data-act="fire" data-arg='${JSON.stringify({ id: st.id, n: 1 })}'>−1</button>
        </td>
      </tr>`).join('');

    const dataRows = DATASETS.map((d, i) => {
      const owned = i <= s.dataTier;
      const isNext = i === s.dataTier + 1;
      const lockedRes = d.research && !s.research.includes(d.research);
      return `<div class="res-card ${owned ? 'done' : (!isNext || lockedRes) ? 'locked' : ''}">
        <div class="row" style="justify-content:space-between">
          <span class="rn">${owned ? '✅ ' : ''}${esc(d.name)}</span>
          ${!owned ? `<span class="gold num">${fmtMoney(d.cost)}</span>` : ''}
        </div>
        <div class="muted small">${esc(d.desc)}</div>
        <div class="faint">${fmtNum(d.tokens)} tokens · quality ×${d.quality}</div>
        ${isNext && !lockedRes ? `<button class="act" data-act="buyData" data-arg="${d.id}" ${s.money < d.cost ? 'disabled' : ''}>Acquire</button>` : ''}
        ${lockedRes && !owned ? '<div class="faint">🔒 needs Synthetic Data Research</div>' : ''}
      </div>`;
    }).join('');

    const fundCards = FUNDING.map((f, i) => {
      const taken = s.funding.includes(f.id);
      const prevOk = i === 0 || s.funding.includes(FUNDING[i - 1].id);
      const waitH = E.fundingWaitH(s, f);
      const capOk = s.bestCap >= f.reqCap, repOk = s.rep >= f.reqRep;
      const ready = !taken && prevOk && capOk && repOk && waitH <= 0;
      return `<div class="res-card ${taken ? 'done' : !prevOk ? 'locked' : ''}">
        <div class="row" style="justify-content:space-between">
          <span class="rn">${taken ? '✅ ' : '💰 '}${esc(f.name)}</span>
          <span class="gold num">${fmtMoney(f.amount)}</span>
        </div>
        <div class="muted small">${esc(f.desc)}</div>
        ${!taken ? `<div class="faint">needs capability ${f.reqCap} ${capOk ? '✓' : '✗'} · reputation ${f.reqRep} ${repOk ? '✓' : '✗'}
          ${prevOk && waitH > 0 ? `· ⏳ traction review: ${fmtDur(waitH)}` : ''}</div>
        <button class="act gold" data-act="fund" data-arg="${f.id}" ${ready ? '' : 'disabled'}>Close the round</button>` : ''}
      </div>`;
    }).join('');

    return `<div class="grid2">
      <div>
        <div class="card"><h3>Team — <span id="co-staff"></span> / ${fmtNum(sel.fac.staffMax)} seats</h3>
          <table class="tbl"><tr><th>Role</th><th>Wage</th><th>Count</th><th></th></tr>${staffRows}</table>
          <div class="stat-row" style="margin-top:6px"><span class="k">Payroll</span><span class="stat-v" id="co-payroll"></span></div>
        </div>
        <div class="card"><h3>Reputation & publications</h3>
          <div class="stat-row"><span class="k">Reputation</span><span class="stat-v cyan" id="co-rep"></span></div>
          <div class="stat-row"><span class="k">Papers published</span><span class="stat-v">${s.stats.papers}</span></div>
          <button class="act" data-act="paper" id="co-paper" style="margin-top:6px"></button>
          <div class="faint" style="margin-top:4px">+${BAL.PAPER_REP} reputation each. Investors read NeurIPS proceedings.</div>
        </div>
        <div class="card"><h3>Funding rounds</h3><div class="grid3" style="grid-template-columns:1fr">${fundCards}</div></div>
      </div>
      <div>
        <div class="card"><h3>Datasets</h3>
          <p class="muted small">Training data caps your token budget; quality multiplies effective compute.</p>
          ${dataRows}
        </div>
      </div>
    </div>`;
  },
  update(s, sel) {
    set('co-staff', fmtNum(sel.staffCount));
    set('co-payroll', fmtMoney(sel.salaries) + '/h');
    set('co-rep', s.rep.toFixed(1) + ' / 100');
    for (const st of STAFF) set('staff_' + st.id, s.staff[st.id]);
    const pb = document.getElementById('co-paper');
    if (pb) {
      const cost = E.paperCost(s);
      pb.textContent = `📄 Publish a paper — ${fmtNum(cost)} RP`;
      pb.disabled = s.rp < cost;
    }
  },
};
ACTIONS.hire = (arg) => { const { id, n } = JSON.parse(arg); doAction(E.hire, id, n); };
ACTIONS.fire = (arg) => { const { id, n } = JSON.parse(arg); doAction(E.fire, id, n); };
ACTIONS.buyData = (id) => doAction(E.buyDataset, id);
ACTIONS.fund = (id) => doAction(E.takeFunding, id);
ACTIONS.paper = () => doAction(E.publishPaper);

// ════════════════════════ GOALS ════════════════════════
const goalsTab = {
  id: 'goals', label: '🎯 Goals',
  sig: (s) => Object.keys(s.milestones).length + ':' + s.won,
  build(s) {
    const current = MAIN_QUEST.find(m => !s.milestones[m.id]);
    const questHtml = MAIN_QUEST.map((m, i) => {
      const done = !!s.milestones[m.id];
      const isCur = m === current;
      return `<div class="run-card" style="${isCur ? 'border-color:var(--accent)' : ''}; ${done ? 'opacity:.6' : ''}">
        <div class="row" style="justify-content:space-between">
          <span><b>${done ? '✅' : isCur ? '👉' : '·'} ${i + 1}. ${esc(m.name)}</b></span>
          ${m.reward ? `<span class="faint">${rewardText(m.reward)}</span>` : ''}
        </div>
        <div class="muted small">${esc(m.desc)}</div>
      </div>`;
    }).join('');
    const side = MILESTONES.filter(m => !m.main).map(m => {
      const done = !!s.milestones[m.id];
      return `<div class="res-card ${done ? 'done' : ''}">
        <span class="rn">${done ? '🏆' : '🔘'} ${esc(m.name)}</span>
        <div class="muted small">${esc(m.desc)}</div>
        ${m.reward ? `<div class="faint">${rewardText(m.reward)}</div>` : ''}
      </div>`;
    }).join('');
    return `<div class="grid2">
      <div class="card"><h3>The road to AGI</h3>${questHtml}</div>
      <div class="card"><h3>Achievements</h3><div class="grid3" style="grid-template-columns:1fr 1fr">${side}</div></div>
    </div>`;
  },
};

export const TABS = [labTab, trainTab, hwTab, modelsTab, resTab, coTab, goalsTab];
