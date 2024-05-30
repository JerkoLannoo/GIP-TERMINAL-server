const express = require('express');
//var phantomjs = require('phantomjs')
const fs = require('fs');
const app = express()
const http = require('http');
const https = require('https');
const url = require('url');
const path = require('path');
var mysql = require('mysql');
const bodyParser = require('body-parser')
var token;
var passwd = "TG9KNHRJRDhSaUtMcjdueFZRU1RUREU5ZEs3a1Zo"
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
const options = { 
  key: fs.readFileSync("server-key.pem"), 
  cert: fs.readFileSync("server-cert.pem"), 
}; 
var server=http.createServer(app);
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
var pfcon = mysql.createConnection({
  host: "192.168.100.2",
  user: "pf",
  password: "ARF843U425>D<>[a",
  database:"pf",
  multipleStatements:true
});
pfcon.connect(function(err) {
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
pfLogin()
setInterval(() => {
  pfLogin()
}, 10*60*1000);
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
  socket.on("get-code", (bcode, key)=>{
    console.log("key: "+key)
    if(key === passwd) {
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
        con.query("INSERT INTO terminal_registration VALUES('"+bcode+"', "+JSON.stringify(code)+", "+JSON.stringify(id)+",0);", function(err,result){
          if(err) console.log(err)
          else io.emit("get-code",code)
        })
    }).catch(reject=>{
      console.log(reject)
    })
    }
  })
});
app.post("/check-code", function(req,res){
  if(req.body.key===passwd){
    con.query("SELECT * FROM users WHERE bcode='"+req.body.bcode+"'; SELECT email, mac FROM doubleTap WHERE bcode = '"+req.body.bcode+"';",[1,2], function(err, result){
      if (err) {
        console.log(err)
        res.sendStatus(500)
      }
      else if (result[0].length&&result[1].length) {
        let dbTap = result[1]
        pfcon.query("SELECT * FROM node WHERE pid LIKE '"+result[0][0].username+"%' AND status = 'reg' AND mac='"+dbTap[0].mac+"'", function(err, result){
          if(err) {
            console.log(err)
            res.sendStatus(500)
          }
          else if(!result.length){
            res.send({login: true, doubleTap: dbTap.length})
          }
          else res.send({login: true, doubleTap: 0})
        })
      }
      else res.send({login: false})
    })
  }
})
app.post("/check-pin", function(req,res){
  if(req.body.key===passwd){
    con.query("SELECT * FROM users WHERE bcode='"+req.body.bcode+"' AND pin=SHA2("+req.body.pincode+",512);", function(err, result){
      if (err) {
        console.log(err)
        res.sendStatus(500)
      }
      else if (result.length) res.send({login: true})
      else res.send({login: false})
    })
  }
})
app.post("/quick-register", function(req,res){
  if(req.body.key===passwd){
    con.query("SELECT mac FROM doubleTap WHERE bcode = "+JSON.stringify(req.body.bcode)+"; SELECT * FROM tijdprijzen WHERE time = 1; SELECT saldo FROM users WHERE bcode = "+JSON.stringify(req.body.bcode)+
    "; SELECT email INTO @email FROM users WHERE bcode="+JSON.stringify(req.body.bcode)+"; SELECT * FROM blacklist WHERE email=@email;",[1,2,3,4,5], function(err, result){
      if(err){
        console.log(err)
        res.send(500)
      }
      else if(result[0].length){
        console.log("1")
        if(result[4].length) res.send({success: false, msg: "Je bent verbannen."})
        else if(result[1].price-result[2].saldo>=0){
          regUser(result[0][0].mac, (success)=>{
            if(success){
              console.log(success)
              console.log("is registered")
              con.query("UPDATE users SET saldo = saldo - "+result[1][0].price, function(err,result){
                if(err){
                  console.log(err)
                  res.send(500)
                }
                else res.send({success: true, msg: "Je apparaat is nu geregistreerd."})
              })  
            }
            else res.send({success: false, msg: "Kon apparaat niet registreren."})
          })
        }
        else res.send({success: false, msg: "Onvoldoende saldo."})
      }
      else res.send(400)
    })
  }
})
app.post("/change-bcode", function(req,res){
  if(req.body.key===passwd){
    con.query("UPDATE users SET bcode = "+JSON.stringify(req.body.newBcode)+" WHERE bcode="+JSON.stringify(req.body.bcode)+" AND pin=SHA2("+JSON.stringify(req.body.pin)+", 512)", function(err, result){
      if(err){
        console.log(err)
        res.send(500)
      }
      else {
        res.send(200)
      }
    })
  }
})
app.post("/get-user-info", function(req,res){
  if(req.body.key===passwd){
    con.query("SELECT * FROM users WHERE bcode='"+req.body.bcode+"' AND pin=SHA2("+req.body.pincode+",512);", function(err, result){
      if (err) {
        console.log(err)
        res.sendStatus(500)
      }
      else if (result.length){
         let saldo=result[0].saldo
         let username = result[0].username
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
            res.send({saldo:saldo, devices:devices, gDevices:gDevices, nGDevices: nGDevices, nDevices:nDevices, username:username})
          }
          else res.send({saldo:saldo, devices:0, gDevices:0, nGDevices: 0, nDevices:0, username:username})
        })
      }
      else res.send(400)
    })
  }
})
app.post("/get-user-beurten", function(req,res){
  if(req.body.key===passwd){
    con.query("SELECT * FROM users WHERE bcode='"+req.body.bcode+"' AND pin=SHA2("+req.body.pincode+",512);", function(err, result){
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
  }
})
app.post("/get-guest-beurten", function(req,res){
  if(req.body.key===passwd){
    con.query("SELECT * FROM users WHERE bcode='"+req.body.bcode+"' AND pin=SHA2("+req.body.pincode+",512);", function(err, result){
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
  }
})
app.post("/register/terminal/send-status", function(req,res){//na het scannen van de QR-code
  if(req.body.key===passwd){
    console.log(req.body)
    con.query("SELECT * FROM terminal_registration WHERE code="+JSON.stringify(req.body.code), function(err, result){
      if(err) {
        console.log(err)
        res.send(500)
      }
      else if(result.length){
        console.log("emitting to socket (send-status)")
        io.to(result[0].socketId).emit('send-status', 'true');
      }
      else {
        console.log("socket not found")
      }
    })
    res.sendStatus(200)
  }
})
app.post("/register/terminal/send-scan", function(req,res){//na het invullen van de gegevens
  if(req.body.key===passwd){
    console.log(req.body)
    console.log("sending scan status")
    con.query("SELECT * FROM terminal_registration WHERE code="+JSON.stringify(req.body.code), function(err, result){
      if(err) {
        console.log(err)
        res.send(500)
      }
      else if(result.length){
        console.log("emitting to socket (scan-status)")
        io.to(result[0].socketId).emit('scan-status', 'true');
      }
      else {
        console.log("socket not found")
      }
    })
    res.sendStatus(200)
  }
})
app.post("/add-guest-beurt", function(req,res){//veranderingen nodig, adblock en data kunnen toevoegen.
  if(req.body.key===passwd){
    con.query("SELECT * FROM users WHERE bcode='"+req.body.bcode+"' AND pin=SHA2('"+req.body.pincode+"',512); SELECT * FROM tijdprijzen; SELECT email INTO @email FROM users WHERE bcode='"+req.body.bcode+"' LIMIT 1; SELECT * FROM beurten WHERE email=@email AND used<devices; SELECT * FROM settings;",[1,2,3,4,5], function(err,result){
      if(err){
        console.log(err)
        res.sendStatus(500)
      }
      else if(result.length){
    let price= calcPrice(result[1], req.body)
         let str = "0123456789azeretyuiopqsdfghjklmwxcvbn"
         let password=""
         let suffix=""
         if(result[4][0].max_beurten>result[3].length){
          if(price<=result[0][0].saldo&&req.body.devices>0&&result[4][0].allow_new){
            for(let i=0;i<8;i++) password+=str.charAt(Math.random()*str.length)
               //voor normale apparaten
                 var datum = new Date().getTime()
                 if(req.body.adblock) suffix="-adblock"
                 console.log("price after calculation:"+price+" ; beurten: "+result[3].length)
                   con.query("INSERT INTO beurten VALUES('"+result[0][0].email+"',"+req.body.devices+","+req.body.duration+",null,'"+datum+"',"+price+",1,"+datum+",0,'"+result[0][0].username+"@gast_"+formatTime(req.body.duration)+""+suffix+"', '"+password+"', false, null);UPDATE users SET saldo=saldo-"+price+" WHERE email='"+result[0][0].email+"'",[1,2], function(err,result){
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
         else if(!result[4][0].allow_new) res.send(JSON.stringify({success:false, msg: "Het is niet mogelijk om nieuwe beurten aan te maken."}))
         else res.send(JSON.stringify({success:false, msg: "Je hebt het maximum aantal beurten bereikt."}))
      }
      else {
        console.log("user not found")
        res.sendStatus(400)
      } 
    })
  }
})
app.post("/add-user-beurt", function(req,res){//veranderingen nodig, adblock en data kunnen toevoegen.
  if(req.body.key===passwd){
    con.query("SELECT * FROM users WHERE bcode='"+req.body.bcode+"' AND pin=SHA2('"+req.body.pincode+"',512); SELECT * FROM tijdprijzen; SELECT email INTO @email FROM users WHERE bcode = '"+req.body.bcode+"' LIMIT 1; SELECT * FROM beurten WHERE email=@email AND used<devices; SELECT * FROM settings;",[1,2,3,4,5], function(err,result){
      if(err){
        console.log(err)
        res.sendStatus(500)
      }
      else if(result.length){
    let price= calcPrice(result[1], req.body)
         let str = "0123456789azeretyuiopqsdfghjklmwxcvbn"
         let password=""
         let suffix=""
         if(result[4][0].max_beurten>result[3].length&&result[4][0].allow_new){
          if(price<=result[0][0].saldo&&req.body.devices>0){
            for(let i=0;i<8;i++) password+=str.charAt(Math.random()*str.length)
               //voor normale apparaten
                 var datum = new Date().getTime()
                 if(req.body.adblock) suffix="-adblock"
                 console.log("price after calculation:"+price+" ; beurten: "+result[3].length)
                 console.log(result[3])
                   con.query("INSERT INTO beurten VALUES('"+result[0][0].email+"',"+req.body.devices+","+req.body.duration+",null,'"+datum+"',"+price+",0,"+datum+",0,'"+result[0][0].username+"_"+formatTime(req.body.duration)+""+suffix+"', '"+password+"', false, null);UPDATE users SET saldo=saldo-"+price+" WHERE email='"+result[0][0].email+"'",[1,2], function(err,result){
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
         else if(!result[4][0].allow_new) res.send(JSON.stringify({success:false, msg: "Het is niet mogelijk om nieuwe beurten aan te maken."}))
         else res.send(JSON.stringify({success:false, msg: "Je hebt het maximum aantal beurten bereikt."}))
      }
      else {
        console.log("user not found")
        res.sendStatus(400)
      } 
    })
  }
})
app.get("/get-prijzen", function(req,res){
    con.query("SELECT * FROM tijdprijzen", function(err,result){
      if (err){
        console.log(err)
        res.sendStatus(500)
      }
      else res.send(result)
    })
})
app.get("/", function(req,res){
    res.send(404)
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
  let maxprice = 0;
  let price=0.00
  console.log(config)
    for(let i=result.length-1;i>=0;i--){
      console.log("calcing price")
      if(result[i].time<=config.duration&&result[i].time>maxprice) {
          console.log(price)
          maxprice = result[i].time
          console.log("maxprice: "+maxprice+", selected price: "+result[i].price)
          price=(result[i].price*config.duration/result[i].time).toFixed(2);
          console.log("prijs: "+price)
         // break
      }
  }
  console.log("price: "+price)
return price
}
function pfLogin (){
  console.log("logging in")
  process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
  data={"username":"admin", "password": "Gip"}
  var options = {
    host: '192.168.100.2',
    path: "/api/v1/login",
    port: 9999,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }}
  var httpreq = https.request(options, function (response) {
    response.setEncoding('utf8');
    console.log(response.statusCode)
    response.on('data', (d) => {
      let res = JSON.parse(d)
      console.log("loged in, token:" +res.token)
      token = res.token
    });
    response.on('error', (d) => {
    });
})
  httpreq.end(JSON.stringify(data))
}
function regUser(mac, callback){
  pfcon.query("SELECT * FROM node WHERE mac='"+mac+"' AND status='unreg'", function(err,result){
    if(err){
      console.log(err)
      res.send(500)
    }
    else if(result.length){
      console.log("nog niet reg")
      process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
        console.log("token: "+token + ", mac: "+mac)
        let data={
          "time_balance": 3600,
          "status" : "reg",
          "category_id": "16"
        }
        console.log(data)
        var options = {
          host: '192.168.100.2',
          path: "/api/v1/node/"+mac,
          port: 9999,
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization' : token
          }
        }
        var httpreq = https.request(options, function (response) {
         // response.setEncoding('utf8');
         console.log(response.statusCode +" "+ response.statusMessage)
         if(response.statusCode==200){
         callback(true)
         }
         else  callback("") 
         response.on("error", ()=>{
          callback("") 
         })
        });
        httpreq.end(JSON.stringify(data))
    }
    else{
      console.log('al reg')
      callback(false)
    }
  })
}
function toIsoString(date) {
  var tzo = -date.getTimezoneOffset(),
      dif = tzo >= 0 ? '+' : '-',
      pad = function(num) {
          return (num < 10 ? '0' : '') + num;
      };

  return date.getFullYear() +
      '-' + pad(date.getMonth() + 1) +
      '-' + pad(date.getDate()) +
      'T' + pad(date.getHours()) +
      ':' + pad(date.getMinutes()) +
      ':' + pad(date.getSeconds()) +
      dif + pad(Math.floor(Math.abs(tzo) / 60)) +
      ':' + pad(Math.abs(tzo) % 60);
}