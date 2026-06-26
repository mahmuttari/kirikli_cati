// Tek dosyalık HTML üretici: css + data + app -> ../Kuran-Yolculugu.html
const fs = require("fs");
const path = require("path");
const dir = __dirname;
const css = fs.readFileSync(path.join(dir, "css/style.css"), "utf8");
const data = fs.readFileSync(path.join(dir, "js/data.js"), "utf8");
const app = fs.readFileSync(path.join(dir, "js/app.js"), "utf8");
const html =
  '<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8" />' +
  '<meta name="viewport" content="width=device-width, initial-scale=1.0" />' +
  "<title>Kuran Yolculugu</title>" +
  '<link rel="preconnect" href="https://fonts.googleapis.com" />' +
  '<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&family=Amiri:wght@700&display=swap" rel="stylesheet" />' +
  "<style>\n" + css + "\n</style></head><body>" +
  '<div id="app"></div>' +
  "<script>\n" + data + "\n</script>" +
  "<script>\n" + app + "\n</script>" +
  "</body></html>";
fs.writeFileSync(path.join(dir, "..", "Kuran-Yolculugu.html"), html);
console.log("Kuran-Yolculugu.html yazıldı:", html.length, "bayt");
