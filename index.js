express = require('express')
const path = require('path');
var flash = require('express-flash')
const bodyParser = require('body-parser');
var cookie = require('cookie-parser')
var session = require('express-session')

const app = express()
app.use(cookie('keyboard cat'));
app.use(session({ cookie: { maxAge: 60000 }}));
app.use(flash());

var users = []

var urlencodeParser = bodyParser.urlencoded({extended: false})




app.post('/registerUser', urlencodeParser, (req, res) => {
    if (!req.body || req.body.username ===  "" ||
        req.body.password === "" ||
        req.body.password !== req.body.password_repeat){
        req.flash('error', 'Invalid registration')
        res.redirect("/register.html")
        return
    }
    users.push({"username": req.body.username, "password": req.body.password})
    req.flash('success', 'You have logged in')
    res.redirect("/login.html");

})

app.get('/register.html', function(req, res) {
    res.sendFile(__dirname + "/html/register.html");
});

app.get('/login.html', function(req, res) {
    res.sendFile(__dirname + "/html/login.html");
});


app.get('/style.css', function(req, res) {
    res.sendFile(__dirname + "/" + "style.css");
});
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '/html/404.html'))
})

app.listen(3000, () => {
    console.log(`Example app listening at http://localhost:3000`);
});