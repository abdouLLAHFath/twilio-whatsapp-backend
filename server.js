const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;

const TWILIO_SID = process.env.TWILIO_SID;
const TWILIO_TOKEN = process.env.TWILIO_TOKEN;
const TWILIO_NUMBER = process.env.TWILIO_NUMBER;

app.use(bodyParser.json());

const DB_FILE = './conversations.json';

function loadMessages() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '{}');
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveMessages(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

app.post('/webhook', (req, res) => {
  const { From, Body } = req.body;
  const data = loadMessages();
  if (!data[From]) data[From] = [];
  data[From].push({ from: From, body: Body, timestamp: new Date().toISOString() });
  saveMessages(data);
  res.sendStatus(200);
});

app.get('/api/conversations', (req, res) => {
  const data = loadMessages();
  res.json(data);
});

app.get('/api/messages', (req, res) => {
  const number = req.query.number;
  const data = loadMessages();
  res.json(data[number] || []);
});

app.post('/api/send', async (req, res) => {
  const { to, body } = req.body;

  const params = new URLSearchParams();
  params.append('To', to);
  params.append('From', TWILIO_NUMBER);
  params.append('Body', body);

  const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params
  });

  const result = await twilioRes.json();

  const data = loadMessages();
  if (!data[to]) data[to] = [];
  data[to].push({ from: 'me', body: body, timestamp: new Date().toISOString() });
  saveMessages(data);

  res.json(result);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
