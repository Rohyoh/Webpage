const express = require('express');
const path = require('path');
const axios = require('axios');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

const isProduction = process.env.NODE_ENV === 'production';
const baseURL = isProduction 
  ? 'https://cleandseas.onrender.com'
  : 'http://localhost:3001';

// Session config
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

// Passport confi
app.use(passport.initialize());
app.use(passport.session());

// Passport Google OAuth
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${baseURL}/auth/google/callback`
  },
  function(accessToken, refreshToken, profile, done) {
    // Simple user serialization
    return done(null, profile);
  }
));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Configuración de EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Archivos estáticos
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
    // Successful authent
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

// main
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
    // Quote por defecto en caso de que no cargue xd
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

// Ruta para help.ejs
app.get('/help', (req, res) => {
  console.log('Help route accessed - User:', req.user ? req.user.displayName : 'No user');
  res.render('help');
});

// RESTful API xdddddd
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

// Ruta de health check para Render
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    environment: isProduction ? 'production' : 'development',
    timestamp: new Date().toISOString(),
    user: req.user ? 'authenticated' : 'not authenticated'
  });
});

// Error handling (when explota xd)
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