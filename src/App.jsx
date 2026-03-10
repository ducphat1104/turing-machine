import { useState, useEffect, useRef, useCallback } from 'react';

/* ━━━ PRESETS: Các bài toán mẫu từ dễ → khó ━━━ */
const PRESETS = {
  flip_bits: {
    name: '① Đảo bit (Dễ — 3 luật)',
    desc: 'Đảo toàn bộ bit trên băng: 0→1, 1→0. Ví dụ: "1010" → "0101". Đây là bài đơn giản nhất để hiểu cách máy Turing hoạt động.',
    input: '1010',
    transitions: [
      { state: 'q0', read: '0', write: '1', dir: 'R', next: 'q0' },
      { state: 'q0', read: '1', write: '0', dir: 'R', next: 'q0' },
      { state: 'q0', read: '_', write: '_', dir: 'R', next: 'q_acc' },
    ],
  },
  unary_add: {
    name: '② Cộng Unary (Vừa — 5 luật)',
    desc: 'Cộng 2 số biểu diễn bằng chuỗi ký tự 1, ngăn cách bởi dấu +. Ví dụ: "111+11" = 3+2 → "11111" = 5. Thay + bằng 1, xoá 1 ký tự đầu.',
    input: '111+11',
    transitions: [
      { state: 'q0', read: '1', write: '1', dir: 'R', next: 'q0' },
      { state: 'q0', read: '+', write: '1', dir: 'L', next: 'q1' },
      { state: 'q1', read: '1', write: '1', dir: 'L', next: 'q1' },
      { state: 'q1', read: '_', write: '_', dir: 'R', next: 'q2' },
      { state: 'q2', read: '1', write: '_', dir: 'R', next: 'q_acc' },
    ],
  },
  equal_01: {
    name: '③ Số 0 = Số 1 (Khó — 16 luật)',
    desc: 'Kiểm tra chuỗi nhị phân có số lượng 0 bằng số lượng 1 hay không. "0011" → Accept ✓, "011" → Reject ✗. Thuật toán ghép cặp từng số 0 với số 1.',
    input: '0011',
    transitions: [
      { state: 'q0', read: 'X', write: 'X', dir: 'R', next: 'q0' },
      { state: 'q0', read: '0', write: 'X', dir: 'R', next: 'q1' },
      { state: 'q0', read: '1', write: 'X', dir: 'R', next: 'q2' },
      { state: 'q0', read: '_', write: '_', dir: 'R', next: 'q_acc' },
      { state: 'q1', read: '0', write: '0', dir: 'R', next: 'q1' },
      { state: 'q1', read: '1', write: 'X', dir: 'L', next: 'q3' },
      { state: 'q1', read: 'X', write: 'X', dir: 'R', next: 'q1' },
      { state: 'q1', read: '_', write: '_', dir: 'L', next: 'q_rej' },
      { state: 'q2', read: '0', write: 'X', dir: 'L', next: 'q3' },
      { state: 'q2', read: '1', write: '1', dir: 'R', next: 'q2' },
      { state: 'q2', read: 'X', write: 'X', dir: 'R', next: 'q2' },
      { state: 'q2', read: '_', write: '_', dir: 'L', next: 'q_rej' },
      { state: 'q3', read: '0', write: '0', dir: 'L', next: 'q3' },
      { state: 'q3', read: '1', write: '1', dir: 'L', next: 'q3' },
      { state: 'q3', read: 'X', write: 'X', dir: 'L', next: 'q3' },
      { state: 'q3', read: '_', write: '_', dir: 'R', next: 'q0' },
    ],
  },
  even_ones: {
    name: '④ Số 1 chẵn? (Vừa — 6 luật)',
    desc: 'Kiểm tra chuỗi nhị phân có số lượng bit 1 chẵn hay không. "1100" (2 bit 1) → Accept ✓, "111" (3 bit 1) → Reject ✗. Dùng 2 trạng thái đếm chẵn/lẻ, giống DFA.',
    input: '1100',
    transitions: [
      { state: 'q0', read: '0', write: '0', dir: 'R', next: 'q0' },
      { state: 'q0', read: '1', write: '1', dir: 'R', next: 'q1' },
      { state: 'q0', read: '_', write: '_', dir: 'R', next: 'q_acc' },
      { state: 'q1', read: '0', write: '0', dir: 'R', next: 'q1' },
      { state: 'q1', read: '1', write: '1', dir: 'R', next: 'q0' },
      { state: 'q1', read: '_', write: '_', dir: 'R', next: 'q_rej' },
    ],
  },
};

const PRESET_KEYS = Object.keys(PRESETS);

export default function App() {
  const [presetKey, setPresetKey] = useState('flip_bits');
  const [tapeInput, setTapeInput] = useState(PRESETS.flip_bits.input);
  const [transitions, setTransitions] = useState(PRESETS.flip_bits.transitions.map(t => ({ ...t })));
  const [tape, setTape] = useState([]);
  const [head, setHead] = useState(0);
  const [curState, setCurState] = useState('q0');
  const [status, setStatus] = useState('idle');
  const [history, setHistory] = useState([]);
  const [stepCount, setStepCount] = useState(0);
  const [speed, setSpeed] = useState(300);
  const [isRunning, setIsRunning] = useState(false);

  const runRef = useRef(false);
  const timerRef = useRef(null);
  const tapeR = useRef([]);
  const headR = useRef(0);
  const stateR = useRef('q0');
  const histR = useRef([]);
  const stepR = useRef(0);
  const endRef = useRef(null);

  const initMachine = useCallback(() => {
    clearTimeout(timerRef.current);
    runRef.current = false;
    setIsRunning(false);
    const chars = tapeInput.trim().split('');
    const t = ['_', ...chars, '_', '_'];
    tapeR.current = t; headR.current = 1; stateR.current = 'q0';
    histR.current = []; stepR.current = 0;
    setTape(t); setHead(1); setCurState('q0');
    setStatus('idle'); setHistory([]); setStepCount(0);
  }, [tapeInput]);

  const execStep = useCallback(() => {
    const cs = stateR.current;
    if (cs === 'q_acc') { setStatus('accepted'); runRef.current = false; setIsRunning(false); clearTimeout(timerRef.current); return false; }
    if (cs === 'q_rej') { setStatus('rejected'); runRef.current = false; setIsRunning(false); clearTimeout(timerRef.current); return false; }
    const sym = tapeR.current[headR.current] || '_';
    const rule = transitions.find(t => t.state === cs && t.read === sym);
    if (!rule) { setStatus('halted'); runRef.current = false; setIsRunning(false); clearTimeout(timerRef.current); return false; }

    const nt = [...tapeR.current]; nt[headR.current] = rule.write;
    let nh = headR.current + (rule.dir === 'R' ? 1 : -1);
    if (nh < 0) { nt.unshift('_'); nh = 0; }
    while (nh >= nt.length) nt.push('_');

    const s = stepR.current + 1;
    const entry = { step: s, state: cs, read: sym, write: rule.write, dir: rule.dir, next: rule.next };
    tapeR.current = nt; headR.current = nh; stateR.current = rule.next;
    histR.current = [...histR.current, entry]; stepR.current = s;

    setTape(nt); setHead(nh); setCurState(rule.next);
    setHistory(histR.current); setStepCount(s); setStatus('running');

    if (rule.next === 'q_acc') { setStatus('accepted'); runRef.current = false; setIsRunning(false); clearTimeout(timerRef.current); return false; }
    if (rule.next === 'q_rej') { setStatus('rejected'); runRef.current = false; setIsRunning(false); clearTimeout(timerRef.current); return false; }
    return true;
  }, [transitions]);

  const handleStep = () => { if (status === 'idle') setStatus('running'); execStep(); };

  const handleRun = () => {
    if (isRunning) { clearTimeout(timerRef.current); runRef.current = false; setIsRunning(false); return; }
    if (status === 'idle') setStatus('running');
    runRef.current = true; setIsRunning(true);
    const tick = () => { if (!runRef.current) return; const ok = execStep(); if (ok && runRef.current) timerRef.current = setTimeout(tick, speed); };
    timerRef.current = setTimeout(tick, 0);
  };

  const handleReset = () => initMachine();

  const handlePresetChange = (key) => {
    setPresetKey(key);
    const p = PRESETS[key];
    if (!p) return;
    setTapeInput(p.input);
    setTransitions(p.transitions.map(t => ({ ...t })));
  };

  const tChange = (i, f, v) => setTransitions(p => { const n = [...p]; n[i] = { ...n[i], [f]: v }; return n; });
  const tAdd = () => setTransitions(p => [...p, { state: '', read: '_', write: '_', dir: 'R', next: '' }]);
  const tDel = (i) => setTransitions(p => p.filter((_, j) => j !== i));

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history]);
  useEffect(() => { initMachine(); }, []);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const done = status === 'accepted' || status === 'rejected' || status === 'halted';
  const pill = { idle: 'bg-gray-700 text-gray-300', running: 'bg-indigo-500/20 text-indigo-400 animate-pulse', accepted: 'bg-emerald-500/20 text-emerald-400', rejected: 'bg-red-500/20 text-red-400', halted: 'bg-amber-500/20 text-amber-400' }[status];
  const pillTxt = { idle: 'Sẵn sàng', running: 'Đang chạy', accepted: '✓ Chấp nhận', rejected: '✗ Từ chối', halted: '⚠ Dừng' }[status];
  const curPreset = PRESETS[presetKey];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-cyan-500/5 blur-[120px]" />
      </div>

      <header className="relative z-10 border-b border-white/5 bg-gray-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-base">⚙️</div>
            <div>
              <h1 className="text-sm font-bold bg-gradient-to-r from-white to-indigo-300 bg-clip-text text-transparent">Turing Machine Simulator</h1>
              <p className="text-[10px] text-gray-500 font-medium tracking-wider">NHÓM 8 • LÝ THUYẾT TÍNH TOÁN</p>
            </div>
          </div>
          <div className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide ${pill}`}>{pillTxt}</div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto p-5">
        <div className="grid grid-cols-1 lg:grid-cols-[370px_1fr] gap-5">

          {/* ── LEFT ── */}
          <div className="space-y-5">
            {/* Preset Selector */}
            <div className="bg-gray-900/60 border border-white/5 rounded-2xl p-5 backdrop-blur-sm">
              <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-xs">📦</span>
                Chọn bài toán
              </h2>
              <select value={presetKey} onChange={e => handlePresetChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-800 border border-white/8 rounded-lg text-sm text-gray-100 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/15 transition cursor-pointer appearance-none"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236366f1'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '32px' }}>
                {PRESET_KEYS.map(k => <option key={k} value={k}>{PRESETS[k].name}</option>)}
              </select>
              {curPreset && (
                <p className="text-[11px] text-gray-400 mt-2.5 leading-relaxed bg-indigo-500/5 border-l-2 border-indigo-500/30 px-3 py-2 rounded-r-lg">{curPreset.desc}</p>
              )}
            </div>

            {/* Input */}
            <div className="bg-gray-900/60 border border-white/5 rounded-2xl p-5 backdrop-blur-sm">
              <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-xs">🎞️</span>
                Đầu vào
              </h2>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Chuỗi (Tape)</label>
              <input type="text" value={tapeInput} onChange={e => setTapeInput(e.target.value)} placeholder="Nhập chuỗi..."
                className="w-full px-3 py-2 bg-gray-800 border border-white/8 rounded-lg text-sm font-mono text-gray-100 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/15 transition placeholder:text-gray-600" />
              <button onClick={handleReset} className="w-full mt-3 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold transition active:scale-[0.98]">Nạp máy & Reset</button>
            </div>

            {/* Transition Table */}
            <div className="bg-gray-900/60 border border-white/5 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center text-xs">🔀</span>
                  Bảng luật δ
                </h2>
                <span className="text-[10px] text-gray-500 font-mono">{transitions.length} luật</span>
              </div>
              <div className="max-h-[350px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-[10px] text-gray-500 uppercase tracking-wider">
                    <th className="text-left py-1.5 px-0.5">State</th><th className="text-left py-1.5 px-0.5">Read</th>
                    <th className="text-left py-1.5 px-0.5">Write</th><th className="text-left py-1.5 px-0.5">Dir</th>
                    <th className="text-left py-1.5 px-0.5">Next</th><th className="w-7"></th>
                  </tr></thead>
                  <tbody>{transitions.map((t, i) => (
                    <tr key={i} className="border-t border-white/3">
                      {['state', 'read', 'write'].map(f => (
                        <td key={f} className="py-1 px-0.5"><input value={t[f]} onChange={e => tChange(i, f, e.target.value)} maxLength={f === 'state' ? 10 : 3}
                          className="w-full px-1.5 py-1 bg-gray-800 border border-white/6 rounded text-xs font-mono text-gray-200 outline-none focus:border-indigo-500/50" /></td>
                      ))}
                      <td className="py-1 px-0.5"><select value={t.dir} onChange={e => tChange(i, 'dir', e.target.value)}
                        className="w-full px-1 py-1 bg-gray-800 border border-white/6 rounded text-xs font-mono text-gray-200 outline-none cursor-pointer">
                        <option value="R">R→</option><option value="L">L←</option></select></td>
                      <td className="py-1 px-0.5"><input value={t.next} onChange={e => tChange(i, 'next', e.target.value)}
                        className="w-full px-1.5 py-1 bg-gray-800 border border-white/6 rounded text-xs font-mono text-gray-200 outline-none focus:border-indigo-500/50" /></td>
                      <td className="py-1 text-center"><button onClick={() => tDel(i)} className="text-red-400/50 hover:text-red-400 transition">✕</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <button onClick={tAdd} className="w-full mt-2 py-2 rounded-lg border border-dashed border-white/10 text-gray-400 text-xs font-medium hover:border-indigo-500/30 hover:text-indigo-400 transition">+ Thêm luật</button>
            </div>
          </div>

          {/* ── RIGHT ── */}
          <div className="space-y-5">
            {/* Tape + Controls */}
            <div className="bg-gray-900/60 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex items-center gap-4 mb-5 flex-wrap">
                <div><span className="text-[9px] text-gray-500 uppercase tracking-wider block">Trạng thái</span><span className="font-mono text-xl font-bold text-indigo-400">{curState}</span></div>
                <span className="text-gray-600 text-lg">→</span>
                <div><span className="text-[9px] text-gray-500 uppercase tracking-wider block">Đọc</span><span className="font-mono text-xl font-bold text-cyan-400">{tape[head] === '_' ? '·' : (tape[head] || '·')}</span></div>
                <span className="text-gray-600 text-lg">→</span>
                <div><span className="text-[9px] text-gray-500 uppercase tracking-wider block">Bước</span><span className="font-mono text-xl font-bold text-emerald-400">{stepCount}</span></div>
              </div>

              <div className="flex justify-center mb-1"><div className="text-indigo-400 flex flex-col items-center" style={{ animation: 'bounce 2s infinite' }}><span className="text-[9px] font-bold tracking-wider">HEAD</span><span className="text-base">▼</span></div></div>

              <div className="overflow-x-auto pb-2"><div className="flex justify-center gap-1 min-w-max px-4">
                {tape.map((sym, i) => {
                  const isH = i === head; const isB = sym === '_'; return (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div className={`w-11 h-13 flex items-center justify-center rounded-lg font-mono text-lg font-bold border-2 transition-all duration-300 ${isH ? 'bg-indigo-500/20 border-indigo-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] scale-110' : isB ? 'bg-gray-800/50 border-white/5 text-gray-600' : 'bg-gray-800 border-white/8 text-gray-300'}`}>
                        {isB ? '·' : sym}
                      </div>
                      <span className={`text-[9px] font-mono ${isH ? 'text-indigo-400 font-bold' : 'text-gray-600'}`}>{i}</span>
                    </div>
                  );
                })}
              </div></div>

              <div className="flex items-center justify-center gap-3 mt-6">
                <button onClick={handleReset} className="w-10 h-10 rounded-lg bg-gray-800 border border-white/8 text-gray-400 hover:text-white hover:border-white/20 flex items-center justify-center transition" title="Reset">🔄</button>
                <button onClick={handleStep} disabled={done || isRunning} className="px-5 py-2.5 rounded-lg bg-gray-800 border border-indigo-500/20 text-indigo-400 text-sm font-semibold hover:bg-indigo-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-[0.97]">Bước</button>
                <button onClick={handleRun} disabled={done} className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition active:scale-[0.97] min-w-[140px] disabled:opacity-30 disabled:cursor-not-allowed ${isRunning ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-[0_4px_20px_rgba(239,68,68,0.3)]' : 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-[0_4px_20px_rgba(99,102,241,0.3)]'}`}>
                  {isRunning ? '⏸ Dừng' : '▶ Chạy'}
                </button>
              </div>

              <div className="flex items-center gap-3 mt-4 px-4">
                <span>🐢</span>
                <input type="range" min="50" max="1000" step="50" value={1050 - speed} onChange={e => setSpeed(1050 - Number(e.target.value))}
                  className="flex-1 h-1 bg-gray-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-400 [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(99,102,241,0.5)] [&::-webkit-slider-thumb]:cursor-pointer" />
                <span>⚡</span>
                <span className="text-[11px] font-mono text-indigo-400 min-w-[40px]">{speed}ms</span>
              </div>
            </div>

            {/* History */}
            <div className="bg-gray-900/60 border border-white/5 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold flex items-center gap-2"><span className="w-6 h-6 rounded bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-xs">📝</span>Lịch sử</h2>
                <span className="text-[10px] text-gray-500 font-mono">{history.length} bước</span>
              </div>
              <div className="max-h-[250px] overflow-y-auto space-y-1">
                {history.length === 0 && <p className="text-xs text-gray-500 italic text-center py-6">Chưa có bước nào. Nhấn "Bước" hoặc "Chạy" để bắt đầu.</p>}
                {history.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/40 border border-white/3 text-xs font-mono">
                    <span className="text-gray-500 min-w-[24px]">#{h.step}</span>
                    <span className="text-indigo-400 font-semibold">{h.state}</span>
                    <span className="text-gray-600">→</span>
                    <span className="text-cyan-400">{h.read === '_' ? '·' : h.read}</span>
                    <span className="text-gray-600">/</span>
                    <span className="text-emerald-400">{h.write === '_' ? '·' : h.write}</span>
                    <span className="text-amber-400">{h.dir}</span>
                    <span className="text-gray-600">→</span>
                    <span className="text-indigo-300">{h.next}</span>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              {done && (
                <div className={`mt-4 p-3 rounded-xl text-center text-sm font-semibold ${status === 'accepted' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : status === 'rejected' ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'}`}>
                  {status === 'accepted' && `✅ CHẤP NHẬN "${tapeInput}" sau ${stepCount} bước!`}
                  {status === 'rejected' && `❌ TỪ CHỐI "${tapeInput}" sau ${stepCount} bước.`}
                  {status === 'halted' && `⚠️ DỪNG — không tìm thấy luật phù hợp.`}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 text-center py-5 border-t border-white/5 text-xs text-gray-500">
        Nhóm 8 — Lý thuyết tính toán • Turing Machine Simulator
      </footer>
    </div>
  );
}
