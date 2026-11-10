const gpStage       = document.getElementById("gpStage");
const gpNeedle      = document.getElementById("gpNeedle");
const instrumental  = document.getElementById("gpInstrumental");
const gpButterflies = document.getElementById("gpButterflies");

const SONG_FADE_OUT = 1500;   // transisi keluar
const SONG_FADE_IN  = 1500;   // transisi masuk
const INST_DELAY    = 900;    // durasi mulai habis pencet jarum
const INST_FADE_IN  = 2500;   // transisi masuk musik ke-1
const INST_FADE_OUT = 1200;   // transisi keluar musik ke-2

const INST_VOLUME   = 0.15;   // volume musik ke-2


function getSavedVolume() {

    try {

        const state = JSON.parse(sessionStorage.getItem("melodyMusicState")) || {};

        if (typeof state.volume === "number") {
            return Math.min(1, Math.max(0, state.volume));
        }

    } catch (_) {}

    return 0.25;

}


function fadeVolume(audio, to, duration, onDone) {

    const token = {};

    audio._fadeToken = token;

    const from  = audio.volume;
    const start = performance.now();

    function step(now) {

        if (audio._fadeToken !== token) return;

        const t = Math.min(1, (now - start) / duration);

        audio.volume = Math.min(1, Math.max(0, from + (to - from) * t));

        if (t < 1) {
            requestAnimationFrame(step);
        } else if (onDone) {
            onDone();
        }

    }

    requestAnimationFrame(step);

}


let played      = false;   // pas jarum kebuka
let carriedSong = null;    // langsung matiin musik awal
let instTimer   = null;


function startInstrumentalMode() {

    const music = window.MelodyMusic;
    const song  = music && music.getCurrent ? music.getCurrent() : null;

    if (song) carriedSong = song;


    if (carriedSong && !carriedSong.paused) {

        fadeVolume(carriedSong, 0, SONG_FADE_OUT, () => {
            carriedSong.pause();

            if (music && music.stop) music.stop();
        });

    } else if (music && music.stop) {

        music.stop();

    }

    clearTimeout(instTimer);

    instTimer = setTimeout(() => {

        if (!instrumental) return;

        instrumental.volume = 0;
        instrumental.currentTime = 0;

        instrumental.play()
            .then(() => fadeVolume(instrumental, INST_VOLUME, INST_FADE_IN))
            .catch(() => {});

    }, INST_DELAY);

}

function resumeSongMode() {

    clearTimeout(instTimer);

    if (instrumental && !instrumental.paused) {

        fadeVolume(instrumental, 0, INST_FADE_OUT, () => {
            instrumental.pause();
        });

    } else if (instrumental) {

        instrumental._fadeToken = {};

    }

    if (!carriedSong) return;

    const target = getSavedVolume();


    if (carriedSong.paused) {
        carriedSong.volume = 0;
    }

    carriedSong.play()
        .then(() => fadeVolume(carriedSong, target, SONG_FADE_IN))
        .catch(() => {});

}



const BUTTERFLY_COUNT  = 16;
const BUTTERFLY_COLORS = ["#f6b3c8", "#ffd3e2", "#fff1d6", "#f9c9a8", "#f2a5bf", "#fbdcc4"];

const BUTTERFLY_SVG = `
<svg viewBox="0 0 100 80" aria-hidden="true">
    <g class="gp-wing">
        <path class="gp-wing-shape" d="M50 38 C42 8 10 2 6 24 C3 40 30 47 50 42 Z"/>
        <path class="gp-wing-shape" d="M50 43 C36 46 14 54 22 68 C30 78 46 64 50 49 Z"/>
    </g>
    <g class="gp-wing">
        <path class="gp-wing-shape" d="M50 38 C58 8 90 2 94 24 C97 40 70 47 50 42 Z"/>
        <path class="gp-wing-shape" d="M50 43 C64 46 86 54 78 68 C70 78 54 64 50 49 Z"/>
    </g>
    <ellipse cx="50" cy="42" rx="3.2" ry="15" fill="#7b4425"/>
    <path d="M48.5 28 C45 18 41 14 38 13 M51.5 28 C55 18 59 14 62 13" stroke="#7b4425" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>`;

function scatterButterflies() {

    if (!gpButterflies) return;

    gpButterflies.innerHTML = "";

    for (let i = 0; i < BUTTERFLY_COUNT; i++) {

        const angle = (i / BUTTERFLY_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const dist  = 550 + Math.random() * 450;

        const dx = Math.sin(angle) * dist;
        const dy = -Math.cos(angle) * dist;

        const px = Math.cos(angle);
        const py = Math.sin(angle);

        const sway = (60 + Math.random() * 90) * (Math.random() < 0.5 ? -1 : 1);

        const points = [
            [0.3, sway],
            [0.6, -sway * 0.8],
            [1,   sway * 0.4]
        ].map(([t, offset]) => [
            (dx * t + px * offset).toFixed(1),
            (dy * t + py * offset).toFixed(1)
        ]);

        const el = document.createElement("div");

        el.className = "gp-bfly";
        el.innerHTML = BUTTERFLY_SVG;

        el.style.setProperty("--s",     (80 + Math.random() * 70).toFixed(0));
        el.style.setProperty("--c",     BUTTERFLY_COLORS[Math.floor(Math.random() * BUTTERFLY_COLORS.length)]);
        el.style.setProperty("--rot",   (angle * 180 / Math.PI).toFixed(1) + "deg");
        el.style.setProperty("--delay", (0.35 + Math.random() * 1).toFixed(2) + "s");
        el.style.setProperty("--dur",   (4.2 + Math.random() * 2).toFixed(2) + "s");
        el.style.setProperty("--flap",  (0.28 + Math.random() * 0.14).toFixed(2) + "s");

        points.forEach(([x, y], index) => {
            el.style.setProperty("--x" + (index + 1), x);
            el.style.setProperty("--y" + (index + 1), y);
        });

        gpButterflies.appendChild(el);

    }

}

gpNeedle.addEventListener("click", () => {

    played = !played;

    if (played) scatterButterflies();

    gpStage.classList.toggle("played", played);

    if (played) {
        startInstrumentalMode();
    } else {
        resumeSongMode();
    }

});