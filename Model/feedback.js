const mongoose = require("mongoose");

const feedbackSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    subject: {
        type: String,
        required: true,
    },
    comment: {
        type: String,
        required: true,
    },
});

module.exports = mongoose.model("Feedback", feedbackSchema);
