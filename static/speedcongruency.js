// Speed Congruency interactions
(function(){
  const triggerView = document.getElementById('triggerView');
  const responseView = document.getElementById('responseView');
  const countNum = document.getElementById('countNum');
  const rtRow = document.getElementById('rtRow');
  const rtValue = document.getElementById('rtValue');

  let countdown = 3; // 3,2,1
  let reactionStart = null;

  function showResponse(){
    triggerView.setAttribute('aria-hidden','true');
    triggerView.style.display = 'none';

    responseView.removeAttribute('aria-hidden');
    responseView.style.display = 'block';

    // Start internal timer as soon as response view appears
    reactionStart = performance.now();
  }

  // Initialize: show trigger, start countdown
  function startCountdown(){
    countNum.textContent = String(countdown);
    const int = setInterval(()=>{
      countdown -= 1;
      if(countdown >= 1){
        countNum.textContent = String(countdown);
      }else{
        clearInterval(int);
        // After reaching 0, swap views immediately
        showResponse();
      }
    }, 1000);
  }

  // Handle color clicks, compute RT
  function handleChoice(e){
    const swatch = e.target.closest('.swatch');
    if(!swatch) return;
    if(reactionStart == null) return;

    const rt = Math.round(performance.now() - reactionStart);
    rtValue.textContent = rt.toString();
    rtRow.hidden = false;

    // You could store submission here:
    console.log('Selected color:', swatch.dataset.color, 'RT(ms):', rt);
    // Optionally disable further clicks
    document.querySelectorAll('.swatch').forEach(b=>b.disabled = true);
  }

  // Setup
  responseView.style.display = 'none';
  document.querySelector('.palette').addEventListener('click', handleChoice);

  // Kick things off
  startCountdown();
})();