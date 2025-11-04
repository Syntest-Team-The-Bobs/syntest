
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const rgbEq = (a, b) => a && b && a.r === b.r && a.g === b.g && a.b === b.b;
const rgbStyle = ({r,g,b}) => `rgb(${r}, ${g}, ${b})`;

function randomRGB(minDistance = 50, avoid = []) {
  for (let tries = 0; tries < 1000; tries++) {
    const c = { r: randInt(0,255), g: randInt(0,255), b: randInt(0,255) };
    let ok = true;
    for (const v of avoid) {
      const dr = c.r - v.r, dg = c.g - v.g, db = c.b - v.b;
      const dist = Math.sqrt(dr*dr + dg*dg + db*db);
      if (dist < minDistance) { ok = false; break; }
    }
    if (ok) return c;
  }
  return { r: randInt(0,255), g: randInt(0,255), b: randInt(0,255) };
}

// ---------- DOM refs ----------
const triggerView  = document.getElementById('triggerView');
const responseView = document.getElementById('responseView');
const triggerChip  = document.getElementById('triggerChip');
const countNum     = document.getElementById('countNum');
const paletteEl    = document.getElementById('palette');
const rtRow        = document.getElementById('rtRow');
const rtValue      = document.getElementById('rtValue');

// ---------- state ----------
let expected = null;        // {r,g,b}
let stimulusId = null;
let trialIndex = 1;
let responseStart = null;

// ---------- flow ----------
async function loadTrial() {
  const res = await fetch('/api/speed-congruency/next');
  if (!res.ok) {
    const msg = await res.text();
    console.error('No trial:', msg);
    alert('No eligible color association found. Complete the Color Test (pass) first.');
    return;
  }
  const data = await res.json();
  expected   = data.expected;
  stimulusId = data.stimulus_id || null;
  trialIndex = data.trial_index || 1;

  triggerChip.style.backgroundColor = rgbStyle(expected);
  startCountdown(3, showResponse);
}

function startCountdown(n, done) {
  let val = n;
  countNum.textContent = String(val);
  const it = setInterval(() => {
    val -= 1;
    countNum.textContent = String(val);
    if (val <= 0) {
      clearInterval(it);
      triggerView.style.display = 'none';
      triggerView.setAttribute('aria-hidden', 'true');
      done();
    }
  }, 1000);
}

function showResponse() {
  // build choices: 1 correct + 3 random
  const choices = [{ ...expected, correct: true }];
  const avoid = [ expected ];
  while (choices.length < 4) {
    const c = randomRGB(50, avoid);
    avoid.push(c);
    choices.push({ ...c, correct: false });
  }
  // shuffle
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  // render
  paletteEl.innerHTML = '';
  choices.forEach((c, idx) => {
    const btn = document.createElement('button');
    btn.className = 'swatch';
    btn.setAttribute('aria-label', c.correct ? 'Correct color' : `Color ${idx+1}`);
    btn.dataset.r = c.r; btn.dataset.g = c.g; btn.dataset.b = c.b;
    btn.style.backgroundColor = rgbStyle(c);
    btn.addEventListener('click', onChoice);
    paletteEl.appendChild(btn);
  });

  responseView.style.display = 'block';
  responseView.removeAttribute('aria-hidden');
  responseStart = performance.now();
}

function onChoice(e) {
  const btn = e.currentTarget;
  const chosen = {
    r: Number(btn.dataset.r),
    g: Number(btn.dataset.g),
    b: Number(btn.dataset.b),
  };
  const matched = rgbEq(chosen, expected);
  const rtMs = Math.round(performance.now() - responseStart);

  // show RT
  rtValue.textContent = String(rtMs);
  rtRow.hidden = false;

  // submit to server (SpeedCongruency table)
  fetch('/api/speed-congruency/submit', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      trial_index: trialIndex,
      stimulus_id: stimulusId,
      expected: expected,          // {r,g,b}
      chosen: chosen,              // {r,g,b}
      response_ms: rtMs
    })
  }).then(r => r.json()).then(j => {
    // optional: toast/advance to next trial
    console.log('Saved:', j);
  }).catch(err => console.error('submit failed', err));
}

document.addEventListener('DOMContentLoaded', loadTrial);
