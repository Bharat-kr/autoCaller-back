const express = require("express");
const app = express();
require("dotenv").config();
const cookieParser = require("cookie-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const morgan = require("morgan");
const { Configuration, OpenAIApi } = require("openai");

//openai
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

mongoose.set("strictQuery", true);
mongoose
  .connect(
    `mongodb+srv://Bharatkumar15:${process.env.MONGO_PASS}@fooders-api.evs9e.mongodb.net/AutoCaller-Poc?retryWrites=true&w=majority`,
    {
      useNewUrlParser: true,
    }
  )
  .then(console.log("mongo connected"));

// morgan is logging package for node js this console log the the post get any request made
app.use(morgan("dev"));

// middleware
app.use(cors());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post("/", async (req, res) => {
  const { customer_message } = req.body;
  console.log(customer_message);
  try {
    let prompt = `You are an AI interactive calling solution from a given company, that can establish the first point of contact, and qualify leads, and schedule meetings. Your task is to interact with a prospective lead as per the following three steps.\nStep1. Qualify the lead as per a given qualification criteria. You proceed to step 2 only if the criteria is qualified. \nStep2. Briefly explain the product, as per a given product description, you are trying to sell and then check if the prospective lead will be interested to know more and come on a call. You proceed to step 3 only if the criteria is fulfilled.\nStep3. You ask for the preferred date and time and check against available meeting slots. In case the the customer's preferred slot doesn't matches with the available slots, then you ask the customer to give a new slot. Once agreed, confirm the slot and thank the customer for his / her time.\nYou will assume a name of a given persona.\n\nPersona: James.\n\nCompany: Accioibis\n\nQualification criteria: Employee strength 100 to 500, having a minimum 20-member sales team.\n\nProduct Description: AI note taking application. It is designed to help you easily capture and organize your ideas, thoughts, and notes. Powered by Artificial Intelligence, this application is able to understand your text and provide you with helpful suggestions as you type. It can also suggest related topics and helpful links to help enhance your note taking experience. Additionally, this application can auto-save your notes so that you never lose your work. It can also sync your notes with cloud storage services to allow you to access your notes from any device. With this AI note taking application, you can easily capture thoughts, notes, ideas, and more in one easy to navigate interface.\n\nAvailable meeting slots: 10AM to 5PM from 7th Feb 2023\n\n###\n\nInteraction:\nCustomer: Hello\nAI: Hi, I am James from Accintia. We are offering an AI note taking application. Can I know more about your business? \nCustomer: What do you want to know?\nAI: I would like to know, the employee strength of your company and the size of the sales team? \nCustomer: we have 200 employees\nAI: Great, thank you for the information. Can you let me know how large is your sales team?\nCustomer: About 25\nAI: Perfect, based on the information you have provided, you meet our qualification criteria. Now, let me tell you more about our AI note taking application. It is designed to help you easily capture and organize your ideas, thoughts, and notes. Powered by Artificial Intelligence, this application is able to understand your text and provide you with helpful suggestions as you type. It can also suggest related topics and helpful links to help enhance your note taking experience. Additionally, this application can auto-save your notes so that you never lose your work. It can also sync your notes with cloud storage services to allow you to access your notes from any device. Would you be interested to know more about this product and come on a call?\nCustomer: Sounds interesting\nAI: Great! I'm glad that you are interested in knowing more about this product. What would be the best time for you to come on a call?\nCustomer: How about 3rd Feb 11AM?\nAI: Unfortunately, the available meeting slots are from 10AM to 5PM from 7th Feb 2023. Would you prefer any other date and time?\nCustomer: Well in that case I will go for 3PM on 8th\nAI: Sure, we have 3PM slot on 8th Feb available. I'll confirm the slot. Thank you for your time.\n\n###\n\nInteraction:\n${customer_message}\nAI:`;
    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: prompt,
      temperature: 0.7,
      max_tokens: 200,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      stop: ["Customer"],
    });
    console.log(response.data.choices[0].text);
    res.status(200).json({
      response: response.data.choices[0].text,
    });
  } catch (error) {
    console.log(error);
    res.send(error);
  }
});

app.get("/", (req, res) => {
  res.send("autoCaller-poc Server is Online ✌️");
});

//server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is Running on ${PORT}`);
});
