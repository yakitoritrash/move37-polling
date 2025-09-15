// index.js
const express = require('express');
const http = require('http'); // Import the native http module
const { WebSocketServer } = require('ws'); // Import the ws library
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

// Create a standard HTTP server from the Express app
const server = http.createServer(app);

// Create a WebSocket server and attach it to the HTTP server
const wss = new WebSocketServer({ server });

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('A new client connected!');
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

app.use(express.json());

// --- API ENDPOINTS ---

// ... (Your existing /users and /polls endpoints go here) ...
app.post('/users', async (req, res) => { /* existing code */ });
app.get('/users', async (req, res) => { /* existing code */ });
app.post('/polls', async (req, res) => { /* existing code */ });
app.get('/polls', async (req, res) => { /* existing code */ });

// POST /vote - Submit a vote AND broadcast results
app.post('/vote', async (req, res) => {
  try {
    const { userId, pollOptionId } = req.body;
    
    // 1. Create the vote
    const newVote = await prisma.vote.create({ data: { userId, pollOptionId } });

    // 2. Find which poll this option belongs to
    const votedOption = await prisma.pollOption.findUnique({ where: { id: pollOptionId } });
    const pollId = votedOption.pollId;

    // 3. Get the poll with updated vote counts for each option
    const pollWithCounts = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          include: {
            _count: {
              select: { votes: true },
            },
          },
        },
      },
    });

    // 4. Prepare the results payload
    const results = pollWithCounts.options.map(option => ({
      text: option.text,
      votes: option._count.votes,
    }));
    
    // 5. Broadcast the results to all connected clients
    wss.clients.forEach(client => {
      if (client.readyState === require('ws').OPEN) {
        client.send(JSON.stringify({ pollId, results }));
      }
    });

    res.status(201).json(newVote);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'User has already voted for this option' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error submitting vote' });
  }
});

// --- SERVER ---

// Start the HTTP server instead of the Express app directly
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
