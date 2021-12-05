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

var currentUsers = []

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
        res.render("register", {error: true, loggedIn: false});
        return
    }
    users.push({"username": req.body.username, "password": req.body.password})
    res.render("login", {error: false, loggedIn: false});

})

app.post('/loginUser', urlencodeParser, (req, res) => {
    if (!req.body || req.body.username === "" ||
        req.body.password === "") {
        res.render("login", {error: true, loggedIn: false});
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
    res.render("login", {error: true, loggedIn: false});
})

app.get('/register.html', function (req, res) {
    activeSession = false
    if (session && session.userid) {
        activeSession = true;
    }
    res.render("register", {error: false, loggedIn: activeSession});
});

app.get('/logout.html', function (req, res) {
    session = undefined;
    res.redirect("index.html");
});

app.get('/login.html', function (req, res) {
    activeSession = false
    if (session && session.userid) {
        activeSession = true;
    }
    res.render("login", {error: false, loggedIn: activeSession});
});

app.get('/index.html', function (req, res) {
    if (session && session.userid) {
        res.render("index", {loggedIn: true, text: texts});
        return
    }
    test = JSON.stringify(texts);
    res.render("index", {loggedIn: false, text: texts});

});

app.get("/search", urlencodeParser, (req, res) => {
    console.log(req.body.search)
})


app.get('/style.css', function (req, res) {
    res.sendFile(__dirname + "/" + "style.css");
});
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '/html/404.html'))
})

app.listen(3000, () => {
    console.log(`Example app listening at http://localhost:3000`);
});