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
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4,  
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Could not connect to MongoDB', err));

// Define Schema and Model
const todoSchema = new mongoose.Schema({
    todo: { type: String, required: true },
    position: { type: Number, required: true },
    status: { type: String, default: "pending" }, // Added status field
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
        console.log(err);
        res.status(500).send('Internal Server Error');
    }
});

// Add a new todo
app.post('/', async (req, res, next) => {
    const schema = Joi.object().keys({
        todo: Joi.string().required(),
        priority: Joi.string().valid("high", "medium", "low").required()
    });

    const userInput = req.body;
    const { error } = schema.validate(userInput);
    if (error) {
        const err = new Error("Invalid Input");
        err.status = 400;
        next(err);
    } else {
        try {
            const lastTodo = await Todo.findOne().sort({ position: -1 }).exec();
            const newPosition = lastTodo ? lastTodo.position + 1 : 1;  // Start with position 1 if no todos exist

            const newTodo = new Todo({
                todo: userInput.todo,
                status: "pending",
                priority: userInput.priority, 
                position: newPosition
            });

            const savedTodo = await newTodo.save();
            res.json({ result: savedTodo, msg: "Successfully added task!", error: null });
        } catch (err) {
            res.status(500).json({ error: "Failed to add task" });
        }
    }
});

// Delete a todo
app.delete('/:id', async (req, res) => {
    const todoId = req.params.id;

    try {
        const deletedTodo = await Todo.findByIdAndDelete(todoId);
        res.json({ message: 'Todo deleted successfully!' });
    } catch (err) {
        console.log(err);
        res.status(500).send('Internal Server Error');
    }
});

// Reorder todos
app.post('/reorder', async (req, res) => {
    const { reorderedTodos } = req.body;

    try {
        await Promise.all(reorderedTodos.map((todo, index) => {
            return Todo.findByIdAndUpdate(todo._id, { position: index + 1 });
        }));

        res.json({ message: 'Todos reordered successfully!' });
    } catch (err) {
        console.log(err);
        res.status(500).send('Internal Server Error');
    }
});

// Update a todo
app.put('/:id', async (req, res) => {
    const todoID = req.params.id;
    const userInput = req.body;

    try {
        const updatedTodo = await Todo.findByIdAndUpdate(
            todoID,
            { todo: userInput.todo, priority: userInput.priority },
            { new: true }
        );
        res.json(updatedTodo);
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

// Error handling middleware
app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
        error: {
            message: err.message
        }
    });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
