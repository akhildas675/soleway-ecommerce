const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;
require('dotenv').config();

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

// console.log('CLIENT_ID', process.env.CLIENT_ID);  // Should print your Google Client ID
// console.log('CLIENT_SECRET', process.env.CLIENT_SECRET);  // Should print your Google Client Secret


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.NODE_ENV === "production"
    ? "https://soleway.shop/auth/google/callback" 
    : "http://localhost:3000/auth/google/callback",

    passReqToCallback: true
},
function(request, accessToken, refreshToken, profile, done) {
    return done(null, profile);
}));

