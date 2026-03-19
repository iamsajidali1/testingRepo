/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
async function up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async transaction => {
        try {
            await queryInterface.addColumn(
                'CSS_TDC_DATA',
                'GEOGRAPHICAL_SITE_ID',
                {
                    type: Sequelize.INTEGER(11),
                    references: {
                        model: "CSS_GEOGRAPHICAL_SITE",
                        key: "ID"
                    },
                    allowNull: true,
                }, { transaction }
            )

            const records = await queryInterface.sequelize.query("select * from css_tdc_data", { transaction });
            for (const record of records[0]) {

                const insertLocation = await queryInterface.sequelize.query("INSERT INTO css_geographical_location (latitude,longitude) VALUES (:latitude, :longitude)", {
                    transaction,
                    raw: true,
                    replacements: {
                        latitude: record.LATITUDE ?? "",
                        longitude: record.LONGTITUDE ?? ""
                    }
                });

                const insertAddress = await queryInterface.sequelize.query("INSERT INTO css_geographical_address (`glid`, `street_name`, `city`, `state`, `country`, `zip`) VALUES (:glid, :street, :city, :state, :country, :zip)", {
                    transaction,
                    raw: true,
                    replacements: {
                        glid: record.GLID ?? "",
                        street: record.STREET ?? "",
                        city: record.CITY ?? "",
                        state: record.STATE ?? "",
                        country: record.COUNTRY ?? "",
                        zip: record.ZIP ?? ""
                    }
                });

                const insertSite = await queryInterface.sequelize.query("INSERT INTO css_geographical_site (name, geographical_location_id, geographical_address_id, organization_id) VALUES (:name, :geographicalLocationId, :geographicalAddressId, :organizationId)", {
                    transaction,
                    raw: true,
                    replacements: {
                        name: "",
                        geographicalLocationId: insertLocation[0],
                        geographicalAddressId: insertAddress[0],
                        organizationId: record.ORGANIZATION_ID
                    }
                });


                await queryInterface.sequelize.query("UPDATE css_tdc_data SET geographical_site_id = :geographicalSiteId WHERE id = :recordId", {
                    raw: true,
                    transaction,
                    replacements: {
                        recordId: record.ID,
                        geographicalSiteId: insertSite[0]
                    }
                });
            }

            await queryInterface.removeColumn("CSS_TDC_DATA", "GLID", transaction);
            await queryInterface.removeColumn("CSS_TDC_DATA", "STREET", transaction);
            await queryInterface.removeColumn("CSS_TDC_DATA", "CITY", transaction);
            await queryInterface.removeColumn("CSS_TDC_DATA", "STATE", transaction);
            await queryInterface.removeColumn("CSS_TDC_DATA", "COUNTRY", transaction);
            await queryInterface.removeColumn("CSS_TDC_DATA", "ZIP", transaction);
            await queryInterface.removeColumn("CSS_TDC_DATA", "LATITUDE", transaction);
            await queryInterface.removeColumn("CSS_TDC_DATA", "LONGTITUDE", transaction);

        } catch (error) {
            console.error(error);
            await transaction.rollback();
            throw error;
        }
    });
}

/**
 * @param {import("sequelize").QueryInterface} queryInterface
 */
async function down(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async transaction => {
        try {
            await queryInterface.addColumn('CSS_TDC_DATA', 'GLID', { type: Sequelize.STRING(100), allowNull: true, transaction }, { transaction } );
            await queryInterface.addColumn('CSS_TDC_DATA', 'STREET', { type: Sequelize.STRING(100), allowNull: true, transaction }, { transaction } );
            await queryInterface.addColumn('CSS_TDC_DATA', 'CITY', { type: Sequelize.STRING(100), allowNull: true, transaction }, { transaction } );
            await queryInterface.addColumn('CSS_TDC_DATA', 'STATE', { type: Sequelize.STRING(100), allowNull: true, transaction }, { transaction } );
            await queryInterface.addColumn('CSS_TDC_DATA', 'COUNTRY', { type: Sequelize.STRING(100), allowNull: true, transaction }, { transaction } );
            await queryInterface.addColumn('CSS_TDC_DATA', 'ZIP', { type: Sequelize.STRING(100), allowNull: true, transaction }, { transaction } );
            await queryInterface.addColumn('CSS_TDC_DATA', 'LATITUDE', { type: Sequelize.STRING(100), allowNull: true, transaction }, { transaction } );
            await queryInterface.addColumn('CSS_TDC_DATA', 'LONGTITUDE', { type: Sequelize.STRING(100), allowNull: true, transaction }, { transaction } );

            await queryInterface.sequelize.query(`
                    UPDATE css_tdc_data 
                        LEFT JOIN css_geographical_site ON css_geographical_site.ID = css_tdc_data.GEOGRAPHICAL_SITE_ID
                        LEFT JOIN css_geographical_location ON css_geographical_location.ID = css_geographical_site.GEOGRAPHICAL_LOCATION_ID
                        LEFT JOIN css_geographical_address ON css_geographical_address.ID = css_geographical_site.GEOGRAPHICAL_ADDRESS_ID
                    SET 
                        css_tdc_data.GLID = css_geographical_address.GLID,  
                        css_tdc_data.STREET = css_geographical_address.STREET_NAME,  
                        css_tdc_data.CITY = css_geographical_address.CITY,  
                        css_tdc_data.STATE = css_geographical_address.STATE,  
                        css_tdc_data.COUNTRY = css_geographical_address.COUNTRY,  
                        css_tdc_data.ZIP = css_geographical_address.ZIP,  
                        css_tdc_data.LATITUDE = css_geographical_location.LATITUDE,  
                        css_tdc_data.LONGTITUDE = css_geographical_location.LONGITUDE
                    where css_tdc_data.id > 0`, { transaction });

            await queryInterface.removeColumn(
                "CSS_TDC_DATA",
                "GEOGRAPHICAL_SITE_ID",
                transaction
            );
        } catch (error) {
            console.error(error);
            await transaction.rollback();
            throw error;
        }
    });
}

module.exports = { up, down };
