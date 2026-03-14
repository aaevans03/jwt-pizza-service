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

// Metrics stored in memory
const requests = {};
const activeUsers = {};

// Middleware to track requests
function requestTracker(req, res, next) {
    const endpoint = req.method;
    requests[endpoint] = (requests[endpoint] | 0) + 1;

    const authHeader = req.headers.authorization;
    if (authHeader) {
        addActiveUser(authHeader);
    }

    next();
}

function addActiveUser(authHeader) {
    let authToken = authHeader;
    if (authHeader.includes(' ')) {
        authToken = authHeader.split(' ')[1];
    }
    activeUsers[authToken] = Date.now();
}

function removeActiveUser(user) {
    delete activeUsers[user];
}

// Send metrics to Grafana every 10 seconds
setInterval(() => {
    const metrics = [];

    // HTTP Requests
    let totalRequests = 0;
    Object.keys(requests).forEach((endpoint) => {
        totalRequests += requests[endpoint]
        metrics.push(createMetric('requests', requests[endpoint], '1', 'sum', 'asInt', { endpoint }));
    });

    metrics.push(createMetric('requests', totalRequests, '1', 'sum', 'asInt', { "endpoint": "Total" }));

    // Active users
    // If user hasn't made a request in 5 minutes, remove them from the list of active users
    let activeUserCount = 0;
    Object.keys(activeUsers).forEach((user) => {
        if (Date.now() - activeUsers[user] > 300000) {
            removeActiveUser(user);
        } else {
            activeUserCount++;
        }
    });
    metrics.push(createMetric('activeUserCount', activeUserCount, '1', 'gauge', 'asInt', {}));
    console.log(activeUsers);

    sendMetricToGrafana(metrics);
}, 10000);

function createMetric(metricName, metricValue, metricUnit, metricType, valueType, attributes) {
    attributes = { ...attributes, source: config.metrics.source };

    const metric = {
        name: metricName,
        unit: metricUnit,
        [metricType]: {
            dataPoints: [
                {
                    [valueType]: metricValue,
                    timeUnixNano: Date.now() * 1000000,
                    attributes: [],
                },
            ],
        },
    };

    Object.keys(attributes).forEach((key) => {
        metric[metricType].dataPoints[0].attributes.push({
            key: key,
            value: { stringValue: attributes[key] },
        });
    });

    if (metricType === 'sum') {
        metric[metricType].aggregationTemporality = 'AGGREGATION_TEMPORALITY_CUMULATIVE';
        metric[metricType].isMonotonic = true;
    }

    return metric;
}

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

    fetch(`${config.metrics.endpointUrl}`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { Authorization: `Bearer ${config.metrics.accountId}:${config.metrics.apiKey}`, 'Content-Type': 'application/json' },
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

module.exports = { requestTracker, addActiveUser, removeActiveUser };
