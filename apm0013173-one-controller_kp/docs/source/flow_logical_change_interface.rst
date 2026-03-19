.. _flow-logical-change:

Logical Change – Change of Interface Description
================================================

#. Step

.. include:: common_select.rst

#. Step

   Choose interface and description.

   * interface: ``GigabitEthernet0/0.101``

   + push ``Next``

   .. image:: _static/image_002.png

#. Step

   No action is required for this step. The command is predefined
   in the template.

   + push ``Next``

   .. image:: _static/image_003.png

#. Step

   No action is required. The configuration is automatically generated
   according to the inputs from the ``Data Collection`` step.

   + push ``Configure Device``

   .. image:: _static/image_004.png

#. Step

   After you push ``Configure Device``, an information dialog will pop up,
   asking you one more time if you want to provide the change on the selected
   device.

   + please push ``Continue``.

   .. image:: _static/image_005.png

#. Step

   In the ``Show commands`` tab you can see the output of the validation
   commands before and after the change.

   .. image:: _static/image_006.png

#. Step

   In the ``Pre/Post change diff`` you can see specific differences between
   the validation outputs.

   If you press ``Accept`` button you will make the change permanent.
   If you press ``Rollback`` button, the device will get back to original state
   before the change.

   .. image:: _static/image_007.png

#. Step

   This view is displaying the summary of the whole change. You should get an
   email with same content as you will see.

   .. image:: _static/image_008.png
