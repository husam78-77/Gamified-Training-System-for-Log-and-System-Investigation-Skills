const Mailjet = require('node-mailjet');

const mailjet = Mailjet.apiConnect(
    process.env.MAILJET_API_KEY,
    process.env.MAILJET_SECRET_KEY
);

const sendWelcomeEmail = async (toEmail, username) => {
    try {
        await mailjet.post('send', { version: 'v3.1' }).request({
            Messages: [
                {
                    From: {
                        Email: process.env.SENDER_EMAIL,
                        Name: 'Your App Name',
                    },
                    To: [
                        {
                            Email: toEmail,
                            Name: username,
                        },
                    ],
                    Subject: '🎉 Welcome! Registration Successful',
                    HTMLPart: `
                        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
                            <h2 style="color: #4f46e5;">Welcome, ${username}! 🎓</h2>
                            <p>Your account has been created successfully.</p>
                            <p style="color: #6b7280; font-size: 14px;">If you didn't register, please ignore this email.</p>
                            <hr style="border: none; border-top: 1px solid #e5e7eb;" />
                            <p style="font-size: 12px; color: #9ca3af;">© 2026 Your App Name</p>
                        </div>
                    `,
                },
            ],
        });
        console.log(`✅ Welcome email sent to ${toEmail}`);
    } catch (err) {
        // Email failure won't break registration
        console.error('❌ Failed to send welcome email:', err.message);
    }
};

module.exports = { sendWelcomeEmail };