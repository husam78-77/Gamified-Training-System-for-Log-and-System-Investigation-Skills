const sendEmail = require('./emailSender');

const testEmail = async () => {
    await sendEmail(
        'husamprince76@gmail.com',
        'Test Email',
        'It works 🔥'
    );
};

module.exports = { testEmail };