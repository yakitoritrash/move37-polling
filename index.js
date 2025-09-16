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
// POST /users - Create a new user
app.post('/users', async (req, res) => {
  try {
    const { name, email, passwordHash } = req.body;
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });
    res.status(201).json(newUser);
  } catch (error) {
    // Log the detailed error to the console
    console.error(error); 

    // Send a more informative error response
    res.status(500).json({ error: 'Error creating user', details: error.message });
  }
});
// GET /users - Retrieve all users
app.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany(); // Fetch all users from the database
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching users' });
  }
});

// POST /polls - Create a new poll with options
app.post('/polls', async (req, res) => {
  try {
    const { question, options, creatorId } = req.body;

    // Prisma's nested write creates the poll and its options in one transaction
    const newPoll = await prisma.poll.create({
      data: {
        question,
        creatorId, // Link the poll to the user who created it
        options: {
          create: options.map(optionText => ({ text: optionText })),
        },
      },
      include: {
        options: true, // Include the newly created options in the response
      },
    });

    res.status(201).json(newPoll);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating poll' });
  }
});
// GET /polls - Retrieve all polls with their options and creators
app.get('/polls', async (req, res) => {
  try {
    const polls = await prisma.poll.findMany({
      include: {
        options: true, // Include poll options
        creator: {      // Include creator info
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    res.json(polls);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching polls' });
  }
});
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
