require('dotenv').config();
const axios = require('axios');

class WhatsAppService {
  constructor() {
    this.token = process.env.WHATSAPP_ACCESS_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.baseUrl = `https://graph.facebook.com/v17.0/${this.phoneNumberId}/messages`;
  }

  async sendTextMessage(to, message) {
    if (!this.token || !this.phoneNumberId) {
      console.error("WhatsApp credentials are not fully configured in .env");
      return { success: false, error: "Missing credentials" };
    }

    try {
      // Clean phone number (ensure country code but no '+' or '00')
      let cleanPhone = to.replace(/\D/g, '');
      if (cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone; // Default to India if only 10 digits
      }

      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "text",
        text: { 
          preview_url: false,
          body: message 
        }
      };

      const response = await axios.post(this.baseUrl, payload, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`WhatsApp message sent successfully to ${cleanPhone}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error sending WhatsApp message:", error?.response?.data || error.message);
      return { success: false, error: error?.response?.data || error.message };
    }
  }

  async sendInteractiveButtons(to, bodyText, buttonsArray) {
    if (!this.token || !this.phoneNumberId) {
      console.error("WhatsApp credentials are not fully configured in .env");
      return { success: false, error: "Missing credentials" };
    }

    try {
      let cleanPhone = to.replace(/\D/g, '');
      if (cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone;
      }

      // Map our simplified buttons array to Meta's expected format
      const formattedButtons = buttonsArray.map(btn => ({
        type: "reply",
        reply: {
          id: btn.id,
          title: btn.title
        }
      }));

      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "interactive",
        interactive: {
          type: "button",
          body: {
            text: bodyText
          },
          action: {
            buttons: formattedButtons
          }
        }
      };

      const response = await axios.post(this.baseUrl, payload, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`WhatsApp interactive buttons sent successfully to ${cleanPhone}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error sending WhatsApp interactive buttons:", error?.response?.data || error.message);
      return { success: false, error: error?.response?.data || error.message };
    }
  }

  async sendOrderConfirmation(to, orderId, customerName, totalAmount) {
    const message = `🌿 *ReLeaf Pads - Order Confirmed!* 🌿\n\nHi ${customerName},\nYour order (#${orderId}) for ₹${totalAmount} has been successfully placed.\n\nWe will notify you once it is out for delivery. Thank you for choosing sustainable periods! 💚`;
    return this.sendTextMessage(to, message);
  }
}

module.exports = new WhatsAppService();
