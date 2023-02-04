const config = require("../config/config");
const { SpeechClient } = require("@google-cloud/speech").v1p1beta1;

// Creates a client
const speechToText = new SpeechClient({
  projectId: config.GCLOUD_CREDENTIALS.project_id,
  credentials: {
    ...config.GCLOUD_CREDENTIALS,
  },
});

module.exports = speechToText;
