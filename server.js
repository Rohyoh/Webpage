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
    secure: isProduction, // Solo HTTPS en producción
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

// Passport Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${baseURL}/auth/google/callback`
  },
  function(accessToken, refreshToken, profile, done) {
    // Simple user serialization - (guardar en base de datos xddd)
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

app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.isProduction = isProduction;
  next();
});

// Authentication
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
    // Successful auth
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
    // Quote por defecto en caso de que no cargue la API
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

// RESTful API xddddd
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

// Ruta para help.html
app.get('/help', (req, res) => {
    res.render('help');
});

// Ruta de health check para Render
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    environment: isProduction ? 'production' : 'development',
    timestamp: new Date().toISOString()
  });
});

// Error handling (when falla bro)
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).render('error', { 
    message: 'Something went wrong!',
    error: isProduction ? {} : err // Solo mostrar detalles en desarrollo
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
  console.log(`Server running in ${isProduction ? 'production' : 'development'} mode`);
  console.log(`App URL: ${baseURL}`);
  console.log(`Port: ${PORT}`);
});