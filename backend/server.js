const express = require('express');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config({ path: __dirname + '/.env' });
const passport = require('./config/passport');

const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const scenarioRoutes = require('./routes/scenarioRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const terminalRoutes = require('./routes/terminalRoutes');
const hintRoutes = require('./routes/hintRoutes');
const desktopRoutes = require('./routes/desktopRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

// Existing routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Gaming engine routes
app.use('/api/scenarios', scenarioRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/terminal', terminalRoutes);
app.use('/api/hints', hintRoutes);
app.use('/api/desktop', desktopRoutes);


app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});