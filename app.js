const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const Joi = require('joi');
const dotenv = require('dotenv');
const cors = require('cors');

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crud_mongodb';

// Connect to MongoDB
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Could not connect to MongoDB', err));

// Define Schema and Model
const todoSchema = new mongoose.Schema({
    todo: { type: String, required: true },
    position: { type: Number, required: true },
    status: { type: String, default: "pending" },
    priority: { type: String, default: "medium" }
});

const Todo = mongoose.model('Todo', todoSchema);

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Get all todos
app.get('/getTodos', async (req, res) => {
    try {
        const todos = await Todo.find().sort({ position: 1 });
        res.json(todos);
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Add a new todo
app.post('/', async (req, res) => {
    const schema = Joi.object({
        todo: Joi.string().required(),
        priority: Joi.string().valid("high", "medium", "low").required()
    });

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const lastTodo = await Todo.findOne().sort({ position: -1 });
        const newPosition = lastTodo ? lastTodo.position + 1 : 1;

        const newTodo = new Todo({
            todo: req.body.todo,
            status: "pending",
            priority: req.body.priority,
            position: newPosition
        });

        const savedTodo = await newTodo.save();
        res.json(savedTodo);
    } catch (err) {
        res.status(500).json({ error: "Failed to add task" });
    }
});

// Delete a todo
app.delete('/:id', async (req, res) => {
    try {
        await Todo.findByIdAndDelete(req.params.id);
        res.json({ message: 'Todo deleted successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Update a todo
app.put('/:id', async (req, res) => {
    try {
        const updatedTodo = await Todo.findByIdAndUpdate(
            req.params.id,
            { todo: req.body.todo, priority: req.body.priority },
            { new: true }
        );
        res.json(updatedTodo);
    } catch (err) {
        res.status(500).send('Internal Server Error');
    }
});

// Update status
app.put('/updateStatus/:id', async (req, res) => {
    try {
        const updatedTodo = await Todo.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true }
        );
        res.json(updatedTodo);
    } catch (err) {
        res.status(500).send('Internal Server Error');
    }
});

// Reorder todos
app.post('/reorder', async (req, res) => {
    try {
        await Promise.all(req.body.reorderedTodos.map((todo, index) => {
            return Todo.findByIdAndUpdate(todo._id, { position: index + 1 });
        }));
        res.json({ message: 'Todos reordered successfully!' });
    } catch (err) {
        res.status(500).send('Internal Server Error');
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
