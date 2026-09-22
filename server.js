const express = require("express");
const { GoogleGenAI } = require("@google/genai");

const app = express();

const PORT = process.env.PORT || 3000;
const REQUEST_LIMIT = "110mb";

const GEMINI_MODEL = "gemini-3.8-flash";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: GEMINI_API_KEY
    })
  : null;

const MAX_MESSAGES = 20;
const conversation = [];

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

app.use(express.static("public"));

function readyAnswer(message) {
  const text = message.trim().toLowerCase();

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

function addMessage(role, text) {
  conversation.push({
    role,
    text
  });

  while (conversation.length > MAX_MESSAGES) {
    conversation.shift();
  }
}

function getConversation() {
  return conversation.map(message => ({
    role: message.role === "user" ? "user" : "model",
    parts: [
      {
        text: message.text
      }
    ]
  }));
}

async function generateGemini() {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY Render Environment Variables içinde bulunamadı."
    );
  }

  if (!ai) {
    throw new Error(
      "Gemini bağlantısı başlatılamadı."
    );
  }

  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: getConversation(),
        config: {
          systemInstruction:
            "Sen Onur AI'sın. Türkçe konuş. Açık, doğru ve yardımcı cevaplar ver."
        }
      });

      const answer = response?.text?.trim();

      if (!answer) {
        throw new Error(
          "Gemini boş cevap döndürdü."
        );
      }

      return answer;
    } catch (error) {
      lastError = error;

      console.error(
        `Gemini bağlantı hatası ${attempt}/3:`,
        error.message
      );

      if (attempt < 3) {
        await new Promise(resolve =>
          setTimeout(resolve, attempt * 1500)
        );
      }
    }
  }

  throw lastError;
}

app.get("/", (req, res) => {
  res.json({
    status: "online",
    server: "Onur AI Server",
    model: GEMINI_MODEL,
    geminiConfigured: Boolean(GEMINI_API_KEY),
    requestLimit: REQUEST_LIMIT,
    conversationLimit: MAX_MESSAGES,
    cache: false
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "online",
    server: "Onur AI Server",
    geminiConfigured: Boolean(GEMINI_API_KEY),
    model: GEMINI_MODEL,
    conversationMessages: conversation.length,
    conversationLimit: MAX_MESSAGES,
    cache: false
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const message =
      typeof req.body?.message === "string"
        ? req.body.message.trim()
        : "";

    if (!message) {
      return res.status(400).json({
        success: false,
        error: "Mesaj gerekli."
      });
    }

    const ready = readyAnswer(message);

    if (ready) {
      addMessage("user", message);
      addMessage("model", ready);

      return res.json({
        success: true,
        answer: ready,
        model: "ready-answer"
      });
    }

    addMessage("user", message);

    const answer = await generateGemini();

    addMessage("model", answer);

    res.json({
      success: true,
      answer,
      model: GEMINI_MODEL,
      conversationMessages: conversation.length
    });
  } catch (error) {
    console.error("CHAT ERROR:", error);

    if (
      conversation.length > 0 &&
      conversation[conversation.length - 1].role === "user"
    ) {
      conversation.pop();
    }

    res.status(500).json({
      success: false,
      error:
        error?.message ||
        "Gemini bağlantısı başarısız."
    });
  }
});

app.delete("/api/chat/history", (req, res) => {
  conversation.length = 0;

  res.json({
    success: true,
    message: "Sohbet geçmişi temizlendi."
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Sayfa bulunamadı."
  });
});

process.on("uncaughtException", error => {
  console.error("UNCAUGHT EXCEPTION:", error);
});

process.on("unhandledRejection", error => {
  console.error("UNHANDLED REJECTION:", error);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Onur AI ${PORT} portunda çalışıyor.`);
  console.log(
    "Gemini:",
    GEMINI_API_KEY ? "HAZIR" : "API KEY YOK"
  );
  console.log("Model:", GEMINI_MODEL);
});
