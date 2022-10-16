# Isaac-XML-Validator
A collection of XSD files used to validate XML files of the Game "The Binding of Isaac: Rebirth"

XSD file generator used: [https://www.liquid-technologies.com/online-xml-to-xsd-converter](https://www.liquid-technologies.com/online-xml-to-xsd-converter)


Live-XML Validator tool: [https://wofsauge.github.io/Isaac-XML-Validator/webtool](https://wofsauge.github.io/Isaac-XML-Validator/webtool)


## Isaac Datatype usage example:
You can import our common XML Schema like this:
```
<xs:schema attributeFormDefault="unqualified" elementFormDefault="qualified" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsisaac="https://wofsauge.github.io/Isaac-XML-Validator">
  <xs:import schemaLocation="https://wofsauge.github.io/Isaac-XML-Validator/isaacTypes.xsd" namespace="https://wofsauge.github.io/Isaac-XML-Validator" />
  <xs:element name="Test">
    <xs:complexType>
      <xs:attribute name="root" type="xsisaac:pngFile" />
    </xs:complexType>
  </xs:element>
</xs:schema>
```