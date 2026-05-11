const bcrypt = require('bcrypt');
bcrypt.hash('1', 12).then(hash => {
    console.log(hash);
    return bcrypt.compare('1', hash);
}).then(isMatch => {
    console.log('Matches "1":', isMatch);
});
