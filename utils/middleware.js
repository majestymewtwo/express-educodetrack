const jwt = require("jsonwebtoken");

const jwtFilter = async (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || authHeader.split(" ")[0] !== "Bearer") {
    return res.sendStatus(401);
  }

  const token = authHeader.split(" ")[1];
  if(!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if(err) {
        console.error(err);
        return res.sendStatus(401);
    }
    req.user = user;
    next();
  });
};

module.exports = jwtFilter;
