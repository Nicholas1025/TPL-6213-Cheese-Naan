const express = require('express');
const bodyParser = require("body-parser");
const path = require('path');
const Joi = require('joi');
const mongoose = require('mongoose');

const app = express();

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/crud_mongodb', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB', err));

// Define Schema and Model
const todoSchema = new mongoose.Schema({
    todo: { type: String, required: true },
    status: { type: String, default: "pending" },
    priority: { type: String, default: "medium" } // Added priority field
});

const Todo = mongoose.model('Todo', todoSchema);

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'video')));

// Serve HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Get all todos
app.get('/getTodos', async (req, res) => {
    try {
        const todos = await Todo.find();
        res.json(todos);
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Add a new todo
app.post('/', async (req, res, next) => {
    const schema = Joi.object().keys({
        todo: Joi.string().required(),
        priority: Joi.string().valid("high", "medium", "low").required() // Added validation for priority
    });

    const userInput = req.body;
    const { error } = schema.validate(userInput);
    if (error) {
        const err = new Error("Invalid Input");
        err.status = 400;
        next(err);
    } else {
        try {
            const newTodo = new Todo({
                todo: userInput.todo,
                status: "pending",
                priority: userInput.priority // Store priority
            });
            const savedTodo = await newTodo.save();
            res.json({ result: savedTodo, msg: "Successfully added task!", error: null });
        } catch (err) {
            res.status(500).json({ error: "Failed to add task" });
        }
    }
});

// Update a todo
app.put('/:id', async (req, res) => {
    const todoID = req.params.id;
    const userInput = req.body;

    try {
        const updatedTodo = await Todo.findByIdAndUpdate(
            todoID,
            { todo: userInput.todo, priority: userInput.priority }, // Update priority
            { new: true }
        );
        res.json(updatedTodo);
    } catch (err) {
        res.status(500).send('Internal Server Error');
    }
});

// Delete a todo
app.delete('/:id', async (req, res) => {
    const todoID = req.params.id;

    try {
        const deletedTodo = await Todo.findByIdAndDelete(todoID);
        res.json(deletedTodo);
    } catch (err) {
        res.status(500).send('Internal Server Error');
    }
});

// Update status
app.put('/updateStatus/:id', async (req, res) => {
    const todoID = req.params.id;
    const newStatus = req.body.status;

    try {
        const updatedTodo = await Todo.findOneAndUpdate(
            { _id: todoID },
            { status: newStatus },
            { new: true }
        );

        if (updatedTodo) {
            res.json({ ok: 1, result: updatedTodo });
        } else {
            res.status(404).json({ error: "Todo not found" });
        }
    } catch (err) {
        res.status(500).json({ error: "Failed to update status" });
    }
});

// Error handling
app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
        error: {
            message: err.message
        }
    });
});

// Start server
app.listen(3000, () => {
    console.log('App listening on port 3000');
});
