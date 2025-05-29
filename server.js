const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Variables d'environnement (Render)
const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_TOKEN;
const twilioNumber = process.env.TWILIO_NUMBER;

const client = require('twilio')(accountSid, authToken);

const app = express();
const PORT = process.env.PORT || 10000;

// Middlewares
app.use(cors());
app.use(bodyParser.json()); // Pour les requêtes JSON
app.use(bodyParser.urlencoded({ extended: false })); // Pour les requêtes x-www-form-urlencoded

// Fichier JSON pour stocker les conversations
const DATA_PATH = path.join(__dirname, 'conversations.json');

// Charger les conversations existantes
let conversations = {};
if (fs.existsSync(DATA_PATH)) {
  const raw = fs.readFileSync(DATA_PATH);
  conversations = JSON.parse(raw);
}

// Sauvegarde sur fichier
const saveConversations = () => {
  fs.writeFileSync(DATA_PATH, JSON.stringify(conversations, null, 2));
};

// ✅ GET toutes les conversations
app.get('/api/conversations', (req, res) => {
  res.json(conversations);
});

// ✅ Webhook Twilio ou Zoho Flow (réception message)
app.post('/webhook', (req, res) => {
  console.log('➡️ Webhook reçu :', req.body);

  // Accepte les deux formats (Twilio ou Zoho)
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

// ✅ Envoi message depuis UI + enregistrement
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
      message: message,
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

// ✅ Lancement du serveur
app.listen(PORT, () => {
  console.log(`✅ Serveur actif sur le port ${PORT}`);
});
