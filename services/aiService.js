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
      
      Greeting Rule:
      - If the user says "Hi", "Hello", or initiates the conversation, YOU MUST ALWAYS reply exactly with:
      "Hello! 👋 Welcome to ReLeaf Pads.
      
      We're happy to help you with comfortable, thoughtful menstrual care. 💚
      
      What would you like to do today?
      1. 🛍️ Shop
      2. 📦 Track
      3. 📜 My Orders
      4. 🛒 Cart
      
      (Please reply with a number or tell me what you need help with!)"

      Rules:
      - Keep your responses concise (under 2-3 sentences max) because this is a WhatsApp chat.
      - Use emojis occasionally (🌿, 💚, etc.).
      - Always be polite, warm, and professional.
      - If they ask to track or view orders, tell them to check the app, as you don't have their account data yet.
    `;
  }

  async generateReply(userMessage) {
    // If no API key is provided, use the hardcoded app greeting
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dummy_key_to_prevent_crash') {
      const lower = userMessage.toLowerCase();
      if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey')) {
        return "Hello! 👋 Welcome to ReLeaf Pads.\n\nWe're happy to help you with comfortable, thoughtful menstrual care. 💚\n\nWhat would you like to do today?\n1. 🛍️ Shop\n2. 📦 Track\n3. 📜 My Orders\n4. 🛒 Cart\n\n(Note: My AI brain is offline right now, so a human will reply to any other questions shortly! 🌿)";
      }
      return "Thanks for your message! A human agent will be with you shortly to help. 💚";
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
