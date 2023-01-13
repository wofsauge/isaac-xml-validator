import os
import sys
import glob
import lxml
import lxml.etree


class bcolors:
    HEADER = "\033[95m"
    OKBLUE = "\033[94m"
    OKCYAN = "\033[96m"
    OKGREEN = "\033[92m"
    WARNING = "\033[93m"
    FAIL = "\033[91m"
    ENDC = "\033[0m"
    BOLD = "\033[1m"
    UNDERLINE = "\033[4m"


# Default values
global rootFolder, expectedErrorCount, recursive


fileAllowList = [
    "bossportraits.xml",
    "entities2.xml",
    "cutscenes.xml",
    "itempools.xml",
    "recipes.xml",
    "costumes2.xml",
    "bosspools.xml",
    "music.xml",
    "players.xml",
    "wisps.xml",
    "items_metadata.xml",
    "nightmares.xml",
    "locusts.xml",
    "babies.xml",
    "stages.xml",
    "pocketitems.xml",
    "challenges.xml",
    "items.xml",
    "bombcostumes.xml",
    "curses.xml",
    "sounds.xml",
    "achievements.xml",
    "backdrops.xml",
    "giantbook.xml",
    "bossoverlays.xml",
]


def clearIsaacRefsRecursive(node):
    for child in list(node):
        if child.get("type") is not None:
            child.set("type", child.get("type").replace("xsisaac:", ""))
        clearIsaacRefsRecursive(child)


def printf(*args):
    print(*args, flush=True)


def printErr(string):
    printf(bcolors.FAIL + str(string) + bcolors.ENDC)


def printOK(string):
    printf(bcolors.OKGREEN + str(string) + bcolors.ENDC)


def printWarn(string):
    printf(bcolors.WARNING + str(string) + bcolors.ENDC)


def main():
    global rootFolder, expectedErrorCount, recursive
    scriptPath = os.path.realpath(__file__).replace("isaac-xml-validator.py", "")

    totalErrorCount = 0
    files = glob.glob(rootFolder + "/**.xml", recursive=recursive)
    printf("Found " + str(len(files)) + " files in path: " + rootFolder + "/**.xml")
    for filename in files:
        filteredFilename = filename.split("\\")[len(filename.split("\\")) - 1]
        filteredFilename = filteredFilename.split("/")[
            len(filteredFilename.split("/")) - 1
        ]
        if filteredFilename not in fileAllowList:
            printWarn("Ignoring file: " + filename)
            continue

        printf("Now analyzing: " + filename)

        errCount = 0
        try:
            xmlschema_root_doc = lxml.etree.parse(scriptPath + "isaacTypes.xsd")
            xmlschema_doc = lxml.etree.parse(
                scriptPath + "xsd/" + filteredFilename.replace(".xml", ".xsd")
            )

            # Replace import node with content of the imported file, because lxml does not like https links.
            node = xmlschema_doc.getroot().find(
                "{http://www.w3.org/2001/XMLSchema}import"
            )
            if node is not None:
                for child in list(xmlschema_root_doc.getroot()):
                    xmlschema_doc.getroot().insert(0, child)
                xmlschema_doc.getroot().remove(node)
            clearIsaacRefsRecursive(xmlschema_doc.getroot())
            xmlschema = lxml.etree.XMLSchema(xmlschema_doc)

            xml_doc = lxml.etree.parse(filename)
            isValid = xmlschema.validate(xml_doc)
            if not isValid:
                for error in xmlschema.error_log:
                    printErr(
                        error.filename
                        + ":line "
                        + str(error.line)
                        + ":col "
                        + str(error.column)
                        + ": "
                        + error.message
                    )
                errCount += len(xmlschema.error_log)
            else:
                printOK("File is valid")
        except Exception as err:
            printErr(err)
            errCount += 1
            printErr("SYNTAX ERROR DETECTED!!")

        if errCount > 0:
            printf("---- End errors for file: " + filename)

        totalErrorCount += errCount

    printf("~~~~~ Finished analyzing " + str(len(files)) + " files! ~~~~~")
    if totalErrorCount > 0:
        printErr("Found: " + str(totalErrorCount) + " Errors")
        if int(totalErrorCount) != int(expectedErrorCount):
            printErr("Expected error count was not reached!")
            sys.exit(1)
    else:
        printOK("No errors found")


def readGithubEnvVars():
    global rootFolder, expectedErrorCount, recursive
    printf("Evaluate settings:")
    if "INPUT_ROOTFOLDER" in os.environ:
        rootFolder = os.environ["INPUT_ROOTFOLDER"]
    else:
        rootFolder = "**"
    printf("\tRoot folder: ", rootFolder)

    if "INPUT_RECURSIVE" in os.environ:
        recursive = os.environ["INPUT_RECURSIVE"]
    else:
        recursive = True
    printf("\tRecursive: ", recursive)

    if "INPUT_EXPECTEDERRORCOUNT" in os.environ:
        expectedErrorCount = os.environ["INPUT_EXPECTEDERRORCOUNT"]
    else:
        expectedErrorCount = 5
    printf("\tExpected Error Count: ", expectedErrorCount)


if __name__ == "__main__":
    readGithubEnvVars()
    main()
