const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const baseUrl = "https://xn--ffrk-8i9hs14f.gamematome.jp/game/780/wiki/";
const outputPath = path.join(root, "ffrk", "entity-image-map.json");
const series = ["FF1", "FF2", "FF3", "FF4", "FF5", "FF6", "FF7", "FF8", "FF9", "FF10", "FF11", "FF12", "FF13", "FF14", "FF15", "FFT", "外伝", "零式", "KH", "その他"];
const categories = [
  { type: "bosses", page: "ボス_" },
  { type: "monsters", page: "モンスター_" },
  { type: "characters", page: "キャラクター_" }
];

function imageFolder(category) {
  const match = category.match(/(FF\d+|FFT|KH|Other|Spinoffs|Type_Zero|外伝|零式)$/);
  const series = match ? match[1] : "Other";
  const seriesFolder = { 外伝: "Spinoffs", 零式: "Type_Zero" }[series] || series;
  if (category.startsWith("ボス_")) return `Boss_${seriesFolder}`;
  if (category.startsWith("モンスター_")) return `Monster_${seriesFolder}`;
  if (category.startsWith("キャラクター(ジョブ別)_")) {
    const jobs = { シーフ: "Thief", シューター: "Shooter", ナイト: "Knight", モンク: "Monk", 侍: "Samurai", 召喚士: "Summoner", 忍者: "Ninja", 戦士I: "Warrior_I", 戦士II: "Warrior_II", 機工士: "Machinist", 竜騎士: "Dragoon", 魔女: "Witch", 魔法剣士: "Spellblade", 魔道士I: "Mage_I", 魔道士II: "Mage_II" };
    return `Character_Job_${jobs[category.slice(13)] || "Knight"}`;
  }
  return "Character_Jobs";
}

function decode(value) {
  return decodeURIComponent(value).replace(/\\([()])/g, "$1");
}

function parseEntries(markdown) {
  const entries = [];
  const pattern = /<img[^>]+src=["'](https?:\/\/[^"']+\/([0-9a-f-]+)\.png)["'][^>]*>[\s\S]*?<a[^>]+href=["'][^"']+["'][^>]*>\s*([^<]+?)\s*<\/a>/gi;
  let match;
  while ((match = pattern.exec(markdown))) {
    const name = match[3].trim();
    if (name && !name.includes("公式") && !name.includes("トップページ")) {
      entries.push({ name, imageId: match[2] });
    }
  }
  return entries;
}

async function fetchPage(page) {
  const response = await fetch(baseUrl + encodeURIComponent(page));
  if (!response.ok) throw new Error(`${page}: HTTP ${response.status}`);
  return response.text();
}

async function main() {
  const imageIndex = JSON.parse(fs.readFileSync(path.join(root, "ffrk", "images", "index.json"), "utf8"));
  const localImages = Object.fromEntries(imageIndex.map((item) => [item.id, `images/ffrk/${imageFolder(item.category)}/${item.id}.png`]));
  const result = {};
  for (const category of categories) {
    for (const game of series) {
      const page = category.page + game;
      process.stdout.write(`Reading ${page}\n`);
      const entries = parseEntries(await fetchPage(page));
      entries.forEach((entry) => {
        const localFile = localImages[entry.imageId];
        if (!localFile) return;
        const key = `${category.type}|${game}|${entry.name}`;
        result[key] = localFile;
      });
    }
  }
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + "\n");
  process.stdout.write(`Wrote ${Object.keys(result).length} mappings to ${outputPath}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
