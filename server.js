const express = require('express');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración de EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal
app.get('/', async (req, res) => {
    try {
        const response = await axios.get('https://zenquotes.io/api/random');
        const quoteData = response.data[0];
        const quote = {
            text: quoteData.q,
            author: quoteData.a
        };
        res.render('index', { quote });
    } catch (error) {
        console.error('Error fetching quote:', error);
        // Quote por defecto en caso de error
        const quote = {
            text: "The ocean is a mighty harmonist.",
            author: "William Wordsworth"
        };
        res.render('index', { quote });
    }
});

// Ruta para help.html (Importante para mantener estático)
app.get('/help', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'help.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});