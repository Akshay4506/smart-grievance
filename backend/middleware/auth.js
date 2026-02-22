const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
            req.user = decoded; // { id, role }
            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const officialOnly = (req, res, next) => {
    if (req.user && req.user.role === 'official') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an official' });
    }
};

module.exports = { protect, officialOnly };
