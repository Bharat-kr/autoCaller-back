const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const util = require("util");

//DB
const mongoose = require("mongoose");
const DataModel = require("./DataModel");

//configs
const config = require("./config/config");
const textToSpeech = require("./lib/textToSpeech.lib");
const speechToText = require("./lib/speechToText.lib");
const openai = require("./lib/openai.lib");

//mongo connection
mongoose.set("strictQuery", true);
mongoose
  .connect(
    `mongodb+srv://Bharatkumar15:${config.MONGO.PASS}@fooders-api.evs9e.mongodb.net/AutoCaller-Poc?retryWrites=true&w=majority`,
    {
      useNewUrlParser: true,
    }
  )
  .then(console.log("mongo connected"));

// middleware
app.use(cors());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post("/", async (req, res) => {
  const { customer_message, user_id } = req.body;
  console.log("------------------------------------------------");
  console.log("Customer : ", customer_message);
  try {
    const audioData = fs.readFileSync(__dirname + "/output.mp3");
    const buffer = new Buffer.from(audioData);

    const audio = {
      content: buffer,
    };
    //converting buffer to text
    const config = {
      encoding: "MP3",
      sampleRateHertz: 16000,
      languageCode: "en-US",
    };
    const requestJSON = {
      audio: audio,
      config: config,
    };

    // Detects speech in the audio file
    const [SpeechTOTextResponse] = await speechToText.recognize(requestJSON);
    const transcription = SpeechTOTextResponse.results
      .map((result) => result.alternatives[0].transcript)
      .join("\n");
    console.log("transcription", transcription);

    //getting old chat-history
    var old_history = await DataModel.find({
      user_id,
    })
      .limit(5)
      .sort({ createdAt: -1 });
    old_history.reverse();
    let prompt = `You are an AI interactive calling solution from a given company, that can establish the first point of contact, and qualify leads, and schedule meetings. Your task is to interact with a prospective lead as per the following three steps.\nStep1. Qualify the lead as per a given qualification criteria. You proceed to step 2 only if the criteria is qualified. \nStep2. Briefly explain the product, as per a given product description, you are trying to sell and then check if the prospective lead will be interested to know more and come on a call. You proceed to step 3 only if the criteria is fulfilled.\nStep3. You ask for the preferred date and time and check against available meeting slots. In case the the customer's preferred slot doesn't matches with the available slots, then you ask the customer to give a new slot. Once agreed, confirm the slot and thank the customer for his / her time.\nYou will assume a name of a given persona.\n\nPersona: James.\n\nCompany: Accioibis\n\nQualification criteria: Employee strength 100 to 500, having a minimum 20-member sales team.\n\nProduct Description: AI note taking application. It is designed to help you easily capture and organize your ideas, thoughts, and notes. Powered by Artificial Intelligence, this application is able to understand your text and provide you with helpful suggestions as you type. It can also suggest related topics and helpful links to help enhance your note taking experience. Additionally, this application can auto-save your notes so that you never lose your work. It can also sync your notes with cloud storage services to allow you to access your notes from any device. With this AI note taking application, you can easily capture thoughts, notes, ideas, and more in one easy to navigate interface.\n\nAvailable meeting slots: 10AM to 5PM from 7th Feb 2023\n\n###\n\nInteraction:\nCustomer: Hello\nAI: Hi, I am James from Accintia. We are offering an AI note taking application. Can I know more about your business? \nCustomer: What do you want to know?\nAI: I would like to know, the employee strength of your company and the size of the sales team? \nCustomer: we have 200 employees\nAI: Great, thank you for the information. Can you let me know how large is your sales team?\nCustomer: About 25\nAI: Perfect, based on the information you have provided, you meet our qualification criteria. Now, let me tell you more about our AI note taking application. It is designed to help you easily capture and organize your ideas, thoughts, and notes. Powered by Artificial Intelligence, this application is able to understand your text and provide you with helpful suggestions as you type. It can also suggest related topics and helpful links to help enhance your note taking experience. Additionally, this application can auto-save your notes so that you never lose your work. It can also sync your notes with cloud storage services to allow you to access your notes from any device. Would you be interested to know more about this product and come on a call?\nCustomer: Sounds interesting\nAI: Great! I'm glad that you are interested in knowing more about this product. What would be the best time for you to come on a call?\nCustomer: How about 3rd Feb 11AM?\nAI: Unfortunately, the available meeting slots are from 10AM to 5PM from 7th Feb 2023. Would you prefer any other date and time?\nCustomer: Well in that case I will go for 3PM on 8th\nAI: Sure, we have 3PM slot on 8th Feb available. I'll confirm the slot. Thank you for your time.\n\n###\n\nInteraction:`;
    old_history.forEach((item) => {
      prompt =
        prompt + `\nCustomer: ${item.question}` + `\nAI: ${item.response}`;
    });
    prompt = prompt + `\n${customer_message}\nAI:`;
    const result = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: prompt,
      temperature: 0.7,
      max_tokens: 200,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      stop: ["Customer"],
    });
    console.log("AI : ", result.data.choices[0].text);

    //converting text
    const request = {
      input: { text: result.data.choices[0].text },
      voice: {
        languageCode: "en-US",
        name: "en-US-Neural2-J",
      },
      audioConfig: { audioEncoding: "MP3" },
    };

    const [response] = await textToSpeech.synthesizeSpeech(request);
    console.log("AI Buffer : ", response.audioContent);
    //TODO: Send this Buffer to frontend

    //saving responve for future conversation
    const Item = new DataModel({
      _id: new mongoose.Types.ObjectId(),
      question: customer_message,
      user_id: user_id,
      response: result.data.choices[0].text,
    });
    await Item.save();
    res.status(200).json({
      response: result.data.choices[0].text,
    });
  } catch (error) {
    console.log(error);
    res.send(error);
  }
});

app.get("/", (req, res) => {
  res.send("autoCaller-poc Server is Online ✌️");
});

//socket connection
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log(socket.id);
  socket.on("ques", async ({ audioBuff, id }) => {
    //perform operation
    const responseBuff = await GetResponseAI(audioBuff, id);
    socket.emit("ans", { ansBuff: responseBuff, id: id });
  });
});

//server
const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
  console.log(`Server is Running on ${PORT}`);
});

//helper

const GetResponseAI = async (audioBuff, user_id) => {
  try {
    const audio = {
      content: audioBuff,
    };
    //converting buffer to text
    const config = {
      encoding: "MP3",
      sampleRateHertz: 16000,
      languageCode: "en-US",
    };
    const requestJSON = {
      audio: audio,
      config: config,
    };

    // Detects speech in the audio file
    const [SpeechTOTextResponse] = await speechToText.recognize(requestJSON);
    const transcription = SpeechTOTextResponse.results
      .map((result) => result.alternatives[0].transcript)
      .join("\n");
    console.log("Customer : ", transcription);

    //getting old chat-history
    var old_history = await DataModel.find({
      user_id,
    })
      .limit(5)
      .sort({ createdAt: -1 });
    old_history.reverse();
    let prompt = `You are an AI interactive calling solution from a given company, that can establish the first point of contact, and qualify leads, and schedule meetings. Your task is to interact with a prospective lead as per the following three steps.\nStep1. Qualify the lead as per a given qualification criteria. You proceed to step 2 only if the criteria is qualified. \nStep2. Briefly explain the product, as per a given product description, you are trying to sell and then check if the prospective lead will be interested to know more and come on a call. You proceed to step 3 only if the criteria is fulfilled.\nStep3. You ask for the preferred date and time and check against available meeting slots. In case the the customer's preferred slot doesn't matches with the available slots, then you ask the customer to give a new slot. Once agreed, confirm the slot and thank the customer for his / her time.\nYou will assume a name of a given persona.\n\nPersona: James.\n\nCompany: Accioibis\n\nQualification criteria: Employee strength 100 to 500, having a minimum 20-member sales team.\n\nProduct Description: AI note taking application. It is designed to help you easily capture and organize your ideas, thoughts, and notes. Powered by Artificial Intelligence, this application is able to understand your text and provide you with helpful suggestions as you type. It can also suggest related topics and helpful links to help enhance your note taking experience. Additionally, this application can auto-save your notes so that you never lose your work. It can also sync your notes with cloud storage services to allow you to access your notes from any device. With this AI note taking application, you can easily capture thoughts, notes, ideas, and more in one easy to navigate interface.\n\nAvailable meeting slots: 10AM to 5PM from 7th Feb 2023\n\n###\n\nInteraction:\nCustomer: Hello\nAI: Hi, I am James from Accintia. We are offering an AI note taking application. Can I know more about your business? \nCustomer: What do you want to know?\nAI: I would like to know, the employee strength of your company and the size of the sales team? \nCustomer: we have 200 employees\nAI: Great, thank you for the information. Can you let me know how large is your sales team?\nCustomer: About 25\nAI: Perfect, based on the information you have provided, you meet our qualification criteria. Now, let me tell you more about our AI note taking application. It is designed to help you easily capture and organize your ideas, thoughts, and notes. Powered by Artificial Intelligence, this application is able to understand your text and provide you with helpful suggestions as you type. It can also suggest related topics and helpful links to help enhance your note taking experience. Additionally, this application can auto-save your notes so that you never lose your work. It can also sync your notes with cloud storage services to allow you to access your notes from any device. Would you be interested to know more about this product and come on a call?\nCustomer: Sounds interesting\nAI: Great! I'm glad that you are interested in knowing more about this product. What would be the best time for you to come on a call?\nCustomer: How about 3rd Feb 11AM?\nAI: Unfortunately, the available meeting slots are from 10AM to 5PM from 7th Feb 2023. Would you prefer any other date and time?\nCustomer: Well in that case I will go for 3PM on 8th\nAI: Sure, we have 3PM slot on 8th Feb available. I'll confirm the slot. Thank you for your time.\n\n###\n\nInteraction:`;
    old_history.forEach((item) => {
      prompt =
        prompt + `\nCustomer: ${item.question}` + `\nAI: ${item.response}`;
    });
    prompt = prompt + `\n${transcription}\nAI:`;
    const result = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: prompt,
      temperature: 0.7,
      max_tokens: 200,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      stop: ["Customer"],
    });
    console.log("AI : ", result.data.choices[0].text);

    //converting text
    const request = {
      input: { text: result.data.choices[0].text },
      voice: {
        languageCode: "en-US",
        name: "en-US-Neural2-J",
      },
      audioConfig: { audioEncoding: "MP3" },
    };

    //saving responve for future conversation
    const Item = new DataModel({
      _id: new mongoose.Types.ObjectId(),
      question: customer_message,
      user_id: user_id,
      response: result.data.choices[0].text,
    });
    await Item.save();
    const [response] = await textToSpeech.synthesizeSpeech(request);
    console.log("AI Buffer : ", response.audioContent);
    return response.audioContent;
  } catch (error) {
    console.log(error);
    return error;
  }
};
