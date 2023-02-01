# isaac-xml-validator

This repo contains:

- A [collection of XSD files](https://github.com/wofsauge/isaac-xml-validator/tree/main/xsd) used to validate XML files for mods of the game _[The Binding of Isaac: Repentance](https://store.steampowered.com/app/1426300/The_Binding_of_Isaac_Repentance/)_. (They were generated with the [`online-xml-to-xsd-converter`](https://www.liquid-technologies.com/online-xml-to-xsd-converter) tool.)
)
- A [website](https://wofsauge.github.io/isaac-xml-validator/webtool) that allows end-users to copy paste arbitrary XML data to validate it.
- A [Python script](https://github.com/wofsauge/isaac-xml-validator/blob/main/isaac-xml-validator.py) which allows you to lint all the XML files in the repository for your mod.

## Using the Website

You can view the website [here](https://wofsauge.github.io/isaac-xml-validator/webtool).

## Usage in VSCode and Other IDEs

Most people create Binding of Isaac mods (and other software) using [VSCode](https://code.visualstudio.com/), which is a very nice text editor / IDE.

If you make a typo (or some other error) in your XML file, you can get VSCode to automatically show you the error with a little red squiggly line, which is really helpful. This is accomplished by specifying a link to the corresponding schema at the top of the file.

First, make sure that you have the [XML extension by Red Hat](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-xml) installed. Next, add the following to the top of your XML file:

```xml
<?xml-model href="https://wofsauge.github.io/isaac-xml-validator/xsd/[NAME OF THE FILE].xsd" ?>
```

For example, this is how it would look for a "babies.xml" file:

```xml
<?xml-model href="https://wofsauge.github.io/isaac-xml-validator/xsd/babies.xsd" ?>
<babies root="gfx/Characters/Player2/">
  <baby id="0" name="Spider Baby" skin="000_Baby_Spider.png" />
  <baby id="1" name="Love Baby" skin="001_Baby_Love.pngz" /> <!-- shows an error, because the "skin" attribute doesn't contain a .png file, but a .pngz-->
  <baby id="2" name="Bloat Baby" skin="002_Baby_Bloat.png" />
</babies>
```

Note that by default, the XML extension caches the XSD files in the following location:

```text
C:\Users\%USERNAME%\.lemminx\cache\https\wofsauge.github.io\isaac-xml-validator
```

You can remove this directory if you want to purge the cache to download any potentially updated XSD files.

## Using the Python Script

The tool is published to PyPI, so you can install it via:

```sh
pip install isaac-xml-validator
```

By default, it will recursively scan for all XML files in the current working directory.

You will likely want to set up your repository so that the script runs in CI (e.g. GitHub Actions).

## Usage in GitHub Actions

For most users, you will probably want to manually integrate the Python script into your existing lint routine. Alternatively, you can use [a GitHub action](https://github.com/wofsauge/Isaac-xmlvalidator-action) that automatically invokes the script.

## Creating New XSD Files

If you need to create new XSD files, you can import our common XML schema like this:

```xml
<xs:schema attributeFormDefault="unqualified" elementFormDefault="qualified" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsisaac="https://wofsauge.github.io/isaac-xml-validator">
  <xs:import schemaLocation="https://wofsauge.github.io/isaac-xml-validator/xsd/isaacTypes.xsd" namespace="https://wofsauge.github.io/isaac-xml-validator" />
  <xs:element name="Test">
    <xs:complexType>
      <xs:attribute name="root" type="xsisaac:pngFile" />
    </xs:complexType>
  </xs:element>
</xs:schema>
```
