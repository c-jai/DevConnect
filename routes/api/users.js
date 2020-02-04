const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const User = require("../../models/User");
const gravatar = require("gravatar");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");

//@route    POST api/users
//@desc     register a new user
//@access   Public
router.post(
	"/",
	[
		check("name", "Name is required")
			.not()
			.isEmpty(),
		check("email", "Email is required") //these validations are provided by express-validator module
			.not()
			.isEmpty(),
		check("email", "Please enter a valid email address").isEmail(),
		check(
			"password",
			"Please enter a password of 6 or more characters"
		).isLength({ min: 6 })
	],
	async (req, res) => {
		const errors = validationResult(req); //returns results of validating the request
		if (!errors.isEmpty())
			return res.status(400).json({ errors: errors.array() });

		const { name, email, password } = req.body;

		try {
			let user = await User.findOne({ email: email });

			if (user)
				return res
					.status(400)
					.json({ errors: [{ msg: "user already exists" }] });

			const avatar = gravatar.url(email, {
				size: "200",
				rating: "pg",
				default: "mm"
			});

			user = new User({
				name,
				email,
				avatar,
				password
			});

			//encrypt the password before saving user to db
			const salt = await bcrypt.genSalt(10);
			user.password = await bcrypt.hash(password, salt);
			await user.save();

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

			//res.send("user registered");
		} catch (err) {
			console.error(err.message);
			res.status(500).send("Server error");
		}
	}
);

module.exports = router;
