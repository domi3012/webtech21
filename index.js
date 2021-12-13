express = require('express')
const path = require('path');
const bodyParser = require('body-parser');
const sessions = require('express-session');
const fs = require('fs');
const fsPromises = fs.promises;

const app = express()
app.set('view engine', 'ejs');


var users = []

var currentUsers = []

var urlencodeParser = bodyParser.urlencoded({extended: false})

const oneDay = 1000 * 60 * 60 * 24;

var votingDictionary = {}

//session middleware
app.use(sessions({
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized: true,
    cookie: {maxAge: oneDay},
    resave: false
}));

var questions, answers;

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
    let keys = Object.keys(questions);
    let indexData = [];
    for (let i = 0; i < 5; i++) {
        questions[keys[i]].key = keys[i]
        indexData.push(questions[keys[i]])
        let index = parseInt(keys[i])
        if (!(index in votingDictionary)){
            votingDictionary[index] = {"upVotes": 0, "downVotes": 0}
        }
    }
    if (session && session.userid) {
        res.render("index", {loggedIn: true, text: indexData, voting: votingDictionary});
        return
    }
    res.render("index", {loggedIn: false, text: indexData, voting: votingDictionary});
});

app.get("/search", urlencodeParser, (req, res) => {
    console.log(req.body.search)
})

app.post("/vote", urlencodeParser, (req, res) => {
    console.log(req.body.upvote)
    console.log(req.body.downvote)
    let key = parseInt(req.body.key)
    if (req.body.upvote !== undefined &&req.body.upvote.toString().includes("Upvote")) {
        votingDictionary[key].upVotes += 1
    } else
        votingDictionary[key].downVotes += 1;
    res.redirect("/index.html")
    return


})


app.get('/style.css', function (req, res) {
    res.sendFile(__dirname + "/" + "style.css");
});
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '/html/404.html'))
})

function readData(questionsTxt, answersTxt) {
    try {
        const data = fs.readFileSync(questionsTxt, 'utf8')
        questions = JSON.parse(data)
    } catch (err) {
        console.error(err)
    }


    try {
        const data = fs.readFileSync(answersTxt, 'utf8')
        answers = JSON.parse(data)
    } catch (err) {
        console.error(err)
    }

}

app.listen(3000, () => {
    var questions_json = "./input_data/Questions.json"
    var answers_json = "./input_data/Answers.json"
    readData(questions_json, answers_json)

    console.log(`Example app listening at http://localhost:3000`);
});