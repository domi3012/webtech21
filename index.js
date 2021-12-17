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

var activeSession = false; //TODO change back to false

var urlencodeParser = bodyParser.urlencoded({extended: false})

const oneDay = 1000 * 60 * 60 * 24;

var votingQuestionsDictionary = {}
var votingAnswersDictionary = {}

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
            activeSession = true
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
    if (session && session.userid) {
        activeSession = true;
    }
    res.render("register", {error: false, loggedIn: activeSession});
});

app.get('/logout.html', function (req, res) {
    session = undefined;
    activeSession = false
    res.redirect("index.html");
});

app.get('/login.html', function (req, res) {
    activeSession = false
    if (session && session.userid) {
        activeSession = true;
    }
    res.render("login", {error: false, loggedIn: activeSession});
});


app.get('/', function (req, res){
    res.redirect("index.html")
})

app.get('/index.html', function (req, res) {
    let keys = Object.keys(questions);
    let indexData = [];
    for (let i = 0; i < 5; i++) {
        questions[keys[i]].key = keys[i]
        indexData.push(questions[keys[i]])
        let index = parseInt(keys[i])
        if (!(index in votingQuestionsDictionary)){
            votingQuestionsDictionary[index] = {"upVotes": 0, "downVotes": 0}
        }
    }
    if (session && session.userid) {
        res.render("index", {loggedIn: true, text: indexData, voting: votingQuestionsDictionary});
        return
    }
    res.render("index", {loggedIn: false, text: indexData, voting: votingQuestionsDictionary});
});

app.get("/search", urlencodeParser, (req, res) => {
    console.log(req.body.search)
})

app.get("/question/:qid", urlencodeParser, (req, res) => {
    let question = questions[req.params.qid]
    console.log(question)
    let keys = Object.keys(answers);
    let answer = [];
    keys.forEach((e) => {
        if (!(e in votingAnswersDictionary)){
            votingAnswersDictionary[e] = {"upVotes": 0, "downVotes": 0}
        }
        if (answers[e].ParentId === parseInt(req.params.qid)){
            answers[e].key = e
            console.log(answers[e]["key"])
            answer.push(answers[e]);
        }
    })
    if (!Object.keys(votingAnswersDictionary).length || !Object.keys(votingQuestionsDictionary).length) {
        console.log("test");
        res.redirect("../index.html")
        return
    }
    res.render("question", {question: question, answers: answer,ansVoting: votingAnswersDictionary, questVoting: votingQuestionsDictionary, loggedIn: activeSession}) //TODO change to active session
})

app.post("/vote", urlencodeParser, (req, res) => {
    let key = parseInt(req.body.key)
    if (!activeSession){
        res.redirect("/index.html")
        return
    }
    if (req.body.upvote !== undefined &&req.body.upvote.toString().includes("Upvote")) {
        votingQuestionsDictionary[key].upVotes += 1
    } else
        votingQuestionsDictionary[key].downVotes += 1;
    res.redirect("/index.html")
    return
})

app.post("/Ansvote", urlencodeParser, (req, res) => {
    let key = parseInt(req.body.key)
    let parentKey = parseInt(req.body.parentkey)
    if (!activeSession){
        let redirectQuestion = ((!isNaN(parentKey)) ? parentKey : key);
        res.redirect("/question/"+redirectQuestion)
        return
    }
    if (req.body.upvoteAns !== undefined &&req.body.upvoteAns.toString().includes("Upvote")) {
        votingAnswersDictionary[key].upVotes += 1
    }else if (req.body.upvote !== undefined &&req.body.upvote.toString().includes("Upvote")) {
        votingQuestionsDictionary[key].upVotes += 1
    } else if(req.body.downvote !== undefined &&req.body.downvote.toString().includes("Downvote")){
        votingQuestionsDictionary[key].downVotes += 1;
    }
    else  {
        votingAnswersDictionary[key].downVotes += 1
    }
    let redirectQuestion = ((!isNaN(parentKey)) ? parentKey : key);
    res.redirect("/question/"+redirectQuestion)
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