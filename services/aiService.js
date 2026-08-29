class AIService {
  constructor() {}

  async generateReply(userMessage) {
    const msg = userMessage.toLowerCase().trim();

    // Greeting / Main Menu
    if (msg === 'hi' || msg === 'hello' || msg === 'hey' || msg === 'menu') {
      return "Hello! 👋 Welcome to ReLeaf Pads.\n\nWe're happy to help you with comfortable, thoughtful menstrual care. 💚\n\nWhat would you like to do today?\n1. 🛍️ Shop\n2. 📦 Track\n3. 📜 My Orders\n4. 🛒 Cart\n\n(Reply with a number 1-4)";
    }

    // Options
    if (msg === '1' || msg.includes('shop') || msg.includes('buy') || msg.includes('order')) {
      return "Awesome! 🛍️ You can browse and buy all our eco-friendly ReLeaf Pads directly on our website: https://releafpads.in \n\nLet us know if you need help choosing a pack size! 🌿";
    }
    
    if (msg === '2' || msg.includes('track')) {
      return "📦 To track your current order, please log into your ReLeaf Pads mobile app or website account and visit the 'Track Order' section. \n\nIf you need manual assistance, reply with 'Help' to speak to an agent.";
    }

    if (msg === '3' || msg.includes('orders') || msg.includes('history')) {
      return "📜 You can view your full order history and download invoices inside the ReLeaf Pads app under 'My Orders'.";
    }

    if (msg === '4' || msg.includes('cart')) {
      return "🛒 Ready to checkout? Head over to the ReLeaf Pads app or website and click the Cart icon at the top right to complete your purchase!";
    }

    if (msg === 'help' || msg.includes('human') || msg.includes('agent') || msg.includes('support')) {
      return "A human agent has been notified and will be with you shortly to help. 💚";
    }

    // Fallback for anything else
    return "I didn't quite understand that. 🤔 \n\nPlease reply with 'Hi' to see the main menu, or 'Help' to speak to a human agent.";
  }
}

module.exports = new AIService();
