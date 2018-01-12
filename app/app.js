const express        = require('express');
const path           = require('path');
const logger         = require('morgan');
const bodyParser     = require('body-parser');
const app            = express();
const mongoose       = require('mongoose');
const User           = require('./models/user');

//used to add google strategy
const passport       = require('passport');

// Sessions for user to stay logged in, using a Cookie stored in the users browser
const expressSession = require('express-session');
const cookieParser   = require("cookie-parser");

// Mongoose Setup
mongoose.connect('mongodb://localhost:27017/google-authentication-app');

// Middleware
app.use(cookieParser());
app.use(expressSession({secret: 'mySecretKey'}));
app.use(passport.initialize());
app.use(passport.session());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.use(express.static(__dirname + '/public'));

//access app-env
const ENV            = require('./app-env');

// Setting up the Passport Strategies
//get and store client id
//get and store client secret
const googleClientKey = ENV.GOOGLE_CLIENT_ID;
const googleClientSecret = ENV.GOOGLE_CLIENT_SECRET;
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

// Use the GoogleStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Google
//   profile), and invoke a callback with a user object.
passport.use(new GoogleStrategy({
    clientID: googleClientKey,
    clientSecret: googleClientSecret,
    callbackURL: "http://127.0.0.1:3000/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
        //check user table for anyone with a facebook ID of profile.id
        User.findOne({
            'facebook.id': profile.id
        }, function(err, user) {
            if (err) {
                return done(err);
            }
            //No user was found... so create a new user with values from Facebook (all the profile. stuff)
            if (!user) {
                user = new User({
                    google: profile
                });
                user.save(function(err) {
                    if (err) console.log(err);
                    return done(err, user);
                });
            } else {
                //found user. Return
                return done(err, user);
            }
        });
    }
));

// Finish setting up the Sessions
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});


// GET /auth/google

// Use passport.authenticate() as route middleware to authenticate the

//   request.  The first step in Google authentication will involve redirecting

//   the user to google.com.  After authorization, Google will redirect the user

//   back to this application at /auth/google/callback

app.get('/auth/google', passport.authenticate('google', { scope: "email" }));

// GET /auth/google/callback

//   Use passport.authenticate() as route middleware to authenticate the

//   request.  If authentication fails, the user will be redirected back to the

//   login page.  Otherwise, the primary route function function will be called,

//   which, in this example, will redirect the user to the home page.
app.get('/auth/google/callback',
      passport.authenticate('google', { successRedirect: '/',
                                          failureRedirect: '/' }));

// Logout
app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/")
})

// Home page
app.get('/', function(req, res){
  res.render('layout', {user: req.user});
});

app.listen(3000);
