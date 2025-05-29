const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Twilio
const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_TOKEN;
const twilioNumber = process.env.TWILIO_NUMBER;
const client = require('twilio')(accountSid, authToken);

const app = express();
const PORT = process.env.PORT || 10000;

// Middlewares
app.use(cors());
app.use(express.json()); // Pour JSON
app.use(express.urlencoded({ extended: true })); // Pour x-www-form-urlencoded

// Conversations JSON
const DATA_PATH = path.join(__dirname, 'conversations.json');
let conversations = {};
if (fs.existsSync(DATA_PATH)) {
  const raw = fs.readFileSync(DATA_PATH);
  conversations = JSON.parse(raw);
}
const saveConversations = () => {
  fs.writeFileSync(DATA_PATH, JSON.stringify(conversations, null, 2));
};

// ✅ GET conversations
app.get('/api/conversations', (req, res) => {
  res.json(conversations);
});

// ✅ Webhook Zoho/Twilio
app.post('/webhook', (req, res) => {
  console.log('➡️ Webhook reçu :', req.body);

  const From = req.body.From || req.body.from;
  const Body = req.body.Body || req.body.body;

  if (!From || !Body) {
    console.log('❌ Donnée manquante dans Webhook');
    return res.sendStatus(400);
  }

  if (!conversations[From]) conversations[From] = [];

  conversations[From].push({
    message: Body,
    timestamp: new Date().toISOString(),
    received: true
  });

  saveConversations();
  res.status(200).send('Message reçu');
});

// ✅ Envoi de message
app.post('/send', async (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) return res.sendStatus(400);

  const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

  try {
    await client.messages.create({
      from: `whatsapp:${twilioNumber}`,
      to: formattedTo,
      body: message
    });

    if (!conversations[formattedTo]) conversations[formattedTo] = [];

    conversations[formattedTo].push({
      message,
      timestamp: new Date().toISOString(),
      sent: true
    });

    saveConversations();
    res.status(200).send('Message envoyé et enregistré');
  } catch (err) {
    console.error('❌ Erreur Twilio :', err.message);
    res.status(500).send('Erreur envoi');
  }
});

// ✅ Serveur actif
app.listen(PORT, () => {
  console.log(`✅ Serveur actif sur le port ${PORT}`);
});
