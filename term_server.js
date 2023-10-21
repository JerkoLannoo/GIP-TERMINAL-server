const express = require('express');
//var phantomjs = require('phantomjs')
const fs = require('fs');
const app = express()
const http = require('http');
var server=http.createServer(app);
const url = require('url');
const path = require('path');
var mysql = require('mysql');
const bodyParser = require('body-parser')

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "6IctGip2023",
    database:"gip"
  });
  app.set('view engine', 'ejs');
con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
})
//app.use(express.static('/votez/'));
setInterval(() => {
  con.query("SELECT 1;", function (err, result) {
    if (err) console.log(err);
    else console.log("SELECT 1")
  });
}, 3600000);

var users = {}

const { Server } = require("socket.io");
const io = new Server(server)
io.on('connection', (socket) => {
  console.log(socket);
  console.log(socket[1]);
  socket.on("get-code", (bcode)=>{
    console.log("got socket request")
    let code=""
    let str="BCDFGHJKLMPQRTVWQYZ0123456789"
    for(let i=0; i<4;i++) code+=str.charAt(Math.random()*str.length)
    let id = socket.id
    users[id] = code
    console.log(users)
    console.log("barcode: "+bcode)
    con.query("INSERT INTO terminal_registration VALUES("+bcode+", "+JSON.stringify(code)+", "+JSON.stringify(id)+");", function(err,result){
      if(err) console.log(err)
      else io.emit("get-code",code)
    })
  })
});
app.post("/check-code", function(req,res){
  res.send({login: false})
})
app.get("/", function(req,res){
    res.sendFile(__dirname+"\\index.html")
})
server.listen(80, ()=>{
  console.log("luisteren ")
})
 