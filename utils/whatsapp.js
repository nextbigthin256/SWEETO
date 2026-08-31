// ============================================
// SWEETOS WHATSAPP CLOUD API NOTIFICATION SYSTEM
// Real-time WhatsApp Alerts for Store Owner & Customers
// ============================================

const WHATSAPP_CONFIG = {
  phoneNumberId: '1240965192441738',
  accessToken: 'EAAfuiZC12v8oBSZAL1sPqO7JPF6ZCEp8h5oMloJbvHKQoLk8AaQEFlglyLeO2Nu9zjXejs10KuAYPo',
  businessAccountId: '1079864837794353',
  version: 'v19.0',
  ownerPhone: '2250500619923' // Store Owner WhatsApp (+225 05 00 61 99 23)
};

// ============================================
// UTILITY HELPERS
// ============================================

export function formatWhatsAppNumber(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
}

export function validateWhatsAppNumber(phone) {
  const cleaned = formatWhatsAppNumber(phone);
  return cleaned.length >= 8;
}

// ============================================
// CORE SEND FUNCTION
// ============================================

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
    console.error('❌ [WhatsApp] Send failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send WhatsApp notification to Store Owner
 */
export async function notifyStoreOwner(message) {
  return await sendWhatsAppMessage(WHATSAPP_CONFIG.ownerPhone, message);
}

// ============================================
// ORDER NOTIFICATIONS
// ============================================

/**
 * 1. New Order Notification
 */
export async function notifyNewOrder(order) {
  const itemsList = order.items || order.products || [];
  const itemsSummary = itemsList.length > 0
    ? itemsList.map(item => `  • ${item.name || item.product_name} x${item.quantity || item.units || 1} = ${((item.price || 0) * (item.quantity || item.units || 1)).toLocaleString()} FCFA`).join('\n')
    : '  • 1x Produit SWEETOS';

  const message = `🛍️ *NEW ORDER - SWEETOS*
  
Order #: ${order.id || order.order_number || 'N/A'}
Customer: ${order.customerName || order.name || 'N/A'}
Phone: ${order.phone || order.customerPhone || 'N/A'}
Email: ${order.email || order.customerEmail || 'N/A'}
Payment: ${order.paymentMethod || 'Paiement à la livraison'}
Delivery: ${order.deliveryMethod || order.address || 'Standard'}

📦 Items:
${itemsSummary}

💰 Total: ${(order.total || 0).toLocaleString()} FCFA
📅 Date: ${new Date().toLocaleString('fr-FR')}

🔗 View: ${window?.location?.origin}/admin.html`;

  return await notifyStoreOwner(message);
}

/**
 * 2. High-Value Order Alert (> 100,000 FCFA)
 */
export async function notifyHighValueOrder(order) {
  const message = `💰 *HIGH VALUE ORDER - SWEETOS*
  
🚨 Amount: ${(order.total || 0).toLocaleString()} FCFA
Order #: ${order.id || order.order_number || 'N/A'}
Customer: ${order.customerName || order.name || 'N/A'}
Phone: ${order.phone || order.customerPhone || 'N/A'}

⭐ This order qualifies for VIP handling!

Action items:
1. Confirm stock availability
2. Prepare special packaging
3. Consider express delivery

📦 Dashboard: ${window?.location?.origin}/admin.html`;

  return await notifyStoreOwner(message);
}

/**
 * 3. Order Delivered Notification
 */
export async function notifyOrderDelivered(order) {
  const message = `✅ *ORDER DELIVERED - SWEETOS*
  
Order #: ${order.id || order.order_number || 'N/A'}
Customer: ${order.customerName || order.customer_name || 'N/A'}
Amount: ${(order.total || 0).toLocaleString()} FCFA
Delivery: ${order.deliveryMethod || 'Standard'}

🎉 Order successfully delivered!

Follow up:
- Send thank you message
- Request review
- Offer promo for next order

📊 Dashboard: ${window?.location?.origin}/admin.html`;

  return await notifyStoreOwner(message);
}

/**
 * 4. Order Cancelled Notification
 */
export async function notifyOrderCancelled(order) {
  const message = `❌ *ORDER CANCELLED - SWEETOS*
  
Order #: ${order.id || order.order_number || 'N/A'}
Customer: ${order.customerName || order.name || 'N/A'}
Phone: ${order.phone || order.customerPhone || 'N/A'}
Amount: ${(order.total || 0).toLocaleString()} FCFA
Reason: ${order.cancellationReason || 'Not specified'}

📊 Dashboard: ${window?.location?.origin}/admin.html`;

  return await notifyStoreOwner(message);
}

/**
 * 5. Payment Confirmed Notification
 */
export async function notifyPaymentConfirmed(order) {
  const message = `💳 *PAYMENT CONFIRMED - SWEETOS*
  
Order #: ${order.id || order.order_number || 'N/A'}
Customer: ${order.customerName || order.name || 'N/A'}
Amount: ${(order.total || 0).toLocaleString()} FCFA
Method: ${order.paymentMethod || 'N/A'}

✅ Payment verified successfully!

📦 Ready for processing: ${window?.location?.origin}/admin.html`;

  return await notifyStoreOwner(message);
}

/**
 * 6. Payment Failed Notification
 */
export async function notifyPaymentFailed(order) {
  const message = `⚠️ *PAYMENT FAILED - SWEETOS*
  
Order #: ${order.id || order.order_number || 'N/A'}
Customer: ${order.customerName || order.name || 'N/A'}
Amount: ${(order.total || 0).toLocaleString()} FCFA
Method: ${order.paymentMethod || 'N/A'}

❌ Payment was not successful.

Action required: Contact customer to resolve payment issue.

📊 Dashboard: ${window?.location?.origin}/admin.html`;

  return await notifyStoreOwner(message);
}

// ============================================
// INVENTORY NOTIFICATIONS
// ============================================

/**
 * 7. Low Stock Alert
 */
export async function notifyLowStock(product) {
  const message = `⚠️ *LOW STOCK ALERT - SWEETOS*
  
Product: ${product.name || 'N/A'}
Stock: ${product.stock || 0} units remaining
Category: ${product.category || 'N/A'}
SKU: ${product.sku || 'N/A'}

🛒 Threshold: ${product.threshold || 5} units

Recommended action: Restock ASAP!

📦 Dashboard: ${window?.location?.origin}/admin.html`;

  return await notifyStoreOwner(message);
}

/**
 * 8. Product Out of Stock
 */
export async function notifyOutOfStock(product) {
  const message = `🚫 *OUT OF STOCK - SWEETOS*
  
Product: ${product.name || 'N/A'}
Category: ${product.category || 'N/A'}
SKU: ${product.sku || 'N/A'}

❌ Product is completely out of stock!

Immediate action required:
1. Update product status
2. Order new stock
3. Hide from store

📦 Dashboard: ${window?.location?.origin}/admin.html`;

  return await notifyStoreOwner(message);
}

/**
 * 9. Product Restocked
 */
export async function notifyProductRestocked(product) {
  const message = `🔄 *RESTOCKED - SWEETOS*
  
Product: ${product.name || 'N/A'}
New Stock: ${product.stock || 0} units
Category: ${product.category || 'N/A'}

✅ Product is back in stock!

Recommended actions:
1. Re-list product
2. Notify interested customers
3. Consider promotion

📦 Dashboard: ${window?.location?.origin}/admin.html`;

  return await notifyStoreOwner(message);
}

// ============================================
// CUSTOMER NOTIFICATIONS
// ============================================

/**
 * 10. New Customer Registration
 */
export async function notifyNewCustomer(customer) {
  const message = `👤 *NEW CUSTOMER - SWEETOS*
  
Name: ${customer.name || customer.firstName || 'N/A'}
Email: ${customer.email || 'N/A'}
Phone: ${customer.phone || 'N/A'}
Location: ${customer.location || customer.address || 'N/A'}

🎉 Welcome new customer!

📊 Dashboard: ${window?.location?.origin}/admin.html`;

  return await notifyStoreOwner(message);
}

/**
 * 11. Customer VIP Status
 */
export async function notifyVIPCustomer(customer) {
  const message = `⭐ *VIP CUSTOMER - SWEETOS*
  
Name: ${customer.name || customer.firstName || 'N/A'}
Email: ${customer.email || 'N/A'}
Total Spent: ${(customer.totalSpent || 0).toLocaleString()} FCFA
Orders: ${customer.ordersCount || 0}

🏆 This customer has reached VIP status!

Recommended actions:
1. Send special thank you
2. Offer exclusive promotion
3. Add to VIP list

📊 Dashboard: ${window?.location?.origin}/admin.html`;

  return await notifyStoreOwner(message);
}

// ============================================
// REVIEW NOTIFICATIONS
// ============================================

/**
 * 12. New Review Notification
 */
export async function notifyNewReview(review) {
  const message = `📝 *NEW REVIEW - SWEETOS*
  
Product: ${review.productName || 'N/A'}
Customer: ${review.customerName || 'N/A'}
Rating: ${'⭐'.repeat(Math.round(review.rating || 5))}
Comment: ${review.comment || 'No comment'}

${(review.rating || 5) >= 4 ? '👍 Positive review!' : '👎 Needs attention.'}

📊 Dashboard: ${window?.location?.origin}/admin.html`;

  return await notifyStoreOwner(message);
}

// ============================================
// DAILY SUMMARY & SYSTEM
// ============================================

/**
 * 13. Daily Store Summary
 */
export async function notifyDailySummary(stats) {
  const message = `📊 *DAILY SUMMARY - SWEETOS*
  
📅 Date: ${new Date().toLocaleDateString('fr-FR')}

Orders: ${stats.orders || 0}
Revenue: ${(stats.revenue || 0).toLocaleString()} FCFA
New Customers: ${stats.newCustomers || 0}
Pending Orders: ${stats.pendingOrders || 0}
Delivered: ${stats.deliveredOrders || 0}

Top Product: ${stats.topProduct || 'N/A'}
Best Category: ${stats.topCategory || 'N/A'}

📈 Report: ${window?.location?.origin}/admin.html`;

  return await notifyStoreOwner(message);
}

/**
 * 14. System Error Notification
 */
export async function notifySystemError(error) {
  const message = `⚠️ *SYSTEM ERROR - SWEETOS*
  
Time: ${new Date().toLocaleString('fr-FR')}
Error: ${error.message || String(error)}

${error.stack ? `\n📋 Stack:\n${error.stack.substring(0, 200)}` : ''}

Please check the system immediately.`;

  return await notifyStoreOwner(message);
}

/**
 * 15. Backup Completed Notification
 */
export async function notifyBackupCompleted() {
  const message = `✅ *BACKUP COMPLETED - SWEETOS*
  
Time: ${new Date().toLocaleString('fr-FR')}
Status: Successful

📦 Your store data has been backed up successfully.`;

  return await notifyStoreOwner(message);
}

/**
 * 16. Promotion Active Notification
 */
export async function notifyPromotionStarted(promotion) {
  const message = `🎉 *PROMOTION ACTIVE - SWEETOS*
  
Promotion: ${promotion.name || 'N/A'}
Discount: ${promotion.discount || 0}% OFF
Valid: ${promotion.validFrom || 'N/A'} to ${promotion.validTo || 'N/A'}

📊 Dashboard: ${window?.location?.origin}/admin.html`;

  return await notifyStoreOwner(message);
}

// ============================================
// CUSTOMER DIRECT NOTIFICATIONS
// ============================================

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

export async function sendPromotionalWhatsApp(customerPhone, promoMessage) {
  const message = `🎉 *SWEETOS Special Offer!*
  
${promoMessage}

Visit our store: ${window?.location?.origin || 'https://sweetos.store'}

Don't miss out! 🛍️`;

  return await sendWhatsAppMessage(customerPhone, message);
}

// ============================================
// AUTO EVENT DISPATCHER
// ============================================

export async function handleStoreEvent(eventType, data) {
  switch (eventType) {
    case 'order:new':
      return await notifyNewOrder(data);
    case 'order:high-value':
      return await notifyHighValueOrder(data);
    case 'order:delivered':
      return await notifyOrderDelivered(data);
    case 'order:cancelled':
      return await notifyOrderCancelled(data);
    case 'payment:confirmed':
      return await notifyPaymentConfirmed(data);
    case 'payment:failed':
      return await notifyPaymentFailed(data);
    case 'inventory:low':
      return await notifyLowStock(data);
    case 'inventory:out-of-stock':
      return await notifyOutOfStock(data);
    case 'inventory:restocked':
      return await notifyProductRestocked(data);
    case 'customer:new':
      return await notifyNewCustomer(data);
    case 'customer:vip':
      return await notifyVIPCustomer(data);
    case 'review:new':
      return await notifyNewReview(data);
    case 'system:error':
      return await notifySystemError(data);
    case 'system:backup':
      return await notifyBackupCompleted();
    case 'promotion:started':
      return await notifyPromotionStarted(data);
    default:
      console.warn('[WhatsApp] Unknown event type:', eventType);
      return null;
  }
}

// ============================================
// DEV CONSOLE TEST HELPER
// ============================================

export async function testWhatsAppConfiguration(targetPhone = null) {
  const phone = targetPhone || WHATSAPP_CONFIG.ownerPhone;
  console.log('[WhatsApp Test] 💬 Sending test message to:', phone);
  const result = await sendWhatsAppMessage(phone, '🧪 *WhatsApp Test - SWEETOS System Alert*\n\nAll 16 WhatsApp notification events are active on your store!\n✅ Everything is operating cleanly.');
  
  if (result.success) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('toast:show', { detail: '💬 WhatsApp test message sent successfully!' }));
    }
  } else {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('toast:show', { detail: '❌ WhatsApp test failed. Check console.' }));
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
  notifyStoreOwner,
  notifyNewOrder,
  notifyHighValueOrder,
  notifyOrderDelivered,
  notifyOrderCancelled,
  notifyPaymentConfirmed,
  notifyPaymentFailed,
  notifyLowStock,
  notifyOutOfStock,
  notifyProductRestocked,
  notifyNewCustomer,
  notifyVIPCustomer,
  notifyNewReview,
  notifyDailySummary,
  notifySystemError,
  notifyBackupCompleted,
  notifyPromotionStarted,
  sendOrderConfirmationWhatsApp,
  sendOrderDeliveredWhatsApp,
  sendPromotionalWhatsApp,
  formatWhatsAppNumber,
  validateWhatsAppNumber,
  handleStoreEvent,
  testWhatsAppConfiguration
};
