import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON body
  app.use(express.json());

  // API Route for chat proxy to OpenRouter
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, model, providedKey } = req.body;
      
      const apiKey = providedKey || process.env.OPENROUTER_API_KEY;
      const targetModel = model || "mistralai/mistral-7b-instruct:free";

      if (!apiKey) {
        return res.status(401).json({ 
          error: "No OpenRouter API key found. Please provide one in the UI or set OPENROUTER_API_KEY in the environment." 
        });
      }

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": process.env.APP_URL || "http://localhost:3000", // Required by OpenRouter for ranking
          "X-Title": "Minimalist Chat App", // Required by OpenRouter for ranking
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: targetModel,
          messages: messages,
          // We can enable streaming if desired, but for simplicity we'll keep it false first
          // unless we want to implement SSE
        })
      });

      if (!response.ok) {
        let errText = await response.text();
        return res.status(response.status).json({ error: `OpenRouter Error: ${errText}` });
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Chat API Error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
