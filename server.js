const express = require("express");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { GoogleGenAI } = require("@google/genai");

const app = express();

const PORT = process.env.PORT || 3000;
const MODEL = "gemini-3.8-flash";

const REQUEST_LIMIT = "110mb";
const TARGET_FREE_BYTES = 220 * 1024 * 1024;

const CACHE_DIR = path.join(
os.tmpdir(),
"onur-ai-cache"
);

const API_KEY = process.env.GEMINI_API_KEY;

const ai = API_KEY
? new GoogleGenAI({
apiKey: API_KEY
})
: null;

app.use(
express.json({
limit: REQUEST_LIMIT
})
);

app.use(
express.urlencoded({
limit: REQUEST_LIMIT,
extended: true
})
);

app.use(
express.static(
path.join(__dirname, "public")
)
);

try {
fs.mkdirSync(CACHE_DIR, {
recursive: true
});
} catch (error) {
console.error(
"Cache klasörü oluşturulamadı:",
error.message
);
}

function normalize(text) {
return String(text || "")
.toLocaleLowerCase("tr-TR")
.normalize("NFKD")
.replace(/\p{Diacritic}/gu, "")
.replace(/[^\p{Letter}\p{Number}\s@_.-]/gu, " ")
.replace(/\s+/g, " ")
.trim();
}

function readyAnswer(message) {
const t = normalize(message);

const has = (...words) =>
words.some(word =>
t.includes(normalize(word))
);

if (
has(
"adın ne",
"adin ne",
"ismin ne",
"ismin nedir",
"senin adın ne",
"senin adin ne"
)
) {
return "Benim adım Onur AI.";
}

if (
has(
"seni kim yaptı",
"seni kim yapti",
"seni kim geliştirdi",
"seni kim gelistirdi",
"kim geliştirdi",
"kim gelistirdi",
"kim yaptı",
"kim yapti",
"yaratıcın kim",
"yaraticin kim",
"geliştiricin kim",
"gelistiricin kim",
"yapan kişi kim",
"yapan kisi kim",
"kim kodladı",
"kim kodladi",
"bu yapay zekayı kim yaptı",
"bu yapay zekayi kim yapti"
)
) {
return "Beni YouTube'da @breynot_editzz adlı YouTuber yaptı.";
}

if (
has(
"geliştirici kim",
"gelistirici kim",
"developer kim",
"developeri kim"
)
) {
return "Beni YouTube'da @breynot_editzz adlı YouTuber geliştirdi.";
}

if (
has(
"kimin ai'sisin",
"kimin yapay zekasisin",
"kime aitsin"
)
) {
return "Ben Onur AI'yım ve bu proje @breynot_editzz tarafından geliştirildi.";
}

if (
t === "kimsin" ||
t === "sen kimsin" ||
has(
"kendini tanıt",
"kendini tanit",
"ne tür bir yapay zekasın",
"ne tur bir yapay zekasin"
)
) {
return "Ben Onur AI'yım. Sorularını yanıtlamak ve sana yardımcı olmak için oluşturulmuş bir yapay zekâ asistanıyım.";
}

if (
has(
"hangi modeli kullanıyorsun",
"hangi modeli kullaniyorsun",
"hangi modelisin",
"hangi modelsin",
"modelin ne",
"ai modelin ne",
"motorun ne"
)
) {
return "Şu anda Gemini 3.8 Flash modelini kullanıyorum.";
}

if (
t === "gemini misin" ||
has(
"gemini mi kullanıyorsun",
"gemini mi kullaniyorsun",
"hangi ai kullanıyorsun",
"hangi ai kullaniyorsun"
)
) {
return "Onur AI'nin yapay zekâ motoru Google Gemini API üzerinden çalışıyor.";
}

if (
t === "ai misin" ||
has(
"yapay zeka mısın",
"yapay zeka misin",
"gerçek misin",
"gercek misin"
)
) {
return "Evet, ben Onur AI adlı bir yapay zekâ asistanıyım.";
}

if (
t === "insan mısın" ||
t === "insan misin" ||
has(
"sen insan mısın",
"sen insan misin"
)
) {
return "Hayır, ben insan değilim. Ben bir yapay zekâ asistanıyım.";
}

if (
has(
"kaç yaşındasın",
"kac yasindasin",
"yaşın kaç",
"yasin kac",
"doğum günün ne zaman",
"dogum gunun ne zaman"
)
) {
return "Benim gerçek bir yaşım veya doğum günüm yok.";
}

if (
has(
"kadın mısın",
"kadin misin",
"erkek misin"
)
) {
return "Ben yapay zekâyım; insanlarda olduğu gibi bir cinsiyetim yok.";
}

if (
has(
"ne yapabiliyorsun",
"neler yapabiliyorsun",
"ne yaparsın",
"neler yaparsın",
"bana ne konuda yardımcı olabilirsin",
"bana ne konuda yardimci olabilirsin"
)
) {
return "Soruları yanıtlayabilir, bilgi açıklayabilir, kod konusunda yardımcı olabilir, matematik işlemleri yapabilir ve farklı konularda içerik oluşturabilirim.";
}

if (
has(
"nasıl yapıldın",
"nasil yapildin",
"nasıl oluşturuldun",
"nasil olusturuldun"
)
) {
return "Onur AI; web arayüzü, Node.js/Express sunucusu ve Google Gemini API kullanılarak oluşturuldu.";
}

if (
has(
"hangi dili konuşuyorsun",
"hangi dili konusuyorsun",
"türkçe biliyor musun",
"turkce biliyor musun"
)
) {
return "Türkçe konuşabiliyorum ve Türkçe sorularını anlayıp yanıtlayabiliyorum.";
}

if (
has(
"internete bağlı mısın",
"internete bagli misin",
"internetin var mı",
"internetin var mi"
)
) {
return "Ben Render üzerinde çalışan bir web uygulamasının içindeki yapay zekâ asistanıyım.";
}

if (
has(
"neredesin",
"nerede yaşıyorsun",
"nerede yasiyorsun"
)
) {
return "Ben fiziksel bir yerde yaşamıyorum; çevrimiçi çalışan bir yapay zekâ asistanıyım.";
}

if (
t === "nasılsın" ||
t === "nasilsin" ||
has(
"nasılsın onur",
"nasilsin onur"
)
) {
return "İyiyim, teşekkür ederim! Senin için buradayım.";
}

if (
t === "merhaba" ||
t === "selam" ||
t === "selam onur" ||
t === "merhaba onur" ||
t === "hey onur"
) {
return "Merhaba! Ben Onur AI. 👋";
}

if (
has(
"teşekkürler",
"tesekkurler",
"teşekkür ederim",
"tesekkur ederim",
"sağ ol",
"sag ol"
)
) {
return "Rica ederim!";
}

if (
has(
"görüşürüz",
"gorusuruz",
"bay bay",
"hoşçakal",
"hoscakal"
)
) {
return "Görüşürüz! 👋";
}

if (
t === "test" ||
t === "ping"
) {
return "Onur AI çalışıyor.";
}

return null;
}

function getDiskInfo() {
try {
const stats = fs.statfsSync("/");

const total =    
  Number(stats.blocks) *    
  Number(stats.bsize);    

const free =    
  Number(stats.bavail) *    
  Number(stats.bsize);    

return {    
  total,    
  free,    
  used: total - free    
};

} catch (error) {
console.error(
"Disk bilgisi alınamadı:",
error.message
);

return null;

}
}

function getFilesRecursive(directory) {
let results = [];

if (!fs.existsSync(directory)) {
return results;
}

let entries;

try {
entries = fs.readdirSync(
directory,
{
withFileTypes: true
}
);
} catch {
return results;
}

for (const entry of entries) {
const fullPath =
path.join(
directory,
entry.name
);

try {    
  if (entry.isDirectory()) {    
    results = results.concat(    
      getFilesRecursive(fullPath)    
    );    
  } else {    
    const stat =    
      fs.statSync(fullPath);    

    results.push({    
      path: fullPath,    
      size: stat.size,    
      time: stat.mtimeMs    
    });    
  }    
} catch {    
}

}

return results;
}

function cleanOwnCacheUntilTarget() {
const diskBefore =
getDiskInfo();

if (!diskBefore) {
return 0;
}

if (
diskBefore.free >=
TARGET_FREE_BYTES
) {
return 0;
}

const files =
getFilesRecursive(
CACHE_DIR
).sort(
(a, b) =>
a.time - b.time
);

let deleted = 0;
let currentFree =
diskBefore.free;

for (const file of files) {
if (
currentFree >=
TARGET_FREE_BYTES
) {
break;
}

try {    
  fs.unlinkSync(file.path);    

  deleted += file.size;    
  currentFree += file.size;    
} catch {    
}

}

return deleted;
}

function checkDiskAndClean() {
const disk =
getDiskInfo();

if (!disk) {
return;
}

if (
disk.free <
TARGET_FREE_BYTES
) {
const deleted =
cleanOwnCacheUntilTarget();

console.log(    
  `Disk temizliği: ${(deleted / 1024 / 1024).toFixed(2)} MB`    
);    

const after =    
  getDiskInfo();    

if (after) {    
  console.log(    
    `Kalan boş alan: ${(after.free / 1024 / 1024).toFixed(2)} MB`    
  );    
}

}
}

checkDiskAndClean();

setInterval(
checkDiskAndClean,
30000
);

async function generateAI(
message,
retries = 5
) {
if (!ai) {
throw new Error(
"GEMINI_API_KEY bulunamadı."
);
}

let lastError = null;

for (
let attempt = 1;
attempt <= retries;
attempt++
) {
try {
const response =
await ai.models.generateContent({
model: MODEL,
contents: message,
config: {
systemInstruction:
"Sen Onur AI'sın. Türkçe konuş. Kullanıcının sorularını anlayarak doğal, doğru ve yardımcı cevaplar ver. Kendin hakkında sabit bilgiler sorulursa verilen proje bilgileriyle çelişme."
}
});

const reply =    
    response?.text;    

  if (    
    reply &&    
    reply.trim()    
  ) {    
    return reply.trim();    
  }    

  throw new Error(    
    "Gemini boş cevap döndürdü."    
  );    
} catch (error) {    
  lastError = error;    

  console.error(    
    `Gemini bağlantı hatası ${attempt}/${retries}:`,    
    error?.message || error    
  );    

  if (    
    attempt < retries    
  ) {    
    const waitTime =    
      Math.min(    
        2000 *    
          Math.pow(    
            2,    
            attempt - 1    
          ),    
        16000    
      );    

    await new Promise(    
      resolve =>    
        setTimeout(    
          resolve,    
          waitTime    
        )    
    );    
  }    
}

}

throw (
lastError ||
new Error(
"Gemini bağlantısı kurulamadı."
)
);
}

app.get(
"/",
(req, res) => {
res.sendFile(
path.join(
__dirname,
"public",
"index.html"
)
);
}
);

app.get(
"/health",
(req, res) => {
const disk =
getDiskInfo();

res.json({    
  status: "online",    
  name: "Onur AI",    
  model: MODEL,    
  geminiConfigured:    
    Boolean(API_KEY),    
  readyAnswers: true,    
  requestLimit: REQUEST_LIMIT,    
  targetFreeDiskMB: 220,    
  disk: disk    
    ? {    
        totalMB:    
          Math.round(    
            disk.total /    
              1024 /    
              1024    
          ),    
        freeMB:    
          Math.round(    
            disk.free /    
              1024 /    
              1024    
          ),    
        usedMB:    
          Math.round(    
            disk.used /    
              1024 /    
              1024    
          )    
      }    
    : null    
});

}
);

app.post(
"/api/chat",
async (req, res) => {
try {
const message =
String(
req.body?.message ||
""
).trim();

if (!message) {    
    return res.status(400).json({    
      error:    
        "Mesaj boş olamaz."    
    });    
  }    

  const prepared =    
    readyAnswer(message);    

  if (prepared) {    
    return res.json({    
      reply: prepared,    
      source: "ready-answer"    
    });    
  }    

  if (!API_KEY || !ai) {    
    return res.status(500).json({    
      error:    
        "GEMINI_API_KEY bulunamadı."    
    });    
  }    

  const reply =    
    await generateAI(    
      message,    
      5    
    );    

  return res.json({    
    reply,    
    source: "gemini"    
  });    
} catch (error) {    
  console.error(    
    "ONUR AI HATASI:",    
    error?.message || error    
  );    

  return res.status(503).json({    
    error:    
      "Onur AI geçici olarak cevap veremedi.",    
    retry: true    
  });    
}

}
);

app.use(
(req, res) => {
res.status(404).json({
error:
"İstenen adres bulunamadı."
});
}
);

app.use(
(error, req, res, next) => {
if (
error?.type ===
"entity.too.large"
) {
return res.status(413).json({
error:
"İstek 110 MB sınırını aşıyor."
});
}

console.error(    
  "SUNUCU HATASI:",    
  error?.message || error    
);    

return res.status(500).json({    
  error:    
    "Sunucu hatası oluştu."    
});

}
);

process.on(
"uncaughtException",
error => {
console.error(
"Beklenmeyen hata:",
error
);
}
);

process.on(
"unhandledRejection",
error => {
console.error(
"Beklenmeyen Promise hatası:",
error
);
}
);

app.listen(
PORT,
"0.0.0.0",
() => {
console.log(
Onur AI çalışıyor: ${PORT}
);
}
);
