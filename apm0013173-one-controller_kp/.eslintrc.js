module.exports = {
    "env": {
        "browser": false,
        "node": true,
        "mocha": false,
        "es2021": true
    },
    "extends": [
        "eslint:all"
    ],
    "parserOptions": {
        "ecmaFeatures": { "jsx": false },
        "ecmaVersion": 12,
        "sourceType": "module"
    },
    "plugins": [],
    "rules": {
        "sort-keys": "off",
        "dot-location": ["error", "property"],
        "semi": ["error", "always"],
        "quotes": ["error", "double"],
        "padded-blocks": ["error", "never"],
        "one-var": ["error", "never"],
        "array-bracket-newline": [
            "error", { "multiline": true, "minItems": 4 }
        ],
        "array-element-newline": ["error", "consistent"],
        "newline-per-chained-call": ["error", { "ignoreChainWithDepth": 4 }],
        "object-curly-spacing": ["error", "always"],
        "function-call-argument-newline": ["error", "consistent"],
        "function-paren-newline": ["error", "consistent"],
        "object-property-newline": [
            "error", { "allowAllPropertiesOnSameLine": true }
        ],
        "space-before-function-paren": ["error", {
            "anonymous": "never",
            "named": "never",
            "asyncArrow": "always"
        }],
        // The no-unsafe-finally is a standard behavior in almost every lang!
        "no-unsafe-finally": "off",
        "multiline-ternary": ["error", "always-multiline"],
        "no-ternary": "off",
        "no-return-await": "off",
        "max-params": ["error", 5],
        "max-statements": ["error", 30],
        "max-len": ["error", 100],
        "max-lines-per-function": ["error", 75]
    },
    "ignorePatterns": [
        "ecosystem.config.js",
        "api/seeders", "api/models", "api/migrations", "api/routes",
        "api/config",
        "api/helpers/loggerHelper*",
        "middleware",
        "api/controllers/actionDataController.js",
        "api/controllers/actionTableController.js",
        "api/controllers/actionTemplateController.js",
        "api/controllers/customerUserController.js",
        "api/controllers/formTemplateController.js",
        "api/controllers/mcapController.js",
        "api/controllers/mdsController.js",
        "api/controllers/roleToActionController.js",
        "api/controllers/rolesController.js",
        "api/controllers/schedulerController.js",
        "api/controllers/statusCheckController.js",
        "api/controllers/userRegistrationContoller.js",
        "api/controllers/userTemplateController.js"
    ]
};
