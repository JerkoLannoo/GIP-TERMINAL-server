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

setInterval(()=>{
con.query("SELECT * FROM terminal_registration WHERE time>=2;", function(err,result){
if(err) console.log(err)
else{
 for(let i=0; i<result.length;i++) io.to(result[i].socketId).emit('end-connection', 'Deze code is vervallen.');
  con.query("DELETE FROM terminal_registration WHERE time>=2;", function(err){
    if(err) console.log(err)
    con.query("UPDATE terminal_registration SET time=time+1;", function(err){
      if(err) console.log(err)
      else console.log("success")
    })
  })
}
})
}, 60000)
const { Server } = require("socket.io");
const io = new Server(server)
io.on('connection', (socket) => {
  socket.on("get-code", (bcode)=>{
    console.log("got socket request")
    let code=""
    let str="BCDFGHJKLMPQRTVWQYZ0123456789"
    return new Promise((resolve, reject)=>{
      con.query("SELECT * FROM terminal_registration;", function(err, result){
        console.log("in promise, result length: "+result.length)
        if(err) reject(err)
        else if(result.length){
          let checkedCode=""
          while(checkedCode===""){
            console.log("finding code...")
            for(let i=0; i<4;i++) code+=str.charAt(Math.random()*str.length)
            for(let i=0;i<result.length;i++) {
              if(result[i].code===code) return;
              else if(i===result.length-1) {
                checkedCode=code;
                resolve(code)
              }
             } 
          }
        }
        else {
          for(let i=0; i<4;i++) code+=str.charAt(Math.random()*str.length)
          resolve(code)
        }
      })
    }).then(resolve=>{
      console.log("resolved")
      let id = socket.id
      console.log("barcode: "+bcode)
      con.query("INSERT INTO terminal_registration VALUES("+bcode+", "+JSON.stringify(code)+", "+JSON.stringify(id)+",0);", function(err,result){
        if(err) console.log(err)
        else io.emit("get-code",code)
      })
  }).catch(reject=>{
    console.log(reject)
  })
  })
});
app.post("/check-code", function(req,res){
  res.send({login: false})
})
app.post("/register/terminal/send-status", function(req,res){
  console.log(req.body)
  con.query("SELECT * FROM terminal_registration WHERE code="+JSON.stringify(req.body.code), function(err, result){
    if(err) {
      console.log(err)
      res.send(500)
    }
    else if(result.length){
      console.log("emitting to socket")
      io.to(result[0].socketId).emit('register-status', 'true');
    }
    else {
      console.log("socket not found")
    }
  })
  res.sendStatus(200)
})
app.post("/register/terminal/send-scan", function(req,res){
  console.log(req.body)
  con.query("SELECT * FROM terminal_registration WHERE code="+JSON.stringify(req.body.code), function(err, result){
    if(err) {
      console.log(err)
      res.send(500)
    }
    else if(result.length){
      console.log("emitting to socket")
      io.to(result[0].socketId).emit('scan-status', 'true');
    }
    else {
      console.log("socket not found")
    }
  })
  res.sendStatus(200)
})
app.get("/", function(req,res){
    res.sendFile(__dirname+"\\index.html")
})
server.listen(80, ()=>{
  console.log("luisteren ")
})
 