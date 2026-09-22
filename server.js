const express = require("express");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { GoogleGenAI } = require("@google/genai");

const app = express();

const PORT = process.env.PORT || 3000;

const GEMINI_MODEL = "gemini-3.8-flash";

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY;

const REQUEST_LIMIT = "110mb";

const TARGET_FREE_BYTES =
  220 * 1024 * 1024;

const CLEANUP_BYTES =
  330 * 1024 * 1024;

const CACHE_DIR = path.join(
  os.tmpdir(),
  "onur-ai-cache"
);

const ai = GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: GEMINI_API_KEY
    })
  : null;

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, {
    recursive: true
  });
}

app.use(
  express.json({
    limit: REQUEST_LIMIT
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: REQUEST_LIMIT
  })
);

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);

function readyAnswer(message) {
  const text = message
    .trim()
    .toLowerCase();

  if (
    text === "merhaba" ||
    text === "selam" ||
    text === "sa"
  ) {
    return "Merhaba! Ben Onur AI. Sana nasıl yardımcı olabilirim?";
  }

  if (
    text.includes("sen kimsin") ||
    text.includes("adın ne") ||
    text.includes("adın nedir")
  ) {
    return "Ben Onur AI.";
  }

  if (
    text.includes("seni kim yaptı") ||
    text.includes("geliştiricin kim") ||
    text.includes("geliştiricini kim") ||
    text.includes("yapan kim")
  ) {
    return "Beni YouTuber Breynot_editzz yaptı.";
  }

  if (
    text.includes("çalışıyor musun") ||
    text.includes("calisiyor musun") ||
    text.includes("online mısın") ||
    text.includes("online misin")
  ) {
    return "Evet, Onur AI sunucusu çalışıyor!";
  }

  if (
    text.includes("ne yapabiliyorsun") ||
    text.includes("neler yapabiliyorsun")
  ) {
    return "Soruları cevaplayabilir, kod yazabilir, ders çalışmana yardımcı olabilir ve çeşitli konularda yardımcı olabilirim.";
  }

  if (
    text.includes("teşekkür") ||
    text.includes("tesekkur") ||
    text === "sağol" ||
    text === "sagol"
  ) {
    return "Rica ederim!";
  }

  if (
    text === "güle güle" ||
    text === "gule gule" ||
    text === "bay bay"
  ) {
    return "Görüşürüz!";
  }

  if (
    text === "test" ||
    text === "ping"
  ) {
    return "Onur AI çalışıyor!";
  }

  return null;
}

function getDiskInfo() {
  try {
    const stats =
      fs.statfsSync(CACHE_DIR);

    const total =
      stats.blocks *
      stats.bsize;

    const free =
      stats.bavail *
      stats.bsize;

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

function getCacheFiles() {
  try {
    return fs
      .readdirSync(CACHE_DIR)
      .map(name => {
        const filePath =
          path.join(
            CACHE_DIR,
            name
          );

        try {
          const stat =
            fs.statSync(filePath);

          if (!stat.isFile()) {
            return null;
          }

          return {
            path: filePath,
            size: stat.size,
            time: stat.mtimeMs
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function cleanCache() {
  const disk =
    getDiskInfo();

  if (!disk) {
    return 0;
  }

  if (
    disk.free >=
    TARGET_FREE_BYTES
  ) {
    return 0;
  }

  console.log(
    "Disk boş alanı 220 MB'ın altına düştü."
  );

  const files =
    getCacheFiles()
      .sort(
        (a, b) =>
          a.time - b.time
      );

  let deletedBytes = 0;

  for (const file of files) {
    if (
      deletedBytes >=
      CLEANUP_BYTES
    ) {
      break;
    }

    try {
      fs.unlinkSync(
        file.path
      );

      deletedBytes +=
        file.size;

      console.log(
        "Cache silindi:",
        path.basename(
          file.path
        )
      );
    } catch (error) {
      console.error(
        "Cache silinemedi:",
        error.message
      );
    }
  }

  console.log(
    "Temizlenen cache:",
    (
      deletedBytes /
      1024 /
      1024
    ).toFixed(2),
    "MB"
  );

  return deletedBytes;
}

function checkDisk() {
  const disk =
    getDiskInfo();

  if (!disk) {
    return;
  }

  const freeMB =
    disk.free /
    1024 /
    1024;

  console.log(
    `Render disk boş alanı: ${freeMB.toFixed(2)} MB`
  );

  if (
    disk.free <
    TARGET_FREE_BYTES
  ) {
    cleanCache();
  }
}

function saveCache(name, data) {
  try {
    const safeName =
      path.basename(name);

    const filePath =
      path.join(
        CACHE_DIR,
        safeName
      );

    fs.writeFileSync(
      filePath,
      data
    );

    checkDisk();

    return true;
  } catch (error) {
    console.error(
      "Cache kaydedilemedi:",
      error.message
    );

    cleanCache();

    return false;
  }
}

async function generateGemini(message) {
  if (!ai) {
    throw new Error(
      "GEMINI_API_KEY Render Environment Variables içinde bulunamadı."
    );
  }

  let lastError;

  for (
    let attempt = 1;
    attempt <= 5;
    attempt++
  ) {
    try {
      const response =
        await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: message
        });

      const answer =
        response?.text;

      if (
        answer &&
        answer.trim()
      ) {
        return answer.trim();
      }

      throw new Error(
        "Gemini boş cevap döndürdü."
      );
    } catch (error) {
      lastError = error;

      console.error(
        `Gemini denemesi ${attempt}/5 başarısız:`,
        error.message
      );

      if (
        attempt < 5
      ) {
        await new Promise(
          resolve =>
            setTimeout(
              resolve,
              attempt * 1500
            )
        );
      }
    }
  }

  throw (
    lastError ||
    new Error(
      "Gemini isteği başarısız."
    )
  );
}

app.get(
  "/",
  (req, res) => {
    res.json({
      status: "online",
      server:
        "Onur AI Server",
      model:
        GEMINI_MODEL,
      gemini:
        Boolean(GEMINI_API_KEY),
      requestLimit:
        REQUEST_LIMIT,
      cache:
        "onur-ai-cache"
    });
  }
);

app.get(
  "/health",
  (req, res) => {
    const disk =
      getDiskInfo();

    res.json({
      status: "online",
      server:
        "Onur AI Server",
      model:
        GEMINI_MODEL,
      geminiConfigured:
        Boolean(GEMINI_API_KEY),
      requestLimit:
        REQUEST_LIMIT,
      readyAnswers:
        true,
      cacheDirectory:
        CACHE_DIR,
      disk: disk
        ? {
            totalMB:
              (
                disk.total /
                1024 /
                1024
              ).toFixed(2),
            freeMB:
              (
                disk.free /
                1024 /
                1024
              ).toFixed(2),
            usedMB:
              (
                disk.used /
                1024 /
                1024
              ).toFixed(2)
          }
        : null,
      cleanup: {
        trigger:
          "220 MB boş alanın altı",
        amount:
          "330 MB'a kadar"
      }
    });
  }
);

app.post(
  "/api/chat",
  async (req, res) => {
    try {
      const {
        message
      } = req.body;

      if (
        !message ||
        typeof message !==
          "string"
      ) {
        return res
          .status(400)
          .json({
            success: false,
            error:
              "Mesaj gerekli."
          });
      }

      const ready =
        readyAnswer(message);

      if (ready) {
        return res.json({
          success: true,
          answer: ready,
          model:
            "ready-answer"
        });
      }

      const answer =
        await generateGemini(
          message
        );

      res.json({
        success: true,
        answer,
        model:
          GEMINI_MODEL
      });

    } catch (error) {
      console.error(
        "CHAT ERROR:",
        error
      );

      res
        .status(500)
        .json({
          success: false,
          error:
            error?.message ||
            "Yapay zekâ isteği başarısız."
        });
    }
  }
);

app.use(
  (req, res) => {
    res
      .status(404)
      .json({
        success: false,
        error:
          "Sayfa bulunamadı."
      });
  }
);

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "SERVER ERROR:",
      error
    );

    res
      .status(500)
      .json({
        success: false,
        error:
          "Sunucu hatası."
      });
  }
);

process.on(
  "uncaughtException",
  error => {
    console.error(
      "UNCAUGHT EXCEPTION:",
      error
    );
  }
);

process.on(
  "unhandledRejection",
  error => {
    console.error(
      "UNHANDLED REJECTION:",
      error
    );
  }
);

checkDisk();

setInterval(
  checkDisk,
  30000
);

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Onur AI ${PORT} portunda çalışıyor.`
    );

    console.log(
      "Gemini hazır:",
      Boolean(GEMINI_API_KEY)
    );

    console.log(
      "İstek limiti:",
      REQUEST_LIMIT
    );

    console.log(
      "Cache klasörü:",
      CACHE_DIR
    );

    console.log(
      "Hazır cevaplar: aktif"
    );
  }
);
