const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000;

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_TOKEN;
const client = require('twilio')(accountSid, authToken);

app.use(cors());
app.use(bodyParser.json());

const conversationsFile = path.join(__dirname, 'conversations.json');

// Charger les conversations depuis le fichier
function loadConversations() {
  if (!fs.existsSync(conversationsFile)) return {};
  return JSON.parse(fs.readFileSync(conversationsFile, 'utf8'));
}

// Sauvegarder les conversations dans le fichier
function saveConversations(data) {
  fs.writeFileSync(conversationsFile, JSON.stringify(data, null, 2), 'utf8');
}

// API pour voir les conversations
app.get('/api/conversations', (req, res) => {
  const data = loadConversations();
  res.json(data);
});

// Webhook Twilio
app.post('/webhook', (req, res) => {
  const from = req.body.From;
  const msg = req.body.Body;
  const timestamp = new Date().toISOString();

  const data = loadConversations();
  if (!data[from]) {
    data[from] = [];
  }

  data[from].push({ message: msg, timestamp });
  saveConversations(data);

  res.send('OK');
});

// Point d'entrée par défaut
app.get('/', (req, res) => {
  res.send('WhatsApp Chat API is running ✅');
});

// Lancer le serveur
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
