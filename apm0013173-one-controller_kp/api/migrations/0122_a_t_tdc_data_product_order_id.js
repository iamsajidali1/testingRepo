/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
async function up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async transaction => {
        try {
            await queryInterface.addColumn(
                'CSS_TDC_DATA',
                'PRODUCT_ORDER_ID',
                {
                    type: Sequelize.INTEGER(11),
                    references: {
                        model: "CSS_PRODUCT_ORDER",
                        key: "ID"
                    },
                    allowNull: true,
                }, { transaction }
            )

            const records = await queryInterface.sequelize.query("select * from css_tdc_data", { transaction });
            for (const record of records[0]) {

                const insertProductOrder = await queryInterface.sequelize.query("INSERT INTO css_product_order (EXTERNAL_ID, STATUS) VALUES (:externalId, :status)", {
                    transaction,
                    raw: true,
                    replacements: {
                        externalId: record.SR ?? "",
                        status: record.SNOW_STATUS ?? ""
                    }
                });

                const productOrderId = insertProductOrder[0];

                await queryInterface.sequelize.query("UPDATE css_tdc_data SET PRODUCT_ORDER_ID = :productOrderId WHERE id = :recordId", {
                    raw: true,
                    transaction,
                    replacements: {
                        recordId: record.ID,
                        productOrderId
                    }
                });
            }

            await queryInterface.removeColumn(
                "CSS_TDC_DATA",
                "SR",
                transaction
            );

            await queryInterface.removeColumn(
                "CSS_TDC_DATA",
                "SNOW_STATUS",
                transaction
            );

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
            await queryInterface.addColumn(
                'CSS_TDC_DATA',
                'SR',
                {
                    type: Sequelize.STRING(100),
                    allowNull: false,
                    defaultValue: "",
                }, { transaction }
            )

            await queryInterface.addColumn(
                'CSS_TDC_DATA',
                'SNOW_STATUS',
                {
                    type: Sequelize.STRING(100),
                    allowNull: false,
                    defaultValue: "",
                }, { transaction }
            )

            await queryInterface.sequelize.query("UPDATE css_tdc_data LEFT JOIN css_product_order ON css_product_order.ID = css_tdc_data.PRODUCT_ORDER_ID SET css_tdc_data.SR= css_product_order.EXTERNAL_ID, css_tdc_data.SNOW_STATUS = css_product_order.status  where css_tdc_data.id > 0", { transaction });

            await queryInterface.removeColumn(
                "CSS_TDC_DATA",
                "PRODUCT_ORDER_ID",
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
