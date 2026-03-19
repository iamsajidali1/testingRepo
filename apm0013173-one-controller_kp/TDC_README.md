# Technical Data Collection

Here is some description, Captain? :D


# Push TDC Data Collection Request Data to CSS

Description

## Endpoint Details

```
URI: https://selfservice.dev.att.com/api/oauth/tdc/tdc-data
Method: POST
Header: { Content-Type: "application/json" }
```
    

## Success Case

### Request Body:
```json
[
    {
        "device": "GBTTELROCRC0101UJZZ01",
        "address": {
            "address_line_1": "Eagle House Eagle Technology Park Eagle",
            "address_line_2": "line 2",
            "address_line_3": "line 3",
            "address_line_4": "",
            "address_line_5": "",
            "latitude": "latt",
            "longitude": "long",
            "city": "Rochdale",
            "county": "Orange county",
            "country": "United Kingdom",
            "state_province": "Free country",
            "zip": "OL11 1TQ",
            "outside_city_limits": "are monsters",
            "room": "dark",
            "floor": "roof",
            "building": "crooked"
        },
        "callback_url": "attbdasdev2/api/x_att12_tdc/att_meng_tdc_gateway/update_cdc?id=1cd9823c1b457198184d20a1604bcb78",
        "sr": "2222001",
        "templateId": 715,
        "grua": "MNST"
    }
]
```

### Response:
```json
{
    "status": "Success",
    "statusCode": 200,
    "message": "TDC data created successfully!"
}
```


## Failed Case


### Request Body:
```json
[{}]
```

### Response:
```json
{
    "status": "Failure",
    "statusCode": 400,
    "message": "There are some errors with the data, please refer errors!",
    "errors": [
        {
            "index": 0,
            "errors": [
                "Mandatory field 'device' is missing or has wrong value!",
                "Mandatory field 'callback_url' is missing or has wrong value!",
                "Mandatory field 'sr' is missing or has wrong value!",
                "Mandatory field 'templateId' is missing or has wrong value!",
                "Mandatory field 'grua' is missing or has wrong value!"
            ]
        }
    ]
}
```

