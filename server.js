require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const passport = require('passport');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { registerUser, checkAuthenticated, checkNotAuthenticated } = require('./auth');
const User = require('./models/User');
const Survey = require('./models/Survey');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect("mongodb+srv://amazaingAdmin:mcJQzHFjVoLfjrlC@cluster0.fr5wl.mongodb.net/project_db", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
})
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.log('MongoDB connection error:', err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Global variables
app.use((req, res, next) => {
    res.locals.isAuthenticated = req.isAuthenticated();
    res.locals.user = req.user;
    next();
});

// Routes
app.get('/', checkAuthenticated, async (req, res) => {
    try {
        const surveys = await Survey.find({ user: req.user.id });
        res.render('index', { surveys });
    } catch (err) {
        res.status(500).send('Error loading surveys.');
    }
});

app.get('/register', checkNotAuthenticated, (req, res) => res.render('register'));
app.post('/register', checkNotAuthenticated, registerUser);

app.get('/login', checkNotAuthenticated, (req, res) => res.render('login', { message: req.flash('error') }));
app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true,
}));

app.post('/logout', (req, res, next) => {
    req.logout(err => {
        if (err) return next(err);
        res.redirect('/login');
    });
});

app.get('/create-survey', checkAuthenticated, (req, res) => res.render('create-survey'));

app.post('/surveys', checkAuthenticated, async (req, res) => {
    try {
        const newSurvey = new Survey({
            title: req.body.title,
            description: req.body.description,
            status: req.body.status || 'Active',
            user: req.user.id,
        });
        await newSurvey.save();
        res.redirect('/');
    } catch (err) {
        res.status(500).send('Error creating survey.');
    }
});

app.get('/surveys/:id', checkAuthenticated, async (req, res) => {
    try {
        const survey = await Survey.findOne({ _id: req.params.id, user: req.user.id });
        if (!survey) {
            return res.status(404).send('Survey not found.');
        }
        res.render('survey-details', { survey });
    } catch (err) {
        res.status(500).send('Error loading survey.');
    }
});

app.put('/surveys/:id', checkAuthenticated, async (req, res) => {
    try {
        const survey = await Survey.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            { title: req.body.title, description: req.body.description, status: req.body.status },
            { new: true },
        );
        if (!survey) {
            return res.status(404).send('Survey not found.');
        }
        res.redirect('/');
    } catch (err) {
        res.status(500).send('Error updating survey.');
    }
});

app.delete('/surveys/:id', checkAuthenticated, async (req, res) => {
    try {
        const survey = await Survey.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        if (!survey) {
            return res.status(404).send('Survey not found.');
        }
        res.redirect('/');
    } catch (err) {
        res.status(500).send('Error deleting survey.');
    }
});

// Edit survey route
app.get('/surveys/:id/edit', checkAuthenticated, async (req, res) => {
    try {
        const survey = await Survey.findOne({ _id: req.params.id, user: req.user.id });
        if (!survey) {
            return res.status(404).send('Survey not found.');
        }
        res.render('edit-survey', { survey });
    } catch (err) {
        res.status(500).send('Error loading survey for editing.');
    }
});

// Update survey route
app.put('/surveys/:id', checkAuthenticated, async (req, res) => {
    try {
        const survey = await Survey.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            { title: req.body.title, description: req.body.description, status: req.body.status },
            { new: true },
        );
        if (!survey) {
            return res.status(404).send('Survey not found.');
        }
        res.redirect('/');
    } catch (err) {
        res.status(500).send('Error updating survey.');
    }
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
