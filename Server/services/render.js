const axios = require("axios");

exports.homeRoutes = (req, res) => {
  res.render("index");
};
exports.video_chat = (req, res) => {
  res.render("video_chat");
};
exports.about = (req, res) => {
  res.render("about");
};
exports.terms = (req, res) => {
  res.render("terms");
};
exports.contact = (req, res) => {
  res.render("contact");
};


