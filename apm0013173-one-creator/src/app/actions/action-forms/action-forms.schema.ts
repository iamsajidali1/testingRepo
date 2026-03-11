import {ActionService} from '../action.service';

/**
 * Message Schema
 */
export const MessageSchema = {
  $id: 'message.json',
  title: 'Form attributes for Message',
  type: 'object',
  properties: {
    key: {
      type: 'string',
      nullable: true
    },
    label: {
      type: 'string'
    },
    value: {
      type: 'string'
    },
    controlType: {
      type: 'string',
      enum: ['message']
    },
    required: {
      type: 'boolean'
    },
    hidden: {
      type: 'boolean'
    },
    order: {
      type: 'number'
    },
    placeholder: {
      type: 'string',
      nullable: true
    }
  },
  required: ['label', 'value', 'controlType', 'order'],
  additionalProperties: true
}

/**
 * TextBox Schema
 */
export const TextBoxSchema = {
  $id: 'textbox.json',
  title: 'Form attributes for TextBox',
  type: 'object',
  properties: {
    key: {
      type: 'string'
    },
    label: {
      type: 'string'
    },
    value: {
      type: 'string',
      nullable: true
    },
    controlType: {
      type: 'string',
      enum: ['textbox']
    },
    required: {
      type: 'boolean'
    },
    hidden: {
      type: 'boolean'
    },
    order: {
      type: 'number'
    },
    placeholder: {
      type: 'string',
      nullable: true
    },
    type: {
      type: 'string'
    },
    validator: {
      type: ['object', 'string'],
      nullable: true,
      enum: [
        'None',
        ...ActionService.prototype.availableValidators
      ]
    },
    validatorRegExp: {
      type: 'string'
    },
    validatorRegExpFlags: {
      type: 'string'
    }
  },
  required: ['key', 'label', 'controlType', 'required', 'order'],
  additionalProperties: true
}

/**
 * Dropdown Schema (Can be Same as Multiselect)
 */
export const DropdownSchema = {
  $id: 'dropdown.json',
  title: 'Form attributes for Dropdown',
  type: 'object',
  properties: {
    key: {
      type: 'string'
    },
    label: {
      type: 'string'
    },
    value: {
      type: 'string',
      nullable: true
    },
    controlType: {
      type: 'string',
      enum: ['dropdown', 'multiselect']
    },
    required: {
      type: 'boolean'
    },
    hidden: {
      type: 'boolean'
    },
    order: {
      type: 'number'
    },
    placeholder: {
      type: 'string',
      nullable: true
    },
    options: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          value: { type: 'string' },
          conditions: { type: 'object' }
        },
        additionalProperties: false,
        required: ['key', 'value']
      }
    }
  },
  required: ['key', 'label', 'controlType', 'required', 'order', 'options'],
  additionalProperties: true
}

/**
 * Default Schema
 */
export const DefaultSchema = {
  $id: 'default.json',
  title: 'Form attributes Default',
  type: 'object',
  properties: {
    key: {
      type: 'string'
    },
    label: {
      type: 'string'
    },
    value: {
      type: 'string',
      nullable: true
    },
    controlType: {
      type: 'string',
      enum: ['message', 'textbox', 'chips', 'dropdown', 'multiselect', 'list', 'file']
    },
    required: {
      type: 'boolean'
    },
    hidden: {
      type: 'boolean'
    },
    order: {
      type: 'number'
    },
    placeholder: {
      type: 'string',
      nullable: true
    }
  },
  required: ['key', 'label', 'controlType', 'required', 'order'],
  additionalProperties: true
}
