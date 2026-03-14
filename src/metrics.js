const config = require('./config');

/**
 * Metrics needed:
 *  - HTTP Requests by method per minute
 *      - Total requests
 *      - GET, PUT, POST, and DELETE requests
 *  - Active users
 *  - Authentication attempts per minute
 *      - Successful
 *      - Failed
 *  - CPU and memory usage percentage
 *  - Pizzas
 *      - Sold per minute
 *      - Creation failures
 *      - Revenue per minute
 *  - Latency
 *      - Service endpoint
 *      - Pizza creation
 */


// Add tracking here

setInterval(() => {
    sendMetricToGrafana("placeholder");
}, 10000);


function sendMetricToGrafana(metrics) {
    const body = {
        resourceMetrics: [
            {
                scopeMetrics: [
                    {
                        metrics,
                    },
                ],
            },
        ],
    };

    fetch(`${config.endpointUrl}`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { Authorization: `Bearer ${config.accountId}:${config.apiKey}`, 'Content-Type': 'application/json' },
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP status: ${response.status}`);
            }
        })
        .catch((error) => {
            console.error('Error pushing metrics:', error);
        });
}
