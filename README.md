# Isaac-XML-Validator
A collection of XSD files used to validate XML files of the Game "The Binding of Isaac: Rebirth"

XSD file generator used: https://www.liquid-technologies.com/online-xml-to-xsd-converter


## Isaac Datatype usage example:
You can import our common XML Schema like this:
```
<xs:schema attributeFormDefault="unqualified" elementFormDefault="qualified" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsisaac="https://wofsauge.github.io/Isaac-XML-Validator">
  <xs:import schemaLocation="../datatypes.xsd" namespace="https://wofsauge.github.io/Isaac-XML-Validator" />
  <xs:element name="Test">
    <xs:complexType>
      <xs:attribute name="root" type="xsisaac:pngfile" />
    </xs:complexType>
  </xs:element>
</xs:schema>
```