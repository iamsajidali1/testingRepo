/**
 * @param {import("sequelize").QueryInterface} queryInterface
 * @param {import("sequelize").DataTypes} Sequelize
 */
async function up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async transaction => {
        try {
            await queryInterface.addColumn(
                'CSS_TDC_DATA',
                'ORGANIZATION_ID',
                {
                    type: Sequelize.INTEGER(11),
                    allowNull: true,
                },
                {
                    transaction
                }
            )

            const records = await queryInterface.sequelize.query("select * from css_tdc_data", { transaction });
            for (const record of records[0]) {
                const existingOrganization = await queryInterface.sequelize.query("SELECT * FROM css_organization WHERE GRUA = :grua", {
                    transaction,
                    raw: true,
                    replacements: {
                        grua: record.CUSTOMER_GRUA
                    }
                });

                let organizationId = 0;

                if (existingOrganization[0].length) {
                    organizationId = existingOrganization[0][0].ID;
                } else {
                    const insertOrganization = await queryInterface.sequelize.query("INSERT INTO css_organization (GRUA) VALUES (:grua)", {
                        transaction,
                        raw: true,
                        replacements: {
                            grua: record.CUSTOMER_GRUA
                        }
                    });

                    organizationId = insertOrganization[0];
                }

                if (!organizationId) {
                    throw new Error(`Invalid ORGANIZATION_ID ${organizationId}`);
                }

                await queryInterface.sequelize.query("UPDATE css_tdc_data SET organization_id = :organizationId WHERE id = :recordId", {
                    raw: true,
                    transaction,
                    replacements: {
                        recordId: record.ID,
                        organizationId
                    }
                });
            }

            await queryInterface.removeColumn(
                "CSS_TDC_DATA",
                "CUSTOMER_GRUA",
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
                'CUSTOMER_GRUA',
                {
                    type: Sequelize.STRING(100),
                    allowNull: true,
                    transaction
                }, { transaction }
            )

            await queryInterface.sequelize.query("UPDATE css_tdc_data LEFT JOIN css_organization ON css_organization.ID = css_tdc_data.ORGANIZATION_ID SET css_tdc_data.CUSTOMER_GRUA = css_organization.GRUA  where css_tdc_data.id > 0", { transaction });

            await queryInterface.removeColumn(
                "CSS_TDC_DATA",
                "ORGANIZATION_ID",
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
