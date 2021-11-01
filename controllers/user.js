const User = require('../models/user');
const winston = require('../config/winston');
const {hashPassword} = require('../user_modules/hash_password');
const {MESSAGES} = require('../config/message');

exports.register = async (req, res, next) => {
    const { password, isAdmin, secret } = req.body;
    let { username } = req.body;
    if(secret !== process.env.SECRET) {
        res.send(401);
        return next();
    }
    if(typeof isAdmin !== 'boolean') {
        res.send(400, {message: MESSAGES.ISADMIN});
        return next();
    }
    if(!username || !password) {
        res.send(400, {message: MESSAGES.EMPTYUSERORPASS});
        return next();
    }
    username = username.toLowerCase();
    try {
        const user = await User.findOne({ username });
        if (user) {
            winston.info('creating user already exists!');
            res.json(400, {message: MESSAGES.USEREXISTS});
            return next();
        }
    } catch(err) {
        winston.error('Error Finding username in database');
        winston.error(err);
        res.send(500, {message: MESSAGES.INTERNAL});
        return next();
    }
    const user = new User({
        username,
        password,
        isAdmin
    });
    winston.info('running hash password from POST user route!');
    try {
        const newUser = await hashPassword(user, user.password);
        res.send(200, {message: MESSAGES.CREATEUSER});
        return next();
    } catch(err) {
        winston.error(err)
        res.send(500, {message: MESSAGES.INTERNAL});
    }
};