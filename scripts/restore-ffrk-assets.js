const fs = require("node:fs");
const path = require("node:path");
const { pipeline } = require("node:stream/promises");
const { Readable } = require("node:stream");

const root = path.resolve(__dirname, "..");
const baseUrl = "https://xn--ffrk-8i9hs14f.gamematome.jp/game/780/wiki/";
const outputRoot = path.join(root, "images", "ffrk");
const series = ["FF1", "FF2", "FF3", "FF4", "FF5", "FF6", "FF7", "FF8", "FF9", "FF10", "FF11", "FF12", "FF13", "FF14", "FF15", "FFT", "外伝", "零式", "KH", "その他"];
const pages = [
  { prefix: "ボス_", folder: (game) => `Boss_${seriesFolder(game)}` },
  { prefix: "モンスター_", folder: (game) => `Monster_${seriesFolder(game)}` },
  { prefix: "キャラクター_", folder: () => "Character_Jobs" },
  { prefix: "キャラクター(ジョブ別)_", folder: (game) => `Character_Job_${jobFolders[game] || game}` }
];
const jobs = ["シーフ", "シューター", "ナイト", "モンク", "侍", "召喚士", "忍者", "戦士I", "戦士II", "機工士", "竜騎士", "魔女", "魔法剣士", "魔道士I", "魔道士II"];
const concurrency = Number(process.env.FFRK_CONCURRENCY || 8);

function seriesFolder(game) {
  return game === "外伝" ? "Spinoffs" : game === "零式" ? "Type_Zero" : game === "その他" ? "Other" : game;
}

const jobFolders = { "シーフ": "Thief", "シューター": "Shooter", "ナイト": "Knight", "モンク": "Monk", "侍": "Samurai", "召喚士": "Summoner", "忍者": "Ninja", "戦士I": "Warrior_I", "戦士II": "Warrior_II", "機工士": "Machinist", "竜騎士": "Dragoon", "魔女": "Witch", "魔法剣士": "Spellblade", "魔道士I": "Mage_I", "魔道士II": "Mage_II" };

function parseEntries(html) {
  const entries = [];
  const pattern = /<img[^>]+src=["'](https?:\/\/[^"']+\/([0-9a-f-]+)\.png)["'][^>]*>[\s\S]*?<a[^>]+href=["'][^"']+["'][^>]*>\s*([^<]+?)\s*<\/a>/gi;
  let match;
  while ((match = pattern.exec(html))) {
    const name = match[3].trim();
    if (name && !name.includes("公式") && !name.includes("トップページ")) entries.push({ id: match[2], url: match[1] });
  }
  return entries;
}

function safe(value) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/\s+/g, " ").trim() || "Other";
}

async function fetchEntries(page) {
  const response = await fetch(baseUrl + encodeURIComponent(page));
  if (!response.ok) throw new Error(`${page}: HTTP ${response.status}`);
  return parseEntries(await response.text());
}

async function download(item) {
  const destination = path.join(outputRoot, item.folder, `${item.id}.png`);
  if (fs.existsSync(destination) && fs.statSync(destination).size > 0) return;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const response = await fetch(item.url, { headers: { "user-agent": "phantom-canvas-game asset restore" } });
  if (!response.ok || !response.body) throw new Error(`${item.url}: HTTP ${response.status}`);
  const temporary = `${destination}.part`;
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(temporary));
  fs.renameSync(temporary, destination);
}

async function main() {
  const assets = new Map();
  for (const category of pages) {
    const names = category.prefix.startsWith("キャラクター(ジョブ別)") ? jobs : series;
    for (const suffix of names) {
      const page = category.prefix + suffix;
      process.stdout.write(`Reading ${page}\n`);
      for (const entry of await fetchEntries(page)) {
        assets.set(`${category.folder(suffix)}|${entry.id}`, { ...entry, folder: safe(category.folder(suffix)) });
      }
    }
  }
  const list = [...assets.values()];
  let next = 0, done = 0, failed = [];
  async function worker() {
    while (next < list.length) {
      const item = list[next++];
      try { await download(item); } catch (error) { failed.push({ ...item, error: error.message }); }
      done++;
      if (done % 100 === 0 || done === list.length) process.stdout.write(`\rDownloaded ${done}/${list.length}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, worker));
  process.stdout.write("\n");
  fs.writeFileSync(path.join(root, "ffrk", "restore-failures.json"), JSON.stringify(failed, null, 2) + "\n");
  if (failed.length) process.exitCode = 1;
  console.log(`Restored ${list.length - failed.length} assets; ${failed.length} failed.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
