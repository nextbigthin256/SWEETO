// ============================================
// SWEETOS WHATSAPP CLOUD API SERVICE
// Using Meta WhatsApp Business Graph API
// ============================================

const WHATSAPP_CONFIG = {
  phoneNumberId: '1240965192441738',
  accessToken: 'EAAfuiZC12v8oBSZAL1sPqO7JPF6ZCEp8h5oMloJbvHKQoLk8AaQEFlglyLeO2Nu9zjXejs10KuAYPo',
  businessAccountId: '1079864837794353',
  version: 'v19.0'
};

/**
 * Format phone number for WhatsApp API (e.g. '2250123456789' or '2348123456789')
 */
export function formatWhatsAppNumber(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
}

/**
 * Validate phone number format
 */
export function validateWhatsAppNumber(phone) {
  const cleaned = formatWhatsAppNumber(phone);
  return cleaned.length >= 8;
}

/**
 * Send a WhatsApp text message using Meta Graph API
 */
export async function sendWhatsAppMessage(to, message) {
  const recipient = formatWhatsAppNumber(to);
  if (!recipient) {
    console.warn('[WhatsApp] Invalid recipient phone number:', to);
    return { success: false, error: 'Invalid phone number' };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${WHATSAPP_CONFIG.version}/${WHATSAPP_CONFIG.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_CONFIG.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: recipient,
          type: 'text',
          text: { body: message }
        })
      }
    );

    const data = await response.json();
    
    if (data.error) {
      console.error('[WhatsApp API Error]:', data.error);
      return { success: false, error: data.error };
    }
    
    console.log('✅ [WhatsApp] Message sent successfully to:', recipient);
    return { success: true, data: data };
  } catch (error) {
    console.error('❌ [WhatsApp] Failed to send message:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send Order Confirmation via WhatsApp
 */
export async function sendOrderConfirmationWhatsApp(order, customerPhone) {
  const phone = customerPhone || order?.phone || order?.shippingPhone;
  if (!phone) return { success: false, error: 'No phone provided' };

  const message = `🛍️ *SWEETOS Order Confirmation*
  
Bonjour ${order.customerName || order.name || 'Client'}!

✅ Your order #${order.id || order.order_number} has been confirmed.

📦 Items: ${order.items?.length || order.products?.length || 1} item(s)
💰 Total: ${order.total || 0} FCFA
🚚 Delivery: ${order.deliveryMethod || 'Standard'}

We'll notify you when your order ships.

Thank you for shopping with SWEETOS! ❤️`;

  return await sendWhatsAppMessage(phone, message);
}

/**
 * Send Order Delivered Notification via WhatsApp
 */
export async function sendOrderDeliveredWhatsApp(order, customerPhone) {
  const phone = customerPhone || order?.phone || order?.customerPhone;
  if (!phone) return { success: false, error: 'No phone provided' };

  const message = `✅ *Order Delivered - SWEETOS*
  
Bonjour ${order.customerName || order.customer_name || 'Client'}!

Your order #${order.id || order.order_number} has been successfully delivered! 🎉

Thank you for choosing SWEETOS. We hope you love your items!

⭐ Please leave a review: ${window?.location?.origin}/#reviews

Have a wonderful day! ❤️`;

  return await sendWhatsAppMessage(phone, message);
}

/**
 * Send Promotional Message via WhatsApp
 */
export async function sendPromotionalWhatsApp(customerPhone, promoMessage) {
  const message = `🎉 *SWEETOS Special Offer!*
  
${promoMessage}

Visit our store: ${window?.location?.origin || 'https://sweetos.store'}

Don't miss out! 🛍️`;

  return await sendWhatsAppMessage(customerPhone, message);
}

/**
 * Console Test Helper
 */
export async function testWhatsAppConfiguration(targetPhone = null) {
  const phone = targetPhone || prompt('Enter WhatsApp number with country code (e.g. 2348123456789 or 2250123456789):');
  if (!phone) return false;

  console.log('[WhatsApp Test] 💬 Sending test message to:', phone);
  const result = await sendWhatsAppMessage(phone, '🎉 SWEETOS WhatsApp integration test successful!\n\nYour store is now connected to WhatsApp Cloud API!');
  
  if (result.success) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('toast:show', { detail: '💬 WhatsApp test message sent successfully!' }));
    }
  } else {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('toast:show', { detail: '❌ WhatsApp test failed. Check console for error details.' }));
    }
  }
  return result;
}

if (typeof window !== 'undefined') {
  window.testWhatsApp = function(phone) {
    return testWhatsAppConfiguration(phone);
  };
}

export default {
  sendWhatsAppMessage,
  sendOrderConfirmationWhatsApp,
  sendOrderDeliveredWhatsApp,
  sendPromotionalWhatsApp,
  formatWhatsAppNumber,
  validateWhatsAppNumber,
  testWhatsAppConfiguration
};
