const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const Profile = require("../../models/Profile");
const User = require("../../models/User");
const Post = require("../../models/Post");

const { check, validationResult } = require("express-validator");
const request = require("request");
const config = require("config");

//@route    GET api/profile/me
//@desc     get current user's profile
//@access   Private
router.get("/me", auth, async (req, res) => {
	try {
		const profile = await Profile.findOne({ user: req.user.id }) //the user field in ProfileSchema
			.populate("user", ["name", "avatar"]); //populate the result with name and avatar from the "user" collection
		if (!profile) {
			return res.status(400).json({ msg: "There is no profile for this user" });
		}

		res.json(profile);
	} catch (err) {
		console.error(err.message);
		res.status(500).send("Server error");
	}
});

//@route    POST api/profile
//@desc     create or update a user's profile
//@access   Private
router.post(
	"/",
	[
		//array of middlewares
		auth,
		check("status", "Status is required")
			.not()
			.isEmpty(),
		check("skills", "Skill(s) is required")
			.not()
			.isEmpty()
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty())
			return res.status(400).json({ errors: errors.array() });

		const {
			company,
			website,
			location,
			bio,
			status,
			githubusername,
			skills,
			youtube,
			facebook,
			twitter,
			instagram,
			linkedin
		} = req.body;

		//build a profile object
		const profileFields = {};
		profileFields.user = req.user.id;
		if (company) profileFields.company = company;
		if (website) profileFields.website = website;
		if (location) profileFields.location = location;
		if (bio) profileFields.bio = bio;
		if (status) profileFields.status = status;
		if (githubusername) profileFields.githubusername = githubusername;
		if (skills) {
			profileFields.skills = skills.split(",").map(skill => skill.trim());
		}

		// Build social object
		profileFields.social = {};
		if (youtube) profileFields.social.youtube = youtube;
		if (twitter) profileFields.social.twitter = twitter;
		if (facebook) profileFields.social.facebook = facebook;
		if (linkedin) profileFields.social.linkedin = linkedin;
		if (instagram) profileFields.social.instagram = instagram;

		//insert a profile into the db

		try {
			let profile = await Profile.findOne({ user: req.user.id });

			//update existing profile
			if (profile) {
				profile = await Profile.findOneAndUpdate(
					{ user: req.user.id },
					{ $set: profileFields },
					{ new: true } //what does this do
				); //mongoose methods always return promises, therefore preceeded by await

				return res.json(profile);
			}

			//create a new profile
			profile = new Profile(profileFields);
			await profile.save();
			return res.json(profile);
		} catch (err) {
			console.error(err.message);
			res.status(500).send("Server error");
		}
	}
);

//@route    GET api/profile
//@desc     get all profiles
//@access   Public
router.get("/", async (req, res) => {
	try {
		const profiles = await Profile.find().populate("user", ["name", "avatar"]);
		res.json(profiles);
	} catch (err) {
		console.error(err.message);
		res.status(500).send("Server error");
	}
});

//@route    GET api/profile/user/:user_id (this is a place holder for the user id that'll be passed in)
//@desc     get profile by user id
//@access   Public
router.get("/user/:user_id", async (req, res) => {
	try {
		const profile = await Profile.findOne({
			user: req.params.user_id
		}).populate("user", ["name", "avatar"]);

		if (!profile) return res.status(400).json({ msg: "Profile not found" });
		res.json(profile);
	} catch (err) {
		console.error(err.message);
		if (err.kind == "ObjectId")
			//error due to incorrect user id
			return res.status(400).json({ msg: "Profile not found" });

		res.status(500).send("Server error");
	}
});

//@route    DELETE api/profile
//@desc     delete profile, user and posts
//@access   Private
router.delete("/", auth, async (req, res) => {
	try {
		// Remove posts
		await Post.deleteMany({ user: req.user.id });
		// Remove profile
		await Profile.findOneAndRemove({ user: req.user.id });
		// Remove user
		await User.findOneAndRemove({ _id: req.user.id });

		res.json({ msg: "User deleted" });
	} catch (err) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// @route    PUT api/profile/experience
// @desc     Add profile experience
// @access   Private
router.put(
	"/experience",
	[
		auth,
		[
			check("title", "Title is required")
				.not()
				.isEmpty(),
			check("company", "Company is required")
				.not()
				.isEmpty(),
			check("from", "From date is required")
				.not()
				.isEmpty()
		]
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const {
			title,
			company,
			location,
			from,
			to,
			current,
			description
		} = req.body;

		const newExp = {
			title,
			company,
			location,
			from,
			to,
			current,
			description
		};

		try {
			const profile = await Profile.findOne({ user: req.user.id });

			profile.experience.unshift(newExp); //add newest at the start

			await profile.save();

			res.json(profile);
		} catch (err) {
			console.error(err.message);
			res.status(500).send("Server Error");
		}
	}
);

//@route    DELETE api/profile/experience/:exp_id
//@desc     Delete experience from profile
//@access   Private
router.delete("/experience/:exp_id", auth, async (req, res) => {
	try {
		const profile = await Profile.findOne({ user: req.user.id });

		// Get remove index
		const indexToBeRemoved = profile.experience
			.map(item => item.id)
			.indexOf(req.params.exp_id);

		profile.experience.splice(indexToBeRemoved, 1);

		await profile.save();

		res.json(profile);
	} catch (err) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// @route    PUT api/profile/education
// @desc     Add profile education
// @access   Private
router.put(
	"/education",
	[
		auth,
		[
			check("school", "School is required")
				.not()
				.isEmpty(),
			check("degree", "Degree is required")
				.not()
				.isEmpty(),
			check("fieldofstudy", "Field of Study is required")
				.not()
				.isEmpty(),
			check("from", "From date is required")
				.not()
				.isEmpty()
		]
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const {
			school,
			degree,
			fieldofstudy,
			from,
			to,
			current,
			description
		} = req.body;

		const newEdu = {
			school,
			degree,
			fieldofstudy,
			from,
			to,
			current,
			description
		};

		try {
			const profile = await Profile.findOne({ user: req.user.id });

			profile.education.unshift(newEdu);

			await profile.save();

			res.json(profile);
		} catch (err) {
			console.error(err.message);
			res.status(500).send("Server Error");
		}
	}
);

// @route    DELETE api/profile/education/:edu_id
// @desc     Delete education from profile
// @access   Private
router.delete("/education/:edu_id", auth, async (req, res) => {
	try {
		const profile = await Profile.findOne({ user: req.user.id });

		//Get remove index
		const indexToBeRemoved = profile.education
			.map(item => item.id)
			.indexOf(req.params.edu_id);

		profile.education.splice(indexToBeRemoved, 1);
		await profile.save();
		res.json(profile);
	} catch (err) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// @route    GET api/profile/github/:username
// @desc     Get user repos from Github
// @access   Public
router.get("/github/:username", (req, res) => {
	try {
		const options = {
			uri: encodeURI(
				`https://api.github.com/users/${
					req.params.username
				}/repos?per_page=5&sort=created:asc&client_id=${config.get(
					"githubClientId"
				)}&client_secret=${config.get("githubSecret")}`
			),
			method: "GET",
			headers: { "user-agent": "node.js" }
		};

		request(options, (error, response, body) => {
			if (error) console.error(error);

			if (response.statusCode !== 200) {
				return res.status(404).json({ msg: "No Github profile found" });
			}

			res.json(JSON.parse(body));
		});
	} catch (err) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

module.exports = router;
