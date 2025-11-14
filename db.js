const mongoose = require('mongoose');

// Database name
const dbname = "crud_mongodb";
const url = 'mongodb://localhost:27017/crud_mongodb';

// Connect to MongoDB using Mongoose
const connect = (cb) => {
    mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
        .then(() => {
            console.log('Connected to MongoDB');
            cb();
        })
        .catch(err => {
            console.error('Could not connect to MongoDB', err);
            cb(err);
        });
};

// Define Schema and Model
const todoSchema = new mongoose.Schema({
    todo: { type: String, required: true },
    status: { type: String, default: "pending" },
    priority: { type: String, default: "medium" } 
});

const Todo = mongoose.model('Todo', todoSchema);

const getPrimaryKey = (_id) => {
    return mongoose.Types.ObjectId(_id);
};

const getDB = () => {
    return mongoose.connection;
};

module.exports = { getDB, connect, getPrimaryKey, Todo };
