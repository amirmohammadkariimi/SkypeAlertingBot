userController = require('../controllers/user');
module.exports = server => {
    // Create a new User
    server.post('/api/register', userController.register);
}