// Tell Bing, Yandex and other IndexNow engines that the site changed. Bing results also feed ChatGPT search and Copilot.
// Run after a deploy: npm run indexnow
// The key is public by design. The key file in public/ proves that this site owns it.
import fs from "node:fs";

const SITE = "https://iampatelom.com";
const keyFile = fs.readdirSync("public").find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) throw new Error("No IndexNow key file in public/");
const key = keyFile.replace(".txt", "");

const sitemap = await (await fetch(`${SITE}/sitemap.xml`)).text();
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
urlList.push(`${SITE}/llms.txt`, `${SITE}/llms-full.txt`);

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: new URL(SITE).host, key, keyLocation: `${SITE}/${keyFile}`, urlList })
});
console.log(`IndexNow: HTTP ${res.status} for ${urlList.length} URLs`);
if (res.status >= 300) process.exit(1);
