const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendWelcomeEmail = async (toEmail, username) => {
    try {
        await transporter.sendMail({
            from: `"Kinetic Breach" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: '🎉 Operative Enlisted Successfully',
            html: `
                <div style="font-family: Arial, sans-serif; background-color: #0A0A0A; color: #ffffff; max-width: 500px; margin: auto; padding: 32px; border: 1px solid #FF003C;">
                    <h1 style="color: #FF003C; font-style: italic; letter-spacing: -1px;">KINETIC BREACH</h1>
                    <div style="width: 100%; height: 2px; background: #FF003C; margin-bottom: 24px;"></div>
                    <h2 style="color: #ffffff; text-transform: uppercase; letter-spacing: 4px;">OPERATIVE ENLISTED</h2>
                    <p style="color: #aaaaaa; letter-spacing: 2px; font-size: 13px;">AGENT: <span style="color: #00FFFF;">${username}</span></p>
                    <p style="color: #aaaaaa; font-size: 13px; line-height: 1.8;">Your neural signature has been logged. Welcome to the network.</p>
                    <div style="margin-top: 32px; padding: 16px; border-left: 4px solid #FF003C; background: #1a1a1a;">
                        <p style="color: #ffffff; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; margin: 0;">
                            SYSTEM_NOTICE: THIS IS AN AUTOMATED TRANSMISSION. DO NOT REPLY.
                        </p>
                    </div>
                </div>
            `,
        });
        console.log(`✅ Welcome email sent to ${toEmail}`);
    } catch (err) {
        console.error('❌ Failed to send welcome email:', err.message);
    }
};

// 👇 New function
const sendTempPasswordEmail = async (toEmail, username, tempPassword) => {
    try {
        await transporter.sendMail({
            from: `"Kinetic Breach" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: '🔐 Emergency Access Code — Kinetic Breach',
            html: `
                <div style="font-family: Arial, sans-serif; background-color: #0A0A0A; color: #ffffff; max-width: 500px; margin: auto; padding: 32px; border: 1px solid #FF003C;">
                    <h1 style="color: #FF003C; font-style: italic; letter-spacing: -1px;">KINETIC BREACH</h1>
                    <div style="width: 100%; height: 2px; background: #FF003C; margin-bottom: 24px;"></div>
                    <h2 style="color: #ffffff; text-transform: uppercase; letter-spacing: 4px;">EMERGENCY ACCESS GRANTED</h2>
                    <p style="color: #aaaaaa; font-size: 13px;">AGENT: <span style="color: #00FFFF;">${username}</span></p>
                    <p style="color: #aaaaaa; font-size: 13px; line-height: 1.8;">
                        A temporary access code has been issued for your account.
                        Use it to log in, then change your password immediately from your profile.
                    </p>
                    <div style="margin: 24px 0; padding: 20px; background: #1a1a1a; border: 2px solid #00FFFF; text-align: center;">
                        <p style="color: #00FFFF; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin: 0 0 8px 0;">TEMP ACCESS CODE</p>
                        <p style="color: #ffffff; font-size: 28px; font-weight: bold; letter-spacing: 6px; margin: 0;">${tempPassword}</p>
                    </div>
                    <div style="padding: 16px; border-left: 4px solid #FF003C; background: #1a1a1a;">
                        <p style="color: #FF003C; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0;">
                            ⚠ EXPIRES IN 1 HOUR — CHANGE YOUR PASSWORD AFTER LOGIN
                        </p>
                    </div>
                    <p style="color: #555; font-size: 11px; margin-top: 16px;">
                        If you did not request this, ignore this email. Your original password remains unchanged.
                    </p>
                </div>
            `,
        });
        console.log(`✅ Temp password email sent to ${toEmail}`);
    } catch (err) {
        console.error('❌ Failed to send temp password email:', err.message);
    }
};

module.exports = { sendWelcomeEmail, sendTempPasswordEmail };