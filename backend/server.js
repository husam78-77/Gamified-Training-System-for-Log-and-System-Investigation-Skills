const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('./config/passport');
require('dotenv').config();

const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
// const testing = require('./utils/test')
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());

// 👇 Add these
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);


app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});