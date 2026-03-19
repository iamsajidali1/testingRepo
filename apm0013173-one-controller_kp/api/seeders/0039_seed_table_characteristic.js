/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert(
        "CSS_CHARACTERISTIC",
        [
            {
                "ID": 1,
                "NAME": "interface1",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 2,
                "NAME": "virtualInterface",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 3,
                "NAME": "vRouterInterface",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 4,
                "NAME": "Juniper Interfaces",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": "Juniper"
            },
            {
                "ID": 5,
                "NAME": "PA Interface",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": "Palo Alto"
            },
            {
                "ID": 6,
                "NAME": "Velo Interface",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": "Velocloud"
            },
            {
                "ID": 7,
                "NAME": "Forti Interface",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": "Fortinet"
            },
            {
                "ID": 8,
                "NAME": "portSpeed",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 9,
                "NAME": "portDuplex",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 10,
                "NAME": "portUsage",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 11,
                "NAME": "Template",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 12,
                "NAME": "trueFalse",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 13,
                "NAME": "portConnectMode",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 14,
                "NAME": "InterfaceMode",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 15,
                "NAME": "portMode",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 16,
                "NAME": "portState",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 17,
                "NAME": "transportType",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 18,
                "NAME": "vlanMode",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 19,
                "NAME": "yesNo",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 20,
                "NAME": "Connection Type",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 21,
                "NAME": "VNFs",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 22,
                "NAME": "VNF Part Numbers",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 23,
                "NAME": "Physical Ports",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 24,
                "NAME": "Virtual Ports",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 25,
                "NAME": "PortConnectMode",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 26,
                "NAME": "Management",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 27,
                "NAME": "vrf",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 28,
                "NAME": "vSRX Part Numbers",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 29,
                "NAME": "Velo Part Numbers",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": "Velocloud"
            },
            {
                "ID": 30,
                "NAME": "Palo Part Numbers",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": "Palo Alto"
            },
            {
                "ID": 31,
                "NAME": "Forti Part Numbers",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": "Fortinet"
            },
            {
                "ID": 32,
                "NAME": "v4v6",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 33,
                "NAME": "NFX250LAN",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": "Juniper"
            },
            {
                "ID": 34,
                "NAME": "NFX250WAN",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": "Juniper"
            },
            {
                "ID": 35,
                "NAME": "ISO 3166-2",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 36,
                "NAME": "Model",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 37,
                "NAME": "uCPEModelNumber",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 38,
                "NAME": "uCPEModelNumber",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 39,
                "NAME": "transportType",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 40,
                "NAME": "Address Mode",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 41,
                "NAME": "IkePolicyMode",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 42,
                "NAME": "PortType",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 43,
                "NAME": "HA",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 44,
                "NAME": "interfaceState",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 45,
                "NAME": "Environment",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": null
            },
            {
                "ID": 46,
                "NAME": "CiscoPartNumbers",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": "Cisco"
            },
            {
                "ID": 47,
                "NAME": "SilverpeakPartNumbers",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": "SilverPeak"
            },
            {
                "ID": 48,
                "NAME": "SilverPeak Boost",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": "SilverPeak Boost"
            },
            {
                "ID": 49,
                "NAME": "Cisco Interfaces",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": "Cisco"
            },
            {
                "ID": 50,
                "NAME": "SilverPeak Interfaces",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": "SilverPeak"
            },
            {
                "ID": 51,
                "NAME": "SilverPeak Boost Interfaces",
                "VALUE_TYPE": "choice",
                "EXTERNAL_SOURCE": "SilverPeak Boost"
            }
        ],
        {}
    );
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
function down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete(
        "CSS_CHARACTERISTIC",
        {
            ID: { [Sequelize.Op.lte]: 51 },
        },
        {}
    );
}

module.exports = { up, down };
