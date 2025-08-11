const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();

// Security middleware
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(cors({ origin: ["http://localhost:5173", "http://localhost:8080"] })); // Add your app origins
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Simple authentication
app.use((req, res, next) => {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : "";
  if (!process.env.BACKEND_AUTH_TOKEN || token === process.env.BACKEND_AUTH_TOKEN) return next();
  return res.status(401).json({ error: "Unauthorized" });
});

// Proxy endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages[] is required" });
    }

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages,
        temperature: 0.2
      })
    });

    const data = await r.json();
    res.status(r.ok ? 200 : r.status).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Proxy running on :${port}`));
