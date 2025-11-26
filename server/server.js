// server/server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const HF_TOKEN = process.env.HF_TOKEN;

// 💡 Text model: SmolLM3 chat LLM
const HF_CHAT_URL = "https://router.huggingface.co/v1/chat/completions";
const TEXT_MODEL = "HuggingFaceTB/SmolLM3-3B:hf-inference";

// 💡 Image model: Stable Diffusion (text → image)
const IMAGE_MODEL = "stabilityai/stable-diffusion-xl-base-1.0"; //stabilityai/stable-diffusion-xl-base-1.0
//other model = stabilityai/stable-diffusion-xl-base-1.0



// ---------------------------------------------------------------------
// 1) TEXT ROUTE  →  /api/hf  (SmolLM3 via chat/completions)
// ---------------------------------------------------------------------
app.post("/api/hf", async (req, res) => {
  try {
    const { inputs } = req.body; // we ignore 'model' from frontend

    if (!inputs || typeof inputs !== "string") {
      return res
        .status(400)
        .json({ error: "Missing 'inputs' (string) in request body" });
    }

    if (!HF_TOKEN) {
      console.warn("[WARN] HF_TOKEN is missing in .env");
    }

    console.log(
      "[HF TEXT REQUEST] ->",
      HF_CHAT_URL,
      "| model:",
      TEXT_MODEL,
      "| prompt:",
      inputs.slice(0, 100)
    );

    const hfResponse = await fetch(HF_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: TEXT_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful AI assistant. Respond clearly and do not include any hidden reasoning markup.",
          },
          {
            role: "user",
            content: inputs,
          },
        ],
      }),
    });

    const text = await hfResponse.text();
    let data;

    // Try to parse JSON — if fail, return raw text as error
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("[HF NON-JSON RESPONSE]", hfResponse.status, text);
      return res.status(hfResponse.status || 500).json({
        error: "HF returned non-JSON response",
        details: text,
        status: hfResponse.status,
      });
    }

    if (!hfResponse.ok) {
      console.error("[HF TEXT ERROR]", hfResponse.status, data);
      return res.status(hfResponse.status).json({
        error: "HF TEXT error",
        details: data,
        status: hfResponse.status,
      });
    }

    // Extract assistant's reply (OpenAI-style chat response)
    const content =
      data?.choices?.[0]?.message?.content ?? JSON.stringify(data);

    console.log(
      "[HF TEXT OK]",
      hfResponse.status,
      "| reply:",
      String(content).slice(0, 120)
    );

    // 👇 Frontend compatibility: same shape as old HF text-generation
    return res.json({ generated_text: content });
  } catch (err) {
    console.error("SERVER ERROR (TEXT):", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------
// 2) IMAGE ROUTE  →  /api/hf-image  (Stable Diffusion XL)
// ---------------------------------------------------------------------
app.post("/api/hf-image", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res
        .status(400)
        .json({ error: "Missing 'prompt' (string) in request body" });
    }

    if (!HF_TOKEN) {
      console.warn("[WARN] HF_TOKEN is missing in .env");
    }

    const IMAGE_API_URL = `https://router.huggingface.co/hf-inference/models/${IMAGE_MODEL}`;

    console.log(
      "[HF IMAGE REQUEST] ->",
      IMAGE_API_URL,
      "| prompt:",
      prompt.slice(0, 80)
    );

    const response = await fetch(IMAGE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "image/png", // ask for PNG
      },
      body: JSON.stringify({
        inputs: prompt,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[HF IMAGE ERROR]", response.status, text);
      return res.status(response.status || 500).json({
        error: "HF IMAGE error",
        details: text,
        status: response.status,
      });
    }

    // Image bytes → base64
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString("base64");

    console.log("[HF IMAGE OK]", "| bytes:", buffer.length);

    // Frontend-friendly data URL
    res.json({
      image: `data:image/png;base64,${base64Image}`,
    });
  } catch (err) {
    console.error("SERVER ERROR (IMAGE):", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------
// 3) START SERVER
// ---------------------------------------------------------------------
// app.listen(3001, () => {
//   console.log("Backend running on http://localhost:3001");
// });

// for deployment at  railway we need to
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
