const express = require('express');
const path = require('path');
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
const emailRoutes = require('./services/email/routes/emailRoutes');
const filesRoutes = require('./services/files/routes/filesRoutes');
const investigationRoutes = require('./services/investigation/routes/investigationRoutes');
const browserRoutes = require('./services/browser/routes/browserRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());

// Serve backend/content statically (wallpapers, icons, and other desktop assets)
app.use('/content', express.static(path.join(__dirname, 'content')));

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
app.use('/api/email', emailRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/investigation', investigationRoutes);
app.use('/api/browser', browserRoutes);


app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});