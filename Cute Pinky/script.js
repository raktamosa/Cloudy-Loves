(function () {

    const STORAGE_KEY = "melodyMusicState";
    const SAVE_INTERVAL = 500; //  supaya GA NULIS terlalu sering

    let lastSave = 0;
    let currentAudio = null; // biar muter semua halaman, KEREN KAN WKWKWK

    function readState() {

        try {

            return JSON.parse(
                sessionStorage.getItem(STORAGE_KEY)
            ) || {};

        } catch (_) {

            return {};

        }

    }

    function writeState(patch) {

        try {

            sessionStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ ...readState(), ...patch })
            );

        } catch (_) {}

    }

    function save(audio, force) {

        if (!audio || audio.paused) return;

        const now = Date.now();

        if (!force && now - lastSave < SAVE_INTERVAL) return;

        lastSave = now;

        writeState({
            src: audio.getAttribute("src") || audio.src,
            time: audio.currentTime,
            playing: true,
            savedAt: now
        });

    }

    function stop() {

        writeState({ playing: false });

    }

    function setVolume(volume) {

        writeState({ volume: volume });

    }

    function resume() {

        if (document.getElementById("radioDial")) return;

        if (currentAudio) {

            currentAudio.pause();
            currentAudio = null;

        }

        const state = readState();

        if (!state.playing || !state.src) return;

        const audio = new Audio(state.src);

        currentAudio = audio;

        if (typeof state.volume === "number") {

            audio.volume = Math.min(1, Math.max(0, state.volume));

        }
        function targetPosition() {

            return (state.time || 0) +
                (Date.now() - (state.savedAt || Date.now())) / 1000;

        }

        function start() {

            const position = targetPosition();

            if (position >= audio.duration) {

                stop();
                return;

            }

            audio.currentTime = position;

            audio.play().catch(() => {

                const events = ["click", "keydown", "touchend"];

                const unlock = () => {

                    events.forEach(name =>
                        document.removeEventListener(name, unlock, true)
                    );

                    const position = targetPosition();

                    if (position < audio.duration) {

                        audio.currentTime = position;
                        audio.play().catch(() => {});

                    }

                };

                events.forEach(name =>
                    document.addEventListener(name, unlock, true)
                );

            });

        }

        audio.addEventListener("loadedmetadata", start, { once: true });

        audio.addEventListener("timeupdate", () => save(audio));

        audio.addEventListener("ended", stop);

    }

    window.addEventListener("pagehide", () => {

        if (currentAudio) save(currentAudio, true);

    });

    window.addEventListener("pageshow", event => {

        if (event.persisted) resume();

    });

    if (document.readyState === "loading") {

        document.addEventListener("DOMContentLoaded", resume);

    } else {

        resume();

    }

    window.MelodyMusic = {
        save, stop, setVolume,

        getCurrent: () => currentAudio
    };

})();

if (document.getElementById("radioDial")) {
const dial = document.getElementById("radioDial");
const rotor = document.getElementById("dialRotor");
const statusText = document.getElementById("stationStatus");
const nextPageLink = document.getElementById("nextPageLink");

const music = window.MelodyMusic || {
    save() {},
    stop() {},
    setVolume() {}
};

const songs = [
    document.getElementById("song1"),
    document.getElementById("song2"),
    document.getElementById("song3")
];

const stations = [
    {
        angle: -45,
        name: "Melody One",
        audio: songs[0]
    },
    {
        angle: 0,
        name: "Melody Two",
        audio: songs[1]
    },
    {
        angle: 45,
        name: "Melody Three",
        audio: songs[2]
    }
];

let currentAngle = 0;
let previousPointerAngle = null;
let isDragging = false;
let activeStation = -1;

let audioContext = null;
let noiseSource = null;
let noiseGain = null;

songs.forEach(song => {

    if (!song) return;

    song.addEventListener("timeupdate", () => music.save(song));

});

window.addEventListener("pagehide", () => {

    const playingSong = songs.find(song => song && !song.paused);

    if (playingSong) {

        music.save(playingSong, true);

    } else {

        music.stop();

    }

});

function setDialAngle(angle) {

    currentAngle = Math.min(
        Math.max(angle, -55),
        55
    );

    rotor.style.transform =
        `rotate(${currentAngle}deg)`;

    dial.setAttribute(
        "aria-valuenow",
        String(Math.round(currentAngle))
    );
}

function getPointerAngle(event) {

    const rect = dial.getBoundingClientRect();

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;

    return Math.atan2(dy, dx) * (180 / Math.PI) + 90;
}

function shortestAngleDifference(next, previous) {

    return ((next - previous + 540) % 360) - 180;
}

async function startRadioStatic() {

    const AudioContextClass =
        window.AudioContext ||
        window.webkitAudioContext;

    if (!AudioContextClass) return;

    try {

        if (!audioContext) {
            audioContext = new AudioContextClass();
        }

        if (audioContext.state === "suspended") {
            await audioContext.resume();
        }

        if (noiseSource) return;

        const bufferSize = audioContext.sampleRate;

        const noiseBuffer = audioContext.createBuffer(
            1,
            bufferSize,
            audioContext.sampleRate
        );

        const channelData = noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {

            channelData[i] =
                (Math.random() * 2 - 1) * 0.7;

        }

        noiseSource = audioContext.createBufferSource();

        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;

        noiseGain = audioContext.createGain();

        noiseGain.gain.setValueAtTime(
            0.0001,
            audioContext.currentTime
        );

        noiseGain.gain.linearRampToValueAtTime(
            0.055,
            audioContext.currentTime + 0.08
        );

        noiseSource.connect(noiseGain);
        noiseGain.connect(audioContext.destination);

        noiseSource.start();

    } catch (error) {

        console.warn(
            "Radio static tidak dapat dimainkan:",
            error
        );

    }
}

function stopRadioStatic() {

    if (!noiseSource || !audioContext) return;

    const sourceToStop = noiseSource;
    const gainToStop = noiseGain;

    noiseSource = null;
    noiseGain = null;

    try {

        gainToStop.gain.cancelScheduledValues(
            audioContext.currentTime
        );

        gainToStop.gain.setTargetAtTime(
            0.0001,
            audioContext.currentTime,
            0.025
        );

        setTimeout(() => {

            try {

                sourceToStop.stop();
                sourceToStop.disconnect();
                gainToStop.disconnect();

            } catch (_) {}

        }, 120);

    } catch (error) {

        console.warn(
            "Radio static gagal dihentikan:",
            error
        );

    }
}

function stopAllSongs() {

    songs.forEach(song => {

        if (!song) return;

        song.pause();
        song.currentTime = 0;

    });

}

function playStation(index) {

    if (index === activeStation) return;

    stopAllSongs();

    activeStation = index;

    updateNextButton(true);

    const station = stations[index];

    statusText.textContent =
        `Now playing: ${station.name}`;

    if (station.audio) {

        station.audio.play().catch(() => {

            statusText.textContent =
                `${station.name} selected — tap the dial again if audio is blocked`;

        });

    }

}

function checkStation() {

    const tolerance = 18;

    stations.forEach((station, index) => {

        if (
            Math.abs(currentAngle - station.angle)
            <= tolerance
        ) {

            if (!isDragging) {

                setDialAngle(station.angle);

                playStation(index);

            }

        }

    });

}

function beginDrag(event) {

    event.preventDefault();

    dial.setPointerCapture(event.pointerId);

    isDragging = true;
    updateNextButton(false);

    previousPointerAngle = getPointerAngle(event);

    songs.forEach(song => {
        song.pause();
    });

    activeStation = -1;

    music.stop();

    startRadioStatic();

    statusText.textContent =
        "Searching for a melody...";
}

function moveDial(event) {

    if (!isDragging) return;

    const pointerAngle = getPointerAngle(event);

    const difference = shortestAngleDifference(
        pointerAngle,
        previousPointerAngle
    );

    previousPointerAngle = pointerAngle;

    setDialAngle(currentAngle + difference);

    checkStation();

}

function endDrag() {

    if (!isDragging) return;

    isDragging = false;

    previousPointerAngle = null;

    const tolerance = 18;

    const foundStation = stations.findIndex(station =>
        Math.abs(currentAngle - station.angle) <= tolerance
    );

    if (foundStation !== -1) {

        stopRadioStatic();

        setDialAngle(stations[foundStation].angle);

        playStation(foundStation);

    } else {

        statusText.textContent =
            "Searching for a melody...";

    }

}

dial.addEventListener("pointerdown", beginDrag);

dial.addEventListener("pointermove", moveDial);

dial.addEventListener("pointerup", endDrag);

dial.addEventListener("pointercancel", endDrag);

dial.addEventListener("lostpointercapture", endDrag);

dial.addEventListener("keydown", event => {

    if (
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight"
    ) {

        event.preventDefault();

        const direction =
            event.key === "ArrowRight" ? 1 : -1;

        startRadioStatic();

        setDialAngle(currentAngle + direction * 5);

        checkStation();

        clearTimeout(dial.keyboardTimer);

        dial.keyboardTimer = setTimeout(() => {

            stopRadioStatic();

            if (activeStation === -1) {

                statusText.textContent =
                    "No channel selected — keep tuning";

            }

        }, 250);

    }

});

const volumeSlider = document.getElementById("volumeSlider");
const volumeValue = document.getElementById("volumeValue");

let masterVolume = 0.25;

function updateVolume() {

    masterVolume = Math.min(1, Number(volumeSlider.value) / 50);

    volumeValue.textContent =
        `${volumeSlider.value}%`;

    songs.forEach(song => {
        song.volume = masterVolume;
    });

  
    music.setVolume(masterVolume);

    if (noiseGain && audioContext) {
        noiseGain.gain.setTargetAtTime(
            masterVolume * 0.18,
            audioContext.currentTime,
            0.03
        );
    }
}

updateVolume();

volumeSlider.addEventListener("input", updateVolume);

function updateNextButton(enabled) {

    if (enabled) {

        nextPageLink.textContent =
            "Continue to Our Story →";

        nextPageLink.setAttribute(
            "aria-disabled",
            "false"
        );

        nextPageLink.removeAttribute("tabindex");

    } else {

        nextPageLink.textContent =
            "Drag the dial to tune in";

        nextPageLink.setAttribute(
            "aria-disabled",
            "true"
        );

        nextPageLink.setAttribute("tabindex", "-1");

    }

}
 
}
document.addEventListener("DOMContentLoaded", function () {
  const cardPairs = document.querySelectorAll(".card-pair");

  cardPairs.forEach((pair) => {
    pair.addEventListener("click", function (e) {
   
      this.classList.toggle("active");
    });
  });
});

(function () {

  const pairs = document.querySelectorAll(".card-pair");

  if (!pairs.length) return;

  const PAPER_VOLUME = 0.5;   
  const COOLDOWN     = 700;   

  let ctx = null;
  let paperBuffer = null;
  let lastPlay = 0;

  function getContext() {

    const AC = window.AudioContext || window.webkitAudioContext;

    if (!AC) return null;

    if (!ctx) ctx = new AC();

    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    return ctx;

  }

  ["pointerdown", "touchstart", "keydown"].forEach(name =>
    document.addEventListener(name, getContext, { passive: true })
  );

  function buildPaperBuffer(c) {

    const length = Math.floor(c.sampleRate * 0.6);
    const buffer = c.createBuffer(1, length, c.sampleRate);
    const data   = buffer.getChannelData(0);

    let crinkle = 1;

    for (let i = 0; i < length; i++) {

      const t = i / c.sampleRate;

      if (i % Math.floor(c.sampleRate * 0.012) === 0) {
        crinkle = 0.25 + Math.random() * 0.75;
      }

      const attack = Math.min(1, t / 0.05);
      const decay  = Math.pow(1 - t / 0.6, 1.6);

      data[i] = (Math.random() * 2 - 1) * attack * decay * crinkle;

    }

    return buffer;

  }

  function playPaper() {

    const now = Date.now();

    if (now - lastPlay < COOLDOWN) return;

    const c = getContext();

    if (!c || c.state !== "running") return;

    lastPlay = now;

    if (!paperBuffer) paperBuffer = buildPaperBuffer(c);

    const source = c.createBufferSource();
    source.buffer = paperBuffer;
    source.playbackRate.value = 0.9 + Math.random() * 0.2;

    const highpass = c.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 900;

    const bandpass = c.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 3200;
    bandpass.Q.value = 0.6;

    const gain = c.createGain();
    gain.gain.value = PAPER_VOLUME;

    source.connect(highpass);
    highpass.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(c.destination);

    source.start();

  }

  const canHover = window.matchMedia("(hover: hover)").matches;

  pairs.forEach(pair => {

    if (canHover) {
      pair.addEventListener("mouseenter", playPaper);
    }

    pair.addEventListener("click", () => {

      if (canHover) return;

      setTimeout(() => {
        if (pair.classList.contains("active")) playPaper();
      }, 0);

    });

  });

})();

(function () {
  "use strict";

  const pair = document.querySelector(".pair-2");
  if (!pair) return;

  const page = pair.querySelector(".cal-page");
  const img = pair.querySelector(".cal-img");
  if (!page || !img) return;

  
  const STRIPS     = 160;     // ukuran gulungan
  const HINGE      = 0.25;   // titik gulungan berhenti (13% dari atas)
  const ROLL_R     = 0.08;  // jari-jari gulungan
  const THICK      = 0.0006; // tebal kertas 
  const RAMP       = 8;      // jumlah strip untuk transisi halus lurus -> melengkung
  const OPEN_MS    =1200    ;   // durasi menggulung ke atas
  const CLOSE_MS   = 1000;   // durasi menutup lagi
  const BACK_COLOR = "#eab4c0"; // warna punggung kertas

  const canHover = window.matchMedia("(hover: hover)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const easeOpen  = (u) => 1 - Math.pow(1 - u, 3);
  const easeClose = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  let root = null;      
  let strips = [];       
  let H = 0;
  let K = 0;            
  let d = 0;             
  let e = 0;             

  let progress = 0;      
  let anim = null;       
  let raf = 0;


  function shape(el, src, i, sh) {
    const s = el.style;
    s.webkitMaskImage = s.maskImage = 'url("' + src + '")';
    s.webkitMaskSize = s.maskSize = "100% " + H + "px";
    s.webkitMaskPosition = s.maskPosition = "0 " + -(i * sh) + "px";
    s.webkitMaskRepeat = s.maskRepeat = "no-repeat";
  }

  function build() {
    const w = img.clientWidth;
    const h = img.clientHeight;
    if (!w || !h) return false;

    if (root) root.remove();
    H = h;
    const sh = H / STRIPS;
    K = Math.round(HINGE * STRIPS);
    d = sh / (H * ROLL_R);
    e = H * THICK;

    root = document.createElement("div");
    root.className = "cal-roll";
    strips = [];

    const src = img.currentSrc || img.src;
    let parent = root;

    for (let i = 0; i < STRIPS; i++) {
      const el = document.createElement("div");
      el.className = "cal-strip";
      el.style.top = (i === 0 ? 0 : sh) + "px";
      el.style.height = (i === STRIPS - 1 ? sh : sh + 1) + "px"; 

      const front = document.createElement("div");
      front.className = "cal-face cal-front";
      front.style.backgroundImage = 'url("' + src + '")';
      front.style.backgroundSize = "100% " + H + "px";
      front.style.backgroundPosition = "0 " + -(i * sh) + "px";
      const fShade = document.createElement("i");
      shape(fShade, src, i, sh);  
      front.appendChild(fShade);

      const back = document.createElement("div");
      back.className = "cal-face cal-back";
      back.style.background = BACK_COLOR;
      shape(back, src, i, sh);    
      const bShade = document.createElement("i");
      back.appendChild(bShade);

      el.appendChild(front);
      el.appendChild(back);
      parent.appendChild(el);
      parent = el;

      strips.push({ el, fShade, bShade });
    }

    page.appendChild(root);
    apply(progress);
    return true;
  }

  function apply(p) {
    if (!strips.length) return;

    const fEnd = K + 1 - RAMP;           
    const front = STRIPS - (STRIPS - fEnd) * p; 
    let cum = 0;

    for (let i = 0; i < STRIPS; i++) {
      const wgt = i < K ? 0 : clamp((i + 1 - front) / RAMP, 0, 1);
      const a = d * wgt;
      cum += a;

      const s = strips[i];
      s.el.style.transform =
        "translateZ(" + (-e * wgt).toFixed(3) + "px) rotateX(" + a.toFixed(4) + "rad)";

      const sn = Math.sin(cum), cs = Math.cos(cum);
      const lit = 0.5 * sn + 0.85 * cs;
      s.fShade.style.opacity = (0.2 * Math.max(0, 0.85 - lit)).toFixed(3);
      s.bShade.style.opacity = (0.2 * Math.max(0, 0.85 + lit)).toFixed(3);
    }

    const rolling = p > 0.0005;
    page.classList.toggle("rolling", rolling);
  }

  function tick(now) {
    if (!anim) return;
    const u = clamp((now - anim.start) / anim.dur, 0, 1);
    const f = anim.to > anim.from ? easeOpen : easeClose;
    progress = anim.from + (anim.to - anim.from) * f(u);
    apply(progress);
    if (u < 1) {
      raf = requestAnimationFrame(tick);
    } else {
      progress = anim.to;
      apply(progress);
      anim = null;
    }
  }

  function goTo(target) {
    if (!root && !build()) return;
    if (anim && anim.to === target) return;
    if (!anim && progress === target) return;
    cancelAnimationFrame(raf);
    const span = Math.abs(target - progress);
    anim = {
      from: progress,
      to: target,
      start: performance.now(),
      dur: Math.max(120, span * (target > progress ? OPEN_MS : CLOSE_MS)),
    };
    raf = requestAnimationFrame(tick);
  }

  function isOpen() {
    return pair.classList.contains("active") || (canHover && pair.matches(":hover"));
  }
  const sync = () => goTo(isOpen() ? 1 : 0);

  if (canHover) {
    pair.addEventListener("mouseenter", sync);
    pair.addEventListener("mouseleave", sync);
  }
  pair.addEventListener("click", () => setTimeout(sync, 0));
  new MutationObserver(sync).observe(pair, { attributes: true, attributeFilter: ["class"] });

  let resizeT;
  window.addEventListener("resize", () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      if (!anim) build();
    }, 150);
  });

  function init() {
    build();
  }
  if (img.complete && img.naturalWidth) init();
  else img.addEventListener("load", init);
  window.addEventListener("load", () => { if (!root) build(); });
})();