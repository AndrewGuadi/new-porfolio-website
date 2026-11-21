import {icon} from './icons.js';

const layoutKey = 'my-smarter-homes.voice-layout.v1';
const speechErrors = {
  'not-allowed': 'Microphone access was denied. Allow it in your browser or type a command.',
  'service-not-allowed': 'The browser blocked its speech service. You can type a command.',
  'audio-capture': 'No microphone is available. Connect one or type a command.',
  network: 'The speech service could not connect. You can type a command.',
  'no-speech': 'No speech detected. Tap the mic to try again.',
  aborted: 'Listening stopped.'
};

export function setupVoiceControl(runCommand, unlockAudio) {
  const dialog = document.getElementById('voiceDialog');
  const home = document.getElementById('voiceDockHome');
  const viewer = document.getElementById('viewer');
  const resize = document.getElementById('resizeVoice');
  const listen = document.getElementById('listenBtn');
  const input = document.getElementById('commandInput');
  const status = document.getElementById('voiceState');
  const triggers = ['voiceBtn', 'stageVoice'].map(id => document.getElementById(id));
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const canSpeak = Boolean(Recognition && window.isSecureContext);
  const idleText = canSpeak ? 'Microphone idle.' : 'Voice input unavailable. Type a command.';
  let preferredLayout = 'full';
  let recognition = null;
  let opener = triggers[0];

  try {
    if (localStorage.getItem(layoutKey) === 'compact') preferredLayout = 'compact';
  } catch {}
  listen.hidden = !canSpeak;

  function paintMicrophone(active) {
    const label = active ? 'Stop listening' : 'Start listening';
    listen.setAttribute('aria-label', label);
    listen.setAttribute('aria-pressed', String(active));
    listen.title = label;
    listen.classList.toggle('recording', active);
    listen.innerHTML = `${icon(active ? 'sound' : 'mic')}<span class="listen-label">${label}</span>`;
  }

  function stopListening() {
    const session = recognition;
    if (!session) return;
    recognition = null;
    session.onstart = session.onresult = session.onerror = session.onend = null;
    try { session.abort(); } catch {}
    paintMicrophone(false);
    status.textContent = idleText;
  }

  function send(text) {
    const command = text.trim();
    if (!command) return;
    input.value = command;
    status.textContent = runCommand(command);
  }

  function startListening() {
    if (!canSpeak || recognition || !dialog.open) return;
    unlockAudio();
    try {
      const session = new Recognition();
      recognition = session;
      session.lang = 'en-US';
      session.continuous = false;
      session.interimResults = false;
      let heard = false;
      session.onstart = () => {
        if (recognition === session) status.textContent = 'Listening for a command…';
      };
      session.onresult = event => {
        if (recognition !== session || !dialog.open) return;
        const transcript = Array.from(event.results)
          .slice(event.resultIndex)
          .map(result => result[0].transcript)
          .join(' ').trim();
        if (transcript) {
          heard = true;
          send(transcript);
        }
      };
      session.onerror = event => {
        if (recognition !== session) return;
        stopListening();
        status.textContent = speechErrors[event.error] || 'Speech recognition ended. Try again or type a command.';
      };
      session.onend = () => {
        if (recognition !== session) return;
        recognition = null;
        paintMicrophone(false);
        if (!heard) status.textContent = 'Listening ended. Tap the mic to try again.';
      };
      paintMicrophone(true);
      status.textContent = 'Waiting for microphone access…';
      session.start();
    } catch {
      stopListening();
      status.textContent = 'The microphone could not start. You can type a command.';
    }
  }

  function host() {
    const fullscreen = document.fullscreenElement === viewer || viewer.classList.contains('expanded-mode');
    return fullscreen ? viewer : home;
  }

  // Switching modality requires closing and re-showing the native dialog. Its controls and
  // microphone session stay alive through that synchronous transition.
  function display(layout, focusTarget) {
    if (dialog.open) dialog.close();
    const target = host();
    if (dialog.parentElement !== target) target.append(dialog);
    const compact = layout === 'compact';
    dialog.dataset.layout = layout;
    dialog.setAttribute('aria-label', compact ? 'Compact voice control' : 'Voice control');
    dialog.setAttribute('aria-modal', String(!compact));
    const label = compact ? 'Expand' : 'Minimize';
    resize.innerHTML = `${icon(compact ? 'expand' : 'minus')}<span class="voice-size-label">${label}</span>`;
    resize.setAttribute('aria-label', `${label} voice control`);
    resize.title = `${label} voice control`;
    input.placeholder = compact ? 'Type a command' : 'Turn off the fireplace';
    if (compact) dialog.show();
    else dialog.showModal();
    for (const button of triggers) button.setAttribute('aria-expanded', 'true');
    const focus = focusTarget || (compact && canSpeak ? listen : resize);
    focus.focus({preventScroll: true});
  }

  function changeLayout(layout) {
    preferredLayout = layout;
    try { localStorage.setItem(layoutKey, layout); } catch {}
    display(layout);
  }

  function open(trigger) {
    if (dialog.open) {
      if (dialog.dataset.layout === 'compact') changeLayout('full');
      return;
    }
    opener = trigger || (host() === viewer ? triggers[1] : triggers[0]);
    input.value = '';
    status.textContent = idleText;
    display(preferredLayout);
  }

  function dismiss() {
    stopListening();
    dialog.close();
    const focus = opener?.getClientRects().length ? opener : (host() === viewer ? triggers[1] : triggers[0]);
    focus.focus({preventScroll: true});
  }

  function syncHost() {
    if (dialog.parentElement === host()) return;
    if (!dialog.open) {
      host().append(dialog);
      return;
    }
    const focus = dialog.contains(document.activeElement) ? document.activeElement : null;
    display(dialog.dataset.layout, focus);
  }

  for (const button of triggers) {
    button.setAttribute('aria-controls', dialog.id);
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', () => open(button));
  }
  resize.addEventListener('click', () => changeLayout(dialog.dataset.layout === 'full' ? 'compact' : 'full'));
  document.getElementById('closeVoice').addEventListener('click', dismiss);
  listen.addEventListener('click', () => recognition ? stopListening() : startListening());
  document.getElementById('voiceForm').addEventListener('submit', event => {
    event.preventDefault();
    send(input.value);
    if (dialog.dataset.layout === 'compact' && matchMedia('(pointer: coarse)').matches) input.blur();
  });
  for (const example of dialog.querySelectorAll('.example-cmd')) {
    example.addEventListener('click', () => send(example.textContent));
  }
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    dismiss();
  });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape' && dialog.dataset.layout === 'compact') {
      event.preventDefault();
      event.stopPropagation();
      dismiss();
    }
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog || dialog.dataset.layout !== 'full') return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dismiss();
  });
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    stopListening();
    for (const button of triggers) button.setAttribute('aria-expanded', 'false');
  });
  new ResizeObserver(() => {
    if (dialog.open && dialog.parentElement === viewer && dialog.dataset.layout === 'compact') {
      viewer.style.setProperty('--compact-voice-height', `${dialog.offsetHeight}px`);
    }
  }).observe(dialog);
  window.addEventListener('pagehide', stopListening);
  paintMicrophone(false);
  return {open, syncHost, get modalOpen() { return dialog.open && dialog.dataset.layout === 'full'; }};
}
