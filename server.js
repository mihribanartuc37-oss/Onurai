const express = require("express");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { GoogleGenAI } = require("@google/genai");
const { InferenceClient } = require("@huggingface/inference");

const app = express();

const PORT = process.env.PORT || 3000;
const MODEL = "gemini-3.8-flash";
const HF_MODEL = "openai/gpt-oss-120b";

const REQUEST_LIMIT = "110mb";
const TARGET_FREE_BYTES = 220 * 1024 * 1024;

const API_KEY = process.env.GEMINI_API_KEY;
const HF_TOKEN = process.env.HF_TOKEN;

const ai = API_KEY
  ? new GoogleGenAI({
      apiKey: API_KEY
    })
  : null;

const hf = HF_TOKEN
  ? new InferenceClient(HF_TOKEN)
  : null;

const CACHE_DIR = path.join(
  os.tmpdir(),
  "onur-ai-cache"
);

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
    limit: REQUEST_LIMIT,
    extended: true
  })
);

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);

function cleanupCache() {
  try {
    const disk = fs.statfsSync("/");
    const freeBytes =
      disk.bavail * disk.bsize;

    if (freeBytes >= TARGET_FREE_BYTES) {
      return;
    }

    const files = fs
      .readdirSync(CACHE_DIR)
      .map((name) => {
        const fullPath =
          path.join(CACHE_DIR, name);

        try {
          const stat =
            fs.statSync(fullPath);

          return {
            path: fullPath,
            size: stat.size,
            time: stat.mtimeMs
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          a.time - b.time
      );

    for (const file of files) {
      try {
        fs.unlinkSync(file.path);
      } catch {}

      const currentDisk =
        fs.statfsSync("/");

      const currentFree =
        currentDisk.bavail *
        currentDisk.bsize;

      if (
        currentFree >=
        TARGET_FREE_BYTES
      ) {
        break;
      }
    }
  } catch (error) {
    console.error(
      "Cache temizleme hatası:",
      error.message
    );
  }
}

cleanupCache();

setInterval(
  cleanupCache,
  30 * 1000
);

function readyAnswer(message) {
  const text = String(message)
    .toLowerCase()
    .trim();

  if (
    text === "merhaba" ||
    text === "selam" ||
    text === "sa"
  ) {
    return "Merhaba! Ben Onur AI. Sana nasıl yardımcı olabilirim?";
  }

  if (
    text.includes("sen kimsin") ||
    text.includes("adın ne")
  ) {
    return "Ben Onur AI. Yapay zekâ destekli bir asistanım.";
  }

  if (
    text.includes("onur ai nedir") ||
    text.includes("onur ai ne")
  ) {
    return "Onur AI, Gemini ve Hugging Face modelleriyle çalışan yapay zekâ asistanıdır.";
  }

  if (
    text.includes("hangi model") ||
    text.includes("hangi yapay zeka")
  ) {
    return `Metin işlemlerinde Hugging Face ${HF_MODEL} ve Gemini kullanılabilir.`;
  }

  return null;
}

async function generateAI(message) {
  if (!ai) {
    throw new Error(
      "GEMINI_API_KEY Render Environment Variables içinde bulunamadı."
    );
  }

  let lastError;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response =
        await ai.models.generateContent({
          model: MODEL,
          contents: message,
          config: {
            systemInstruction: `
Sen Onur AI'sın.

Kullanıcıyla Türkçe konuş.
Cevapların anlaşılır, yardımcı ve doğrudan olsun.
Gereksiz yere çok uzun cevap verme.
`
          }
        });

      return (
        response.text ||
        "Cevap alınamadı."
      );
    } catch (error) {
      lastError = error;

      const wait =
        Math.pow(2, attempt) * 1000;

      await new Promise(
        (resolve) =>
          setTimeout(resolve, wait)
      );
    }
  }

  throw lastError;
}

async function generateHF(
  message,
  mode = "Düşün"
) {
  if (!hf) {
    throw new Error(
      "HF_TOKEN Render Environment Variables içinde bulunamadı."
    );
  }

  let systemPrompt = `
Sen Onur AI'sın.

Kullanıcıyla Türkçe konuş.
Cevaplarını anlaşılır ve yardımcı şekilde ver.

Aktif özellik:
${mode}
`;

  if (mode === "Ders çalıştır") {
    systemPrompt += `
Kullanıcıya konuyu öğret.
Adım adım açıkla.
Gerekirse örnekler kullan.
`;
  }

  if (mode === "Derin düşün") {
    systemPrompt += `
Soruyu dikkatlice analiz et.
Sonucu anlaşılır şekilde açıkla.
`;
  }

  if (mode === "Araştır") {
    systemPrompt += `
Soruyu bilgi odaklı ele al.
Kesin olmayan bilgileri kesinmiş gibi sunma.
`;
  }

  if (mode === "Oyun yap") {
    systemPrompt += `
Oyun geliştirme konusunda kod ve uygulanabilir çözümler üret.
`;
  }

  if (mode === "Düşün") {
    systemPrompt += `
Soruyu normal bir yapay zekâ asistanı gibi cevapla.
`;
  }

  const result =
    await hf.chatCompletion({
      model: HF_MODEL,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 2048
    });

  const answer =
    result?.choices?.[0]?.message?.content;

  if (!answer) {
    throw new Error(
      "Hugging Face boş cevap döndürdü."
    );
  }

  return answer;
}

app.get("/", (req, res) => {
  const indexPath =
    path.join(
      __dirname,
      "public",
      "index.html"
    );

  if (!fs.existsSync(indexPath)) {
    return res.status(404).send(
      "public/index.html bulunamadı."
    );
  }

  res.sendFile(indexPath);
});

app.get("/health", (req, res) => {
  let diskInfo = {};

  try {
    const disk =
      fs.statfsSync("/");

    diskInfo = {
      freeBytes:
        disk.bavail *
        disk.bsize,

      freeMB: Math.round(
        (disk.bavail * disk.bsize) /
          1024 /
          1024
      )
    };
  } catch {}

  res.json({
    status: "online",
    server: "Onur AI Server",

    gemini: {
      configured: !!API_KEY,
      model: MODEL
    },

    huggingface: {
      configured: !!HF_TOKEN,
      model: HF_MODEL
    },

    requestLimit: REQUEST_LIMIT,
    disk: diskInfo
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const {
      message,
      mode = "Düşün",
      provider = "huggingface"
    } = req.body;

    if (
      !message ||
      typeof message !== "string"
    ) {
      return res.status(400).json({
        success: false,
        error: "Mesaj gerekli."
      });
    }

    const ready =
      readyAnswer(message);

    if (ready) {
      return res.json({
        success: true,
        answer: ready,
        model: "ready-answer",
        mode
      });
    }

    let answer;
    let usedModel;

    if (provider === "gemini") {
      answer =
        await generateAI(message);

      usedModel = MODEL;
    } else {
      answer =
        await generateHF(
          message,
          mode
        );

      usedModel = HF_MODEL;
    }

    res.json({
      success: true,
      answer,
      model: usedModel,
      mode,
      provider:
        provider === "gemini"
          ? "gemini"
          : "huggingface"
    });
  } catch (error) {
    console.error(
      "CHAT ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      error:
        error?.message ||
        "Yapay zekâ isteği başarısız."
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error:
      "Sayfa veya endpoint bulunamadı."
  });
});

app.use(
  (
    err,
    req,
    res,
    next
  ) => {
    console.error(
      "SERVER ERROR:",
      err
    );

    if (res.headersSent) {
      return next(err);
    }

    res.status(500).json({
      success: false,
      error:
        err?.message ||
        "Sunucu hatası."
    });
  }
);

process.on(
  "uncaughtException",
  (error) => {
    console.error(
      "UNCAUGHT EXCEPTION:",
      error
    );
  }
);

process.on(
  "unhandledRejection",
  (error) => {
    console.error(
      "UNHANDLED REJECTION:",
      error
    );
  }
);

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Onur AI sunucusu ${PORT} portunda çalışıyor.`
    );

    console.log(
      `Hugging Face: ${
        HF_TOKEN
          ? "AKTİF"
          : "AYARLANMADI"
      }`
    );

    console.log(
      `Gemini: ${
        API_KEY
          ? "AKTİF"
          : "AYARLANMADI"
      }`
    );

    console.log(
      `HF Model: ${HF_MODEL}`
    );
  }
);
