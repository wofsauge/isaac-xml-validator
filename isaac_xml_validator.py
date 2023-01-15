import os
import sys
import glob
import lxml
import lxml.etree
import importlib.metadata
__package__ = importlib.metadata.metadata("isaac-xml-validator").get("name")
__version__ = importlib.metadata.version("isaac-xml-validator")
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


SCRIPT_PATH = os.path.realpath(__file__)
SCRIPT_DIRECTORY = os.path.dirname(SCRIPT_PATH)
XSD_DIRECTORY = os.path.join(SCRIPT_DIRECTORY, "xsd")

# Configuration values from the end-user and/or GitHub Actions
global root_folder
root_folder = "**"
global recursive
recursive = True
global expected_error_count
expected_error_count = 0

# Other global variables
global error_count

# Both of these files do not have a top-level tag, so they will always fail linting.
# (The game's internal XML parser does not care about this.)
file_ignore_list = [
    "fxlayers.xml",
    "seedmenu.xml",
]


def clear_isaac_refs_recursive(node):
    for child in list(node):
        if child.get("type") is not None:
            child.set("type", child.get("type").replace("xsisaac:", ""))
        clear_isaac_refs_recursive(child)


def printf(*args):
    print(*args, flush=True)


def print_err(string):
    printf(bcolors.FAIL + str(string) + bcolors.ENDC)


def print_ok(string):
    printf(bcolors.OKGREEN + str(string) + bcolors.ENDC)


def print_warn(string):
    printf(bcolors.WARNING + str(string) + bcolors.ENDC)


def is_valid_xml(file_path):
    """Perform a normal XML validation without any specific schema. This checks for e.g. closing tags and so on."""
    try:
        lxml.etree.parse(file_path)
        return True
    except Exception as err:
        print_err(f'Failed to parse file "{file_path}": {err}')
        return False


def main():
    global root_folder, expected_error_count, recursive, error_count

    total_error_count = 0

    files = glob.glob(root_folder + "/**.xml", recursive=recursive)
    printf(f"Found {len(files)} files in path: {root_folder}/**.xml")

    for file_path in files:
        error_count = 0

        file_name = os.path.basename(file_path)
        if file_name in file_ignore_list:
            print_warn(f"Skipping ignored XML file: {file_path}")
            continue

        printf(f"Checking XML file: {file_path}")

        # First, do a basic XML validation without any specific schema.
        if not is_valid_xml(file_path):
            total_error_count += 1
            continue

        # Check to see if we have a matching XSD file for this XML file.
        xsd_file_name = file_name.replace(".xml", ".xsd")
        xsd_path = os.path.join(XSD_DIRECTORY, xsd_file_name)
        if not os.path.isfile(xsd_path):
            continue

        # Parse the XML file using our XSD file.
        xml_errors = parse_isaac_xml_file(file_path, xsd_path)
        if xml_errors is None:
            continue

        for error in xml_errors:
            print_err(
                error.filename
                + ":line "
                + str(error.line)
                + ":col "
                + str(error.column)
                + ": "
                + error.message
            )
        error_count += len(xml_errors)
        if error_count > 0:
            printf(f"---- End errors for file: {file_path}")

        total_error_count += error_count

    printf(f"~~~~~ Finished analyzing {len(files)} files! ~~~~~")
    if total_error_count > 0:
        print_err(f"Found: {total_error_count} errors")
        if total_error_count != expected_error_count:
            print_err("Expected error count was not reached!")
            sys.exit(1)
    else:
        print_ok("No errors found")


def parse_isaac_xml_file(xml_file_path: str, xsd_file_path: str):
    """Returns an array of errors or `None` if validation succeeded."""
    try:
        isaac_types_path = os.path.join(SCRIPT_DIRECTORY, "isaacTypes.xsd")
        xml_schema_root_doc = lxml.etree.parse(isaac_types_path)
        xml_schema_file_doc = lxml.etree.parse(xsd_file_path)

        # Replace import node with content of the imported file, because lxml does not like HTTPS links.
        node = xml_schema_file_doc.getroot().find(
            "{http://www.w3.org/2001/XMLSchema}import"
        )
        if node is not None:
            for child in list(xml_schema_root_doc.getroot()):
                xml_schema_file_doc.getroot().insert(0, child)
            xml_schema_file_doc.getroot().remove(node)

        clear_isaac_refs_recursive(xml_schema_file_doc.getroot())
        xml_schema = lxml.etree.XMLSchema(xml_schema_file_doc)
        xml_doc = lxml.etree.parse(xml_file_path)
        xml_schema.validate(xml_doc)
        return xml_schema.error_log

    except Exception as err:
        print_err(err)
        return xml_schema.error_log


def read_github_env_vars():
    global root_folder, expected_error_count, recursive
    printf("Evaluate settings:")

    if "INPUT_ROOTFOLDER" in os.environ:
        root_folder = os.environ["INPUT_ROOTFOLDER"]
    printf("\tRoot folder: ", root_folder)

    if "INPUT_RECURSIVE" in os.environ:
        recursive = os.environ["INPUT_RECURSIVE"]
    printf("\tRecursive: ", recursive)

    if "INPUT_EXPECTEDERRORCOUNT" in os.environ:
        expected_error_count = os.environ["INPUT_EXPECTEDERRORCOUNT"]
    printf("\tExpected Error Count: ", expected_error_count)


if __name__ == "__main__":
    printf("--- " + __package__ + " --- Version:", __version__)
    read_github_env_vars()
    main()
