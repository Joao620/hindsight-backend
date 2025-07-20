import { v2 as datadogv2, client } from "@datadog/datadog-api-client";
import "dotenv/config";

const configuration = client.createConfiguration();

configuration.setServerVariables({
  site: "us5.datadoghq.com",
});

const apiInstance = new datadogv2.MetricsApi(configuration);

function submitMetrics(params){
  apiInstance
    .submitMetrics(params)
    .catch((error) => {
      console.error("Error sending metric:", error);
    });
}

function genericMetric(metricName, type, value){

  /** @type {datadogv2.MetricsApiSubmitMetricsRequest} */
  const params = {
    body: {
      series: [
        {
          metric: metricName,
          points: [
            {
              timestamp: Math.floor(new Date().getTime() / 1000),
              value: value,
            },
          ],
          type: type,
        },
      ],
    },
  };

  submitMetrics(params)
}

function sendUserCountMetric(userCount) {
  genericMetric("users.count", 3, userCount)
}

function sendSucessTranscribeTask() {
  genericMetric("transcribe.task.count", 1, 1)
}

function sendErrorTranscribeTask() {
  genericMetric("transcribe.task.errors", 1, 1)
}


export { sendUserCountMetric, sendSucessTranscribeTask, sendErrorTranscribeTask };
