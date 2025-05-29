const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

let conversations = {};

// 🚀 Route webhook appelée par Twilio
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
    timestamp: new Date().toISOString()
  });

  res.send('OK');
});

// 📤 Envoyer un message (sera utilisé pour "envoyer" depuis Zoho Creator)
app.post('/api/send', (req, res) => {
  const { to, message } = req.body;

  if (!conversations[to]) {
    conversations[to] = [];
  }

  conversations[to].push({
    message: message,
    timestamp: new Date().toISOString(),
    sent: true
  });

  res.send({ success: true });
});

// 📄 Voir toutes les conversations
app.get('/api/conversations', (req, res) => {
  res.send(conversations);
});

// 📄 Voir les messages d’un numéro spécifique
app.get('/api/messages', (req, res) => {
  const number = req.query.number;
  res.send(conversations[number] || []);
});

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
