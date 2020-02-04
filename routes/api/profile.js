const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const Profile = require("../../models/Profile");
const User = require("../../models/User");

//@route    GET api/profile/me
//@desc     get current user's profile
//@access   Private
router.get("/me", auth, async (req, res) => {
	try {
		const profile = await (await Profile.findOne({ user: req.user.id })) //the user field in ProfileSchema
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

module.exports = router;
