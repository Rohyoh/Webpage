const express = require('express');
const path = require('path');
const axios = require('axios');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

//Config for Render proxy
app.set('trust proxy', 1);

const isProduction = process.env.NODE_ENV === 'production';
const baseURL = isProduction 
  ? 'https://cleandseas.onrender.com'
  : 'http://localhost:3001';

//MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

connectDB();

//Database
const userClickSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  displayName: String,
  email: String,
  clickedAt: {
    type: Date,
    default: Date.now
  }
});

const clickCounterSchema = new mongoose.Schema({
  count: {
    type: Number,
    default: 0
  }
});

const UserClick = mongoose.model('UserClick', userClickSchema);
const ClickCounter = mongoose.model('ClickCounter', clickCounterSchema);

//Initialize counter
const initializeCounter = async () => {
  try {
    const counter = await ClickCounter.findOne();
    if (!counter) {
      await ClickCounter.create({ count: 0 });
      console.log('Counter initialized');
    }
  } catch (error) {
    console.error('Error initializing counter:', error);
  }
};

initializeCounter();

//Session config
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret_key_for_development',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: isProduction,
    httpOnly: true, 
    sameSite: 'lax', 
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.get('/api/auth/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      authenticated: true,
      user: {
        id: req.user.id,
        displayName: req.user.displayName,
        email: req.user.emails[0].value,
        photo: req.user.photos[0].value
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Passport config
app.use(passport.initialize());
app.use(passport.session());

// Passport Google OAuth
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${baseURL}/auth/google/callback`
  },
  function(accessToken, refreshToken, profile, done) {
    //user serialization
    return done(null, profile);
  }
));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// EJS Config
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// JSON parsing middleware
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.isProduction = isProduction;
  console.log('User in middleware:', req.user ? req.user.displayName : 'No user');
  next();
});

// Auth Routes
app.get('/auth/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/?auth_error=1' 
  }),
  (req, res) => {
    // Successful authentication
    res.redirect('/');
  }
);

app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.redirect('/');
    }
    res.redirect('/');
  });
});


app.get('/api/click-count', async (req, res) => {
  try {
    const counter = await ClickCounter.findOne();
    res.json({ count: counter ? counter.count : 0 });
  } catch (error) {
    console.error('Error getting counter:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/click', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.user.id;
    
    // Check if user already clicked
    const existingClick = await UserClick.findOne({ userId });
    if (existingClick) {
      return res.status(400).json({ error: 'You have already clicked before' });
    }

    // Register user click
    await UserClick.create({
      userId: userId,
      displayName: req.user.displayName,
      email: req.user.emails[0].value
    });

    // Increment global counter
    const counter = await ClickCounter.findOneAndUpdate(
      {},
      { $inc: { count: 1 } },
      { new: true, upsert: true }
    );

    res.json({ 
      success: true, 
      count: counter.count,
      message: 'Thank you for joining the cause!' 
    });

  } catch (error) {
    console.error('Error registering click:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Main route
app.get('/', async (req, res) => {
  try {
    const response = await axios.get('https://zenquotes.io/api/random');
    const quoteData = response.data[0];
    const quote = {
      text: quoteData.q,
      author: quoteData.a
    };
    res.render('index', { 
      quote,
      authError: req.query.auth_error 
    });
  } catch (error) {
    console.error('Error fetching quote:', error);
    // Default quote if it doesn't load
    const quote = {
      text: "The ocean is a mighty harmonist.",
      author: "William Wordsworth"
    };
    res.render('index', { 
      quote,
      authError: req.query.auth_error 
    });
  }
});

// Route for help.ejs
app.get('/help', async (req, res) => {
  try {
    const counter = await ClickCounter.findOne();
    const totalClicks = counter ? counter.count : 0;
    
    // el usuario, ya dió click?
    let userHasClicked = false;
    if (req.isAuthenticated()) {
      const userClick = await UserClick.findOne({ userId: req.user.id });
      userHasClicked = !!userClick;
    }

    console.log('Help route accessed - User:', req.user ? req.user.displayName : 'No user');
    res.render('help', { 
      totalClicks,
      userHasClicked
    });
  } catch (error) {
    console.error('Error loading help page:', error);
    res.render('help', { 
      totalClicks: 0,
      userHasClicked: false
    });
  }
});

// RESTful API
app.get('/api/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      authenticated: true,
      user: {
        id: req.user.id,
        displayName: req.user.displayName,
        email: req.user.emails[0].value,
        photo: req.user.photos[0].value
      },
      environment: isProduction ? 'production' : 'development'
    });
  } else {
    res.json({ 
      authenticated: false,
      environment: isProduction ? 'production' : 'development'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    environment: isProduction ? 'production' : 'development',
    timestamp: new Date().toISOString(),
    user: req.user ? 'authenticated' : 'not authenticated'
  });
});

// Error handling (por si explota xddd)
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).render('error', { 
    message: 'Something went wrong!',
    error: isProduction ? {} : err
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', { 
    message: 'Page not found',
    error: {}
  });
});

app.listen(PORT, () => {
  console.log(`Environment: ${isProduction ? 'production' : 'development'}`);
  console.log(`App URL: ${baseURL}`);
  console.log(`Port: ${PORT}`);
  console.log(`Google OAuth configured: ${process.env.GOOGLE_CLIENT_ID ? 'Yes' : 'No'}`);
});