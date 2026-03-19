const log = require("./loggerHelper");

/**
 * Transforms the input data into a structured format for utilization metrics.
 * @param {Array} input - The input data to be transformed.
 * @returns {Object|null} - The transformed data along with metadata, or null if transformation fails.
 */
const transformUtilizationMetrics = (input) => {
    try {
        if (!input) {
            log.error('Input passed is either null/undefined!');
            return null;
        }

        // Create metadata: Will be used for UI actions
        const metadata = {};

        // Create a device list
        metadata['devices'] = input.map((device) => ({
            "name": device[0],
            "value": device[0]
        }));

        // Create a timespan list
        metadata['startTime'] = input[0][1].series.shift().startTime;
        metadata['endTime'] = input[0][1].series.pop().endTime;
        const durationInSeconds = (new Date(metadata.endTime).getTime() - new Date(metadata.startTime).getTime()) / 1000;
        const durationInMinutes = (durationInSeconds / 60).toFixed(2);
        const availableTimespans = [
            { name: 'Past 60 Minutes', value: 60 },
            { name: 'Past 8 Hours', value: 60 * 8 },
            { name: 'Past 12 Hours', value: 60 * 12 },
            { name: 'Past 24 Hours', value: 60 * 24 },
            { name: 'Past 3 Days', value: 60 * 24 * 3 },
            { name: 'Past 5 Days', value: 60 * 24 * 5 },
            { name: 'Past 7 Days', value: 60 * 24 * 7 },
            { name: 'Past 30 Days', value: 60 * 24 * 7 * 30 }
        ];
        metadata['timeSpans'] = availableTimespans.filter((timespan) => timespan.value <= durationInMinutes);

        metadata['systemStats'] = [
            { name: 'CPU Utilization', value: 'cpuPct' },
            { name: 'Memory Utilization', value: 'memoryPct' },
            { name: 'Tunnel Count', value: 'tunnelCount' }
        ];

        metadata['linkStats'] = [
            { name: 'Bytes Received', value: 'bytesRx' },
            { name: 'Bytes Sent', value: 'bytesTx' },
            { name: 'Throughput Downstream', value: 'throughputRx' },
            { name: 'Throughput Upstream', value: 'throughputTx' }
        ]

        metadata['agrThroughput'] = [
            { name: 'Aggregate Throughput (Downstream)', value: 'agrThroughputRx' },
            { name: 'Aggregate Throughput (Upstream)', value: 'agrThroughputTx' },
        ]

        metadata['charts'] = [
            {
                id: "byteRx",
                dataSrc: "$.links[*].linkStats[?(@.metric=='bytesRx')]",
                subCharts: [{
                    id: "byteTx",
                    dataSrc: "$.links[*].linkStats[?(@.metric=='bytesTx')]"
                }]
            },
            {
                id: "throughputRx",
                dataSrc: "$.links[*].linkStats[?(@.metric=='throughputRx')]",
                subCharts: [{
                    id: "throughputTx",
                    dataSrc: "$.links[*].linkStats[?(@.metric=='throughputTx')]"
                }]
            },
            { id: "agrThroughputTx", "dataSrc": "$.agrThroughput[*]" },
            { id: 'cpuPct', dataSrc: "$.systemStats[?(@.metric=='cpuPct')]" },
            { id: 'memoryPct', dataSrc: "$.systemStats[?(@.metric=='memoryPct')]" },
            { id: 'tunnelCount', dataSrc: "$.systemStats[?(@.metric=='tunnelCount')]" },
        ]

        metadata['summary'] = {
            "map": "$.data[*].geolocation",
            "table": [
                {
                    "id": "cpuPct",
                    "name": "CPU Utilization",
                    "dataSrc": "$.systemStats[?(@.metric=='cpuPct')]"
                },
                {
                    "id": "memoryPct",
                    "name": "Memory Utilization",
                    "dataSrc": "$.systemStats[?(@.metric=='memoryPct')]"
                },
                {
                    "id": "tunnelCount",
                    "name": "Tunnel Count",
                    "dataSrc": "$.systemStats[?(@.metric=='tunnelCount')]"
                }
            ]
        }

        // Prepare the data
        const data = input.map((device) => {
            const deviceData = {};
            deviceData['hostname'] = device[0];
            deviceData['systemStats'] = metadata.systemStats.map((key) => ({
                label: key.name,
                metric: key.value,
                startTime: new Date(device[1].series[0].startTime).getTime(),
                tickInterval: new Date(device[1].series[0].endTime).getTime() - new Date(device[1].series[0].startTime).getTime(),
                data: device[1].series.map((data) => data[key.value]),
                min: Math.min(...device[1].series.map((data) => data[key.value])),
                max: Math.max(...device[1].series.map((data) => data[key.value]))
            }));
            deviceData['links'] = device[2].map(linkData => {
                // Create basic link details object
                const { id, displayName, lat, lon, linkMode, serviceState } = linkData.link;
                const linkDetails = { id, displayName, lat, lon, linkMode, serviceState };
                linkDetails['linkStats'] = linkData.series.map(series => ({
                    label: displayName,
                    ...series
                }));
                // Return the link details
                return linkDetails;
            });
            deviceData['agrThroughput'] = device[3].map((tput) => ({
                label: metadata.agrThroughput.find((key) => key.value === tput.metric)?.name || tput.metric,
                ...tput
            }));
            deviceData['model'] = device[4];
            deviceData['geolocation'] = device[5];
            return deviceData;
        });

        return { metadata, data };
    } catch (error) {
        log.error('Unable to transform the Utilization Metrics!');
        return null;
    }
};

/**
 * Transforms license data from an array of arrays to an array of objects with specific keys.
 *
 * @param {Array<Array<any>>} input - The input data to transform, where each inner array represents a row of data.
 * @returns {Array<Object>|null} The transformed data as an array of objects, or null if the input is invalid or an error occurs.
 *
 * @example
 * const input = [
 *   ['vco1', 'customer1', '123', 'edge1', 'license1', '12 months', '100Mbps', 'region1', 'type1', 'v1.0', 'SN123', 'HAS123', 'MN123', 'active', '2021-01-01', 'active', 'address1', 'address2', 'state1', 'postal1', 'country1'],
 *   // more rows...
 * ];
 * const result = transformLicenseData(input);
 * console.log(result);
 * // [
 * //   { vcoName: 'vco1', customer: 'customer1', customerId: '123', edgeName: 'edge1', license: 'license1', licenseDuration: '12 months', licenseBw: '100Mbps', licenseRegion: 'region1', licenseType: 'type1', softwareVersion: 'v1.0', defaultSwVersion: 'SN123', serialNumber: 'HAS123', haSerialNumber: 'MN123', modelNumber: 'active', edgeState: '2021-01-01', activationDate: 'active', haState: 'address1', addressLine1: 'address2', addressLine2: 'state1', state: 'postal1', postal: 'country1', country: 'country1' },
 * //   // more objects...
 * // ]
 */
const transformLicenseData = (input) => {
    try {
        if (!input) {
            log.error('Input passed is either null/undefined!');
            return null;
        }
        const columns = ['vcoName', 'customer', 'customerId', 'edgeName', 'logicalId', 'license', 'licenseDuration', 'licenseBw', 'licenseRegion', 'licenseType', 'softwareVersion', 'defaultSwVersion', 'serialNumber', 'haSerialNumber', 'modelNumber', 'edgeState', 'activationDate', 'haState', 'addressLine1', 'addressLine2', 'state', 'postal', 'country'];
        const data = input.map((row) => {
            const rowData = {};
            columns.forEach((key, index) => {
                rowData[key] = row[index];
            });
            return rowData;
        });
        return data;
    } catch (error) {
        log.error('Unable to transform the License Data!');
        return null;
    }
}


const transformSiteData = (input) => {
    try {
        if (!input) {
            log.error('Input passed is either null/undefined!');
            return null;
        }
        const columns = ['tenantID', 'name', 'edgeUUID', 'edgeId', 'state', 'postalCode', 'country', 'streetAddress', 'streetAddress2', 'isHub', 'haMode', 'deviceFamily', 'modelNumber', 'profileName', 'customInfo', 'description', 'platformFirmware', 'license', 'softwareVersion', 'factorySoftwareVersion', 'serialNumber', 'haSerialNumber', 'status', 'activationTime', 'activationKey', 'activationState']
        const data = input.map((row) => {
            const rowData = {};
            columns.forEach((key, index) => {
                rowData[key] = row[index];
            });
            return rowData;
        });
        return data;
    } catch (error) {
        log.error('Unable to transform the License Data!');
        return null;
    }
}


module.exports = { transformUtilizationMetrics, transformLicenseData, transformSiteData };