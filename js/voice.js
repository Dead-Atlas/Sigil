window.SigilVoice = (function(){
  let ctx = null;
  let analyser = null;
  let micStream = null;
  let source = null;
  let running = false;
  let onAnimal = null;
  let raf = 0;
  let cooldownUntil = 0;
  const pitchHist = [];
  const PITCH_HIST = 20;
  let voicedFrames = 0;
  let silentFrames = 0;
  let rmsPeak = 0;

  function ensureCtx(){
    if(ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return null;
    ctx = new AC();
    return ctx;
  }

  function autoCorrelate(buf, sampleRate){
    let size = buf.length;
    let rms = 0;
    for(let i = 0; i < size; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / size);
    if(rms < 0.01) return -1;

    let r1 = 0, r2 = size - 1, thres = 0.2;
    for(let i = 0; i < size / 2; i++){
      if(Math.abs(buf[i]) < thres){ r1 = i; break; }
    }
    for(let i = 1; i < size / 2; i++){
      if(Math.abs(buf[size - i]) < thres){ r2 = size - i; break; }
    }

    buf = buf.slice(r1, r2);
    size = buf.length;
    const c = new Array(size).fill(0);
    for(let i = 0; i < size; i++){
      for(let j = 0; j < size - i; j++) c[i] += buf[j] * buf[j + i];
    }

    let d = 0;
    while(d < size - 1 && c[d] > c[d + 1]) d++;
    let maxVal = -1, maxPos = -1;
    for(let i = d; i < size; i++){
      if(c[i] > maxVal){ maxVal = c[i]; maxPos = i; }
    }
    if(maxPos <= 0) return -1;

    const x1 = c[maxPos - 1] || 0;
    const x2 = c[maxPos];
    const x3 = c[maxPos + 1] || 0;
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    let T = maxPos;
    if(a) T = maxPos - b / (2 * a);
    const freq = sampleRate / T;
    if(freq < 60 || freq > 1600) return -1;
    return freq;
  }

  function bandEnergy(freqData, sampleRate, f0, f1){
    const binHz = sampleRate / analyser.fftSize;
    let sum = 0, n = 0;
    const i0 = Math.max(0, Math.floor(f0 / binHz));
    const i1 = Math.min(freqData.length - 1, Math.ceil(f1 / binHz));
    for(let i = i0; i <= i1; i++){
      sum += freqData[i];
      n++;
    }
    return n ? sum / n : 0;
  }

  function pitchStats(){
    const valid = pitchHist.filter(p => p > 0);
    if(valid.length < 4) return null;
    const minP = Math.min(...valid);
    const maxP = Math.max(...valid);
    const mid = valid.reduce((a, b) => a + b, 0) / valid.length;
    return { mid, span: maxP - minP, n: valid.length };
  }

  function classify(pitch, rms, low, mid, high){
    const st = pitchStats();
    if(!st) return null;
    const { mid: pMid, span } = st;

    
    if(voicedFrames >= 11 && pMid >= 70 && pMid <= 260 && low >= 22){
      if(low >= mid * 0.85 && span < 160) return 'cow';
    }

    
    if(voicedFrames >= 5 && voicedFrames <= 18 && rmsPeak > 0.04){
      if(pMid >= 130 && pMid <= 520 && mid > 30 && high > 16 && span < 140){
        if(!(pMid > 380 && span > 70)) return 'dog';
      }
    }

    
    if(voicedFrames >= 7 && pMid > 280 && pMid < 1150){
      if(span > 40 || (pMid > 340 && pMid < 950 && mid > 28)) return 'cat';
    }

    return null;
  }

  function fire(kind){
    const now = performance.now();
    if(now < cooldownUntil) return;
    cooldownUntil = now + 2000;
    voicedFrames = 0;
    silentFrames = 0;
    rmsPeak = 0;
    pitchHist.length = 0;
    if(typeof onAnimal === 'function') onAnimal(kind);
  }

  function tick(){
    if(!running || !analyser) return;
    raf = requestAnimationFrame(tick);

    const time = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(time);
    let rms = 0;
    for(let i = 0; i < time.length; i++) rms += time[i] * time[i];
    rms = Math.sqrt(rms / time.length);

    const freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqData);
    const low = bandEnergy(freqData, ctx.sampleRate, 60, 220);
    const mid = bandEnergy(freqData, ctx.sampleRate, 220, 750);
    const high = bandEnergy(freqData, ctx.sampleRate, 750, 1800);
    const pitch = autoCorrelate(Array.from(time), ctx.sampleRate);

    const voiced = rms > 0.018 && (mid > 22 || low > 24);
    if(voiced && pitch > 0){
      voicedFrames++;
      silentFrames = 0;
      rmsPeak = Math.max(rmsPeak, rms);
      pitchHist.push(pitch);
      if(pitchHist.length > PITCH_HIST) pitchHist.shift();

      const kind = classify(pitch, rms, low, mid, high);
      if(kind) fire(kind);
    } else {
      
      if(voicedFrames >= 5 && voicedFrames <= 16 && silentFrames === 0 && rmsPeak > 0.038){
        const st = pitchStats();
        if(st && st.mid >= 130 && st.mid <= 520 && st.span < 140){
          fire('dog');
          return;
        }
      }
      silentFrames++;
      voicedFrames = Math.max(0, voicedFrames - 2);
      if(rms < 0.01){
        pitchHist.length = 0;
        rmsPeak = 0;
      }
    }
  }

  async function start(cb){
    onAnimal = cb;
    stop();
    const c = ensureCtx();
    if(!c) return false;
    try{
      micStream = await navigator.mediaDevices.getUserMedia({
        audio:{ echoCancellation:true, noiseSuppression:true, autoGainControl:true },
        video:false
      });
      if(c.state === 'suspended') await c.resume();
      source = c.createMediaStreamSource(micStream);
      analyser = c.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.65;
      source.connect(analyser);
      running = true;
      pitchHist.length = 0;
      voicedFrames = 0;
      silentFrames = 0;
      rmsPeak = 0;
      tick();
      return true;
    }catch(err){
      running = false;
      return false;
    }
  }

  function stop(){
    running = false;
    if(raf) cancelAnimationFrame(raf);
    raf = 0;
    if(source){ try{ source.disconnect(); }catch(e){} source = null; }
    if(micStream){
      micStream.getTracks().forEach(t => t.stop());
      micStream = null;
    }
    analyser = null;
    pitchHist.length = 0;
    voicedFrames = 0;
  }

  function isRunning(){ return running; }

  return { start, stop, isRunning };
})();
