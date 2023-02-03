const config = require("../config/config");
const { TextToSpeechClient } = require("@google-cloud/text-to-speech").v1;

// Creates a client
const textToSpeech = new TextToSpeechClient({
  projectId: config.GCLOUD_CREDENTIALS.project_id,
  credentials: {
    ...config.GCLOUD_CREDENTIALS,
  },
});

module.exports = textToSpeech;
