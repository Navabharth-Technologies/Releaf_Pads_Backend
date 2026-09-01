class AIService {
  constructor() {}

  async generateReply(userMessage) {
    // If the message came from an interactive button, the text might be the button's payload/title
    const msg = userMessage.toLowerCase().trim();

    // Greeting / Main Menu
    if (msg === 'hi' || msg === 'hello' || msg === 'hey' || msg === 'menu') {
      return {
        type: 'buttons',
        text: "Hello! 👋 Welcome to ReLeaf Pads.\n\nWe're happy to help you with comfortable, thoughtful menstrual care. 💚\n\nWhat would you like to do today?",
        buttons: [
          { id: "shop", title: "🛍️ Shop" },
          { id: "track", title: "📦 Track Order" },
          { id: "orders", title: "📜 My Orders" }
        ]
      };
    }

    // Options (Handles both typed numbers and button click payloads)
    if (msg === '1' || msg.includes('shop') || msg.includes('buy') || msg.includes('order')) {
      return { 
        type: 'catalog', 
        text: "Awesome! 🛍️ Check out our eco-friendly ReLeaf Pads in the catalog below. You can add them directly to your cart here! 🌿" 
      };
    }
    
    if (msg === '2' || msg.includes('track')) {
      return { type: 'text', text: "📦 To track your current order, please log into your ReLeaf Pads mobile app or website account and visit the 'Track Order' section. \n\nIf you need manual assistance, reply with 'Help' to speak to an agent." };
    }

    if (msg === '3' || msg.includes('orders') || msg.includes('history')) {
      return { type: 'text', text: "📜 You can view your full order history and download invoices inside the ReLeaf Pads app under 'My Orders'." };
    }

    if (msg === '4' || msg.includes('cart')) {
      return { type: 'text', text: "🛒 Ready to checkout? Head over to the ReLeaf Pads app or website and click the Cart icon at the top right to complete your purchase!" };
    }

    if (msg === 'help' || msg.includes('human') || msg.includes('agent') || msg.includes('support')) {
      return { type: 'text', text: "A human agent has been notified and will be with you shortly to help. 💚" };
    }

    // Fallback for anything else
    return { type: 'text', text: "I didn't quite understand that. 🤔 \n\nPlease reply with 'Hi' to see the main menu, or 'Help' to speak to a human agent." };
  }
}

module.exports = new AIService();
