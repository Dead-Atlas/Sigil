(function(){
  const MODE_META = {
    clear:  { label: 'Reveal',  en: 'reveal',  hands: 1 },
    cloak:  { label: 'Phantom', en: 'phantom', hands: 1 },
    beam:   { label: 'Beam',    en: 'beam',    hands: 1 },
    mirror: { label: 'Mirror',  en: 'mirror',  hands: 1 },
    rift:   { label: 'Rift',    en: 'rift',    hands: 1 },
    prism:  { label: 'Prism',   en: 'prism',   hands: 1 },
    still:  { label: 'Still',   en: 'still',   hands: 1 },
    down:   { label: 'Down',    en: 'down',    hands: 1 },
    ember:  { label: 'Ember',   en: 'ember',   hands: 1 },
    okay:   { label: 'Okay',    en: 'okay',    hands: 1 },
    void:   { label: 'Void',    en: 'void',    hands: 1 },
    echo:   { label: 'Echo',    en: 'echo',    hands: 1 },
    spark:  { label: 'Spark',   en: 'spark',   hands: 1 },
    web:    { label: 'Web',     en: 'web',     hands: 1 },
    metal:  { label: 'Horns',   en: 'metal',   hands: 1 },
    spite:  { label: 'Spite',   en: 'spite',   hands: 1 },
    ink:    { label: 'Ink',     en: 'ink',     hands: 1 },
    bloom:  { label: 'Bloom',   en: 'bloom',   hands: 1 },
    tide:   { label: 'Tide',    en: 'tide',    hands: 1 },
    coil:   { label: 'Coil',    en: 'coil',    hands: 1 },
    twin:   { label: 'Twin',    en: 'twin',    hands: 2 },
    bind:   { label: 'Bind',    en: 'bind',    hands: 2 },
    boost:  { label: 'Boost',   en: 'boost',   hands: 2 },
    sink:   { label: 'Sink',    en: 'sink',    hands: 2 },
    balance:{ label: 'Balance', en: 'balance', hands: 2 },
    aim:    { label: 'Aim',     en: 'aim',     hands: 2 },
    pray:   { label: 'Pray',    en: 'pray',    hands: 2 },
    orbit:  { label: 'Orbit',   en: 'orbit',   hands: 2 },
    storm:  { label: 'Storm',   en: 'storm',   hands: 2 },
    cat:    { label: 'Cat',     en: 'cat',     hands: 0 },
    dog:    { label: 'Dog',     en: 'dog',     hands: 0 },
    cow:    { label: 'Cow',     en: 'cow',     hands: 0 },
    piano:  { label: 'Keys',    en: 'piano',   hands: 2 }
  };

  const ONE_HAND_ORDER = [
    'beam','mirror','rift','prism','clear',
    'cloak','still','down','ember','okay',
    'void','spark','echo','metal','web',
    'spite','ink','bloom','tide','coil'
  ];
  const TWO_HAND_ORDER = [
    'piano','twin','bind','boost','sink',
    'balance','aim','pray','orbit','storm'
  ];

  const HAND_CONNECTIONS = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [0,9],[9,10],[10,11],[11,12],
    [0,13],[13,14],[14,15],[15,16],
    [0,17],[17,18],[18,19],[19,20],
    [5,9],[9,13],[13,17]
  ];

  const video = document.getElementById('video');
  const outputCanvas = document.getElementById('output');
  const outCtx = outputCanvas.getContext('2d', { alpha: false });
  const workCanvas = document.getElementById('work');
  const workCtx = workCanvas.getContext('2d', { alpha: false });
  const bgCanvas = document.getElementById('bg');
  const bgCtx = bgCanvas.getContext('2d', { alpha: false });
  const tmpCanvas = document.getElementById('tmp');
  const tmpCtx = tmpCanvas.getContext('2d', { willReadFrequently: true });
  const maskCanvas = document.getElementById('mask');
  const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
  const gradeCanvas = document.getElementById('grade');
  const gradeCtx = gradeCanvas.getContext('2d', { willReadFrequently: true });
  const freezeCanvas = document.getElementById('freeze');
  const freezeCtx = freezeCanvas.getContext('2d', { alpha: false });
  const trailCanvas = document.getElementById('trail');
  const trailCtx = trailCanvas.getContext('2d', { alpha: false });
  const xfadeCanvas = document.createElement('canvas');
  const xfadeCtx = xfadeCanvas.getContext('2d', { alpha: false });

  const stage = document.getElementById('stage');
  const startOverlay = document.getElementById('startOverlay');
  const startBtn = document.getElementById('startBtn');
  const resetBgBtn = document.getElementById('resetBgBtn');
  const stopBtn = document.getElementById('stopBtn');
  const muteBtn = document.getElementById('muteBtn');
  const scanline = document.getElementById('scanline');
  const calibrateBanner = document.getElementById('calibrateBanner');
  const flash = document.getElementById('flash');
  const flashTitle = document.getElementById('flashTitle');
  const modeLabel = document.getElementById('modeLabel');
  const modeLine = document.querySelector('.mode-line');
  const sigilDock = document.getElementById('sigilDock');

  const bgStatusEl = document.getElementById('bgStatus');
  const gestureStatusEl = document.getElementById('gestureStatus');
  const invStatusEl = document.getElementById('invStatus');
  const handTag = document.getElementById('handTag');
  const stateTag = document.getElementById('stateTag');

  let W = 640, H = 480;
  let stream = null;
  let running = false;
  let mode = 'clear';
  let phase = 'idle';
  let bgFrozen = false;
  let emptyStreak = 0;
  const EMPTY_NEED = 10;
  const CONFIRM_NEED = 16;
  const PERSON_MAX = 0.05;
  let calibStage = 'wait';
  const bgHoldCanvas = document.createElement('canvas');
  const bgHoldCtx = bgHoldCanvas.getContext('2d', { alpha: false });
  let bgHoldReady = false; 

  let latestSegMask = null;
  let latestLandmarksList = [];
  let handsModel = null;
  let segModel = null;
  let processingHands = false;
  let processingSeg = false;
  let processingFace = false;
  let faceModel = null;
  let latestFaceMesh = null; 
  let smoothFace = null;
  const animalMasks = { cat: null, dog: null, cow: null };
  
  const ANIMAL_MASK_CFG = {
    cat: { noseX: 0.499, noseY: 0.727, earSpan: 0.788, widthMul: 1.12 },
    dog: { noseX: 0.497, noseY: 0.734, earSpan: 0.701, widthMul: 1.28 },
    cow: { noseX: 0.493, noseY: 0.806, earSpan: 0.820, widthMul: 1.18 }
  };

  (function preloadAnimalMasks(){
    ['cat', 'dog', 'cow'].forEach(kind => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { animalMasks[kind] = img; };
      img.src = 'assets/masks/' + kind + '.png';
    });
  })();

  let modeVotes = {};
  const VOTE_NEED = 3;
  let lastModeChange = 0;
  const MODE_COOLDOWN = 800;
  let pendingGesture = null;
  let pendingSince = 0;
  const CONFIRM_MS = 340;

  let gainR = 1, gainG = 1, gainB = 1;
  let riftTick = 0;
  let freezeReady = false;
  let trailReady = false;
  let pianoTipLatch = Object.create(null);
  let pianoGlow = Object.create(null);
  let pianoExitArmed = false;
  let transitionUntil = 0;
  const TRANSITION_MS = 480;

  function setSize(w, h){
    W = w; H = h;
    [outputCanvas, workCanvas, bgCanvas, tmpCanvas, maskCanvas, gradeCanvas, freezeCanvas, trailCanvas, xfadeCanvas, bgHoldCanvas]
      .forEach(c => { c.width = W; c.height = H; });
    stage.style.aspectRatio = W + ' / ' + H;
  }

  function setControlsEnabled(on){
    resetBgBtn.disabled = !on;
    stopBtn.disabled = !on;
    muteBtn.disabled = !on;
    sigilDock.querySelectorAll('.sigil').forEach(btn => { btn.disabled = !on; });
  }

  function triggerFlash(modeId){
    const meta = MODE_META[modeId] || MODE_META.clear;
    flash.dataset.fx = modeId || 'clear';
    flashTitle.textContent = meta.label;
    flash.classList.remove('pop');
    void flash.offsetWidth;
    flash.classList.add('pop');
    stage.classList.remove('is-morphing');
    void stage.offsetWidth;
    stage.classList.add('is-morphing');
    setTimeout(() => stage.classList.remove('is-morphing'), 560);
  }

  function beginVisualTransition(){
    try{
      xfadeCtx.drawImage(outputCanvas, 0, 0, W, H);
      transitionUntil = performance.now() + TRANSITION_MS;
    }catch(e){
      transitionUntil = 0;
    }
  }

  function applyTransitionOverlay(){
    const now = performance.now();
    if(now >= transitionUntil) return;
    const t = 1 - (transitionUntil - now) / TRANSITION_MS;
    const ease = t * t * (3 - 2 * t);
    outCtx.save();
    outCtx.globalAlpha = 1 - ease;
    outCtx.drawImage(xfadeCanvas, 0, 0, W, H);

    if(ease < 0.55){
      const wipe = Math.floor(W * (ease / 0.55));
      outCtx.globalAlpha = 0.35 * (1 - ease / 0.55);
      outCtx.fillStyle = 'rgba(243,232,212,0.9)';
      outCtx.fillRect(wipe - 18, 0, 36, H);
    }
    outCtx.restore();
  }

  function setMode(next, fromGesture){
    if(!next || !MODE_META[next]) return;
    if(phase !== 'ready' && next !== 'clear') return;
    const now = performance.now();
    if(next === mode && fromGesture) return;
    if(fromGesture && now - lastModeChange < MODE_COOLDOWN) return;

    const prev = mode;
    if(prev !== next && phase === 'ready') beginVisualTransition();

    mode = next;
    lastModeChange = now;
    modeVotes = {};

    stage.dataset.mode = mode;
    const meta = MODE_META[mode];
    modeLabel.textContent = meta.label;
    stateTag.textContent = meta.en;
    stateTag.classList.toggle('state-on', mode !== 'clear');
    invStatusEl.textContent = meta.label;
    invStatusEl.className = 'status ' + (mode === 'clear' ? 'ok' : 'on');

    modeLine.classList.remove('is-hot');
    void modeLine.offsetWidth;
    modeLine.classList.add('is-hot');

    sigilDock.querySelectorAll('.sigil').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.mode === mode);
    });

    if(mode === 'still'){
      freezeCtx.drawImage(video, 0, 0, W, H);
      freezeReady = true;
    }
    if(mode === 'echo'){
      trailCtx.fillStyle = '#000';
      trailCtx.fillRect(0, 0, W, H);
      trailCtx.drawImage(video, 0, 0, W, H);
      trailReady = true;
    }
    if(mode === 'piano' || prev === 'piano'){
      pianoTipLatch = Object.create(null);
      pianoGlow = Object.create(null);
      pianoExitArmed = false;
    }
    if(mode !== 'cat' && mode !== 'dog' && mode !== 'cow'){
      smoothFace = null;
    }

    if(prev !== mode){
      triggerFlash(mode);
      if(window.SigilAudio) SigilAudio.playMode(mode);
    }
  }

  function dist(a, b){
    const dx = a.x - b.x, dy = a.y - b.y, dz = (a.z || 0) - (b.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function fingerExtended(lm, tip, pip, mcp){
    const wrist = lm[0];
    const longEnough = dist(lm[tip], wrist) > dist(lm[pip], wrist) * 1.05;
    const pastMcp = dist(lm[tip], wrist) > dist(lm[mcp], wrist) * 1.12;
    return longEnough && pastMcp;
  }

  function fingerCurled(lm, tip, pip, mcp){
    const wrist = lm[0];
    const tipNear = dist(lm[tip], wrist) < dist(lm[mcp], wrist) * 1.25;
    const folded = dist(lm[tip], lm[mcp]) < dist(lm[pip], lm[mcp]) * 1.35;
    return tipNear || folded;
  }

  function thumbExtended(lm){
    return dist(lm[4], lm[9]) > dist(lm[2], lm[9]) * 1.05 &&
           dist(lm[4], lm[5]) > 0.07;
  }

  function thumbUp(lm){
    const tipAbove = lm[4].y < lm[2].y - 0.04;
    const out = dist(lm[4], lm[5]) > 0.08;
    return tipAbove && out;
  }

  function thumbDown(lm){
    return lm[4].y > lm[2].y + 0.05 && dist(lm[4], lm[5]) > 0.07;
  }

  function fingerState(lm){
    return {
      idx: fingerExtended(lm, 8, 6, 5),
      mid: fingerExtended(lm, 12, 10, 9),
      rng: fingerExtended(lm, 16, 14, 13),
      pnk: fingerExtended(lm, 20, 18, 17),
      idxDown: fingerCurled(lm, 8, 6, 5),
      midDown: fingerCurled(lm, 12, 10, 9),
      rngDown: fingerCurled(lm, 16, 14, 13),
      pnkDown: fingerCurled(lm, 20, 18, 17),
      thumb: thumbExtended(lm),
      tUp: thumbUp(lm),
      tDown: thumbDown(lm),
      okPinch: dist(lm[4], lm[8]) < 0.055
    };
  }

  function classifyOne(lm){
    const s = fingerState(lm);
    const upCount = [s.idx, s.mid, s.rng, s.pnk].filter(Boolean).length;

    if(s.okPinch && !s.mid && !s.rng && !s.pnk) return 'void';
    if(s.okPinch && (s.mid || s.rng || s.pnk)) return 'okay';
    if(!s.idx && s.mid && !s.rng && !s.pnk && !s.thumb) return 'spite';
    if(!s.idx && !s.mid && s.rng && s.pnk && !s.thumb) return 'ink';
    if(!s.idx && s.mid && s.rng && !s.pnk && !s.thumb) return 'coil';
    if(!s.idx && !s.mid && !s.rng && s.pnk) return 'spark';
    if(s.idx && s.pnk && !s.mid && !s.rng && s.thumb) return 'web';
    if(s.idx && s.pnk && !s.mid && !s.rng && !s.thumb) return 'metal';
    if(s.thumb && s.pnk && !s.idx && !s.mid && !s.rng) return 'echo';
    if(s.idx && s.mid && s.rng && s.pnk && !s.thumb) return 'prism';
    if(s.idx && s.mid && s.rng && !s.pnk && s.thumb) return 'tide';
    if(s.idx && s.mid && s.rng && !s.pnk && !s.thumb) return 'rift';
    if(s.idx && s.mid && !s.rng && !s.pnk && s.thumb) return 'bloom';
    if(s.idx && s.mid && !s.rng && !s.pnk && !s.thumb) return 'mirror';
    if(s.idx && !s.mid && !s.rng && !s.pnk && s.thumb && s.midDown) return 'ember';
    if(s.idx && !s.mid && !s.rng && !s.pnk && !s.thumb && s.midDown) return 'beam';
    if(s.tDown && upCount === 0) return 'down';
    if(s.tUp && upCount === 0) return 'still';
    if(upCount >= 4 && s.thumb) return 'clear';
    if(upCount === 0 && !s.tUp && !s.tDown && !s.thumb) return 'cloak';
    return null;
  }

  function isPalmDownOpen(lm){
    const s = fingerState(lm);
    const upCount = [s.idx, s.mid, s.rng, s.pnk].filter(Boolean).length;
    if(upCount < 3) return false;
    const tipY = (lm[8].y + lm[12].y + lm[16].y + lm[20].y) / 4;
    
    return tipY > lm[0].y + 0.025;
  }

  function detectTwoHand(a, b){
    const ga = classifyOne(a);
    const gb = classifyOne(b);
    const wristDist = dist(a[0], b[0]);
    const tipDist = dist(a[8], b[8]);

    
    if(isPalmDownOpen(a) && isPalmDownOpen(b)) return 'piano';

    if(!ga || !gb) return null;

    if(wristDist < 0.2 && ga === 'clear' && gb === 'clear') return 'pray';
    if(ga === 'cloak' && gb === 'cloak') return 'bind';
    if(ga === 'still' && gb === 'still') return 'boost';
    if(ga === 'down' && gb === 'down') return 'sink';
    if((ga === 'clear' && gb === 'cloak') || (ga === 'cloak' && gb === 'clear')) return 'balance';
    if(ga === 'beam' && gb === 'beam') return 'aim';
    if(ga === 'clear' && gb === 'clear') return 'twin';
    if(ga === 'mirror' && gb === 'mirror') return 'orbit';
    if((ga === 'web' || ga === 'metal') && (gb === 'web' || gb === 'metal')) return 'storm';
    if(tipDist < 0.16 && (ga === 'beam' || ga === 'ember') && (gb === 'beam' || gb === 'ember')) return 'pray';
    return null;
  }

  function meanTips(lm){
    const ids = [4, 8, 12, 16, 20];
    let x = 0, y = 0;
    for(let i = 0; i < ids.length; i++){
      x += lm[ids[i]].x;
      y += lm[ids[i]].y;
    }
    return { x: x / ids.length, y: y / ids.length };
  }

  function isTwoHandCircle(a, b){
    if(isPalmDownOpen(a) && isPalmDownOpen(b)) return false;

    const aw = a[0], bw = b[0];
    const wristDist = dist(aw, bw);
    if(wristDist < 0.12 || wristDist > 0.65) return false;
    if(Math.abs(aw.x - bw.x) < 0.07) return false;
    if(Math.abs(aw.y - bw.y) > 0.28) return false;

    const mid = { x: (aw.x + bw.x) * 0.5, y: (aw.y + bw.y) * 0.5 };
    if(mid.y > 0.78) return false;

    const ca = meanTips(a);
    const cb = meanTips(b);
    const tipGap = Math.hypot(ca.x - cb.x, ca.y - cb.y);
    if(tipGap < 0.035 || tipGap > wristDist * 0.9) return false;

    const wristToMidA = Math.hypot(aw.x - mid.x, aw.y - mid.y);
    const wristToMidB = Math.hypot(bw.x - mid.x, bw.y - mid.y);
    const tipToMidA = Math.hypot(ca.x - mid.x, ca.y - mid.y);
    const tipToMidB = Math.hypot(cb.x - mid.x, cb.y - mid.y);
    if(tipToMidA > wristToMidA * 0.95) return false;
    if(tipToMidB > wristToMidB * 0.95) return false;

    const tipIdx = [4, 8, 12, 16, 20];
    const tips = [];
    for(let t = 0; t < tipIdx.length; t++){
      tips.push(a[tipIdx[t]], b[tipIdx[t]]);
    }
    let rSum = 0;
    const rs = new Array(tips.length);
    for(let i = 0; i < tips.length; i++){
      rs[i] = Math.hypot(tips[i].x - mid.x, tips[i].y - mid.y);
      rSum += rs[i];
    }
    const rMean = rSum / tips.length;
    if(rMean < 0.06 || rMean > 0.34) return false;

    let varSum = 0;
    for(let i = 0; i < rs.length; i++){
      const d0 = rs[i] - rMean;
      varSum += d0 * d0;
    }
    if(Math.sqrt(varSum / rs.length) / rMean > 0.48) return false;

    const openCount = (lm) => {
      const s = fingerState(lm);
      return [s.idx, s.mid, s.rng, s.pnk].filter(Boolean).length;
    };
    if(openCount(a) < 1 || openCount(b) < 1) return false;

    const aPoint = fingerExtended(a, 8, 6, 5) && !fingerExtended(a, 12, 10, 9) && !fingerExtended(a, 16, 14, 13);
    const bPoint = fingerExtended(b, 8, 6, 5) && !fingerExtended(b, 12, 10, 9) && !fingerExtended(b, 16, 14, 13);
    if(aPoint && bPoint) return false;

    return true;
  }

  function detectGestureFromHands(multi){
    if(!multi || !multi.length){
      pianoExitArmed = false;
      return null;
    }
    if(multi.length >= 2){
      if(mode === 'piano' && isTwoHandCircle(multi[0], multi[1])){
        pianoExitArmed = true;
        return 'xout';
      }
      pianoExitArmed = false;
      const two = detectTwoHand(multi[0], multi[1]);
      if(two) return two;
    } else {
      pianoExitArmed = false;
    }
    return classifyOne(multi[0]);
  }

  
  function voteMode(next){
    if(!next){
      modeVotes = {};
      pendingGesture = null;
      return;
    }
    if(mode === 'piano'){
      if(next === 'piano'){
        modeVotes = {};
        pendingGesture = null;
        return;
      }
      if(next !== 'xout') return;
    }

    modeVotes[next] = (modeVotes[next] || 0) + 1;
    Object.keys(modeVotes).forEach(k => {
      if(k !== next) modeVotes[k] = Math.max(0, (modeVotes[k] || 0) - 1);
    });

    const need = next === 'xout' ? 2 : VOTE_NEED;
    if(modeVotes[next] < need){
      if(pendingGesture && pendingGesture !== next) pendingGesture = null;
      return;
    }

    if(pendingGesture !== next){
      pendingGesture = next;
      pendingSince = performance.now();
      return;
    }

    const confirm = next === 'xout' ? 160 : CONFIRM_MS;
    if(performance.now() - pendingSince >= confirm){
      if(next === 'xout') setMode('clear', true);
      else setMode(next, true);
      pendingGesture = null;
      modeVotes = {};
    }
  }
  function sampleMeanRGB(ctx){
    const step = 16;
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    let r = 0, g = 0, b = 0, n = 0;
    for(let y = 0; y < H; y += step){
      for(let x = 0; x < W; x += step){
        const i = (y * W + x) * 4;
        r += d[i]; g += d[i + 1]; b += d[i + 2];
        n++;
      }
    }
    return { r: r / n, g: g / n, b: b / n };
  }

  function sampleMeanRGBMasked(srcCtx, maskData, personThreshold, wantPerson){
    const step = 12;
    const img = srcCtx.getImageData(0, 0, W, H);
    const d = img.data;
    const m = maskData;
    let r = 0, g = 0, b = 0, n = 0;
    for(let y = 0; y < H; y += step){
      for(let x = 0; x < W; x += step){
        const i = (y * W + x) * 4;
        const isPerson = Math.max(m[i], m[i + 3]) > personThreshold;
        if(isPerson !== wantPerson) continue;
        r += d[i]; g += d[i + 1]; b += d[i + 2];
        n++;
      }
    }
    if(n < 8) return null;
    return { r: r / n, g: g / n, b: b / n };
  }

  function clampGain(v){
    return Math.min(1.45, Math.max(0.65, v));
  }

  function updateColorGains(){
    tmpCtx.clearRect(0, 0, W, H);
    tmpCtx.drawImage(latestSegMask, 0, 0, W, H);
    const maskData = tmpCtx.getImageData(0, 0, W, H).data;
    workCtx.drawImage(video, 0, 0, W, H);
    const liveMean = sampleMeanRGBMasked(workCtx, maskData, 80, false);
    const bgMean = sampleMeanRGBMasked(bgCtx, maskData, 80, false);
    if(liveMean && bgMean){
      gainR = clampGain(liveMean.r / Math.max(bgMean.r, 1));
      gainG = clampGain(liveMean.g / Math.max(bgMean.g, 1));
      gainB = clampGain(liveMean.b / Math.max(bgMean.b, 1));
    } else {
      const L = sampleMeanRGB(workCtx);
      gradeCtx.drawImage(bgCanvas, 0, 0, W, H);
      const B = sampleMeanRGB(gradeCtx);
      gainR = clampGain(L.r / Math.max(B.r, 1));
      gainG = clampGain(L.g / Math.max(B.g, 1));
      gainB = clampGain(L.b / Math.max(B.b, 1));
    }
  }

  function buildColorMatchedBg(){
    gradeCtx.drawImage(bgCanvas, 0, 0, W, H);
    const img = gradeCtx.getImageData(0, 0, W, H);
    const d = img.data;
    for(let i = 0; i < d.length; i += 4){
      d[i] = Math.min(255, d[i] * gainR);
      d[i + 1] = Math.min(255, d[i + 1] * gainG);
      d[i + 2] = Math.min(255, d[i + 2] * gainB);
    }
    gradeCtx.putImageData(img, 0, 0);
  }

  function hardenPersonMask(srcMask){
    maskCtx.clearRect(0, 0, W, H);
    maskCtx.filter = 'blur(2px)';
    maskCtx.drawImage(srcMask, 0, 0, W, H);
    maskCtx.filter = 'none';
    const img = maskCtx.getImageData(0, 0, W, H);
    const d = img.data;
    for(let i = 0; i < d.length; i += 4){
      const on = Math.max(d[i], d[i + 1], d[i + 2], d[i + 3]) > 100 ? 255 : 0;
      d[i] = d[i + 1] = d[i + 2] = 255;
      d[i + 3] = on;
    }
    maskCtx.putImageData(img, 0, 0);
  }

  function drawLiveBase(){
    outCtx.drawImage(video, 0, 0, W, H);
  }

  
  const PIANO_WHITE_MIDI = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79];
  
  const PIANO_BLACK_AFTER = { 0:61, 1:63, 3:66, 4:68, 5:70, 7:73, 8:75, 10:78 };

  function midiToFreq(m){
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  function getPianoLayout(){
    const marginX = W * 0.05;
    const y0 = H * 0.62;
    const h = H * 0.34;
    const totalW = W - marginX * 2;
    const n = PIANO_WHITE_MIDI.length;
    const ww = totalW / n;
    const whites = [];
    for(let i = 0; i < n; i++){
      whites.push({
        id: 'w' + i,
        midi: PIANO_WHITE_MIDI[i],
        x: marginX + i * ww,
        y: y0,
        w: ww,
        h: h,
        black: false
      });
    }
    const blacks = [];
    const bw = ww * 0.58;
    const bh = h * 0.58;
    Object.keys(PIANO_BLACK_AFTER).forEach(k => {
      const i = +k;
      const wx = whites[i].x + whites[i].w;
      blacks.push({
        id: 'b' + i,
        midi: PIANO_BLACK_AFTER[i],
        x: wx - bw / 2,
        y: y0,
        w: bw,
        h: bh,
        black: true
      });
    });
    return { y0, h, marginX, totalW, whites, blacks, all: blacks.concat(whites) };
  }

  function hitPianoKey(layout, px, py){
    if(py < layout.y0 || py > layout.y0 + layout.h) return null;
    for(let i = 0; i < layout.blacks.length; i++){
      const k = layout.blacks[i];
      if(px >= k.x && px <= k.x + k.w && py <= k.y + k.h) return k;
    }
    for(let i = 0; i < layout.whites.length; i++){
      const k = layout.whites[i];
      if(px >= k.x && px <= k.x + k.w) return k;
    }
    return null;
  }

  function processPianoHits(layout){
    const now = performance.now();
    const seen = Object.create(null);

    for(let h = 0; h < latestLandmarksList.length; h++){
      const lm = latestLandmarksList[h];
      const id = h + ':8';
      const tip = lm[8];
      const pip = lm[6];
      const px = tip.x * W;
      const py = tip.y * H;
      seen[id] = 1;

      
      const straight = fingerExtended(lm, 8, 6, 5);
      const bentDown = tip.y > pip.y + 0.01;
      const tipFolded = dist(tip, lm[5]) < dist(pip, lm[5]) * 1.45;
      const pressing = !straight && (bentDown || tipFolded);

      if(!pressing || py < layout.y0 - 4 || py > layout.y0 + layout.h){
        delete pianoTipLatch[id];
        continue;
      }

      const key = hitPianoKey(layout, px, py);
      if(!key){
        delete pianoTipLatch[id];
        continue;
      }

      if(pianoTipLatch[id] !== key.id){
        pianoTipLatch[id] = key.id;
        pianoGlow[key.id] = now + 180;
        if(window.SigilAudio && SigilAudio.pianoNote){
          SigilAudio.pianoNote(midiToFreq(key.midi), key.black);
        }
      }
    }

    Object.keys(pianoTipLatch).forEach(id => {
      if(!seen[id]) delete pianoTipLatch[id];
    });
  }

  function drawPianoKeyboard(layout){
    const now = performance.now();
    const { y0, h, whites, blacks } = layout;

    
    outCtx.fillStyle = 'rgba(12,10,8,0.55)';
    outCtx.fillRect(0, y0 - 14, W, H - y0 + 14);
    const wood = outCtx.createLinearGradient(0, y0 - 12, 0, y0);
    wood.addColorStop(0, 'rgba(60,40,22,0)');
    wood.addColorStop(1, 'rgba(70,48,28,0.95)');
    outCtx.fillStyle = wood;
    outCtx.fillRect(layout.marginX - 6, y0 - 10, layout.totalW + 12, 12);

    
    for(let i = 0; i < whites.length; i++){
      const k = whites[i];
      const lit = (pianoGlow[k.id] || 0) > now;
      const g = outCtx.createLinearGradient(k.x, k.y, k.x, k.y + k.h);
      if(lit){
        g.addColorStop(0, '#fff6e0');
        g.addColorStop(1, '#e8c878');
      } else {
        g.addColorStop(0, '#f3e8d4');
        g.addColorStop(1, '#d4c4a8');
      }
      outCtx.fillStyle = g;
      outCtx.fillRect(k.x + 1, k.y, k.w - 2, k.h - 4);
      outCtx.strokeStyle = 'rgba(40,28,16,0.55)';
      outCtx.lineWidth = 1;
      outCtx.strokeRect(k.x + 1, k.y, k.w - 2, k.h - 4);
      if(lit){
        outCtx.fillStyle = 'rgba(255,220,140,0.35)';
        outCtx.fillRect(k.x + 1, k.y, k.w - 2, k.h - 4);
      }
    }

    
    for(let i = 0; i < blacks.length; i++){
      const k = blacks[i];
      const lit = (pianoGlow[k.id] || 0) > now;
      const g = outCtx.createLinearGradient(k.x, k.y, k.x, k.y + k.h);
      if(lit){
        g.addColorStop(0, '#5a4630');
        g.addColorStop(1, '#c9a05a');
      } else {
        g.addColorStop(0, '#2a2218');
        g.addColorStop(1, '#12100c');
      }
      outCtx.fillStyle = g;
      outCtx.fillRect(k.x, k.y, k.w, k.h);
      outCtx.strokeStyle = lit ? 'rgba(230,190,110,0.8)' : 'rgba(0,0,0,0.8)';
      outCtx.lineWidth = 1;
      outCtx.strokeRect(k.x, k.y, k.w, k.h);
    }

    
    outCtx.save();
    for(let h = 0; h < latestLandmarksList.length; h++){
      const lm = latestLandmarksList[h];
      const tip = lm[8];
      const pip = lm[6];
      const px = tip.x * W;
      const py = tip.y * H;
      if(py < y0 - 10) continue;
      const straight = fingerExtended(lm, 8, 6, 5);
      const pressing = !straight && tip.y > pip.y + 0.01;
      outCtx.beginPath();
      outCtx.arc(px, py, pressing ? 8 : 6, 0, Math.PI * 2);
      outCtx.fillStyle = pressing ? 'rgba(230,180,90,0.95)' : 'rgba(212,179,106,0.45)';
      outCtx.fill();
      outCtx.strokeStyle = 'rgba(40,28,16,0.7)';
      outCtx.lineWidth = 1.5;
      outCtx.stroke();
    }
    outCtx.restore();

    
    outCtx.save();
    outCtx.translate(W, 0);
    outCtx.scale(-1, 1);
    outCtx.font = '600 12px Vazirmatn, sans-serif';
    outCtx.textAlign = 'center';
    if(pianoExitArmed || pendingGesture === 'xout'){
      outCtx.fillStyle = 'rgba(230,180,90,0.95)';
      outCtx.fillText('دایره تشخیص داده شد — رها کن تا خارج شوی', W / 2, y0 - 18);
    } else {
      outCtx.fillStyle = 'rgba(243,232,212,0.55)';
      outCtx.fillText('دو دست روبه‌رو · نوک انگشتان دایره بساز = خروج', W / 2, y0 - 18);
    }
    outCtx.restore();
  }

  function effectPiano(){
    drawLiveBase();
    const layout = getPianoLayout();
    processPianoHits(layout);
    drawPianoKeyboard(layout);
  }

  function getPersonBounds(){
    if(!latestSegMask) return null;
    maskCtx.clearRect(0, 0, W, H);
    maskCtx.drawImage(latestSegMask, 0, 0, W, H);
    const img = maskCtx.getImageData(0, 0, W, H);
    const d = img.data;
    let minX = W, minY = H, maxX = 0, maxY = 0, found = 0;
    for(let y = 0; y < H; y += 3){
      for(let x = 0; x < W; x += 3){
        const i = (y * W + x) * 4;
        if(Math.max(d[i], d[i + 1], d[i + 2], d[i + 3]) > 80){
          found++;
          if(x < minX) minX = x;
          if(y < minY) minY = y;
          if(x > maxX) maxX = x;
          if(y > maxY) maxY = y;
        }
      }
    }
    if(found < 24) return null;
    return {
      minX, minY, maxX, maxY,
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      w: maxX - minX,
      h: maxY - minY
    };
  }

  
  function estimateFaceFromMask(){
    const b = getPersonBounds();
    if(!b) return null;
    maskCtx.clearRect(0, 0, W, H);
    maskCtx.drawImage(latestSegMask, 0, 0, W, H);
    const img = maskCtx.getImageData(0, 0, W, H);
    const d = img.data;

    const headH = Math.max(b.h * 0.26, Math.min(b.w * 0.55, b.h * 0.4));
    const y0 = b.minY;
    const y1 = Math.min(H - 1, b.minY + headH);
    let sx = 0, sy = 0, n = 0, minX = W, maxX = 0;
    for(let y = y0; y <= y1; y += 2){
      for(let x = b.minX; x <= b.maxX; x += 2){
        const i = (y * W + x) * 4;
        if(Math.max(d[i], d[i + 1], d[i + 2], d[i + 3]) > 80){
          sx += x; sy += y; n++;
          if(x < minX) minX = x;
          if(x > maxX) maxX = x;
        }
      }
    }
    if(n < 12) return null;
    const cx = sx / n;
    const cy = sy / n;
    const headW = Math.max(40, maxX - minX);
    const top = y0;
    const eyeY = top + headH * 0.45;
    const eyeSpread = headW * 0.18;
    const earSpread = headW * 0.48;
    return {
      re: { x: cx + eyeSpread, y: eyeY },
      le: { x: cx - eyeSpread, y: eyeY },
      nose: { x: cx, y: top + headH * 0.62 },
      mouth: { x: cx, y: top + headH * 0.78 },
      rEar: { x: cx + earSpread, y: eyeY + headH * 0.02 },
      lEar: { x: cx - earSpread, y: eyeY + headH * 0.02 },
      rTemple: { x: cx + earSpread * 0.85, y: eyeY - headH * 0.05 },
      lTemple: { x: cx - earSpread * 0.85, y: eyeY - headH * 0.05 },
      forehead: { x: cx, y: top + headH * 0.08 },
      chin: { x: cx, y: top + headH * 0.95 },
      cx, top, headW, headH, eyeDist: eyeSpread * 2
    };
  }

  
  
  
  function midPt(a, b){
    return { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 };
  }

  function getFaceAnchors(){
    const lm = latestFaceMesh;
    let raw = null;
    if(lm && lm.length >= 468){
      const p = (i) => ({ x: lm[i].x * W, y: lm[i].y * H });
      const hasIris = lm.length > 468;
      const le = hasIris ? p(468) : midPt(p(33), p(133));
      const re = hasIris ? p(473) : midPt(p(362), p(263));
      const nose = p(1);
      const mouth = p(13);
      const lEar = p(234);
      const rEar = p(454);
      const lTemple = p(127);
      const rTemple = p(356);
      const forehead = p(10);
      const chin = p(152);
      const brow = midPt(p(55), p(285));
      const cx = (le.x + re.x) * 0.5;
      const eyeDist = Math.hypot(re.x - le.x, re.y - le.y) || 40;
      const templeW = Math.hypot(rTemple.x - lTemple.x, rTemple.y - lTemple.y);
      const cheekW = Math.hypot(rEar.x - lEar.x, rEar.y - lEar.y);
      const headW = Math.max(eyeDist * 2.2, templeW, cheekW * 0.95, 40);
      const top = forehead.y;
      const headH = Math.max(8, chin.y - forehead.y);
      raw = {
        re, le, nose, mouth, rEar, lEar, lTemple, rTemple, forehead, chin, brow,
        cx, top, headW, headH, eyeDist, templeW, cheekW
      };
    } else {
      raw = estimateFaceFromMask();
    }
    if(!raw){ smoothFace = null; return null; }

    const t = 0.45;
    const mix = (a, b) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    if(!smoothFace){
      smoothFace = raw;
      return raw;
    }
    const s = smoothFace;
    smoothFace = {
      re: mix(s.re, raw.re),
      le: mix(s.le, raw.le),
      nose: mix(s.nose, raw.nose),
      mouth: mix(s.mouth, raw.mouth),
      rEar: mix(s.rEar, raw.rEar),
      lEar: mix(s.lEar, raw.lEar),
      lTemple: mix(s.lTemple, raw.lTemple),
      rTemple: mix(s.rTemple, raw.rTemple),
      forehead: mix(s.forehead, raw.forehead),
      chin: mix(s.chin, raw.chin),
      brow: raw.brow && s.brow ? mix(s.brow, raw.brow) : raw.brow,
      cx: s.cx + (raw.cx - s.cx) * t,
      top: s.top + (raw.top - s.top) * t,
      headW: s.headW + (raw.headW - s.headW) * t,
      headH: s.headH + (raw.headH - s.headH) * t,
      eyeDist: s.eyeDist + (raw.eyeDist - s.eyeDist) * t,
      templeW: (s.templeW || raw.templeW) + ((raw.templeW || 0) - (s.templeW || 0)) * t,
      cheekW: (s.cheekW || raw.cheekW) + ((raw.cheekW || 0) - (s.cheekW || 0)) * t
    };
    return smoothFace;
  }

  function drawTriEar(baseA, baseB, tip, fill, stroke, inner){
    outCtx.beginPath();
    outCtx.moveTo(baseA.x, baseA.y);
    outCtx.lineTo(baseB.x, baseB.y);
    outCtx.lineTo(tip.x, tip.y);
    outCtx.closePath();
    outCtx.fillStyle = fill;
    outCtx.fill();
    outCtx.strokeStyle = stroke;
    outCtx.lineWidth = 2;
    outCtx.stroke();
    if(inner){
      outCtx.beginPath();
      outCtx.moveTo((baseA.x + tip.x) * 0.5, (baseA.y + tip.y) * 0.5);
      outCtx.lineTo((baseA.x + baseB.x + tip.x) / 3, (baseA.y + baseB.y + tip.y) / 3);
      outCtx.lineTo((baseB.x + tip.x) * 0.5, (baseB.y + tip.y) * 0.5);
      outCtx.closePath();
      outCtx.fillStyle = inner;
      outCtx.fill();
    }
  }

  function drawAnimalMaskPNG(kind, f){
    const img = animalMasks[kind];
    if(!img || !img.naturalWidth) return false;
    const cfg = ANIMAL_MASK_CFG[kind];

    const lt = f.lTemple || f.lEar;
    const rt = f.rTemple || f.rEar;
    const faceW = (f.templeW && f.templeW > 20)
      ? f.templeW
      : (Math.hypot(rt.x - lt.x, rt.y - lt.y) || f.cheekW || f.headW || 120);

    
    let angle = Math.atan2(f.re.y - f.le.y, f.re.x - f.le.x);
    if(Math.abs(angle) > 0.55) angle *= 0.55 / Math.abs(angle);

    
    
    const drawW = Math.max(90, (faceW * cfg.widthMul) / cfg.earSpan);
    const drawH = drawW * (img.naturalHeight / img.naturalWidth);

    
    
    const templeMidY = (lt.y + rt.y) * 0.5;
    const faceNoseGap = Math.max(8, f.nose.y - templeMidY);
    const maskNoseGap = Math.max(0.08, cfg.noseY - 0.45) * drawH;
    const gapFix = (faceNoseGap - maskNoseGap) * 0.35; 

    outCtx.save();
    outCtx.translate(f.nose.x, f.nose.y + gapFix);
    outCtx.rotate(angle);
    outCtx.drawImage(
      img,
      -cfg.noseX * drawW,
      -cfg.noseY * drawH,
      drawW,
      drawH
    );
    outCtx.restore();
    return true;
  }

  function animalGrade(tint){
    outCtx.save();
    outCtx.globalCompositeOperation = 'soft-light';
    outCtx.fillStyle = tint;
    outCtx.fillRect(0, 0, W, H);
    outCtx.restore();
  }

  function effectCat(){
    drawLiveBase();
    animalGrade('rgba(255,170,70,0.16)');
    const f = getFaceAnchors();
    if(!f) return;
    if(!drawAnimalMaskPNG('cat', f)){
      
      const lBase = f.lTemple || f.lEar;
      const rBase = f.rTemple || f.rEar;
      const browY = f.forehead ? f.forehead.y + f.headH * 0.12 : lBase.y - f.headH * 0.15;
      const tipY = (f.forehead ? f.forehead.y : browY) - f.headH * 0.28;
      drawTriEar(
        { x: lBase.x + f.headW * 0.02, y: browY },
        { x: lBase.x + f.headW * 0.14, y: lBase.y },
        { x: lBase.x - f.headW * 0.1, y: tipY },
        'rgba(210,150,70,0.95)', 'rgba(70,40,20,0.7)', 'rgba(240,150,120,0.55)'
      );
      drawTriEar(
        { x: rBase.x - f.headW * 0.02, y: browY },
        { x: rBase.x - f.headW * 0.14, y: rBase.y },
        { x: rBase.x + f.headW * 0.1, y: tipY },
        'rgba(210,150,70,0.95)', 'rgba(70,40,20,0.7)', 'rgba(240,150,120,0.55)'
      );
    }
  }

  function effectDog(){
    drawLiveBase();
    animalGrade('rgba(180,120,60,0.14)');
    const f = getFaceAnchors();
    if(!f) return;
    drawAnimalMaskPNG('dog', f);
  }

  function effectCow(){
    drawLiveBase();
    animalGrade('rgba(200,180,120,0.12)');
    const f = getFaceAnchors();
    if(!f) return;
    drawAnimalMaskPNG('cow', f);
  }

  function effectCloak(){
    if(!latestSegMask || !bgFrozen){ drawLiveBase(); return; }
    updateColorGains();
    buildColorMatchedBg();
    hardenPersonMask(latestSegMask);
    drawLiveBase();
    tmpCtx.clearRect(0, 0, W, H);
    tmpCtx.drawImage(maskCanvas, 0, 0, W, H);
    tmpCtx.globalCompositeOperation = 'source-in';
    tmpCtx.drawImage(gradeCanvas, 0, 0, W, H);
    tmpCtx.globalCompositeOperation = 'source-over';
    outCtx.drawImage(tmpCanvas, 0, 0, W, H);
  }

  function effectMirror(){
    tmpCtx.drawImage(video, 0, 0, W, H);
    const half = Math.floor(W / 2);
    outCtx.drawImage(tmpCanvas, 0, 0, half, H, 0, 0, half, H);
    outCtx.save();
    outCtx.translate(W, 0);
    outCtx.scale(-1, 1);
    outCtx.drawImage(tmpCanvas, 0, 0, half, H, 0, 0, half, H);
    outCtx.restore();
  }

  function effectBeam(){
    drawLiveBase();
    let cx = W * 0.5, cy = H * 0.42;
    if(latestLandmarksList[0]){
      cx = latestLandmarksList[0][8].x * W;
      cy = latestLandmarksList[0][8].y * H;
    }
    const g = outCtx.createRadialGradient(cx, cy, H * 0.06, cx, cy, H * 0.7);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.35, 'rgba(0,0,0,0.12)');
    g.addColorStop(1, 'rgba(0,0,0,0.82)');
    outCtx.fillStyle = g;
    outCtx.fillRect(0, 0, W, H);
    outCtx.strokeStyle = 'rgba(212,179,106,0.35)';
    outCtx.lineWidth = 2;
    outCtx.beginPath();
    outCtx.arc(cx, cy, H * 0.12, 0, Math.PI * 2);
    outCtx.stroke();
    outCtx.strokeStyle = 'rgba(212,179,106,0.15)';
    outCtx.beginPath();
    outCtx.arc(cx, cy, H * 0.2, 0, Math.PI * 2);
    outCtx.stroke();
  }

  function effectStill(){
    if(!freezeReady){
      freezeCtx.drawImage(video, 0, 0, W, H);
      freezeReady = true;
    }
    outCtx.drawImage(freezeCanvas, 0, 0, W, H);
    outCtx.fillStyle = 'rgba(20,24,28,0.12)';
    outCtx.fillRect(0, 0, W, H);
  }

  function effectEmber(){
    drawLiveBase();
    outCtx.save();
    outCtx.globalCompositeOperation = 'overlay';
    outCtx.fillStyle = 'rgba(180,70,20,0.28)';
    outCtx.fillRect(0, 0, W, H);
    outCtx.globalCompositeOperation = 'soft-light';
    outCtx.fillStyle = 'rgba(255,180,80,0.18)';
    outCtx.fillRect(0, 0, W, H);
    outCtx.restore();

    const vg = outCtx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(40,10,0,0.45)');
    outCtx.fillStyle = vg;
    outCtx.fillRect(0, 0, W, H);
  }

  function effectRift(){
    tmpCtx.drawImage(video, 0, 0, W, H);
    outCtx.drawImage(tmpCanvas, 0, 0, W, H);
    riftTick++;
    const shift = 3 + (riftTick % 6);

    outCtx.save();
    outCtx.globalCompositeOperation = 'lighter';
    outCtx.globalAlpha = 0.45;
    outCtx.drawImage(tmpCanvas, shift, 0, W, H);
    outCtx.globalAlpha = 0.35;
    outCtx.drawImage(tmpCanvas, -shift, 1, W, H);
    outCtx.restore();

    if(riftTick % 3 === 0){
      const slices = 4 + (riftTick % 3);
      for(let i = 0; i < slices; i++){
        const y = Math.floor(Math.random() * H);
        const h = 3 + Math.floor(Math.random() * 16);
        const dx = (Math.random() * 28) - 14;
        outCtx.drawImage(tmpCanvas, 0, y, W, h, dx, y, W, h);
      }
    }

    outCtx.fillStyle = 'rgba(40,180,160,0.05)';
    outCtx.fillRect(0, 0, W, H);
  }

  function effectEcho(){
    if(!trailReady){
      trailCtx.fillStyle = '#000';
      trailCtx.fillRect(0, 0, W, H);
      trailReady = true;
    }
    trailCtx.fillStyle = 'rgba(10,8,6,0.18)';
    trailCtx.fillRect(0, 0, W, H);
    trailCtx.globalAlpha = 0.55;
    trailCtx.drawImage(video, 0, 0, W, H);
    trailCtx.globalAlpha = 1;
    outCtx.drawImage(trailCanvas, 0, 0, W, H);
    outCtx.globalAlpha = 0.55;
    outCtx.drawImage(video, 0, 0, W, H);
    outCtx.globalAlpha = 1;
  }

  function effectPrism(){
    tmpCtx.drawImage(video, 0, 0, W, H);
    outCtx.fillStyle = '#10080c';
    outCtx.fillRect(0, 0, W, H);
    outCtx.save();
    outCtx.globalCompositeOperation = 'screen';
    outCtx.globalAlpha = 0.9;
    outCtx.drawImage(tmpCanvas, 5, 0, W, H);
    outCtx.globalAlpha = 0.75;
    outCtx.drawImage(tmpCanvas, -4, 2, W, H);
    outCtx.globalAlpha = 0.55;
    outCtx.drawImage(tmpCanvas, 0, -3, W, H);
    outCtx.restore();
    outCtx.save();
    outCtx.globalCompositeOperation = 'overlay';
    outCtx.fillStyle = 'rgba(255,60,140,0.18)';
    outCtx.fillRect(0, 0, W / 3, H);
    outCtx.fillStyle = 'rgba(80,220,160,0.16)';
    outCtx.fillRect(W / 3, 0, W / 3, H);
    outCtx.fillStyle = 'rgba(90,140,255,0.18)';
    outCtx.fillRect((W / 3) * 2, 0, W / 3 + 2, H);
    outCtx.restore();
  }

  function effectInk(){
    if(!latestSegMask){ drawLiveBase(); return; }
    outCtx.fillStyle = '#d8cbb0';
    outCtx.fillRect(0, 0, W, H);
    hardenPersonMask(latestSegMask);
    tmpCtx.clearRect(0, 0, W, H);
    tmpCtx.drawImage(maskCanvas, 0, 0, W, H);
    tmpCtx.globalCompositeOperation = 'source-in';
    tmpCtx.fillStyle = '#1a120c';
    tmpCtx.fillRect(0, 0, W, H);
    tmpCtx.globalCompositeOperation = 'source-over';
    outCtx.drawImage(tmpCanvas, 0, 0, W, H);

    outCtx.strokeStyle = 'rgba(80,55,35,0.15)';
    outCtx.lineWidth = 1;
    for(let y = 0; y < H; y += 6){
      outCtx.beginPath();
      outCtx.moveTo(0, y);
      outCtx.lineTo(W, y);
      outCtx.stroke();
    }
  }

  function handAnchor(){
    const lm = latestLandmarksList[0];
    if(!lm) return { x: W * 0.5, y: H * 0.45 };
    return { x: lm[9].x * W, y: lm[9].y * H };
  }

  function effectWeb(){
    drawLiveBase();
    const p = handAnchor();
    outCtx.save();
    outCtx.strokeStyle = 'rgba(160,220,255,0.55)';
    outCtx.lineWidth = 1.4;
    outCtx.shadowColor = 'rgba(120,200,255,0.6)';
    outCtx.shadowBlur = 8;
    for(let i = 0; i < 10; i++){
      const ang = (Math.PI * 2 * i) / 10 + riftTick * 0.02;
      outCtx.beginPath();
      outCtx.moveTo(p.x, p.y);
      outCtx.lineTo(p.x + Math.cos(ang) * W * 0.55, p.y + Math.sin(ang) * H * 0.55);
      outCtx.stroke();
    }
    for(let r = 0.12; r <= 0.5; r += 0.1){
      outCtx.beginPath();
      outCtx.arc(p.x, p.y, Math.min(W, H) * r, 0, Math.PI * 2);
      outCtx.stroke();
    }
    outCtx.restore();
    outCtx.fillStyle = 'rgba(40,90,140,0.12)';
    outCtx.fillRect(0, 0, W, H);
    riftTick++;
  }

  function effectMetal(){
    drawLiveBase();
    outCtx.save();
    outCtx.globalCompositeOperation = 'overlay';
    outCtx.fillStyle = 'rgba(160,20,30,0.35)';
    outCtx.fillRect(0, 0, W, H);
    outCtx.restore();
    const shake = (riftTick++ % 3) - 1;
    if(shake){
      tmpCtx.drawImage(outputCanvas, 0, 0, W, H);
      outCtx.drawImage(tmpCanvas, shake * 3, 0, W, H);
    }
    const g = outCtx.createRadialGradient(W/2, H/2, H*0.15, W/2, H/2, H*0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    outCtx.fillStyle = g;
    outCtx.fillRect(0, 0, W, H);
  }

  function effectSpite(){
    tmpCtx.drawImage(video, 0, 0, W, H);
    outCtx.save();
    outCtx.filter = 'invert(1) hue-rotate(90deg) contrast(1.3)';
    outCtx.drawImage(tmpCanvas, 0, 0, W, H);
    outCtx.filter = 'none';
    outCtx.restore();
    riftTick++;
    for(let i = 0; i < 6; i++){
      const y = Math.floor(Math.random() * H);
      const h = 2 + Math.floor(Math.random() * 20);
      outCtx.drawImage(tmpCanvas, 0, y, W, h, (Math.random()*30)-15, y, W, h);
    }
    outCtx.fillStyle = 'rgba(255,0,80,0.08)';
    outCtx.fillRect(0, 0, W, H);
  }

  function effectOkay(){
    drawLiveBase();
    const p = latestLandmarksList[0]
      ? { x: ((latestLandmarksList[0][4].x + latestLandmarksList[0][8].x) / 2) * W,
          y: ((latestLandmarksList[0][4].y + latestLandmarksList[0][8].y) / 2) * H }
      : { x: W/2, y: H/2 };
    const g = outCtx.createRadialGradient(p.x, p.y, 10, p.x, p.y, H * 0.55);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.45, 'rgba(0,0,0,0.15)');
    g.addColorStop(1, 'rgba(10,8,5,0.78)');
    outCtx.fillStyle = g;
    outCtx.fillRect(0, 0, W, H);
    outCtx.strokeStyle = 'rgba(212,179,106,0.65)';
    outCtx.lineWidth = 3;
    outCtx.beginPath();
    outCtx.arc(p.x, p.y, H * 0.1, 0, Math.PI * 2);
    outCtx.stroke();
    outCtx.strokeStyle = 'rgba(212,179,106,0.25)';
    outCtx.beginPath();
    outCtx.arc(p.x, p.y, H * 0.16, 0, Math.PI * 2);
    outCtx.stroke();
  }

  function effectDown(){
    drawLiveBase();
    const g = outCtx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0.75)');
    g.addColorStop(0.45, 'rgba(0,0,0,0.2)');
    g.addColorStop(1, 'rgba(20,30,50,0.45)');
    outCtx.fillStyle = g;
    outCtx.fillRect(0, 0, W, H);
    outCtx.save();
    outCtx.globalCompositeOperation = 'saturation';
    outCtx.fillStyle = 'rgba(40,40,50,0.85)';
    outCtx.fillRect(0, 0, W, H);
    outCtx.restore();
  }

  function effectTwin(){
    tmpCtx.drawImage(video, 0, 0, W, H);
    const hw = Math.floor(W / 2);
    const hh = Math.floor(H / 2);
    outCtx.drawImage(tmpCanvas, 0, 0, hw, hh, 0, 0, hw, hh);
    outCtx.save();
    outCtx.translate(W, 0); outCtx.scale(-1, 1);
    outCtx.drawImage(tmpCanvas, 0, 0, hw, hh, 0, 0, hw, hh);
    outCtx.restore();
    outCtx.save();
    outCtx.translate(0, H); outCtx.scale(1, -1);
    outCtx.drawImage(tmpCanvas, 0, 0, hw, hh, 0, 0, hw, hh);
    outCtx.restore();
    outCtx.save();
    outCtx.translate(W, H); outCtx.scale(-1, -1);
    outCtx.drawImage(tmpCanvas, 0, 0, hw, hh, 0, 0, hw, hh);
    outCtx.restore();
  }

  function effectBind(){
    tmpCtx.drawImage(video, 0, 0, W, H);
    const block = 12;
    for(let y = 0; y < H; y += block){
      for(let x = 0; x < W; x += block){
        outCtx.drawImage(tmpCanvas, x, y, 1, 1, x, y, block, block);
      }
    }
    outCtx.fillStyle = 'rgba(0,0,0,0.35)';
    outCtx.fillRect(0, 0, W, H);
    outCtx.strokeStyle = 'rgba(178,69,56,0.35)';
    outCtx.lineWidth = 2;
    outCtx.strokeRect(16, 16, W - 32, H - 32);
  }

  function effectPray(){
    drawLiveBase();
    outCtx.save();
    outCtx.globalCompositeOperation = 'screen';
    const g = outCtx.createRadialGradient(W/2, H*0.4, 10, W/2, H*0.45, H*0.7);
    g.addColorStop(0, 'rgba(255,230,170,0.55)');
    g.addColorStop(0.4, 'rgba(212,179,106,0.2)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    outCtx.fillStyle = g;
    outCtx.fillRect(0, 0, W, H);
    outCtx.restore();
    outCtx.fillStyle = 'rgba(255,240,200,0.06)';
    outCtx.fillRect(0, 0, W, H);
  }

  function effectOrbit(){
    tmpCtx.drawImage(video, 0, 0, W, H);
    const hw = Math.floor(W / 2);
    outCtx.drawImage(tmpCanvas, 0, 0, hw, H, 0, 0, hw, H);
    outCtx.save();
    outCtx.translate(W, 0); outCtx.scale(-1, 1);
    outCtx.drawImage(tmpCanvas, 0, 0, hw, H, 0, 0, hw, H);
    outCtx.restore();
    outCtx.save();
    outCtx.globalCompositeOperation = 'overlay';
    outCtx.fillStyle = 'rgba(120,100,200,0.22)';
    outCtx.fillRect(0, 0, W, H);
    outCtx.restore();
  }

  function effectStorm(){
    effectRift();
    outCtx.save();
    outCtx.globalCompositeOperation = 'screen';
    outCtx.fillStyle = 'rgba(80,180,255,0.12)';
    outCtx.fillRect(0, 0, W, H);
    const p = handAnchor();
    outCtx.strokeStyle = 'rgba(200,240,255,0.4)';
    for(let i = 0; i < 6; i++){
      outCtx.beginPath();
      outCtx.moveTo(p.x, p.y);
      outCtx.lineTo(Math.random() * W, Math.random() * H);
      outCtx.stroke();
    }
    outCtx.restore();
  }

  function effectVoid(){
    drawLiveBase();
    const p = latestLandmarksList[0]
      ? { x: ((latestLandmarksList[0][4].x + latestLandmarksList[0][8].x) / 2) * W,
          y: ((latestLandmarksList[0][4].y + latestLandmarksList[0][8].y) / 2) * H }
      : { x: W/2, y: H/2 };
    const g = outCtx.createRadialGradient(p.x, p.y, 4, p.x, p.y, H * 0.55);
    g.addColorStop(0, 'rgba(0,0,0,0.92)');
    g.addColorStop(0.25, 'rgba(0,0,0,0.55)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    outCtx.fillStyle = g;
    outCtx.fillRect(0, 0, W, H);
    outCtx.strokeStyle = 'rgba(180,160,220,0.45)';
    outCtx.lineWidth = 2;
    outCtx.beginPath();
    outCtx.arc(p.x, p.y, H * 0.08, 0, Math.PI * 2);
    outCtx.stroke();
  }

  function effectSpark(){
    drawLiveBase();
    const p = latestLandmarksList[0]
      ? { x: latestLandmarksList[0][20].x * W, y: latestLandmarksList[0][20].y * H }
      : handAnchor();
    outCtx.save();
    outCtx.globalCompositeOperation = 'screen';
    for(let i = 0; i < 14; i++){
      const ang = (Math.PI * 2 * i) / 14 + riftTick * 0.08;
      const len = 20 + (i % 4) * 12;
      outCtx.strokeStyle = 'rgba(255,220,140,0.55)';
      outCtx.lineWidth = 1.5;
      outCtx.beginPath();
      outCtx.moveTo(p.x, p.y);
      outCtx.lineTo(p.x + Math.cos(ang) * len, p.y + Math.sin(ang) * len);
      outCtx.stroke();
    }
    outCtx.restore();
    riftTick++;
  }

  function effectBoost(){
    drawLiveBase();
    outCtx.save();
    outCtx.globalCompositeOperation = 'overlay';
    outCtx.fillStyle = 'rgba(255,200,80,0.28)';
    outCtx.fillRect(0, 0, W, H);
    outCtx.restore();
    const g = outCtx.createLinearGradient(0, H, 0, 0);
    g.addColorStop(0, 'rgba(255,180,40,0.2)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    outCtx.fillStyle = g;
    outCtx.fillRect(0, 0, W, H);
  }

  function effectBalance(){
    tmpCtx.drawImage(video, 0, 0, W, H);
    const hw = Math.floor(W / 2);
    outCtx.save();
    outCtx.filter = 'grayscale(0.7) contrast(1.1)';
    outCtx.drawImage(tmpCanvas, 0, 0, hw, H, 0, 0, hw, H);
    outCtx.filter = 'sepia(0.35) saturate(1.3)';
    outCtx.drawImage(tmpCanvas, hw, 0, W - hw, H, hw, 0, W - hw, H);
    outCtx.restore();
    outCtx.strokeStyle = 'rgba(212,179,106,0.45)';
    outCtx.lineWidth = 2;
    outCtx.beginPath();
    outCtx.moveTo(hw, 0);
    outCtx.lineTo(hw, H);
    outCtx.stroke();
  }

  function effectAim(){
    const targets = latestLandmarksList.slice(0, 2).map(lm => ({
      x: lm[8].x * W,
      y: lm[8].y * H
    }));
    if(!targets.length) targets.push({ x: W/2, y: H/2 });

    outCtx.fillStyle = '#050403';
    outCtx.fillRect(0, 0, W, H);
    targets.forEach(p => {
      outCtx.save();
      outCtx.beginPath();
      outCtx.arc(p.x, p.y, H * 0.15, 0, Math.PI * 2);
      outCtx.clip();
      outCtx.drawImage(video, 0, 0, W, H);
      outCtx.restore();
      outCtx.strokeStyle = 'rgba(255,90,90,0.75)';
      outCtx.lineWidth = 1.5;
      outCtx.beginPath();
      outCtx.moveTo(p.x - 20, p.y); outCtx.lineTo(p.x + 20, p.y);
      outCtx.moveTo(p.x, p.y - 20); outCtx.lineTo(p.x, p.y + 20);
      outCtx.stroke();
      outCtx.beginPath();
      outCtx.arc(p.x, p.y, 16, 0, Math.PI * 2);
      outCtx.stroke();
    });
  }

  function effectBloom(){
    drawLiveBase();
    const cx = W * 0.5, cy = H * 0.42;
    const t = performance.now() * 0.002;
    outCtx.save();
    outCtx.globalCompositeOperation = 'screen';
    for(let i = 0; i < 6; i++){
      const r = 30 + i * 28 + Math.sin(t + i) * 8;
      outCtx.beginPath();
      outCtx.ellipse(cx, cy, r * 1.15, r * 0.7, t * 0.4 + i * 0.5, 0, Math.PI * 2);
      outCtx.strokeStyle = 'rgba(255,' + (140 + i * 15) + ',' + (180 - i * 10) + ',' + (0.35 - i * 0.04) + ')';
      outCtx.lineWidth = 3;
      outCtx.stroke();
    }
    outCtx.restore();
    outCtx.fillStyle = 'rgba(255,200,220,0.08)';
    outCtx.fillRect(0, 0, W, H);
  }

  function effectTide(){
    tmpCtx.drawImage(video, 0, 0, W, H);
    const t = performance.now() * 0.004;
    const band = 10;
    for(let y = 0; y < H; y += band){
      const shift = Math.sin(y * 0.04 + t) * 18;
      outCtx.drawImage(tmpCanvas, 0, y, W, band, shift, y, W, band);
    }
    outCtx.save();
    outCtx.globalCompositeOperation = 'soft-light';
    outCtx.fillStyle = 'rgba(60,140,200,0.28)';
    outCtx.fillRect(0, 0, W, H);
    outCtx.restore();
  }

  function effectCoil(){
    tmpCtx.drawImage(video, 0, 0, W, H);
    outCtx.save();
    outCtx.translate(W / 2, H / 2);
    outCtx.rotate(Math.sin(performance.now() * 0.0015) * 0.08);
    outCtx.drawImage(tmpCanvas, -W / 2, -H / 2);
    outCtx.restore();
    outCtx.save();
    outCtx.globalCompositeOperation = 'overlay';
    const g = outCtx.createRadialGradient(W/2, H/2, 20, W/2, H/2, H * 0.55);
    g.addColorStop(0, 'rgba(180,80,255,0.15)');
    g.addColorStop(0.5, 'rgba(80,200,180,0.2)');
    g.addColorStop(1, 'rgba(20,10,40,0.45)');
    outCtx.fillStyle = g;
    outCtx.fillRect(0, 0, W, H);
    outCtx.restore();
    for(let i = 0; i < 3; i++){
      outCtx.beginPath();
      outCtx.arc(W/2, H/2, 40 + i * 36, 0, Math.PI * 2);
      outCtx.strokeStyle = 'rgba(200,160,255,' + (0.2 - i * 0.05) + ')';
      outCtx.lineWidth = 2;
      outCtx.stroke();
    }
  }

  function effectSink(){
    drawLiveBase();
    const g = outCtx.createRadialGradient(W/2, H*0.35, 20, W/2, H*0.5, H*0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.45, 'rgba(0,0,0,0.25)');
    g.addColorStop(1, 'rgba(0,0,0,0.82)');
    outCtx.fillStyle = g;
    outCtx.fillRect(0, 0, W, H);
    outCtx.save();
    outCtx.globalCompositeOperation = 'multiply';
    outCtx.fillStyle = 'rgba(40,50,70,0.55)';
    outCtx.fillRect(0, 0, W, H);
    outCtx.restore();
    outCtx.strokeStyle = 'rgba(100,120,150,0.35)';
    outCtx.lineWidth = 2;
    outCtx.strokeRect(20, 20, W - 40, H - 40);
  }

  function drawOneHand(lm, color){
    outCtx.strokeStyle = color;
    outCtx.shadowColor = color;
    outCtx.shadowBlur = 8;
    outCtx.lineWidth = Math.max(2, W * 0.0035);
    outCtx.lineCap = 'round';
    outCtx.lineJoin = 'round';
    for(let i = 0; i < HAND_CONNECTIONS.length; i++){
      const a = lm[HAND_CONNECTIONS[i][0]];
      const b = lm[HAND_CONNECTIONS[i][1]];
      outCtx.beginPath();
      outCtx.moveTo(a.x * W, a.y * H);
      outCtx.lineTo(b.x * W, b.y * H);
      outCtx.stroke();
    }
    outCtx.shadowBlur = 0;
    for(let i = 0; i < lm.length; i++){
      const p = lm[i];
      const r = (i === 0 || i === 4 || i === 8 || i === 12 || i === 16 || i === 20) ? 4.5 : 3;
      outCtx.beginPath();
      outCtx.fillStyle = i === 8 ? 'rgba(255,210,140,1)' : color;
      outCtx.arc(p.x * W, p.y * H, r, 0, Math.PI * 2);
      outCtx.fill();
      outCtx.strokeStyle = 'rgba(40,30,18,0.55)';
      outCtx.lineWidth = 1;
      outCtx.stroke();
    }
  }

  function drawHandOverlay(){
    if(!latestLandmarksList.length) return;
    outCtx.save();
    const colors = ['rgba(212,179,106,0.95)', 'rgba(160,200,220,0.95)'];
    for(let h = 0; h < latestLandmarksList.length; h++){
      drawOneHand(latestLandmarksList[h], colors[h % colors.length]);
    }
    outCtx.restore();
  }

  function renderMode(){
    switch(mode){
      case 'cloak': effectCloak(); break;
      case 'mirror': effectMirror(); break;
      case 'beam': effectBeam(); break;
      case 'still': effectStill(); break;
      case 'ember': effectEmber(); break;
      case 'rift': effectRift(); break;
      case 'echo': effectEcho(); break;
      case 'prism': effectPrism(); break;
      case 'ink': effectInk(); break;
      case 'web': effectWeb(); break;
      case 'metal': effectMetal(); break;
      case 'spite': effectSpite(); break;
      case 'okay': effectOkay(); break;
      case 'down': effectDown(); break;
      case 'twin': effectTwin(); break;
      case 'bind': effectBind(); break;
      case 'pray': effectPray(); break;
      case 'orbit': effectOrbit(); break;
      case 'storm': effectStorm(); break;
      case 'void': effectVoid(); break;
      case 'spark': effectSpark(); break;
      case 'boost': effectBoost(); break;
      case 'balance': effectBalance(); break;
      case 'aim': effectAim(); break;
      case 'bloom': effectBloom(); break;
      case 'tide': effectTide(); break;
      case 'coil': effectCoil(); break;
      case 'sink': effectSink(); break;
      case 'cat': effectCat(); break;
      case 'dog': effectDog(); break;
      case 'cow': effectCow(); break;
      case 'piano': effectPiano(); break;
      default: drawLiveBase(); break;
    }
    applyTransitionOverlay();
    if(mode !== 'piano') drawHandOverlay();
  }

  function refreshBgIfEmpty(){
    if(!latestSegMask || mode === 'cloak') return;
    tmpCtx.clearRect(0, 0, W, H);
    tmpCtx.drawImage(latestSegMask, 0, 0, W, H);
    const sample = tmpCtx.getImageData(0, 0, W, H).data;
    let person = 0;
    for(let i = 0; i < sample.length; i += 32){
      if(Math.max(sample[i], sample[i + 3]) > 80) person++;
    }
    if(person / Math.ceil(sample.length / 32) < 0.025){
      bgCtx.globalAlpha = 0.35;
      bgCtx.drawImage(video, 0, 0, W, H);
      bgCtx.globalAlpha = 1;
    }
  }

  function beginCalibration(){
    phase = 'calibrating';
    bgFrozen = false;
    bgHoldReady = false;
    calibStage = 'wait';
    emptyStreak = 0;
    freezeReady = false;
    trailReady = false;
    pendingGesture = null;
    latestLandmarksList = [];
    bgCtx.fillStyle = '#000';
    bgCtx.fillRect(0, 0, W, H);
    bgHoldCtx.fillStyle = '#000';
    bgHoldCtx.fillRect(0, 0, W, H);
    mode = 'clear';
    stage.dataset.mode = 'clear';
    calibrateBanner.classList.add('show');
    calibrateBanner.textContent = 'کاملاً از کادر خارج شو…';
    modeLabel.textContent = 'یادگیری';
    invStatusEl.textContent = 'خارج شو';
    invStatusEl.className = 'status';
    stateTag.textContent = 'calibrating';
    stateTag.classList.remove('state-on');
    sigilDock.querySelectorAll('.sigil').forEach(btn => btn.classList.remove('is-active'));
    gainR = gainG = gainB = 1;
  }

  function finishCalibration(){
    bgCtx.globalAlpha = 1;
    bgCtx.drawImage(bgHoldCanvas, 0, 0, W, H);
    bgFrozen = true;
    phase = 'ready';
    calibrateBanner.classList.add('show');
    calibrateBanner.textContent = 'ذخیره شد — برگرد تو کادر';
    setTimeout(() => {
      if(phase === 'ready') calibrateBanner.classList.remove('show');
    }, 1600);
    setMode('clear', false);
    invStatusEl.textContent = 'آماده';
    invStatusEl.className = 'status ok';
  }

  function frameIsEmpty(){
    if(!latestSegMask) return false;
    tmpCtx.clearRect(0, 0, W, H);
    tmpCtx.drawImage(latestSegMask, 0, 0, W, H);
    const sample = tmpCtx.getImageData(0, 0, W, H).data;
    let person = 0;
    let total = 0;
    for(let i = 0; i < sample.length; i += 16){
      total++;
      if(Math.max(sample[i], sample[i + 3]) > 80) person++;
    }
    return (person / Math.max(1, total)) < PERSON_MAX;
  }

  async function openStream(advanced){
    const constraints = advanced ? {
      video:{
        width:{ ideal:640, max:1280 },
        height:{ ideal:480, max:720 },
        facingMode:'user',
        advanced:[
          { zoom:1 },
          { exposureMode:'continuous' },
          { whiteBalanceMode:'continuous' }
        ]
      },
      audio:false
    } : {
      video:{ width:{ideal:640}, height:{ideal:480}, facingMode:'user' },
      audio:false
    };
    return navigator.mediaDevices.getUserMedia(constraints);
  }

  async function startCamera(){
    if(window.SigilAudio){ SigilAudio.resume(); SigilAudio.boot(); }
    try{
      try{ stream = await openStream(true); }
      catch(e){ stream = await openStream(false); }

      video.srcObject = stream;
      await video.play();
      await new Promise(r => {
        if(video.videoWidth) return r();
        video.onloadedmetadata = () => r();
      });

      setSize(video.videoWidth || 640, video.videoHeight || 480);
      startOverlay.style.display = 'none';
      setControlsEnabled(true);
      scanline.classList.add('active');
      stage.classList.add('is-live');
      running = true;
      beginCalibration();
      requestAnimationFrame(loop);
      if(window.SigilVoice){
        SigilVoice.start((kind) => {
          if(phase === 'ready' && mode !== 'piano' && (kind === 'cat' || kind === 'dog' || kind === 'cow')){
            setMode(kind, false);
          }
        });
      }
    }catch(err){
      startOverlay.style.display = 'flex';
      startOverlay.innerHTML = '<div class="overlay-card"><button id="retryBtn" type="button">تلاش دوباره</button></div>';
      document.getElementById('retryBtn').onclick = startCamera;
    }
  }

  function stopCamera(){
    running = false;
    phase = 'idle';
    bgFrozen = false;
    freezeReady = false;
    if(window.SigilVoice) SigilVoice.stop();
    if(stream){ stream.getTracks().forEach(t => t.stop()); stream = null; }
    scanline.classList.remove('active');
    stage.classList.remove('is-live');
    stage.dataset.mode = 'idle';
    calibrateBanner.classList.remove('show');
    startOverlay.style.display = 'flex';
    startOverlay.innerHTML = '<div class="overlay-card"><div class="overlay-rune" aria-hidden="true">◈</div><button id="restartBtn" type="button">گشودن دریچه</button></div>';
    document.getElementById('restartBtn').onclick = startCamera;
    setControlsEnabled(false);
    setMode('clear', false);
    modeLabel.textContent = 'در انتظار';
    invStatusEl.textContent = '—';
    invStatusEl.className = 'status';
    handTag.textContent = '—';
    stateTag.textContent = 'idle';
    stateTag.classList.remove('state-on');
    if(window.SigilAudio) SigilAudio.ui();
  }

  segModel = new SelfieSegmentation({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
  });
  segModel.setOptions({ modelSelection: 1 });
  segModel.onResults((results) => {
    latestSegMask = results.segmentationMask;
    processingSeg = false;
  });

  try{
    faceModel = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });
    faceModel.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    faceModel.onResults((results) => {
      processingFace = false;
      if(results.multiFaceLandmarks && results.multiFaceLandmarks[0]){
        latestFaceMesh = results.multiFaceLandmarks[0];
      } else {
        latestFaceMesh = null;
      }
    });
  }catch(err){
    faceModel = null;
  }

  handsModel = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });
  handsModel.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.55,
    minTrackingConfidence: 0.5
  });
  handsModel.onResults((results) => {
    processingHands = false;
    if(phase !== 'ready') return;

    if(!results.multiHandLandmarks || !results.multiHandLandmarks.length){
      handTag.textContent = '—';
      gestureStatusEl.textContent = '';
      latestLandmarksList = [];
      modeVotes = {};
      return;
    }

    latestLandmarksList = results.multiHandLandmarks;
    handTag.textContent = latestLandmarksList.length > 1 ? 'HANDS · 2' : 'HAND · 1';
    const g = detectGestureFromHands(latestLandmarksList);
    gestureStatusEl.textContent = g || '';
    voteMode(g);
  });

  async function loop(){
    if(!running) return;

    if(!processingSeg){
      processingSeg = true;
      segModel.send({ image: video }).catch(() => { processingSeg = false; });
    }
    if(phase === 'ready' && !processingHands){
      processingHands = true;
      handsModel.send({ image: video }).catch(() => { processingHands = false; });
    }
    if(phase === 'ready' && (mode === 'cat' || mode === 'dog' || mode === 'cow') && faceModel && !processingFace){
      processingFace = true;
      faceModel.send({ image: video }).catch(() => { processingFace = false; });
    }

    if(phase === 'calibrating'){
      const isEmpty = frameIsEmpty();

      if(calibStage === 'wait'){
        emptyStreak = isEmpty ? emptyStreak + 1 : 0;
        calibrateBanner.textContent = 'کاملاً از کادر خارج شو…';
        invStatusEl.textContent = 'خارج شو';
        if(emptyStreak >= EMPTY_NEED){
          bgHoldCtx.drawImage(video, 0, 0, W, H);
          bgHoldReady = true;
          calibStage = 'confirm';
          emptyStreak = 0;
        }
      } else {
        if(!isEmpty){
          calibStage = 'wait';
          emptyStreak = 0;
          bgHoldReady = false;
          calibrateBanner.textContent = 'دوباره خارج شو…';
          invStatusEl.textContent = 'خارج شو';
        } else {
          emptyStreak++;
          const pct = Math.min(100, Math.round(100 * emptyStreak / CONFIRM_NEED));
          calibrateBanner.textContent = pct + '٪';
          invStatusEl.textContent = pct + '٪';
          if(emptyStreak >= CONFIRM_NEED && bgHoldReady){
            finishCalibration();
          }
        }
      }

      outCtx.drawImage(video, 0, 0, W, H);
    } else if(phase === 'ready'){
      renderMode();
      if(mode !== 'cloak' && latestSegMask) refreshBgIfEmpty();
    } else {
      outCtx.drawImage(video, 0, 0, W, H);
    }

    requestAnimationFrame(loop);
  }

  startBtn.onclick = startCamera;
  stopBtn.onclick = stopCamera;
  resetBgBtn.onclick = () => {
    if(window.SigilAudio) SigilAudio.ui();
    beginCalibration();
  };
  muteBtn.onclick = () => {
    if(!window.SigilAudio) return;
    const next = !SigilAudio.isMuted();
    SigilAudio.setMuted(next);
    muteBtn.textContent = next ? 'بی‌صدا' : 'صدا';
    muteBtn.classList.toggle('is-muted', next);
    if(!next) SigilAudio.ui();
  };

  sigilDock.querySelectorAll('.sigil').forEach(btn => {
    btn.addEventListener('click', () => {
      if(btn.disabled || phase !== 'ready') return;
      
      if(mode === 'piano' && btn.dataset.mode !== 'piano') return;
      if(btn.dataset.mode === 'still') freezeReady = false;
      if(btn.dataset.mode === 'echo') trailReady = false;
      setMode(btn.dataset.mode, false);
    });
  });
})();
