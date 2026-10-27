// Turns large photos into TV-ready wallpapers: 1920x1080 cover crop with the readability scrim
// baked in, saved as JPEG in src/img/wallpapers/, plus the catalog src/js/wallpapers.js.
// The scrim is part of the image so the TV never composites a gradient over a photo at runtime.
//
//   node scripts/prepare-wallpapers.mjs ~/Downloads/backgrounds
//
// Needs only Node and a Chromium browser, so it runs on macOS, Windows and Linux. Chrome or Edge
// is found in the usual places; set CHROME to the browser's executable to use another one.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, writeFileSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, delimiter, extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function findChrome() {
    if (process.env.CHROME) return process.env.CHROME;
    const env = process.env;
    const candidates = {
        darwin: [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
            '/Applications/Chromium.app/Contents/MacOS/Chromium'
        ],
        // Edge ships with Windows, so it is the fallback that is always there.
        win32: [env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA].filter(Boolean).flatMap((dir) => [
            join(dir, 'Google', 'Chrome', 'Application', 'chrome.exe'),
            join(dir, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
        ])
    }[process.platform] || (env.PATH || '').split(delimiter).flatMap((dir) =>
        ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge'].map((n) => join(dir, n)));
    const found = candidates.find((p) => existsSync(p));
    if (!found) {
        console.error('No Chrome or Edge found. Set CHROME to the path of a Chromium-based browser.');
        process.exit(1);
    }
    return found;
}

const CHROME = findChrome();
const sourceDir = resolve(process.argv[2] || '');
const root = resolve(import.meta.dirname, '..');
const outDir = join(root, 'src/img/wallpapers');

// Friendly names for known files (Unsplash file names: <photographer>-<id>-unsplash.jpg).
// `position` is the CSS background-position used for the crop.
const KNOWN = {
    'anders-jilden-cYrMQA7a3Wc-unsplash.jpg': { key: 'coast', title: 'Coast village', position: 'center 60%' },
    'jms-kFHz9Xh3PPU-unsplash.jpg': { key: 'valley-snow', title: 'Snowy valley' },
    'johannes-plenio-hvrpOmuMrAI-unsplash.jpg': { key: 'forest', title: 'Forest path' },
    'jonatan-pie-3l3RwQdHRHg-unsplash.jpg': { key: 'aurora', title: 'Aurora' },
    'jonatan-pie-h8nxGssjQXs-unsplash.jpg': { key: 'night-sky', title: 'Night sky' },
    'nasa-Q1p7bh3SHj8-unsplash.jpg': { key: 'earth', title: 'Earth at night' },
    'stefan-stefancik-TPv9dh822VA-unsplash.jpg': { key: 'milky-way', title: 'Milky Way' },
    'su-san-lee-E_eWwM29wfU-unsplash.jpg': { key: 'kyoto', title: 'Kyoto' },
    'urban-vintage-78A265wPiO4-unsplash.jpg': { key: 'hills', title: 'Golden hills' },
    'wil-stewart-pHANr-CpbYM-unsplash.jpg': { key: 'waterfall', title: 'Waterfall' }
};

// Darker at the top-left (clock) and towards the bottom (tiles and labels).
const SCRIM = [
    'radial-gradient(1300px 700px at 0% 0%, rgba(0,0,0,0.55), rgba(0,0,0,0) 70%)',
    'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.30) 30%, rgba(0,0,0,0.62) 62%, rgba(0,0,0,0.82) 100%)'
].join(',');

function credit(file) {
    const m = basename(file).match(/^(.*)-[A-Za-z0-9_-]{11}-unsplash\.jpe?g$/);
    if (!m) return '';
    return m[1].split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ') + ' on Unsplash';
}

if (!statSync(sourceDir, { throwIfNoEntry: false })?.isDirectory()) {
    console.error('Usage: node scripts/prepare-wallpapers.mjs <folder with photos>');
    process.exit(1);
}
const thumbDir = join(outDir, 'thumbs');
mkdirSync(thumbDir, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'wallpapers-'));

function chrome(args, url) {
    return execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--window-size=1920,1080',
        '--allow-file-access-from-files', '--virtual-time-budget=5000', `--user-data-dir=${join(tmp, 'profile')}`,
        ...args, url], { stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
}

// Headless Chrome only screenshots to PNG, so a second page re-encodes it in a canvas: the
// wallpaper as JPEG at 0.82 and the 320x180 thumbnail for the Settings picker at 0.78.
function encode(png, key) {
    const html = join(tmp, key + '-encode.html');
    writeFileSync(html, `<!DOCTYPE html><body><script>
        var img = new Image();
        img.onload = function () {
            function jpeg(w, h, q) {
                var c = document.createElement('canvas');
                c.width = w; c.height = h;
                var g = c.getContext('2d');
                g.imageSmoothingQuality = 'high';
                g.drawImage(img, 0, 0, w, h);
                return c.toDataURL('image/jpeg', q);
            }
            var out = document.createElement('pre');
            out.id = 'out';
            out.textContent = JSON.stringify([jpeg(1920, 1080, 0.82), jpeg(320, 180, 0.78)]);
            document.body.appendChild(out);
        };
        img.src = ${JSON.stringify(pathToFileURL(png).href)};
    </script></body>`);
    const dom = chrome(['--dump-dom'], pathToFileURL(html).href).toString();
    const m = dom.match(/<pre id="out">(.*?)<\/pre>/s);
    if (!m) throw new Error('Could not encode ' + key + ' (did Chrome block the file?)');
    const [full, small] = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'))
        .map((url) => Buffer.from(url.split(',')[1], 'base64'));
    writeFileSync(join(outDir, key + '.jpg'), full);
    writeFileSync(join(thumbDir, key + '.jpg'), small);
}

// The plain "Midnight" gradient (img/bg.jpg) is what "Off" shows, so it is not in the catalog.
const catalog = [];

for (const file of readdirSync(sourceDir).sort()) {
    if (!/\.(jpe?g|png|webp)$/i.test(file)) continue;
    const info = KNOWN[file] || { key: basename(file, extname(file)).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) };
    const title = info.title || info.key;
    const html = join(tmp, info.key + '.html');
    const png = join(tmp, info.key + '.png');
    const src = pathToFileURL(join(sourceDir, file)).href;
    writeFileSync(html, `<!DOCTYPE html><body style="margin:0;width:1920px;height:1080px;background:${SCRIM},` +
        `url('${src}') ${info.position || 'center'} / cover no-repeat #000"></body>`);
    chrome([`--screenshot=${png}`], pathToFileURL(html).href);
    encode(png, info.key);
    const out = join(outDir, info.key + '.jpg');
    catalog.push({ key: info.key, title, file: 'img/wallpapers/' + info.key + '.jpg', thumb: 'img/wallpapers/thumbs/' + info.key + '.jpg', credit: credit(file) });
    console.log(`${info.key}.jpg  ${(statSync(out).size / 1024).toFixed(0)} KB  ${credit(file)}`);
}
rmSync(tmp, { recursive: true, force: true });

writeFileSync(join(root, 'src/js/wallpapers.js'),
    '/* Generated by scripts/prepare-wallpapers.mjs. Photos: Unsplash License. */\n' +
    'window.WALLPAPERS = ' + JSON.stringify(catalog, null, 4) + ';\n');
console.log(`Wrote ${catalog.length} entries to src/js/wallpapers.js`);
