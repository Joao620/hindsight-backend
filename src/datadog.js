import { v2 as datadogv2, client } from '@datadog/datadog-api-client';
import 'dotenv/config'

const configuration = client.createConfiguration();

configuration.setServerVariables({
    site: "us5.datadoghq.com"
});

const apiInstance = new datadogv2.MetricsApi(configuration);

datadogv2.Tag

function sendUserCountMetric(userCount) {
    const params = {
        body: {
            series: [
                {
                    metric: 'users.count',
                    points: [
                        {
                            timestamp: Math.floor(new Date().getTime() / 1000),
                            value: userCount,
                        },
                    ],
                    type: 3,
                },
            ],
        },
    };

    apiInstance.submitMetrics(params)
        .then((data) => {
            console.log('API called successfully. Returned data: ' + JSON.stringify(data));
        })
        .catch((error) => {
            console.error('Error sending metric:', error);
        });
}

export default sendUserCountMetric;