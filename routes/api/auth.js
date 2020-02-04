const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const User = require("../../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");
const { check, validationResult } = require("express-validator");

//@route    GET api/auth
//@desc     Get user by token
//@access   Public
router.get("/", auth, async (req, res) => {
	try {
		//req.user is assigned with the payload "user" we sent in the jwt signing process, refer middleware
		const user = await User.findById(req.user.id).select("-password"); //do not include password
		res.json(user); //used for filling redux state, so that app knows which user is logged in all the time
	} catch (err) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
	//res.send("auth route");
});

//@route    POST api/auth
//@desc     Authenticate user & get token
//@access   Public
router.post(
	"/",
	[
		check("email", "Email is required") //these validations are provided by express-validator module
			.not()
			.isEmpty(),
		check("email", "Please enter a valid email address").isEmail(),
		check("password", "Please enter a password").exists()
	],
	async (req, res) => {
		const errors = validationResult(req); //returns results of validating the request
		if (!errors.isEmpty())
			return res.status(400).json({ errors: errors.array() });

		const { email, password } = req.body;

		try {
			let user = await User.findOne({ email: email });

			if (!user)
				return res
					.status(400)
					.json({ errors: [{ msg: "Invalid Credentials" }] });

			const isMatch = await bcrypt.compare(password, user.password);

			if (!isMatch) {
				return res
					.status(400)
					.json({ errors: [{ msg: "Invalid Credentials" }] });
			}

			// get jwt token
			const payload = {
				user: {
					id: user.id
				}
			};

			jwt.sign(
				payload,
				config.get("jwtToken"),
				{ expiresIn: 3600000 },
				(err, token) => {
					if (err) throw err;
					res.json({ token: token });
				}
			);
		} catch (err) {
			console.error(err.message);
			res.status(500).send("Server error");
		}
	}
);

module.exports = router;
