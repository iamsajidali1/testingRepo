"""
Simple BPMN library parser to print topic, name and I/O params for each
External Task ("serviceTask" with "external").
"""

from xml.etree import ElementTree as ET

NS = "{http://camunda.org/schema/1.0/bpmn}"
TOPIC = f"{NS}topic"
TYPE = f"{NS}type"


def main():
    """Main function"""
    xml = ET.parse("library.bpmn").getroot()
    for child in xml:
        if child.tag[-7:] != "process":
            continue

        for node in child:
            if node.tag[-11:] != "serviceTask":
                continue

            if node.attrib[TYPE] != "external":
                continue

            attrs = node.attrib
            print(attrs[TOPIC].ljust(41), f"({attrs['name']})")

            for elem in node:
                if elem.tag[-17:] != "extensionElements":
                    continue

                for ioitem in elem:
                    print("Type".rjust(15), "Name".rjust(30), "Value")
                    for param in ioitem:
                        print(
                            param.tag.replace(NS, "").rjust(15),
                            param.attrib["name"].rjust(30),
                            param.text
                        )
            print("-" * 79)


if __name__ == "__main__":
    main()
