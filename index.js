// express = require('express')
import express from "express"

// const path = require('path');
import path from "path"

// const bodyParser = require('body-parser');
import bodyParser from "body-parser"

// const sessions = require('express-session');
import sessions from "express-session";

// const fs = require('fs');
import fs from "fs"

const fsPromises = fs.promises;

import * as background from "./background.js";


import {fileURLToPath} from 'url';
import {preprocess} from "./background.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express()
app.set('view engine', 'ejs');

var users = []

var currentUsers = []

let searchQuery = "";

var userPerQuestion = {}
var userPerAnswers = {}

var activeSession = false; //TODO change back to false

var urlencodeParser = bodyParser.urlencoded({extended: false})

const oneDay = 1000 * 60 * 60 * 24;

var votingQuestionsDictionary = {}
var votingAnswersDictionary = {}

var questionsJsonFile = "./input_data/Questions.json"
var answersJsonFile = "./input_data/Answers.json"

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

app.post('/postNewQuestion', urlencodeParser, (req, res) => {
    if (!req.body || req.body.title === "" ||
        req.body.question === "") {
        res.redirect("new", {loggedIn: activeSession});
        return
    }
    let keys = Object.keys(questions);
    let lastIndex = parseInt(keys[keys.length - 1]) + 1;
    const post = {
        "OwnerUserId": session.userid,
        "CreationDate": new Date(Date.now()).toISOString(),
        "Score": 0,
        "Title": req.body.title,
        "Body": req.body.question,
        "key": lastIndex
    }
    questions[lastIndex] = post;
    readAndAddToFile(post, questionsJsonFile)
    votingQuestionsDictionary[lastIndex] = {"upVotes": 0, "downVotes": 0}

    res.redirect("/question/" + lastIndex);
})

app.post('/postNewAnswer', urlencodeParser, (req, res) => {
    if (!req.body || req.body.answer === "") {
        var test = req.body.parentkey
        res.redirect("/question/" + req.body.parentkey);
        return
    }
    let keys = Object.keys(answers);
    let lastIndex = parseInt(keys[keys.length - 1]) + 1;
    const post = {
        "OwnerUserId": session.userid,
        "CreationDate": new Date(Date.now()).toISOString(),
        "ParentId": parseInt(req.body.parentkey),
        "Score": 0,
        "Body": req.body.answer,
        "key": lastIndex
    }
    answers[lastIndex] = post;
    readAndAddToFile(post, answersJsonFile)
    votingAnswersDictionary[lastIndex] = {"upVotes": 0, "downVotes": 0}
    res.redirect("/question/" + req.body.parentkey)
})

app.get('/register.html', function (req, res) {
    if (session && session.userid) {
        activeSession = true;
    }
    res.render("register", {error: false, loggedIn: activeSession});
});


app.get('/new.html', function (req, res) {
    if (session && session.userid) {
        activeSession = true;
    }
    res.render("new", {loggedIn: activeSession});
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


app.get('/', function (req, res) {
    res.redirect("index.html")
})

app.get('/about.html', function (req, res) {
    if (session && session.userid) {
        res.render("about", {loggedIn: true});
        return
    }
    res.render("about", {loggedIn: false});
})

app.get('/index.html', function (req, res) {
    let indexData = [];
    let keys = Object.keys(questions);
    if (searchQuery === "") {

        for (let i = 0; i < 5; i++) {
            questions[keys[i]].key = keys[i]
            indexData.push(questions[keys[i]])
        }
    }else {
        var queryQuestionsIds = background.getSimilarQuestionsFromQuery(searchQuery)
        for (const key in queryQuestionsIds) {
            if (queryQuestionsIds[key].word === undefined) continue;
            let idStr = queryQuestionsIds[key].word
            let idInt = Number(idStr)
            let test = questions[idInt];
            questions[idInt].key = idStr;
            indexData.push(questions[idInt])
        }
        searchQuery = "";
        if (indexData.length === 0){
            for (let i = 0; i < 5; i++) {
                questions[keys[i]].key = keys[i]
                indexData.push(questions[keys[i]])
            }
        }
    }
    if (session && session.userid) {
        res.render("index", {loggedIn: true, text: indexData, voting: votingQuestionsDictionary});
        return
    }
    res.render("index", {loggedIn: false, text: indexData, voting: votingQuestionsDictionary});
});

app.get("/question/:qid", urlencodeParser, (req, res) => {
    let question = questions[req.params.qid]
    let keys = Object.keys(answers);
    let answer = [];

    var similarQuestionsIds = background.getSimilarQuestions(req.params.qid)

    var similarQuestions = new Map()

    for (const id in similarQuestionsIds) {
        let idStr = similarQuestionsIds[id].word
        let idInt = Number(idStr)
        let q = questions[idInt]
        similarQuestions.set(idStr, q.Title)
    }

    keys.forEach((e) => {
        if (parseInt(answers[e].ParentId) === parseInt(req.params.qid)) {
            answers[e].key = e
            answer.push(answers[e]);
        }
    })
    if (!Object.keys(votingAnswersDictionary).length || !Object.keys(votingQuestionsDictionary).length) {
        res.redirect("../index.html")
        return
    }
    res.render("question", {
        question: question,
        answers: answer,
        ansVoting: votingAnswersDictionary,
        questVoting: votingQuestionsDictionary,
        similarQuestion: similarQuestions,
        loggedIn: activeSession
    })
})


app.post("/vote", urlencodeParser, (req, res) => {
    let key = parseInt(req.body.key)
    if (!activeSession) {
        res.redirect("/index.html")
        return
    }
    if (!(key in userPerQuestion)) {
        userPerQuestion[key] = []
    }
    if (userPerQuestion[key].includes(session.userid)) {
        res.redirect("/index.html")
        return;
    }
    if (req.body.upvote !== undefined && req.body.upvote.toString().includes("Upvote")) {
        votingQuestionsDictionary[key].upVotes += 1

    } else
        votingQuestionsDictionary[key].downVotes += 1;
    userPerQuestion[key].push(session.userid);
    res.redirect("/index.html")
    return
})

app.post("/Ansvote", urlencodeParser, (req, res) => {
    let key = parseInt(req.body.key)
    let parentKey = parseInt(req.body.parentkey)
    if (!activeSession) {
        let redirectQuestion = ((!isNaN(parentKey)) ? parentKey : key);
        res.redirect("/question/" + redirectQuestion)
        return
    }
    if (!(key in userPerAnswers)) {
        userPerAnswers[key] = []
    }
    let redirectQuestion = ((!isNaN(parentKey)) ? parentKey : key);
    if (userPerAnswers[key].includes(session.userid)) {
        res.redirect("/question/" + redirectQuestion)
        return;
    }
    if (req.body.upvoteAns !== undefined && req.body.upvoteAns.toString().includes("Upvote")) {
        votingAnswersDictionary[key].upVotes += 1
    } else if (req.body.upvote !== undefined && req.body.upvote.toString().includes("Upvote")) {
        votingQuestionsDictionary[key].upVotes += 1
    } else if (req.body.downvote !== undefined && req.body.downvote.toString().includes("Downvote")) {
        votingQuestionsDictionary[key].downVotes += 1;
    } else {
        votingAnswersDictionary[key].downVotes += 1
    }
    userPerAnswers[key].push(session.userid);
    res.redirect("/question/" + redirectQuestion)
    return


})

app.get('/style.css', function (req, res) {
    res.sendFile(__dirname + "/" + "style.css");
    // res.sendFile("/style.css");
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

//TODO catch query request from html
app.post("/search", urlencodeParser, (req, res) => {
    searchQuery = preprocess(req.body.search)
    res.redirect("index.html");
})

app.listen(3000, () => {
    //var vecQuestionModel = "t";
    //var vecAnswersModel =
    //background.process();
    readData(questionsJsonFile, answersJsonFile)
    initialize()
    console.log(`Example app listening at http://localhost:3000`);
});

function initialize(){
    let keys = Object.keys(questions);
    for (const key in keys) {
        let index = parseInt(keys[key])
        votingQuestionsDictionary[index] = {"upVotes": questions[index].Score, "downVotes": 0}
    }
    keys = Object.keys(answers);
    for (const key in keys) {
        let index = parseInt(keys[key])
        votingAnswersDictionary[index] = {"upVotes": answers[index].Score, "downVotes": 0}
    }
}

//TODO for the future, we dont rerender the whole modle as it would need to much time
//Will be done in future from Alex ;)
function readAndAddToFile(post, file) {
    try {
        const data = fs.readFileSync(file, 'utf8')
        tmpFile = JSON.parse(data)
        let tmpEntry = post.key
        delete post.key
        tmpFile[tmpEntry] = post
        let json = JSON.stringify(tmpFile, null, 4);
        try {
            fs.writeFileSync(file, json)
            //file written successfully
        } catch (err) {
            console.error(err)
        }
    } catch (err) {
        console.error(err)
    }

}