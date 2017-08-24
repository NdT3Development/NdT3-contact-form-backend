var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var nodemailer = require('nodemailer');
var path = require('path');
var logger = require('morgan');
var RateLimit = require('express-rate-limit');
var app = express();
var loginconfig = require('./loginconfig.json');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : false}));
app.use(logger('common'));

app.set('trust proxy', '127.0.0.1');

// Email config
var mailOpts, smtpTrans;
smtpTrans = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: loginconfig.email,
        pass: loginconfig.password
    }
});
smtpTrans.verify(function(error, success) {
 if (error) {
      console.log(error);
 } else {
      console.log('Server is ready to take our messages');
 }
});



var apiRatelimiter = new RateLimit({
  windowMs: 7500, // 7.5 second window
  max: 5, // start blocking after 5 requests
  delayAfter: 0, // disable slow down of requests
  delayMs: 0, 
  onLimitReached: function (req, res, options) {
    res.json({"responseCode": 1, "responseDesc": "Ratelimited (too many requests)"});
  }
});

app.get('/onlinecheck', apiRatelimiter, function(req,res) {
  // Sending our HTML file to browser.
  res.end('Well, well, well, look who we have here. You shouldn\'t be here...');
  //res.status(403).end('403 Forbidden\nYou shouldn\'t be here');
});

app.get('/check.png', function(req, res) {
  var reqPath = path.join(__dirname, 'check.png');
  res.sendFile(reqPath);
});

app.post('/contact',function(req,res){
  res.header('Access-Control-Allow-Origin', '*');
  if (!req.body['name'] || !req.body['email'] || !req.body['message']) {
    return res.json({"responseCode": 1, "responseDesc": "All fields are required"});
  }

  var matchEmail = req.body['email'].match(/[\w\d\.\+]+@[\w\.]+\.[[a-z\.][^\.@0-9]+/);
  console.log(matchEmail);
  if (matchEmail === null) {
    return res.json({"responseCode": 1, "responseDesc": "Email invalid"});
  }
  // g-recaptcha-response is the key that browser will generate upon form submit.
  // if its blank or null means user has not selected the captcha, so return the error.
  if (req.headers.captchabypasstoken !== loginconfig.captchabypasstoken) {
  if(req.body['g-recaptcha-response'] === undefined || req.body['g-recaptcha-response'] === '' || req.body['g-recaptcha-response'] === null) {
    return res.json({"responseCode" : 1,"responseDesc" : "Please complete captcha"});
  }
  // Put your secret key here.
  var secretKey = loginconfig.captchakey;
  // req.connection.remoteAddress will provide IP address of connected user.
  var verificationUrl = "https://www.google.com/recaptcha/api/siteverify?secret=" + secretKey + "&response=" + req.body['g-recaptcha-response'] + "&remoteip=" + req.connection.remoteAddress;
  // Hitting GET request to the URL, Google will respond with success or error scenario.
  request(verificationUrl,function(error,response,body) {
    body = JSON.parse(body);
    // Success will be true or false depending upon captcha validation.
    if(body.success !== undefined && !body.success) {
      return res.json({"responseCode" : 1,"responseDesc" : "Failed captcha verification"});
    }
  });
}


  mailOpts = {
      from: req.body.name + ' &lt;' + req.body.email + '&gt;', //grab form data from the request body object
      to: loginconfig.emailto,
      subject: 'Website contact form',
      text: 'Message from: ' + req.body.name + ' ('+req.body.email+') \n' + req.body.message
  };

  smtpTrans.sendMail(mailOpts, function (error, response) {
      //Email not sent
      if (error) {

        console.log('Failed to send email: ' + req.body.name + ' Email: ' + req.body.email +  ' Message: ' + req.body.message + ' ');
        return res.json({"responseCode" : 1,"responseDesc" : "Error sending email. Try again later"});
        //return res.redirect(backURL + '?contactstatus=failed');
      }
      // Email sent
      else {

          console.log('Email sent: ' + req.body.name + ' Email: ' + req.body.email + ' Message: ' + req.body.message + ' ');
          //return res.redirect(backURL + '?contactstatus=sent');
          return res.json({"responseCode" : 0,"responseDesc" : "Message sent"});
      }
  });


});

// This will handle 404 requests.
app.use("*",function(req,res) {
  //res.status(404).send('You lost? Go back to the website. Nothing to see here');
    res.status(403).json({ err: '403', errDesc: 'Forbidden', message: 'You do not have permissions to view this page'});
})

app.listen(9397, function() {
  console.log('Ready');
});
