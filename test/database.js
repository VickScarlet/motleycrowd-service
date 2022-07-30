import mongoose from 'mongoose';

await mongoose.connect('mongodb://127.0.0.1:27017', {
    dbName: 'test',
});
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    email: String,
    created: { type: Date, default: Date.now },
}, {
    
});
const User = mongoose.model('User', userSchema, 'user');

global.User = User;
debugger