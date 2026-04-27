/**
 * WhatsApp Notification Service
 * This service handles sending messages to users via WhatsApp.
 * For production, integrate with a provider like Twilio, Meta WhatsApp Business API, or similar.
 */

export interface WhatsAppPayload {
  to: string;
  message: string;
}

export async function sendWhatsAppMessage({ to, message }: WhatsAppPayload): Promise<boolean> {
  console.log(`[WhatsApp Service] Sending message to ${to}: ${message}`);

  // In a real implementation, you would call an external API here.
  // Example with fetch to a hypothetical provider:
  /*
  const response = await fetch('https://api.whatsapp-provider.com/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ phone: to, text: message })
  });
  return response.ok;
  */

  // For now, we simulate a successful send
  return true;
}

/**
 * Formats a license expiration reminder message
 */
export function formatExpiryReminder(userName: string, daysLeft: number, expiryDate: string): string {
  return `Hello ${userName}! \n\nThis is a friendly reminder that your Skin Mockup license is set to expire in ${daysLeft} days (on ${new Date(expiryDate).toLocaleDateString()}). \n\nTo avoid any interruption in your workflow, please renew your subscription  by contaccting Admin. \n\nThank you for choosing Skin Mockup!`;
}
