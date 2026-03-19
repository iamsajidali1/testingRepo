# ORM

All APIs are based on lowercase of model names. Present methods are:

* GET
* POST
* PUT
* PATCH
* DELETE

In this shape:

    GET /api/<model>/
    returns all items

    GET /api/<model>/<id>
    returns a single item

    POST /api/<model>/
    creates a single item

    PUT/PATCH /api/<model>/<id>
    modifies a single item

    DELETE /api/<model>/<id>
    deletes a single item

List of all apis can be obtained from the error log (for now):

    GET /api

## Example of filtering

* multiple ``Foreign Keys``
* ``LIMIT``
* ``ORDER BY ... DESC``

### Call

    GET /api/workflowtoworkflowattributes/
        ?workflow_attribute__name=Hostname
        &status=hide
        &limit=3
        &ordering=-id
