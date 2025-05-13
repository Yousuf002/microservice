require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const cors = require('cors'); // Add this line

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL;

app.use(cors({
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500'], // Allow both localhost and 127.0.0.1
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// In-memory todo storage
const todos = [];
let idCounter = 1;

// Middleware to verify JWT
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/validate`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.data.valid) {
      req.user = response.data.username;
      next();
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  } catch (err) {
    res.status(401).json({ error: 'Token validation failed' });
  }
};

// Get all todos for the user
app.get('/todos', authenticate, (req, res) => {
  const userTodos = todos.filter(todo => todo.username === req.user);
  res.json(userTodos);
});

// Get specific todo
app.get('/todos/:id', authenticate, (req, res) => {
  const todo = todos.find(t => t.id === parseInt(req.params.id) && t.username === req.user);
  if (!todo) {
    return res.status(404).json({ error: 'Todo not found' });
  }
  res.json(todo);
});

// Create todo
app.post('/todos', authenticate, (req, res) => {
  const { task } = req.body;
  if (!task) {
    return res.status(400).json({ error: 'Task required' });
  }
  const todo = { id: idCounter++, username: req.user, task, completed: false };
  todos.push(todo);
  res.status(201).json(todo);
});

// Update todo
app.put('/todos/:id', authenticate, (req, res) => {
  const todo = todos.find(t => t.id === parseInt(req.params.id) && t.username === req.user);
  if (!todo) {
    return res.status(404).json({ error: 'Todo not found' });
  }
  const { task, completed } = req.body;
  if (task) todo.task = task;
  if (typeof completed === 'boolean') todo.completed = completed;
  res.json(todo);
});

// Delete todo
app.delete('/todos/:id', authenticate, (req, res) => {
  const index = todos.findIndex(t => t.id === parseInt(req.params.id) && t.username === req.user);
  if (index === -1) {
    return res.status(404).json({ error: 'Todo not found' });
  }
  todos.splice(index, 1);
  res.status(204).send();
});

app.listen(PORT, () => console.log(`Todo service running on port ${PORT}`));