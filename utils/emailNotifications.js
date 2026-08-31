// ============================================
// SWEETOS EMAIL NOTIFICATION SERVICE
// Using EmailJS with Gmail
// ============================================

const EMAILJS_CONFIG = {
  publicKey: 'pobjSAurcv_IpAY2',  // ✅ Public Key
  serviceID: 'sweetos',            // ✅ Service ID
  templateID: 'template_iz1eg1h'   // ✅ Your Template ID
};

// ============================================
// LOAD EMAILJS
// ============================================

async function loadEmailJS() {
  if (typeof window !== 'undefined' && window.emailjs) {
    return window.emailjs;
  }
  
  try {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    
    if (window.emailjs) {
      window.emailjs.init(EMAILJS_CONFIG.publicKey);
      return window.emailjs;
    }
  } catch (e) {
    console.error('[EmailJS] Failed to load:', e);
    return null;
  }
}

// ============================================
// GET USER INFO
// ============================================

export function getUserInfo() {
  try {
    const userJson = sessionStorage.getItem('SWEETOS_logged_in_user') || localStorage.getItem('SWEETOS_logged_in_user');
    if (userJson) {
      const user = JSON.parse(userJson);
      if (user && user.email) {
        const safeKey = user.email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
        const profileKey = `SWEETOS_user_profile_${safeKey}`;
        const profileJson = sessionStorage.getItem(profileKey) || localStorage.getItem(profileKey) || sessionStorage.getItem('SWEETOS_user_profile');
        let name = user.name || user.firstName || 'Client';
        if (profileJson) {
          try {
            const profile = JSON.parse(profileJson);
            name = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.name || profile.firstName || name;
          } catch(e) {}
        }
        return { email: user.email, name: name };
      }
    }
    return null;
  } catch (e) {
    console.error('[Email] Failed to get user info:', e);
    return null;
  }
}

// ============================================
// SEND EMAIL NOTIFICATION
// ============================================

export async function sendEmailNotification({
  toEmail = null,
  subject = 'SWEETOS Notification',
  title = 'New Notification',
  message = '',
  type = 'general',
  linkUrl = null,
  linkText = 'View Details',
  orderId = null,
  promoCode = null,
  extraParams = {}
}) {
  try {
    let recipientEmail = toEmail;
    let userName = 'Client';
    
    if (!recipientEmail) {
      const userInfo = getUserInfo();
      if (userInfo) {
        recipientEmail = userInfo.email;
        userName = userInfo.name;
      }
    }
    
    if (!recipientEmail) {
      console.warn('[Email] No recipient email found');
      return false;
    }

    const emailjs = await loadEmailJS();
    if (!emailjs) {
      console.error('[Email] EmailJS not available');
      return false;
    }

    const params = {
      to_email: recipientEmail,
      user_name: userName,
      subject: subject,
      notification_title: title,
      notification_message: message,
      notification_type: type,
      notification_link: linkUrl || window?.location?.origin || 'https://sweetos.store',
      notification_link_text: linkText || 'View Details',
      order_id: orderId || '',
      promo_code: promoCode || '',
      year: new Date().getFullYear(),
      store_name: 'SWEETOS',
      store_url: window?.location?.origin || 'https://sweetos.store',
      ...extraParams
    };

    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceID,
      EMAILJS_CONFIG.templateID,
      params
    );

    if (result && (result.status === 200 || result.text === 'OK')) {
      console.log('[Email] ✅ Sent successfully to:', recipientEmail);
      return true;
    } else {
      console.error('[Email] ❌ Send failed:', result);
      return false;
    }
  } catch (error) {
    console.error('[Email] ❌ Send error:', error);
    return false;
  }
}

// ============================================
// ORDER CONFIRMATION EMAIL
// ============================================

export async function sendOrderConfirmationEmail(orderData, recipientEmail = null) {
  let userEmail = recipientEmail;
  let userName = 'Client';
  
  if (typeof orderData === 'string' || typeof orderData === 'number') {
    // Called with (orderId, recipientEmail)
    const orderId = orderData;
    const userInfo = getUserInfo();
    userEmail = recipientEmail || userInfo?.email;
    userName = userInfo?.name || 'Client';

    if (!userEmail) return false;

    return await sendEmailNotification({
      toEmail: userEmail,
      subject: `📦 Confirmation de Commande #${orderId} - SWEETOS`,
      title: `Commande #${orderId} confirmée !`,
      message: `Bonjour ${userName} !\n\nNous avons bien reçu votre commande #${orderId}. Notre équipe la prépare avec le plus grand soin.\n\nMerci de votre confiance !`,
      type: 'general',
      linkUrl: `${window?.location?.origin}/#orders`,
      linkText: 'Suivre ma commande',
      orderId: orderId
    });
  }

  // Called with orderData object
  const userInfo = getUserInfo();
  userEmail = recipientEmail || orderData.customerEmail || orderData.email || userInfo?.email;
  userName = orderData.customerName || userInfo?.name || 'Client';

  if (!userEmail) return false;

  const orders = (orderData.items || orderData.products || []).map(item => ({
    name: item.name || item.product_name,
    image: item.image || item.image_url || '',
    color: item.selectedColor || item.color || '',
    price: item.price || item.unit_price || 0,
    units: item.quantity || 1
  }));

  const subtotal = orders.reduce((sum, item) => sum + (item.price * item.units), 0);
  const shippingCost = orderData.shippingCost || 0;
  const discount = orderData.discount || 0;
  const total = orderData.total || (subtotal + shippingCost - discount);

  return await sendEmailNotification({
    toEmail: userEmail,
    subject: `Thank You for Your Order #${orderData.id || orderData.order_number} - SWEETOS`,
    title: 'Thank You for Your Order',
    message: `Bonjour ${userName},\n\nThank you for your order #${orderData.id || orderData.order_number}! We'll send you tracking information when the order ships.`,
    type: 'general',
    linkUrl: `${window?.location?.origin}/#orders`,
    linkText: '📋 View Order Details',
    orderId: orderData.id || orderData.order_number,
    extraParams: {
      user_name: userName,
      orders: orders,
      subtotal: subtotal,
      shipping_cost: shippingCost,
      discount: discount,
      total: total,
      shipping_address: orderData.shippingAddress || orderData.address || '',
      shipping_phone: orderData.shippingPhone || orderData.phone || '',
      payment_method: orderData.paymentMethod || 'Cash on Delivery',
      to_email: userEmail,
      year: new Date().getFullYear(),
      store_url: window?.location?.origin || 'https://sweetos.store'
    }
  });
}

// ============================================
// ORDER DELIVERED EMAIL
// ============================================

export async function sendOrderDeliveredEmail(orderId, orderTotal = 0, recipientEmail = null) {
  const userInfo = getUserInfo();
  const targetEmail = recipientEmail || userInfo?.email;
  if (!targetEmail) return false;
  const userName = userInfo?.name || 'Client';

  const currentHour = new Date().getHours();
  let greeting = 'Bonjour';
  if (currentHour >= 12 && currentHour < 18) greeting = 'Bon après-midi';
  else if (currentHour >= 18) greeting = 'Bonsoir';

  let message = `${greeting} ${userName} !\n\nMerci infiniment pour votre achat chez SWEETOS. Votre commande #${orderId} a été livrée avec succès.`;

  if (orderTotal >= 2000) {
    message += `\n\n🎁 Vous avez également reçu une Boîte Mystère ! Vérifiez vos notifications pour la découvrir.`;
  }

  return await sendEmailNotification({
    toEmail: targetEmail,
    subject: `✅ Commande #${orderId} livrée ! - SWEETOS`,
    title: `Commande #${orderId} livrée !`,
    message: message,
    type: 'shipping',
    linkUrl: `${window?.location?.origin}/#orders`,
    linkText: 'Voir ma commande',
    orderId: orderId,
    extraParams: {
      greeting: greeting,
      order_total: orderTotal,
      has_mystery_box: orderTotal >= 2000
    }
  });
}

// ============================================
// MYSTERY BOX EMAIL
// ============================================

export async function sendMysteryBoxEmail(orderId, recipientEmail = null) {
  const userInfo = getUserInfo();
  const targetEmail = recipientEmail || userInfo?.email;
  if (!targetEmail) return false;
  const userName = userInfo?.name || 'Client';

  return await sendEmailNotification({
    toEmail: targetEmail,
    subject: `🎁 Votre Boîte Mystère SWEETOS est arrivée !`,
    title: '📧 Votre Boîte Mystère est là !',
    message: `🎉 Félicitations ${userName} ! Vous avez gagné une surprise exclusive avec votre commande #${orderId}.\n\nRendez-vous dans la boutique pour la découvrir.`,
    type: 'promo',
    linkUrl: `${window?.location?.origin}/#scratchcard`,
    linkText: '🎁 Ouvrir la Boîte Mystère',
    orderId: orderId,
    extraParams: {
      is_mystery_box: true
    }
  });
}

export async function sendAdminNewOrderEmail(order) {
  const adminEmail = 'nextbigthin256@gmail.com';
  const orderId = order.id || order.order_number;
  const itemsList = (order.items || order.products || []);
  const itemsText = itemsList.length > 0 
    ? itemsList.map(i => `• ${i.name || i.product_name} (x${i.quantity || i.units || 1}) - ${i.price || 0} FCFA`).join('\n')
    : '• 1x Produit SWEETOS';

  return await sendEmailNotification({
    toEmail: adminEmail,
    subject: `🔔 NOUVELLE COMMANDE #${orderId} - SWEETOS`,
    title: `Nouvelle Commande #${orderId}`,
    message: `Une nouvelle commande a été enregistrée sur SWEETOS !\n\nClient: ${order.customerName || order.name || 'Client'}\nTéléphone: ${order.phone || order.customerPhone || 'Non renseigné'}\nEmail: ${order.email || order.customerEmail || 'Non renseigné'}\n\nProduits:\n${itemsText}\n\nTotal: ${order.total || 0} FCFA`,
    type: 'shipping',
    linkUrl: `${window?.location?.origin}/admin.html`,
    linkText: 'Accéder au Panneau Admin',
    orderId: orderId
  });
}

// ============================================
// TEST FUNCTION
// ============================================

export async function testEmailConfiguration() {
  const userInfo = getUserInfo();
  if (!userInfo) {
    console.error('[Test] ❌ No user logged in');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('toast:show', { 
        detail: '⚠️ Veuillez vous connecter pour tester l\'envoi d\'e-mails.'
      }));
    }
    return false;
  }

  console.log('[Test] 📧 Sending test email to:', userInfo.email);
  
  const result = await sendEmailNotification({
    toEmail: userInfo.email,
    subject: '🔔 SWEETOS Email Test',
    title: 'Test de notification par email',
    message: `Bonjour ${userInfo.name} !\n\nCeci est un test de votre configuration d'email avec votre Template ID (template_iz1eg1h).\n\nSi vous recevez ce message, votre email fonctionne correctement !\n\n✅ Test réussi !\n\nL'équipe SWEETOS`,
    type: 'general',
    linkUrl: window?.location?.origin,
    linkText: 'Visiter SWEETOS',
    extraParams: {
      is_test: true
    }
  });

  if (result) {
    console.log('[Test] ✅ Test email sent successfully!');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('toast:show', { 
        detail: '📧 Test email sent successfully! Check your inbox.'
      }));
    }
  } else {
    console.error('[Test] ❌ Test email failed');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('toast:show', { 
        detail: '❌ Failed to send test email. Check console for errors.'
      }));
    }
  }
  
  return result;
}

if (typeof window !== 'undefined') {
  window.testSWEETOSEmail = function() {
    console.log('⌛ Dispatching SWEETOS test email...');
    return testEmailConfiguration().then(res => {
      console.log('Result:', res);
      return res;
    }).catch(err => {
      console.error('Error:', err);
    });
  };
}

// ============================================
// EXPORT ALL
// ============================================

export default {
  sendEmailNotification,
  sendOrderConfirmationEmail,
  sendOrderDeliveredEmail,
  sendMysteryBoxEmail,
  testEmailConfiguration,
  getUserInfo
};
