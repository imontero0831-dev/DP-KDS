// Dev server only (CRA picks this file up automatically; it is not part of
// the production build). On Vercel, api/staff-auth.js runs as a serverless
// function; `npm start` has no such thing, so mount the same handler here.
// STAFF_PINS / STAFF_SIGNING_SECRET come from .env.local, which CRA loads
// into this process. Deliberately does NOT mount api/clover.js -- local dev
// must not gain a new path to the live Clover account.
const express = require("express");
const staffAuth = require("../api/staff-auth");

module.exports = function (app) {
  app.post("/api/staff-auth", express.json(), (req, res) => staffAuth(req, res));
};
