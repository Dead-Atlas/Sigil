window.SigilAudio = (function(){
  let ctx = null;
  let muted = false;
  let master = null;
  let delayBus = null;

  function ensure(){
    if(ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;

    delayBus = ctx.createGain();
    delayBus.gain.value = 0.35;
    const delay = ctx.createDelay(1.0);
    delay.delayTime.value = 0.14;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.28;
    const delayFilter = ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.value = 2800;
    delayBus.connect(delay);
    delay.connect(delayFilter);
    delayFilter.connect(feedback);
    feedback.connect(delay);
    delayFilter.connect(master);

    master.connect(ctx.destination);
    return ctx;
  }

  function resume(){
    const c = ensure();
    if(c && c.state === 'suspended') c.resume();
  }

  function setMuted(v){
    muted = !!v;
    if(master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.5, ctx.currentTime, 0.03);
  }

  function isMuted(){ return muted; }

  function envGain(duration, peak, attack, release, wet){
    const c = ensure();
    if(!c || muted) return null;
    const g = c.createGain();
    const now = c.currentTime;
    const a = attack || 0.012;
    const r = release || 0.14;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), now + a);
    g.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(a + 0.03, duration - r));
    g.connect(master);
    if(wet && delayBus) g.connect(delayBus);
    return { g, now, c };
  }

  function tone(freq, duration, type, peak, slideTo, wet){
    const e = envGain(duration, peak || 0.16, 0.01, 0.12, wet);
    if(!e) return;
    const o = e.c.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, e.now);
    if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), e.now + duration * 0.9);
    o.connect(e.g);
    o.start(e.now);
    o.stop(e.now + duration + 0.05);
  }

  function chord(freqs, duration, type, peak){
    freqs.forEach((f, i) => {
      setTimeout(() => tone(f, duration, type || 'sine', (peak || 0.1) * (1 - i * 0.12), null, true), i * 28);
    });
  }

  function noiseBurst(duration, peak, bandFreq, type){
    const e = envGain(duration, peak || 0.12, 0.004, 0.1, false);
    if(!e) return;
    const len = Math.floor(e.c.sampleRate * duration);
    const buf = e.c.createBuffer(1, len, e.c.sampleRate);
    const data = buf.getChannelData(0);
    for(let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = e.c.createBufferSource();
    src.buffer = buf;
    const filter = e.c.createBiquadFilter();
    filter.type = type || 'bandpass';
    filter.frequency.value = bandFreq || 1200;
    filter.Q.value = type === 'lowpass' ? 0.5 : 1.1;
    src.connect(filter);
    filter.connect(e.g);
    src.start(e.now);
  }

  function sweep(from, to, duration, type, peak){
    const e = envGain(duration, peak || 0.14, 0.02, 0.18, true);
    if(!e) return;
    const o = e.c.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(from, e.now);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, to), e.now + duration);
    const f = e.c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(2200, e.now);
    f.frequency.exponentialRampToValueAtTime(600, e.now + duration);
    o.connect(f);
    f.connect(e.g);
    o.start(e.now);
    o.stop(e.now + duration + 0.04);
  }

  function clear(){
    resume();
    noiseBurst(0.12, 0.05, 4000, 'highpass');
    chord([523.25, 659.25, 783.99, 1046.5], 0.42, 'triangle', 0.11);
    setTimeout(() => tone(1318, 0.35, 'sine', 0.06, null, true), 160);
  }

  function cloak(){
    resume();
    noiseBurst(0.45, 0.1, 280, 'lowpass');
    sweep(220, 48, 0.7, 'sawtooth', 0.16);
    setTimeout(() => sweep(140, 40, 0.55, 'triangle', 0.08), 80);
    setTimeout(() => noiseBurst(0.3, 0.06, 180, 'lowpass'), 120);
  }

  function mirror(){
    resume();
    tone(640, 0.08, 'sine', 0.08);
    setTimeout(() => tone(640, 0.1, 'sine', 0.1, null, true), 70);
    setTimeout(() => chord([640, 960, 1280], 0.45, 'triangle', 0.1), 100);
    noiseBurst(0.08, 0.04, 5000, 'highpass');
  }

  function beam(){
    resume();
    sweep(180, 1400, 0.38, 'sine', 0.14);
    setTimeout(() => tone(1400, 0.25, 'triangle', 0.07, 900, true), 200);
    noiseBurst(0.15, 0.05, 3500, 'bandpass');
  }

  function still(){
    resume();
    noiseBurst(0.05, 0.22, 2800, 'bandpass');
    setTimeout(() => noiseBurst(0.04, 0.12, 1800, 'bandpass'), 40);
    tone(90, 0.35, 'square', 0.05);
    setTimeout(() => tone(60, 0.4, 'sine', 0.07), 30);
  }

  function ember(){
    resume();
    noiseBurst(0.5, 0.07, 700, 'bandpass');
    chord([196, 247, 311, 392], 0.55, 'sine', 0.09);
    setTimeout(() => sweep(250, 520, 0.45, 'triangle', 0.08), 100);
  }

  function rift(){
    resume();
    noiseBurst(0.1, 0.18, 2200);
    setTimeout(() => noiseBurst(0.08, 0.14, 900), 45);
    setTimeout(() => noiseBurst(0.12, 0.1, 1600), 90);
    tone(70, 0.22, 'sawtooth', 0.1, 160);
    setTimeout(() => tone(210, 0.15, 'square', 0.06, 80), 70);
    setTimeout(() => sweep(800, 120, 0.25, 'sawtooth', 0.07), 100);
  }

  function echo(){
    resume();
    const notes = [220, 220, 330, 220, 165];
    notes.forEach((n, i) => {
      setTimeout(() => tone(n, 0.55 - i * 0.05, 'sine', 0.1 - i * 0.015, null, true), i * 110);
    });
    noiseBurst(0.2, 0.04, 900, 'lowpass');
  }

  function prism(){
    resume();
    const scale = [523, 587, 659, 698, 784, 880, 988, 1175];
    scale.forEach((f, i) => {
      setTimeout(() => tone(f, 0.22, i % 2 ? 'triangle' : 'sine', 0.08, null, true), i * 38);
    });
    setTimeout(() => noiseBurst(0.2, 0.05, 4000, 'highpass'), 180);
  }

  function ink(){
    resume();
    noiseBurst(0.35, 0.1, 220, 'lowpass');
    sweep(140, 55, 0.65, 'triangle', 0.12);
    setTimeout(() => tone(90, 0.5, 'sine', 0.08, null, true), 80);
    setTimeout(() => noiseBurst(0.2, 0.05, 500, 'lowpass'), 150);
  }

  function web(){
    resume();
    sweep(600, 1800, 0.25, 'sine', 0.1);
    setTimeout(() => tone(1200, 0.2, 'triangle', 0.06, 400, true), 120);
    noiseBurst(0.15, 0.05, 3000, 'bandpass');
  }

  function metal(){
    resume();
    tone(80, 0.35, 'sawtooth', 0.14);
    noiseBurst(0.2, 0.12, 400, 'lowpass');
    setTimeout(() => tone(55, 0.4, 'square', 0.08), 60);
  }

  function spite(){
    resume();
    noiseBurst(0.1, 0.2, 2000);
    tone(60, 0.2, 'square', 0.12, 200);
    setTimeout(() => noiseBurst(0.15, 0.15, 900), 50);
    setTimeout(() => sweep(400, 80, 0.3, 'sawtooth', 0.1), 80);
  }

  function okay(){
    resume();
    chord([392, 494, 587], 0.4, 'sine', 0.1);
    tone(784, 0.3, 'triangle', 0.06, null, true);
  }

  function down(){
    resume();
    sweep(320, 70, 0.55, 'triangle', 0.12);
    noiseBurst(0.3, 0.07, 250, 'lowpass');
  }

  function twin(){
    resume();
    chord([523, 659, 784], 0.35, 'triangle', 0.09);
    setTimeout(() => chord([523, 659, 784], 0.4, 'sine', 0.07), 90);
  }

  function bind(){
    resume();
    noiseBurst(0.25, 0.14, 180, 'lowpass');
    tone(70, 0.5, 'sawtooth', 0.12);
    setTimeout(() => tone(50, 0.4, 'sine', 0.08), 100);
  }

  function pray(){
    resume();
    chord([261, 329, 392, 523], 0.7, 'sine', 0.1);
    setTimeout(() => tone(784, 0.5, 'triangle', 0.05, null, true), 200);
  }

  function orbit(){
    resume();
    sweep(300, 900, 0.35, 'sine', 0.1);
    setTimeout(() => sweep(900, 300, 0.35, 'triangle', 0.08), 150);
  }

  function storm(){
    resume();
    noiseBurst(0.2, 0.16, 1500);
    setTimeout(() => noiseBurst(0.15, 0.12, 800), 60);
    sweep(200, 80, 0.4, 'sawtooth', 0.12);
    setTimeout(() => tone(1000, 0.1, 'square', 0.05), 100);
  }

  function voidx(){
    resume();
    sweep(400, 60, 0.55, 'sine', 0.12);
    noiseBurst(0.35, 0.08, 200, 'lowpass');
    setTimeout(() => tone(80, 0.4, 'triangle', 0.07, null, true), 100);
  }

  function spark(){
    resume();
    tone(1200, 0.08, 'square', 0.06);
    setTimeout(() => tone(1800, 0.1, 'sine', 0.05), 40);
    setTimeout(() => tone(900, 0.12, 'triangle', 0.05), 90);
    noiseBurst(0.1, 0.05, 4000, 'highpass');
  }

  function boost(){
    resume();
    chord([196, 247, 311, 392, 494], 0.45, 'sawtooth', 0.08);
    sweep(150, 600, 0.35, 'triangle', 0.1);
  }

  function balance(){
    resume();
    tone(220, 0.25, 'sine', 0.09);
    setTimeout(() => tone(330, 0.3, 'triangle', 0.09, null, true), 100);
    setTimeout(() => chord([220, 330, 440], 0.4, 'sine', 0.07), 180);
  }

  function aim(){
    resume();
    tone(880, 0.06, 'square', 0.05);
    setTimeout(() => sweep(400, 1200, 0.28, 'sine', 0.1), 40);
    setTimeout(() => tone(1200, 0.15, 'triangle', 0.06), 200);
  }

  function cat(){
    resume();
    sweep(420, 780, 0.16, 'sine', 0.13);
    setTimeout(() => sweep(780, 280, 0.38, 'triangle', 0.12), 120);
    setTimeout(() => tone(210, 0.22, 'sine', 0.05, null, true), 260);
    noiseBurst(0.12, 0.03, 1800, 'bandpass');
  }

  function dog(){
    resume();
    noiseBurst(0.08, 0.16, 600, 'bandpass');
    tone(180, 0.12, 'sawtooth', 0.12, 120);
    setTimeout(() => {
      noiseBurst(0.07, 0.14, 500, 'bandpass');
      tone(150, 0.14, 'sawtooth', 0.1, 90);
    }, 140);
  }

  function cow(){
    resume();
    sweep(140, 95, 0.55, 'sawtooth', 0.14);
    setTimeout(() => sweep(110, 80, 0.7, 'triangle', 0.1), 200);
    noiseBurst(0.35, 0.05, 200, 'lowpass');
  }

  function piano(){
    resume();
    chord([261.63, 329.63, 392.0, 523.25], 0.55, 'triangle', 0.1);
    setTimeout(() => tone(659.25, 0.35, 'sine', 0.06, null, true), 160);
  }

  function bloom(){
    resume();
    chord([392, 494, 587, 740], 0.5, 'sine', 0.09);
    setTimeout(() => sweep(500, 900, 0.4, 'triangle', 0.07), 80);
  }

  function tide(){
    resume();
    sweep(180, 320, 0.55, 'sine', 0.12);
    setTimeout(() => sweep(320, 160, 0.5, 'triangle', 0.08), 200);
    noiseBurst(0.3, 0.04, 400, 'lowpass');
  }

  function coil(){
    resume();
    sweep(220, 660, 0.45, 'sawtooth', 0.1);
    setTimeout(() => chord([330, 415, 550], 0.4, 'triangle', 0.08), 120);
  }

  function sink(){
    resume();
    sweep(200, 60, 0.65, 'sawtooth', 0.14);
    noiseBurst(0.4, 0.08, 180, 'lowpass');
    setTimeout(() => tone(50, 0.4, 'sine', 0.08), 100);
  }

  function pianoNote(freq, isBlack){
    const e = envGain(isBlack ? 0.38 : 0.55, isBlack ? 0.14 : 0.18, 0.008, isBlack ? 0.22 : 0.32, true);
    if(!e) return;
    const o1 = e.c.createOscillator();
    const o2 = e.c.createOscillator();
    o1.type = 'triangle';
    o2.type = 'sine';
    o1.frequency.setValueAtTime(freq, e.now);
    o2.frequency.setValueAtTime(freq * 2, e.now);
    const f = e.c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(isBlack ? 2200 : 3200, e.now);
    f.frequency.exponentialRampToValueAtTime(600, e.now + 0.4);
    const g2 = e.c.createGain();
    g2.gain.value = 0.22;
    o1.connect(f);
    o2.connect(g2);
    g2.connect(f);
    f.connect(e.g);
    o1.start(e.now);
    o2.start(e.now);
    o1.stop(e.now + 0.7);
    o2.stop(e.now + 0.7);
  }

  function ui(){
    resume();
    tone(880, 0.05, 'sine', 0.045);
    setTimeout(() => tone(1320, 0.08, 'triangle', 0.035), 30);
  }

  function boot(){
    resume();
    sweep(90, 280, 0.4, 'sine', 0.1);
    setTimeout(() => chord([280, 350, 420], 0.5, 'triangle', 0.08), 180);
  }

  function transitionWhoosh(){
    resume();
    noiseBurst(0.22, 0.08, 1200, 'bandpass');
    sweep(400, 120, 0.28, 'sawtooth', 0.06);
  }

  const map = {
    clear, cloak, mirror, beam, still, ember, rift, echo, prism, ink,
    web, metal, spite, okay, down, twin, bind, pray, orbit, storm,
    void: voidx, spark, boost, balance, aim, cat, dog, cow, piano,
    bloom, tide, coil, sink
  };

  function playMode(mode){
    transitionWhoosh();
    if(map[mode]) setTimeout(() => map[mode](), 40);
    else ui();
  }

  return {
    ensure, resume, setMuted, isMuted, playMode, ui, boot, pianoNote,
    clear, cloak, mirror, beam, still, ember, rift, echo, prism, ink,
    web, metal, spite, okay, down, twin, bind, pray, orbit, storm,
    void: voidx, spark, boost, balance, aim, cat, dog, cow, piano,
    bloom, tide, coil, sink
  };
})();
