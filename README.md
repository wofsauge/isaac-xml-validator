# isaac-xml-validator

This repo contains:

- A [collection of XSD files](https://github.com/wofsauge/isaac-xml-validator/tree/main/xsd) used to validate XML files for mods of the game _[The Binding of Isaac: Repentance](https://store.steampowered.com/app/1426300/The_Binding_of_Isaac_Repentance/)_. (They were generated with the [`online-xml-to-xsd-converter`](https://www.liquid-technologies.com/online-xml-to-xsd-converter) tool.)
)
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

## Add XSD as a validation Header

If you want to use the XSD files for external validation tools, for example as a live evaluation in VS Code with the ["XML" extension by Red Hat](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-xml), you can add the following line of code at the top of your .xml file:

```xml
<?xml-model href="https://wofsauge.github.io/isaac-xml-validator/xsd/[NAME OF THE FILE].xsd" ?>
```
**Example for the "babies.xml" file:**

```xml
<?xml-model href="https://wofsauge.github.io/isaac-xml-validator/xsd/babies.xsd" ?>
<babies root="gfx/Characters/Player2/">
	<baby id="0" name="Spider Baby" skin="000_Baby_Spider.png" />
	<baby id="1" name="Love Baby" skin="001_Baby_Love.pngz" />	<!-- evaluates as an error, because the "skin" attribute doesn't contain a .png file, but a .pngz-->
	<baby id="2" name="Bloat Baby" skin="002_Baby_Bloat.png" />
</babies>
```


## Creating New XSD Files

If you need to create new XSD files, you can import our common XML schema like this:

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
