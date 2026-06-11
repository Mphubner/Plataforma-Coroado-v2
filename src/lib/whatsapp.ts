export const sendWhatsAppMessage = async (phone: string, message: string) => {
  // TODO: Integrar com API Oficial do WhatsApp (Cloud API) ou provedor terceiro (Twilio / Evolution / Z-API / Zenvia).
  console.log(`[WHATSAPP MOCK] Destino: ${phone} | Mensagem: ${message}`);
  
  // Exemplo de payload usando API real:
  /*
  const response = await fetch('https://SUA_API_WHATSAPP/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${process.env.WHATSAPP_API_TOKEN}\`
    },
    body: JSON.stringify({
      number: phone,
      text: message
    })
  });
  return response.json();
  */
  
  return { success: true, simulated: true };
};
