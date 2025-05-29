const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const twilio = require('twilio');

const app = express();
const port = process.env.PORT || 10000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// ✅ Récupère les identifiants Twilio depuis les variables Render
const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const whatsappNumber = process.env.WHATSAPP_NUMBER || 'whatsapp:+14155238886'; // ou ton sender

const client = twilio(accountSid, authToken);

// 📦 Stockage en mémoire (optionnel : utiliser DB ensuite)
let conversations = {};

// 📩 Webhook Twilio pour messages entrants
app.post('/webhook', (req, res) => {
  const body = req.body;
  console.log("📩 Webhook received:", body);

  const from = body.From || 'undefined';
  const message = body.Body || '';

  if (!conversations[from]) {
    conversations[from] = [];
  }

  conversations[from].push({
    message: message,
    timestamp: new Date().toISOString(),
    sent: false
  });

  res.send('OK');
});

// 📤 Envoyer un message WhatsApp
app.post('/api/send', async (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).send({ error: "Missing 'to' or 'message'" });
  }

  try {
    await client.messages.create({
      from: whatsappNumber,
      to: to,
      body: message
    });

    if (!conversations[to]) {
      conversations[to] = [];
    }

    conversations[to].push({
      message: message,
      timestamp: new Date().toISOString(),
      sent: true
    });

    res.send({ success: true });
  } catch (error) {
    console.error('❌ Error sending message:', error.message);
    res.status(500).send({ error: error.message });
  }
});

// 📄 Voir toutes les conversations
app.get('/api/conversations', (req, res) => {
  res.send(conversations);
});

// 📄 Voir les messages d’un numéro
app.get('/api/messages', (req, res) => {
  const number = req.query.number;
  res.send(conversations[number] || []);
});

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
