const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

// import express-session lib ***************************************8
const session = require('express-session');
const mongoStore = require('connect-mongodb-session')(session);

/* 

  [ csrf role ]
  The server gives a token to front-end, aand the token is particularly assigned to the form.
  Therefor, whenever, req's event occurs, the server is able to recognize that
  the front end is right one to interact with.

  In this mechanism, the would be ablet to prevent csrf from fraud
    which is taking advantage of cookie information it their (hacker's) fron end.

*/
const csrf = require('csurf');

// error handling or to deliver some variable or message in the pre req
//  to the next req 
const flash = require('connect-flash');

const { mongoKey } = require('./config/key' )
const errorController = require('./controllers/error');
const User = require('./models/user');

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

const Mongo_URI = `mongodb+srv://joon:${mongoKey}@firstatlas-drwhc.mongodb.net/shop`;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

/* 
  // When session data is created.... in mongodb

  _id: "Sr5H66Ieud9JLHhUmymKb51iABX_yg_i"
  expires: 2019-03-20T19:42:39.295+00:00
  session: Object
  cookie: Object {
    originalMaxAge: null
    expires: null
    secure: null
    httpOnly: true
    domain: null
    path: "/"
    sameSite: null
  }
  isAuthenticated: true ==>>> we set it up  // set up by us

*/
// create collection to store session data including cookie
const store = new mongoStore({
  uri: Mongo_URI,
  collection: 'sessions'
});

// configuration to initialize. 
// We can confugure about cookie
// but default session would be fine
const csrfProtection = csrf();

// resave:false : as long as session data is not switched,
//  it is not going to be saved.
// saveUninitialized: false: until the req requests the session to be saved,
//  it is not going to be saved.
// It sets up "req.session" field
app.use(session({secret: 'asfasdfsafdsa', resave: false, saveUninitialized: false, store }));

// must use after session.
//  because now we still use session to csrf attack
// it sets up "req.csrfToken();"" like passport.js sets up req.ue ****r
app.use(csrfProtection);

// if we want to hanle session message in connect-flash
// we need to put connect-flash at this spot.
// It sets up "req.flash()" for error message handling....
app.use(flash());

// moved to login routes
// app.use((req, res, next) => {
//   // if(req.session.isAuthenticated) {
//     User.findById('5c7ff22830149705b40657f0')
//       .then(user => {
//         req.user = user
//       });
//   //}
// });

app.use((req, res, next) => {
  // main reason req.session.user is necessary!
  if(req.session.user) {

    console.log('req.session.user ==============> ', req.session.user)

    // We can get req.session.user._id only when user logged in 
    //  stores the session data in db.
    //  Therefore, we do not need to get req.session.isAuthenticated.
      User.findById(req.session.user._id)
        .then(user => {
          req.user = user;
          next();
        })
        .catch(err => console.log(err));
  } else {
    next();
  }
  
});

// Therefore every req is executed , the following value will reach to view's render.
app.use((req, res, next) => {
  // locals: it is built in method express
  // to make variables and deliver variable value to local 'views'
  // It is able to deliver the value to all view components without 'res.render()'.
  // Then, it is often used to deliver common value.

  // in the views if isAuthenticated and and csrfToken variables exist,
  //  they dirctly receive the values from req.session.isAuthenticated
  //  and req.csrfToken

  res.locals.isAuthenticated = req.session.isAuthenticated;
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.use(errorController.get404);

mongoose
  .connect(Mongo_URI, { useNewUrlParser: true })
  .then(() => {
    console.log('Server is up!');
    app.listen(3000);
  })
  .catch(err => {
    console.log(err);
  });
