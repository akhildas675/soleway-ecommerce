const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const nocache = require('nocache');
const passport = require('passport');
require('dotenv').config();

const userRoute = require('./routes/userRoutes');
const adminRoute = require('./routes/adminRoute');
const userController = require('./Controller/userController/userController');

const app = express();

// Connect MongoDB (Atlas recommended for deployment)
mongoose.connect(process.env.MONGO_URL, {})
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err.message));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(nocache());

app.use(session({
  secret: process.env.SESSION_SECRET || "mySiteSessionSecret",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/admin', adminRoute);
app.use('/', userRoute);

// 404 handler
app.use((req, res) => {
  userController.render404(req, res);
});

// 500 handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  userController.render500(req, res);
});


module.exports = app;
