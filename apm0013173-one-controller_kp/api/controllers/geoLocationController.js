const axios = require("axios");
const btoa = require('btoa');
const { CONFIG } = require("../config/configuration");
const { ok } = require("../statuses");
const { getLogger } = require("../../utils/logging");

/**
 * Fetch the GeoLocation by Lst of Addresses
 * @param {Array} addresses
 * @returns {Array} array of geoLocations
 */
const fetchGeoLocations = async (tdcData) => {
    const log = getLogger();
    try {
        const addresses = tdcData.map((data) => ({
            STREET: data.GeographicalSite?.GeographicalAddress.STREET_NAME,
            CITY: data.GeographicalSite?.GeographicalAddress.CITY,
            STATE: data.GeographicalSite?.GeographicalAddress.STATE,
            ZIP: data.GeographicalSite?.GeographicalAddress.ZIP,
        }));

        const value = addresses.map((address) => ({
            "street_address": address.STREET,
            "city": address.CITY,
            "state": address.STATE || address.CITY,
            "postal_code": address.ZIP
        }));
        const auth = btoa(`${CONFIG.MECH_ID}:${CONFIG.MECH_ID_PASS}`);
        const config = {
            "url": `${CONFIG.utilitiesUrl}/others/geo/`,
            "method": "POST",
            "data": {
                "devices": [],
                "params": [
                    {
                        "type": "json",
                        "name": "address",
                        value
                    }
                ]
            },
            "headers": {
                "Content-Type": "application/json",
                "Authorization": `Basic ${auth}`
            },
            "proxy": false
        };
        const response = await axios(config);
        const { status, data } = response;
        return status === ok ? data.data : [];
    } catch (error) {
        log.error("Unable to fetch GeoLocations!");
        log.error(error.message);
        if (error.isAxiosError()) {
            log.error(error.response.data);
        }
        return [];
    }
};

module.exports = { fetchGeoLocations };
