# isaac-xml-validator

This repo contains:

- A [collection of XSD files](https://github.com/wofsauge/isaac-xml-validator/tree/main/xsd) used to validate XML files for mods of the game _[The Binding of Isaac: Repentance](https://store.steampowered.com/app/1426300/The_Binding_of_Isaac_Repentance/)_.
- A [website](https://wofsauge.github.io/isaac-xml-validator/webtool) that allows end-users to copy paste arbitrary XML data to validate it.
- A [Python script](https://github.com/wofsauge/isaac-xml-validator/blob/main/isaac-xml-validator.py) which allows you to lint all the XML files in the repository for your mod.

## Using the Website

You can view the website [here](https://wofsauge.github.io/isaac-xml-validator/webtool).

## Using the Python Script

The tool is published to PyPI, so you can install it via:

```sh
pip install isaac-xml-validator
```

Then, you can run it via:

```sh
isaac-xml-validator
```

By default, it will recursively scan for all XML files in the current working directory.

## Usage in GitHub Actions

For most users, you will probably want to manually integrate the Python script into your existing lint routine. Alternatively, you can use [a GitHub action](https://github.com/wofsauge/Isaac-xmlvalidator-action) that automatically invokes the script.

## Usage in XML Files

You can import our common XML Schema like this:

```xml
<xs:schema attributeFormDefault="unqualified" elementFormDefault="qualified" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsisaac="https://wofsauge.github.io/isaac-xml-validator">
  <xs:import schemaLocation="https://wofsauge.github.io/isaac-xml-validator/isaacTypes.xsd" namespace="https://wofsauge.github.io/isaac-xml-validator" />
  <xs:element name="Test">
    <xs:complexType>
      <xs:attribute name="root" type="xsisaac:pngFile" />
    </xs:complexType>
  </xs:element>
</xs:schema>
```
