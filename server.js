const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Twilio setup
const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_TOKEN;
const twilioNumber = process.env.TWILIO_NUMBER;
const client = require('twilio')(accountSid, authToken);

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ Middleware pour parser JSON et x-www-form-urlencoded
app.use(cors());
app.use(express.json()); // pour application/json
app.use(express.urlencoded({ extended: true })); // pour x-www-form-urlencoded

// ✅ Fichier pour stocker les messages
const DATA_PATH = path.join(__dirname, 'conversations.json');
let conversations = {};
if (fs.existsSync(DATA_PATH)) {
  const raw = fs.readFileSync(DATA_PATH);
  conversations = JSON.parse(raw);
}
const saveConversations = () => {
  fs.writeFileSync(DATA_PATH, JSON.stringify(conversations, null, 2));
};

// ✅ GET toutes les conversations
app.get('/api/conversations', (req, res) => {
  res.json(conversations);
});

// ✅ Webhook Twilio ou Zoho Flow
app.post('/webhook', (req, res) => {
  console.log('➡️ Headers reçus :', req.headers);
  console.log('➡️ Corps reçu :', req.body);

  const From = req.body.From || req.body.from;
  const Body = req.body.Body || req.body.body;

  if (!From || !Body) {
    console.log('❌ Donnée manquante dans Webhook');
    return res.status(400).send('Donnée manquante');
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

// ✅ Envoi de message depuis interface
app.post('/send', async (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) return res.status(400).send('Champs manquants');

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
    res.status(500).send('Erreur lors de l’envoi');
  }
});

// ✅ Lancement serveur
app.listen(PORT, () => {
  console.log(`✅ Serveur actif sur le port ${PORT}`);
});
