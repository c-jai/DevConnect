const jwt = require("jsonwebtoken");
const config = require("config");

module.exports = function(req, res, next) {
	//get token from header (since requests to protected routes need to be sent with the jwt token)
	const token = req.header("x-auth-token");

	//check if no token
	if (!token) {
		return res.status(401).json({ msg: "No token, authorization denied" });
	}

	//verify token if present
	try {
		const decoded = jwt.verify(token, config.get("jwtToken"));
		req.user = decoded.user; //decoded.user is basically the payload "user" we sent in the jwt signing process
		next();
	} catch (err) {
		res.status(401).json({ msg: "Token is not valid" });
	}
};
