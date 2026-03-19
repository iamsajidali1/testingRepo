JSON Form Designer
==================

#. Overview

   As an expert user, you can also design a form model using JSON. This feature not only gives flexibility but also gives more powerful options over the traditional drag-drop method. Users, who are using this feature must be very careful while designing the JSON, it MUST follow the Model and Guidelines mentioned below to make it work.

#. Form Source Editor
   
   To edit/view the source JSON of a form, please goto ``Actions``, select your template and navigate to ``FROM`` tab and click on ``Form Configuration JSON`` button. You should then see a code editor as below,
   
   .. image:: _static/image_038.png

#. Form Model

   The form model is the core JSON that drives the Form. It is an ``Array`` of Form Elements. Please find the below example form includes a simple free-flow text input.

   .. image:: _static/image_039.png
   
   **A Sample Form JSON Looks like below,**

   .. code-block::

       [{
            "value": null,              // A default value to be set
            "key": "Loopback IP",       // A unique key given to identify the control
            "label": "Loopback IP",     // The Lebel of the control
            "required": "true",         // Should it be arequired field - Accepts boolean
            "order": 1,                 // Order of display among all the other controls
            "controlType": "textbox",   // This specifies, the type of form control
            "hidden": false,            // Controls visibility of the control - Accepts boolean
            "placeholder": "Loopback IP",   // Placeholder inside the control
            "section": "",
            "conditions": null,         // Conditions under which control should be rendered
            "validator": { "name": "IPv4", "value": "IPv4" }, // The special predefined validator for the input
            "validatorRegExp": ".*",    // The RegEx for Input Validation
            "validatorRegExpFlags": "",
            "blankValue": "",
            "type": ""
        }]

#. Form Control Attributes

   In this section, we will take a look at the most important form control attributes,
   
   *  **key** - Mandatory field, accepts ``String`` as input, and has to be **unique** among all the controls
   *  **required** - Mandatory field, accepts ``Boolean`` as input, indicates whether the form control should be a required field
   *  **controlType** - Mandatory field, accepts ``String`` but only ``textbox``, ``dropdown``, ``list``, ``message`` as input. It classifies the type of form control to render. Based on the selection the JSON form model should have supporting attributes, such as, if the value of the field is ``dropdown`` then, ``options`` field to be added to the JSON Model of the Form
   *  **conditions** - Optional, accepts a custom ``Conditions`` type, described in details below. It enables the conditional rendering of the form controls
   *  **validator** - Optional, accepts a custom type object include ``key`` and ``value``. Some standard validators as **key** are -  ``IPv4``, ``IPv6``, ``Email``, ``RegEXp``
   
   To find a complete example of all available form control attributes, and use-cases, please check ``Test_ARIF_for_Multilevel_Dropdown`` action in the development environment.

#. Conditional Rendering

   This is one of the most powerful features which lets you design complex and dependent forms.
   For instance, let's say, we need to design forms where some controls are dependent on others, i,e,

   * **Scenario 1** -  Conditional rendering of control based on the value selected in other control

    Let's say, we have a dropdown **IP Version**, which has two values - ``IPv4`` and ``IPv6``. Now, let's consider the situation where we need **IPv4 Address** if the users select ``IPv4`` as the **IP Version**, and **IPv6 Address** if the selection is ``IPv6``. The sample form control configuration will be as follows,
    
    .. code-block::

        {
            "value": null,
            "key": "IPv4 Address",
            "label": "IPv4 Address",
            
             ... other JSON attributes

            "conditions": {
                "type": {
                    "name": "Equal",
                    "value": "eq"
                },
                "attributes": [
                    {
                        "key": "IP version",
                        "value": "IPv4"
                    }
                ]
            }, 
            "placeholder": "IPv4 Address",
            "section": "",
            "validator": {
                "name": "IPv4",
                "value": "IPv4"
            },
            ... some other attributes
        }

    The aboove Input TextBox is going to render only when the control **IP version** has a ``value`` **Equal** to **IPv4**. Observe the **conditions** object.
 
    
   * **Scenario 2** -  Conditional rendering of dropdown options based on the value selected in other control

    Let's say, we have a dropdown **WAN Access Type**, which has two options - ``Ethernet`` and ``Wireless``. Now, let's consider the situation where we need the option **Wireless** if the parent control ``Resiliency type`` has a value that starts with ``No Resiliency`` or ``Dual CE``. The form control configuration will be as follows,
    
    .. code-block::

        {
            "key": "WAN Access Type",
            "label": "WAN Access Type",
            
            ... other JSON attributes

            "options": [
                {
                    "value": "Ethernet",
                    "key": "Ethernet"
                },
                {
                    "value": "Wireless",
                    "key": "Wireless",
                    "conditions": {
                        "type": {
                            "name": "Regex",
                            "value": "regex"
                        },
                        "attributes": [
                            {
                                "key": "Resiliency type",
                                "value": "^No Resiliency"
                            },
                            {
                                "key": "Resiliency type",
                                "value": "^Dual CE"
                            }
                        ]
                    }
                }
            ],
            "optionsSource": "Manual",
            "optionsSourceHeaders": {},
            "readonlyFields": 0
        }

    **Note: Both Scenarios (Scenario 1 and Scenario 2) can also be combined, if needed!**

#. The Conditions Model

   The ``conditions`` model is what powers the controls to render by checks. The sample ``conditions`` object is as follows,
   
   .. code-block::

       {
            "type": { "name": "Equal", "value": "eq" },     // The type of operations to be performed - Operator
            "attributes": [                                 // The subjects on which the operation to be performed - Operands
                { "key": "IP version", "value": "IPv4" }
            ]                                               
        }

   The model attributes and support options in detail,

   * **types** - The type of operations to be performed - Operator
   
    An object of ``name``, ``value`` pair, to describe what type of logical operation to perform. Also, support Regular Expressions.

    .. code-block::

        EQUAL Operation:      { "name": "Equal", "value": "eq" }
        NOT EQUAL Operation:  { "name": "Not Equal", "value": "neq" }
        OR Operation:         { "name": "OR", "value": "or" }
        AND Operation:        { "name": "AND", "value": "and" }

        Regular Expressions:  { "name": "RegEx", "value": "regex" }

   * **attributes** - The subjects on which the operation to be performed - Operands

    An array of objects, each represents ``key``, ``value`` pair, where ``key`` uniquely identifies another form control, and ``value`` is used as an operand to match based on the type of condition. In the case of regular expression the ``value`` contains the expression itself. For example,

    .. code-block::

       {
            "type": { "name": "RegEx", "value": "regex" }, 
            "attributes": [                   
                { "key": "Resiliency type", "value": "^No Resiliency" },
                { "key": "Resiliency type", "value": "^Dual CE" }
            ]                                               
        } 
    
    Note: If the regular expression has a ``\`` such as ``\s+`` or ``\w+``, it must be preceded with another ``\`` to escape the character. For Example, ``\\``, ``\\s+`` and ``\\w+``.