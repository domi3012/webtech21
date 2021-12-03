express = require('express')
const path = require('path');
const bodyParser = require('body-parser');
const sessions = require('express-session');

const app = express()
app.set('view engine', 'ejs');


var texts = [{
    header: "Alex is nice",
    question: "Why is Alex nice?",
    answers: ["amazing dude", "nice to have"]
},
    {
        header: "Bibo is nice",
        question: "Why is Bibo nice?",
        answers: ["nice to have"]
    }
]

var users = []

var urlencodeParser = bodyParser.urlencoded({extended: false})

const oneDay = 1000 * 60 * 60 * 24;

//session middleware
app.use(sessions({
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized: true,
    cookie: {maxAge: oneDay},
    resave: false
}));

var session;


app.post('/registerUser', urlencodeParser, (req, res) => {
    if (!req.body || req.body.username === "" ||
        req.body.password === "" ||
        req.body.password !== req.body.password_repeat) {
        res.render("register", {error: true});
        return
    }
    users.push({"username": req.body.username, "password": req.body.password})
    res.render("login", {error: false});

})

app.post('/loginUser', urlencodeParser, (req, res) => {
    if (!req.body || req.body.username === "" ||
        req.body.password === "") {
        res.render("login", {error: true});
        return
    }
    var found = false;
    users.map((k) => {
        if (k.password === req.body.password && k.username === req.body.username) {
            session = req.session;
            session.userid = req.body.username;
            res.redirect("/index.html")
            found = true;
            return
        }
    })
    if (found) {
        return;
    }
    res.render("login", {error: true});
})

app.get('/register.html', function (req, res) {
    res.render("register", {error: false});
});

app.get('/logout.html', function (req, res) {
    session = undefined;
    res.redirect("index.html");
});

app.get('/login.html', function (req, res) {
    res.render("login", {error: false});
});

app.get('/index.html', function (req, res) {
    console.log("hallo")
    if (session && session.userid) {
        res.render("index", {loggedIn: true, text: JSON.stringify(texts)});
        return
    }
    test = JSON.stringify(texts);
    res.render("index", {loggedIn: false, text: texts});

});


app.get('/style.css', function (req, res) {
    res.sendFile(__dirname + "/" + "style.css");
});
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '/html/404.html'))
})

app.listen(3000, () => {
    console.log(`Example app listening at http://localhost:3000`);
});