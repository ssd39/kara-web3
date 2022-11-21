'use strict';

// Use dotenv to read .env vars into Node
require('dotenv').config();
const process = require('process');
const cors = require('cors')
const { MongoClient, ObjectId } = require("mongodb");
const mongo_uri = ''
const mongo_client = new MongoClient(mongo_uri);
const database = mongo_client.db('kara-web3');
const user_collection = database.collection('users');
const quiz_collection = database.collection('quiz');
const question_collection = database.collection('question');
const chat_flow = require('./flow.json');
// The page access token we have generated in your app settings
const PAGE_ACCESS_TOKEN = "";

// Imports dependencies and set up http server
const
  request = require('request'),
  express = require('express'),
  { urlencoded, json } = require('body-parser'),
  app = express();

// Parse application/x-www-form-urlencoded
app.use(urlencoded({ extended: true }));

// Parse application/json
app.use(json());

app.use(cors());
// Respond with 'Hello World' when a GET request is made to the homepage
app.get('/', function (_req, res) {
  res.send('Hello World');
});

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

  // Your verify token. Should be a random string.
  const VERIFY_TOKEN = "";

  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  // Checks if a token and mode is in the query string of the request
  if (mode && token) {

    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {

      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);

    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});

// Creates the endpoint for your webhook
app.post('/webhook', (req, res) => {
  let body = req.body;

  // Checks if this is an event from a page subscription
  if (body.object === 'page') {

    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {

      // Gets the body of the webhook event
      let webhookEvent = entry.messaging[0];
      console.log(webhookEvent);

      // Get the sender PSID
      let senderPsid = webhookEvent.sender.id;
      console.log('Sender PSID: ' + senderPsid);

      // Check if the event is a message or postback and
      // pass the event to the appropriate handler function
      if (webhookEvent.message) {
        handleMessage(senderPsid, webhookEvent.message);
      } else if (webhookEvent.postback) {
        handlePostback(senderPsid, webhookEvent.postback);
      }
    });

    // Returns a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');
  } else {

    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }
});

app.get('/partners', (req,res)=>{
  res.json(require("./reward.json"))
})

app.get('/user/:id', async (req, res)=>{
  let id = req.params.id
  if(id){
    let user = await user_collection.findOne({ uid: id });
    if(user){
      res.json(user)
      return;
    }
  }
  res.sendStatus(404)
})

app.post('/quiz/:id/finish', async (req,res)=>{
  let id = req.params.id
  if(id){
    try{
      if(!req.body.uid){
        throw ""
      }
      let quiz_data = await quiz_collection.findOne({ _id: new ObjectId(id) });
      if(quiz_data.is_finish){
        res.json({
          sucess: false,
          message: 'Quiz already finished!'
        })
        return;
      }
      console.log(req.body)
      let answers = req.body.answers;
      let count = 0;
      let total = 0; 
      const cursor = question_collection.find({ qid: quiz_data.qid })
      await cursor.forEach((question)=>{
       total +=1;
       if(answers.hasOwnProperty(question.aid)){
        if(answers[question.aid]==question.ans){
          count+=1
        }
       }else{
        throw ""
       }
      });
      let per = Math.floor((count/total)*100)
      let reward = 0;
      if(per<=33){
        reward = Math.floor(Math.random() * (200 - 0 + 1)) + 0;
      } else if(per<=66){
        reward = Math.floor(Math.random() * (600 - 200 + 1)) + 200;
      }else{
        reward = Math.floor(Math.random() * (1200 - 600 + 1)) + 600;
      }
      let uid =req.body.uid;
      console.log(uid, per, reward)
      await user_collection.updateOne({ uid }, { $set: { uid }, $inc:{ reward }}, { upsert: true})
      res.json({
        sucess: true,
        reward
      })
    }catch(e){
      console.error(e)
      res.json({
        sucess: false,
        message:'Bad request!'
      })
    }
    return;
  }
  res.sendStatus(404)
})

app.get('/quiz/:id',async (req,res)=>{
  let id = req.params.id
  if(id){
    try{
      let quiz_data = await quiz_collection.findOne({ _id: new ObjectId(id) });
      if(quiz_data.is_finish){
        res.json({
          sucess: false,
          message: 'Quiz already finished!'
        })
        return;
      }
      const cursor = question_collection.find({ qid: quiz_data.qid })
      let output = []
      await cursor.forEach((question)=>{
        delete question.ans;
        output.push(question)
      });
      res.json({
        sucess: true,
        result: output
      })
    }catch(e){
      res.json({
        sucess: false,
        message: 'Quiz not found!'
      })
    }
    return;
  }
  res.sendStatus(404)
})

function setMessenger() {
  const requestBody = {
    "get_started": {
      "payload": "get_started"
    }
  }
  request({
    'uri': 'https://graph.facebook.com/v2.6/me/messenger_profile',
    'qs': { 'access_token': PAGE_ACCESS_TOKEN },
    'method': 'POST',
    'json': requestBody
  }, (err, _res, _body) => {
    if (!err) {
      console.log('Messanger configured!');
    } else {
      console.error('Unable to send configure messanger:' + err);
    }
  });
}

async function isNewUser(senderPsid) {
  try {
    const query = { senderPsid };
    const user = await user_collection.findOne(query);
    if(user) {
      return true;
    }
  } catch(e) {}
  return false;
}

// Handles messages events
async function handleMessage(senderPsid, receivedMessage) {
  // Checks if the message contains text
  // Create the payload for a basic text message, which
  // will be added to the body of your request to the Send API
  let response = {
    'text': `Bot currently only understand button pressed messages. NLP under development. You will directly able to message bot in future. Thanks! (NEAR To 🌕)`
  };
  // Send the response message
  callSendAPI(senderPsid, response);
}

// Handles messaging_postbacks events
async function handlePostback(senderPsid, receivedPostback) {
  // Get the payload for the postback
  let payload = receivedPostback.payload;
  if(chat_flow.hasOwnProperty(payload)){
    let gap = 0;
    for(let flow_response of chat_flow[payload]){
      let response;
      if(!flow_response.hasOwnProperty('template_type')) {
        response = flow_response;
      } else if(flow_response['template_type']=='refrence'){
        await handlePostback(senderPsid, { payload: flow_response['refrence']});
        continue;
      } else {
        response ={
          "attachment":{
            "type":"template",
            "payload": flow_response
          }
        };
      }
      await new Promise((resolve, reject)=>{
        ((response_to_send, time_out)=>{
          setTimeout(async ()=>{
            await callSendAPI(senderPsid, response_to_send);
            resolve()
          }, time_out)
        })(response, gap)
      })
      gap +=150;
    }
  } else if (payload.includes("quiz")){
    let quiz_id = payload.split(":")[1]
    let quiz_url = await get_quiz(senderPsid, quiz_id)
    callSendAPI(senderPsid, {
      "attachment":{
        "type":"template",
        "payload": {
          "template_type":"button",
          "text":"I hope you learned something new. We appreciate that by learning, you not only educating yourself about women health but also educating others. We are always here to reward your effort 😉.",
          "buttons":[
            {
              "type": "web_url",
              "title": "Go to quiz page",
              "url": quiz_url
          }
          ]
        }
      }
    });
  } else {
    let response = {
      'text': `Something went wrong 😭. Try again!`
    };
    callSendAPI(senderPsid, response);
  }  
}

async function get_quiz(user_id, qid){
  let web_url = `https://google.com/quiz/`
  let quiz_data = await quiz_collection.findOne({ user_id, qid });
  if(quiz_data){
    return `${web_url}${quiz_data._id.toString()}`
  }
  let new_quiz_data = await quiz_collection.insertOne({
    qid,
    user_id,
    is_finish: false
  })
  return `${web_url}${new_quiz_data.insertedId.toString()}` 
}

// Sends response messages via the Send API
async function callSendAPI(senderPsid, response) {
  return new Promise((resolve, reject) =>{
    // Construct the message body
    let requestBody = {
      'recipient': {
        'id': senderPsid
      },
      'message': response
    };

    // Send the HTTP request to the Messenger Platform
    request({
      'uri': 'https://graph.facebook.com/v2.6/me/messages',
      'qs': { 'access_token': PAGE_ACCESS_TOKEN },
      'method': 'POST',
      'json': requestBody
    }, (err, _res, _body) => {
      if (!err) {
        console.log('Message sent!');
      } else {
        console.error('Unable to send message:' + err);
      }
      resolve()
    });
  })
}

async function update_questions(){
  let questions = require('./questions.json').data
  for(let question of questions){
    let aid = question.aid;
    await question_collection.updateOne({ aid },{$set: question}, { upsert: true})
  }
  console.log('Question data updated!')
}

// listen for requests :)
var listener = app.listen(process.env.PORT || 3001, function() {
  update_questions()
  setMessenger()
  console.log('Your app is listening on port ' + listener.address().port);
});
