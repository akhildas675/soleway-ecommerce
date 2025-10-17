const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;
require('dotenv').config();

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://soleway.shop/auth/google/callback",
    passReqToCallback: true
},
function(request, accessToken, refreshToken, profile, done) {
    console.log('Google callback reached successfully!');
    console.log('Profile:', profile);
    return done(null, profile);
}));