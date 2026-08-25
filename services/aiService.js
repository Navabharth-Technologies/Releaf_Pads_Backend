require('dotenv').config();
const { OpenAI } = require('openai');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'dummy_key_to_prevent_crash'
    });
    
    this.systemPrompt = `
      You are a friendly and knowledgeable customer support assistant for "ReLeaf Pads", an eco-friendly and sustainable menstruation products brand.
      
      Key Information:
      - ReLeaf Pads are made from biodegradable materials.
      - They are highly absorbent, comfortable, and safe for the skin (chemical-free).
      - We offer various pack sizes and custom subscriptions.
      - Delivery usually takes 2-4 business days.
      
      Rules:
      - Keep your responses concise (under 2-3 sentences max) because this is a WhatsApp chat.
      - Use emojis occasionally (🌿, 💚, etc.).
      - Always be polite, warm, and professional.
      - If a user asks about their specific order status, tell them to check the "Track Order" section in the app or website, as you do not have direct access to their account data yet.
    `;
  }

  async generateReply(userMessage) {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dummy_key_to_prevent_crash') {
      return "Hi there! I am ReLeaf's AI assistant. My AI brain is currently disconnected (missing API key), but a human agent will be with you shortly! 🌿";
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: this.systemPrompt },
          { role: "user", content: userMessage }
        ],
        max_tokens: 150,
      });

      return completion.choices[0].message.content.trim();
    } catch (error) {
      console.error("OpenAI Error:", error.message);
      return "I'm having a little trouble thinking right now. A human will get back to you soon! 💚";
    }
  }
}

module.exports = new AIService();
