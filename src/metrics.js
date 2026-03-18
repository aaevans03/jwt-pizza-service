const config = require('./config');
const os = require('os');

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
let successfulAuthAttempts = 0;
let failedAuthAttempts = 0;
let pizzaPurchaseCount = 0;
let pizzaFailureCount = 0;
let pizzaRevenue = 0.0;

// Middleware to track requests
function requestTracker(req, res, next) {
    if (req.method === "OPTIONS") {
        next();
        return;
    }
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

function logSuccessfulAuthAttempt() {
    successfulAuthAttempts += 1;
}

function logFailedAuthAttempt(reverse) {
    if (reverse === "reverse") {
        failedAuthAttempts -= 1;
    } else {
        failedAuthAttempts += 1;
    }
}

function getCpuUsagePercentage() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    return Math.floor(cpuUsage.toFixed(2) * 100);
}

function getMemoryUsagePercentage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;
    return memoryUsage.toFixed(2);
}

function pizzaPurchase(success, latency, price) {
    if (success === true) {
        pizzaPurchaseCount++;
        pizzaRevenue += price;
    } else {
        pizzaFailureCount++;
    }
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

    // Authentication attempts per minute
    metrics.push(createMetric('authAttempts', successfulAuthAttempts, '1', 'sum', 'asInt', { "type": "success" }));
    metrics.push(createMetric('authAttempts', failedAuthAttempts, '1', 'sum', 'asInt', { "type": "failure" }));

    // System CPU and Memory usage
    metrics.push(createMetric('cpuUsage', getCpuUsagePercentage(), '1', 'gauge', 'asDouble', {}));
    metrics.push(createMetric('memoryUsage', getMemoryUsagePercentage(), '1', 'gauge', 'asDouble', {}));

    // Send pizza purchase data
    metrics.push(createMetric('pizzaPurchases', pizzaPurchaseCount, '1', 'sum', 'asInt', { "type": "Pizza purchase successes" }));
    metrics.push(createMetric('pizzaFailures', pizzaFailureCount, '1', 'sum', 'asInt', { "type": "Pizza purchase failures" }));
    metrics.push(createMetric('pizzaRevenue', pizzaRevenue, '1', 'sum', 'asDouble', {}));

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

module.exports = { requestTracker, addActiveUser, removeActiveUser, successfulAuthAttempt: logSuccessfulAuthAttempt, unsuccessfulAuthAttempt: logFailedAuthAttempt, pizzaPurchase };
