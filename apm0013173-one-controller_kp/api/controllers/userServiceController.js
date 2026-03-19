const { ServiceToCustomer } = require("../models/serviceToCustomerModel");
const { Users } = require("../models/usersModel");
const { Customers } = require("../models/customerOneModel");
const { check, validationResult, query, body } = require("express-validator");
const {
  UserToServiceToCustomer,
} = require("../models/userToServiceToCustomerModel");
const {
  TemplateToServiceToCustomer,
} = require("../models/templateToServiceToCustomerModel");
const { Templates } = require("../models/templatesDataModel");
const { UsersTemplate } = require("../models/usersTemplateModel");
const {
  RoleToServiceToCustomer,
} = require("../models/roleToServiceToCustomerModel");
const { RoleToService } = require("../models/roleToServiceModel");
const { TemplateToService } = require("../models/templateToServiceModel");
const { ServiceName } = require("../models/serviceNameModel");
const { UserToService } = require("../models/userToServiceModel");
const { Roles } = require("../models/rolesModel");
const { RoleTemplates } = require("../models/roleTemplates");
const loggerPino = require("../helpers/loggerHelper");

exports.getCustomersAccordingUser = [
  [query("attuid").trim(), check("attuid").isLength({ min: 1, max: 255 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).send({ message: errors });
    }
    const result = [];
    const upmLevels = req.upmLevels;
    // find all available customers for user based on attuid which have assigned actions(templates)
    try {
      const customerService = await Templates.findAll({
        include: [
          {
            model: TemplateToServiceToCustomer,
            required: true,
            include: [
              {
                model: ServiceToCustomer,
                required: true,
                include: [
                  {
                    model: UserToServiceToCustomer,
                    required: true,
                    include: [
                      {
                        model: Users,
                        required: true,
                        where: { ATTUID: req.query["attuid"] },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }).catch((error) => {
        loggerPino.error(error);
        throw new Error("Customers to service error!");
      });

    customersId = [];
    for(const result of customerService){
      for(const templateToServiceToCustomers of result["dataValues"]["TemplateToServiceToCustomers"] ){
            customerId =
              templateToServiceToCustomers["dataValues"]["ServiceToCustomer"][
                "dataValues"
              ]["CUSTOMER_ID"];
              customersId.push(customerId);
          }
      }

      const individualAccess = await Templates.findAll({
        include: [
          {
            model: UsersTemplate,
            required: true,
            include: [
              {
                model: Users,
                required: true,
                where: { ATTUID: req.query["attuid"] },
              },
            ],
          },
          {
            model: TemplateToServiceToCustomer,
            required: true,
            include: [
              {
                model: ServiceToCustomer,
                required: true,
              },
            ],
          },
        ],
      }).catch((error) => {
        loggerPino.error(error);
        throw new Error("Users template error!");
      });

        for(const result of individualAccess){
          for(const templateToServiceToCustomer of result["dataValues"]["TemplateToServiceToCustomers"] ){
              customerId = templateToServiceToCustomer["dataValues"]["ServiceToCustomer"][
                "dataValues"
              ]["CUSTOMER_ID"];
              customersId.push(customerId);
          }
      }

    if(upmLevels && upmLevels.length > 0){
      for (const level of upmLevels) {
        const roleCustomerServices = await Templates.findAll({
          include: [
            {
              model: TemplateToServiceToCustomer,
              required: true,
              include: [
                {
                  model: ServiceToCustomer,
                  required: true,
                  include: [
                    {
                      model: RoleToServiceToCustomer,
                      required: true,
                      include: [
                        {
                          model: Roles,
                          required: true,
                          where: { IDENTIFICATOR: level["levelName"] },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        }).catch((error) => {
          loggerPino.error(error);
          throw new Error("Role to service error!");
        });

        for(const customer of roleCustomerServices){
          for(const templateToServiceToCustomer of customer["TemplateToServiceToCustomers"] ){
              customerId =
                templateToServiceToCustomer["ServiceToCustomer"]["dataValues"][
                  "CUSTOMER_ID"
                ];
                customersId.push(customerId);
            }
          }
      }
    }

      const serviceIds = [];
      const serviceUser = await Templates.findAll({
        include: [
          {
            model: TemplateToService,
            required: true,
            include: [
              {
                model: ServiceName,
                required: true,
                include: [
                  {
                    model: UserToService,
                    required: true,
                    include: [
                      {
                        model: Users,
                        required: true,
                        where: { ATTUID: req.query["attuid"] },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }).catch((error) => {
        loggerPino.error(error);
        throw new Error("User to service error!");
      });
        for(const templateToServices of serviceUser ){
          for(const service of templateToServices["TemplateToServices"]){
          serviceId = service["dataValues"]["SERVICE_ID"];
            serviceIds.push(serviceId);
        }
      }

      const serviceIndividualUser = await Templates.findAll({
        include: [
          {
            model: TemplateToService,
            required: true,
            include: [
              {
                model: ServiceName,
                required: true,
              },
            ],
          },
          {
            model: UsersTemplate,
            required: true,
            include: [
              {
                model: Users,
                required: true,
                where: { ATTUID: req.query["attuid"] },
              },
            ],
          },
        ],
      }).catch((error) => {
        loggerPino.error(error);
        throw new Error("User to service to template error!");
      });

        for(const templateToServices of serviceIndividualUser){
          for(const service of templateToServices["TemplateToServices"]){
          serviceId = service["dataValues"]["SERVICE_ID"];
            serviceIds.push(serviceId);
        }
      }
      if(upmLevels && upmLevels.length > 0){
      for (const level of upmLevels) {
        const roleServices = await Templates.findAll({
          include: [
            {
              model: TemplateToService,
              required: true,
              include: [
                {
                  model: ServiceName,
                  required: true,
                  include: [
                    {
                      model: RoleToService,
                      required: true,
                      include: [
                        {
                          model: Roles,
                          required: true,
                          where: { IDENTIFICATOR: level["levelName"] },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        }).catch((error) => {
          loggerPino.error(error);
          throw new Error("Role to service to template error!");
        });

          for(const service of roleServices){
            for(const templateToService of service["TemplateToServices"]){
            serviceId = templateToService["dataValues"]["SERVICE_ID"];
              serviceIds.push(serviceId);
          }
        }

        const roleIndividualServices = await Templates.findAll({
          include: [
            {
              model: TemplateToService,
              required: true,
              include: [
                {
                  model: ServiceName,
                  required: true,
                  include: [],
                },
              ],
            },
            {
              model: RoleTemplates,
              required: true,
              include: [
                {
                  model: Roles,
                  required: true,
                  where: { IDENTIFICATOR: level["levelName"] },
                },
              ],
            },
          ],
        }).catch((error) => {
          loggerPino.error(error);
          throw new Error("Role to service to individual template error!");
        });

          for(const service of roleIndividualServices){
            for(const templateToService of service["TemplateToServices"]){
            serviceId = templateToService["dataValues"]["SERVICE_ID"];
              serviceIds.push(serviceId);
          }
        }

        const roleServicesToCustomer = await Templates.findAll({
          include: [
            {
              model: TemplateToServiceToCustomer,
              required: true,
              include: [
                {
                  model: ServiceToCustomer,
                  required: true,
                  include: [
                    {
                      model: ServiceName,
                      required: true,
                    },
                    {
                      model: RoleToServiceToCustomer,
                      required: true,
                      include: [
                        {
                          model: Roles,
                          required: true,
                          where: { IDENTIFICATOR: level["levelName"] },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        }).catch((error) => {
          loggerPino.error(error);
          throw new Error("Role to service to customer error!");
        });

          for(const service of roleServicesToCustomer){
            for(const templateToServiceToCustomer of service["TemplateToServiceToCustomers"]){
              serviceId =
                templateToServiceToCustomer["dataValues"]["ServiceToCustomer"][
                  "SERVICE_ID"
                ];
                serviceIds.push(serviceId);
            }
        }
      }
    }
      const serviceIdsUnique = serviceIds.filter((item,index) =>serviceIds.indexOf(item) === index);
      const serviceCustomer = await Templates.findAll({
        include: [
          {
            model: TemplateToServiceToCustomer,
            required: true,
            include: [
              {
                model: ServiceToCustomer,
                required: true,
                where: { SERVICE_ID: serviceIdsUnique },
              },
            ],
          },
        ],
      }).catch((error) => {
        loggerPino.error(error);
        throw new Error("Template to service to customer error!");
      });

      const generalCustomerIds = await exports.getCustomersIdsForGeneralServices(req);
      customersId.push(...generalCustomerIds);

      for (const customerService of serviceCustomer) {
        for (const customers of customerService["TemplateToServiceToCustomers"]) {
          customerId = customers["ServiceToCustomer"]["CUSTOMER_ID"];
          customersId.push(customerId);
        }
      }

      const customersIdsUnique = customersId.filter((item,index) =>customersId.indexOf(item) === index);
      const customers = await Customers.findAll({
        where: { ID: customersIdsUnique }, order: [['NAME', 'ASC']]
      }).catch((error) => {
        loggerPino.error(error);
        throw new Error("Customers error!");
      });

        for(const customer of customers){
        result.push({
          CUSTOMER_ID: customer["dataValues"]["ID"],
          NAME: customer["dataValues"]["NAME"],
        });
      }

      return res.status(200).send({ result: result, message: "Successful!" });
    } catch (error) {
      return res.status(404).send({ message: error.message });
    }
  },
];

exports.getCustomersIdsForGeneralServices = async (req) => {
  const customersIds = [];
  const upmLevels = req.upmLevels;
  const generalServices = await Templates.findAll({
    include: [
      {
        model: TemplateToService,
        required: true,
        include: [{
          model: ServiceName,
          required: true,
          include: [
            {
              model: ServiceToCustomer,
              required: true,
              include: [
                {
                  model: UserToServiceToCustomer,
                  required: true,
                  include: [{
                    required: true,
                    model: Users,
                    where: { ATTUID: req.query["attuid"] },
                  }]
                }
              ]
            },
            {
              model: UserToService,
              include: [{
                model: Users,
                required: true,
                where: { ATTUID: req.query["attuid"] },
              }]
            },
          ],
        }]
      },
    ],
  }).catch((error) => {
    loggerPino.error(error);
    throw new Error("Template to service to customer error!");
  });
  for (const customerService of generalServices) {
    for (const service of customerService["TemplateToServices"]) {
      for (const serviceCustomer of service["ServiceName"]["ServiceToCustomers"]) {
        customerId = serviceCustomer["dataValues"]["CUSTOMER_ID"];
        customersIds.push(customerId);
      }
    }
  }

  if (upmLevels && upmLevels.length > 0) {
    for (const level of upmLevels) {
      const roleGeneralServices = await Templates.findAll({
        include: [
          {
            model: TemplateToService,
            required: true,
            include: [{
              model: ServiceName,
              required: true,
              include: [
                {
                  model: ServiceToCustomer,
                  required: true,
                  include: [
                    {
                      model: RoleToServiceToCustomer,
                      required: true,
                      include: [{
                        required: true,
                        model: Roles,
                        where: { IDENTIFICATOR: level["levelName"] },
                      }]
                    }
                  ]
                },
                {
                  model: RoleToService,
                  include: [{
                    model: Roles,
                    required: true,
                    where: { IDENTIFICATOR: level["levelName"] }
                  }]
                },
              ],
            }]
          },
        ],
      }).catch((error) => {
        loggerPino.error(error);
        throw new Error("Role to service error!");
      });

      for (const customerService of roleGeneralServices) {
        for (const service of customerService["TemplateToServices"]) {
          for (const serviceCustomer of service["ServiceName"]["ServiceToCustomers"]) {
            customerId = serviceCustomer["dataValues"]["CUSTOMER_ID"];
            customersIds.push(customerId);
          }
        }
      }
    }
  }
  return customersIds;
}

