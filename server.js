const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const nocache = require('nocache');
const userRoute = require('./routes/userRoutes'); 
const adminRoute = require('./routes/adminRoute'); 
const userController = require('./Controller/userController/userController');
const app = express();

require('dotenv').config();

const passport = require('passport');
require('./passport');

mongoose.connect(process.env.MONGO_URL, {
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((error) => {
    console.error('Error connecting to MongoDB', error.message);
});

// Parsing body data 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(nocache());

app.use(session({
    secret: "mySiteSessionSecret",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/admin', adminRoute);
app.use('/', userRoute);

// 404 Handler
app.use((req, res) => {
    userController.render404(req, res);
});

// 500 Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    userController.render500(req, res);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
});