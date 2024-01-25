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
    database:"gip",
    multipleStatements:true
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
  console.log("C# connected")
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
  con.query("SELECT * FROM users WHERE bcode="+req.body.bcode, function(err, result){
    if (err) {
      console.log(err)
      res.sendStatus(500)
    }
    else if (result.length) res.send({login: true})
    else res.send({login: false})
  })
})
app.post("/check-pin", function(req,res){
  con.query("SELECT * FROM users WHERE bcode="+req.body.bcode+" AND pin=SHA2("+req.body.pincode+",512);", function(err, result){
    if (err) {
      console.log(err)
      res.sendStatus(500)
    }
    else if (result.length) res.send({login: true})
    else res.send({login: false})
  })
})
app.post("/get-user-info", function(req,res){
  con.query("SELECT * FROM users WHERE bcode="+req.body.bcode+" AND pin=SHA2("+req.body.pincode+",512);", function(err, result){
    if (err) {
      console.log(err)
      res.sendStatus(500)
    }
    else if (result.length){
       let saldo=result[0].saldo
      con.query("SELECT * FROM beurten WHERE email='"+result[0].email+"'", function(err,result){
        if(err) {
          console.log(err)
          res.sendStatus(500)
        }
        else if(result.length){
          let gUsed=0;
          let used=0;
          let devices=0;
          let gDevices=0;
          let nDevices=0;
          let nGDevices=0;
          for(let i=0;i<result.length;i++) {
          if(result[i].type==0&&result[0].activeDate<=Date.now()) devices++
            else if(result[i].type==1&&result[0].activeDate<=Date.now()) gDevices++
            if(result[i].type==0&&result[i].used>0) used+=result[i].used
            if(result[i].type==1&&result[i].used>0) gUsed+=result[i].used
          } 
             for(let i=0;i<result.length;i++) {
          if(result[i].type==0&&result[i].activeDate>Date.now()) nDevices++
            else if(result[i].type==1&&result[i].activeDate>Date.now()) {
              console.log("ngdevice")
               nGDevices++
            }
          } 
          devices-=used;
          gDevices-=gUsed;
          res.send({saldo:saldo, devices:devices, gDevices:gDevices, nGDevices: nGDevices, nDevices:nDevices})
        }
        else res.send({saldo:saldo, devices:0, gDevices:0, nGDevices: 0, nDevices:0})
      })
    }
    else res.send(400)
  })
})
app.post("/get-user-beurten", function(req,res){
  con.query("SELECT * FROM users WHERE bcode="+req.body.bcode+" AND pin=SHA2("+req.body.pincode+",512);", function(err, result){
    if (err) {
      console.log(err)
      res.sendStatus(500)
    }
    else if (result.length) {
        con.query("SELECT * FROM beurten WHERE email='"+result[0].email+"' AND type=0;", function(err, result){
          if (err) {
            console.log(err)
            res.sendStatus(500)
          }
          else if (result.length) {
            res.send(result)
          }
         else res.send(result)
      })
    }
    else res.send(400)
  })
})
app.post("/get-guest-beurten", function(req,res){
  con.query("SELECT * FROM users WHERE bcode="+req.body.bcode+" AND pin=SHA2("+req.body.pincode+",512);", function(err, result){
    if (err) {
      console.log(err)
      res.sendStatus(500)
    }
    else if (result.length) {
        con.query("SELECT * FROM beurten WHERE email='"+result[0].email+"' AND type=1;", function(err, result){
          if (err) {
            console.log(err)
            res.sendStatus(500)
          }
          else if (result.length) {
            res.send(result)
          }
         else res.send(result)
      })
    }
    else res.send(400)
  })
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
  console.log("sending scan status")
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
app.post("/add-guest-beurt", function(req,res){
  con.query("SELECT * FROM users WHERE bcode="+req.body.bcode+" AND pin=SHA2('"+req.body.pincode+"',512); SELECT * FROM prijzen;",[1,2], function(err,result){
    if(err){
      console.log(err)
      res.sendStatus(500)
    }
    else if(result.length){
  let price= calcPrice(result[1], req.body)
       let str = "0123456789azeretyuiopqsdfghjklmwxcvbn"
       let password=""
       if(price<=result[0][0].saldo&&req.body.devices>0){
        for(let i=0;i<8;i++) password+=str.charAt(Math.random()*str.length)
           //voor normale apparaten
             var datum = new Date().getTime()
             console.log("price after calc:"+price)
               con.query("INSERT INTO beurten VALUES('"+result[0][0].email+"',"+req.body.devices+","+req.body.duration+",null,'"+datum+"',"+price+",1,"+datum+",0,'"+result[0][0].username+"@gast_"+formatTime(req.body.duration)+"', '"+password+"');UPDATE users SET saldo=saldo-"+price+" WHERE email='"+result[0][0].email+"'",[1,2], function(err,result){
                 if(err){
                  console.log(err)
                  res.sendStatus(400)
                 }
                 else {
                  res.send(JSON.stringify({success:true}))
                  console.log("beurt toegevoegd")
                 } 
                 })
       }
       else if(req.body.devices==0) res.send(JSON.stringify({success:false, msg: "Vul alle velden in."}))
       else res.send(JSON.stringify({success:false, msg: "Niet genoeg saldo."}))
    }
    else {
      console.log("user not found")
      res.sendStatus(400)
    } 
  })
})
app.post("/add-user-beurt", function(req,res){
  con.query("SELECT * FROM users WHERE bcode="+req.body.bcode+" AND pin=SHA2('"+req.body.pincode+"',512); SELECT * FROM prijzen;",[1,2], function(err,result){
    if(err){
      console.log(err)
      res.sendStatus(500)
    }
    else if(result.length){
  let price= calcPrice(result[1], req.body)
       let str = "0123456789azeretyuiopqsdfghjklmwxcvbn"
       let password=""
       if(price<=result[0][0].saldo&&req.body.devices>0){
        for(let i=0;i<8;i++) password+=str.charAt(Math.random()*str.length)
           //voor normale apparaten
             var datum = new Date().getTime()
             console.log("price after calc:"+price)
               con.query("INSERT INTO beurten VALUES('"+result[0][0].email+"',"+req.body.devices+","+req.body.duration+",null,'"+datum+"',"+price+",0,"+datum+",0,'"+result[0][0].username+"_"+formatTime(req.body.duration)+"', '"+password+"');UPDATE users SET saldo=saldo-"+price+" WHERE email='"+result[0][0].email+"'",[1,2], function(err,result){
                 if(err){
                  console.log(err)
                  res.sendStatus(400)
                 }
                 else {
                  res.send(JSON.stringify({success:true}))
                  console.log("beurt toegevoegd")
                 } 
                 })
       }
       else if(req.body.devices==0) res.send(JSON.stringify({success:false, msg: "Vul alle velden in."}))
       else res.send(JSON.stringify({success:false, msg: "Niet genoeg saldo."}))
    }
    else {
      console.log("user not found")
      res.sendStatus(400)
    } 
  })
})
app.get("/get-prijzen", function(req,res){
  con.query("SELECT * FROM prijzen", function(err,result){
    if (err){
      console.log(err)
      res.sendStatus(500)
    }
    else res.send(result)
  })
})
app.get("/", function(req,res){
    res.sendFile(__dirname+"\\index.html")
})
server.listen(80, ()=>{
  console.log("luisteren ")
})
function formatTime(time){
  console.log("time: "+time)
  if(time<24) return time +"h"
  else if(time>=24&&time<720) {
      console.log("tijd groter dan 24: "+time/24+time%24)
      return (time/24)+"d"
  }
  else if(time>=720) {
      console.log("tijd groter dan 24")
      return (time/720)+"m"
  }
}
   function calcPrice(prijzen,config){
    let result=prijzen
  let price=0.00
  console.log(config)
    for(let i=result.length-1;i>=0;i--){
      console.log("calcing price 1")
      if(result[i].devices<=config.devices&&result[i].time<=config.duration) {
          console.log(price)
          price=(result[i].price*config.devices*config.duration).toFixed(2);
          console.log("prijs 1: "+price)
         // break
      }
  }
  console.log("price: "+price)
return price
    

}