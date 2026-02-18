const mongoose = require("mongoose");

const meetingSchema = new mongoose.Schema({
    roomId: String,
    participants: [String],
    transcript: [{
        user: String,
        message: String,
        time: { type: Date, default: Date.now }
    }],
    startTime: Date,
    endTime: Date,
    duration: Number
});

module.exports = mongoose.model("Meeting", meetingSchema);
