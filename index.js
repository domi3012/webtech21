express = require('express')
const path = require('path');
const bodyParser = require('body-parser');

const app = express()

var users = []

var urlencodeParser = bodyParser.urlencoded({extended: false})




app.post('/registerUser', urlencodeParser, (req, res) => {
    if (!req.body || req.body.username ===  "" ||
        req.body.password === "" ||
        req.body.password !== req.body.password_repeat){
        res.sendFile(__dirname + "/html/registerInvalid.html");
        return
    }
    users.push({"username": req.body.username, "password": req.body.password})
    res.redirect("/login.html");

})

app.post('/loginUser', urlencodeParser, (req, res) => {
    if (!req.body || req.body.username ===  "" ||
        req.body.password === ""){
        res.sendFile(__dirname + "/html/loginInvalid.html");
        return
    }
    users.map((k) => {
        if(k.password === req.body.password && k.username === req.body.username){
            res.redirect("/index.html");
            return
        }
    })
    res.sendFile(__dirname + "/html/loginInvalid.html");


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