import os
import argparse
import sys
import glob
import lxml
import lxml.etree
import importlib.metadata

__package__ = importlib.metadata.metadata("isaac-xml-validator").get("name")
__version__ = importlib.metadata.version("isaac-xml-validator")

parser = argparse.ArgumentParser()
parser.add_argument(
    "-v",
    "--version",
    action="version",
    version=str(__package__) + " " + str(__version__),
    help="Print version of package",
)
parser.add_argument("-p", "--path", help="Path to folder")
parser.add_argument(
    "-r", "--recursive", help="Search through folders recursively", type=bool
)
parser.add_argument("-e", "--errors", help="Expected number of errors", type=int)
parser.add_argument(
    "-i", "--ignore", help="files and folders to exclude. Seperated by comma ','"
)
parser.add_argument(
    "-s",
    "--silent",
    "-q",
    "--quiet",
    help="Hide all non error related log messages",
    action="store_true",
)
parser.add_argument(
    "-w",
    "--ignorewarnings",
    help="If set, warnings will not count towards the total number of errors.",
    action="store_true",
)
args = parser.parse_args()


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

# global variables
global error_count


file_ignore_list = [
    # Ignore node module and rooms xml folders
    "\\node_modules\\",
    "\\resources\\rooms\\",
    "\\content\\rooms\\",
    # Both of these files do not have a top-level tag, so they will always fail linting.
    # (The game's internal XML parser does not care about this.)
    "fxlayers.xml",
    "seedmenu.xml",
]

# Configuration values from the end-user and/or GitHub Actions
global root_folder
root_folder = "**"
if args.path is not None:
    root_folder = args.path

global recursive
recursive = True
if args.recursive is not None:
    recursive = args.recursive

global expected_error_count
expected_error_count = 0
if args.errors is not None:
    expected_error_count = args.errors

global ignore_files
ignore_files = []
if args.ignore is not None:
    file_ignore_list.extend(args.ignore.split(","))

silent_mode = False
if args.silent:
    silent_mode = True

global ignore_warnings
ignore_warnings = True
if args.ignorewarnings:
    ignore_warnings = False

# ~~~~~~~~~~~~ Special conditions ~~~~~~~~~~~~


def entity2_auto_increment_check(root, file_path):
    err_count = 0
    for child in list(root):
        if (
            child.tag == "entity"
            and child.get("id") is not None
            and child.get("variant") is None
        ):
            if child.get("id") == "5" or child.get("id") == "1000":
                print_err(
                    f"{file_path}:line {child.sourceline}: Element '{child.tag}': Variant attribute is missing. This is not allowed for IDs equal 5 or 1000!"
                )
                err_count += 1
    return err_count


special_conditions = {"entities2.xml": [entity2_auto_increment_check]}

# ~~~~~~~~~~~~ Code ~~~~~~~~~~~~


def clear_isaac_refs_recursive(node):
    for child in list(node):
        if child.get("type") is not None:
            child.set("type", child.get("type").replace("xsisaac:", ""))
        clear_isaac_refs_recursive(child)


def printf(*args):
    if not silent_mode:
        print(*args, flush=True)


def print_err(string):
    print(bcolors.FAIL + str(string) + bcolors.ENDC, flush=True)


def print_ok(string):
    printf(bcolors.OKGREEN + str(string) + bcolors.ENDC)


def print_warn(string):
    print(bcolors.WARNING + str(string) + bcolors.ENDC, flush=True)


def is_valid_xml(file_path):
    """Perform a normal XML validation without any specific schema. This checks for e.g. closing tags and so on."""
    try:
        lxml.etree.parse(file_path)
        return True
    except Exception as err:
        print_err(f'Failed to parse file "{file_path}": {err}')
        return False


def get_gitignore_files():
    gitignore_path = root_folder.replace("**", "") + ".gitignore"
    if not os.path.isfile(gitignore_path):
        return []

    ignoreLineStarts = ("\n", "#", "*")
    with open(gitignore_path, "r") as f:
        lines = f.readlines()
        lines = [line for line in lines if not line.startswith(ignoreLineStarts)]
        lines = [line.replace("\n", "") for line in lines]
        return lines


def main():
    printf("--- " + __package__ + " --- Version:", __version__)

    read_github_env_vars()

    global root_folder, expected_error_count, recursive, error_count, ignore_warnings
    total_error_count = 0

    files = glob.glob(root_folder + "/**.xml", recursive=recursive)

    # remove files and folders to ignore
    for ignoreFile in file_ignore_list:
        files = [f for f in files if ignoreFile not in f]

    # if exists, remove all folders and files mentioned in the .gitignore file
    gitignore_files = get_gitignore_files()
    if len(gitignore_files) > 0:
        printf(
            f"Found a .gitignore file. Using it to ignore additional {len(gitignore_files)} files and directories:"
        )
        printf(f"{gitignore_files}")
        for git_ignore_file in gitignore_files:
            files = [f for f in files if git_ignore_file not in f]

    printf(f"Found {len(files)} files in path: {root_folder}/**.xml")

    for file_path in files:
        error_count = 0
        file_name = os.path.basename(file_path)

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
        numErrors = len(xml_errors)
        if xml_errors is not None:
            for error in xml_errors:
                # treat non existant attributes as warning
                if "attribute" in error.message and "is not allowed" in error.message:
                    print_warn(
                        error.filename
                        + ":line "
                        + str(error.line)
                        + ":col "
                        + str(error.column)
                        + ": "
                        + error.message.replace("is not allowed", "was not recognized")
                        + " (spelling mistake?)"
                    )
                    if not ignore_warnings:
                        numErrors -= 1
                else:
                    print_err(
                        error.filename
                        + ":line "
                        + str(error.line)
                        + ":col "
                        + str(error.column)
                        + ": "
                        + error.message
                    )
        error_count += numErrors

        error_count += evaluate_special_conditions(file_path)

        if error_count > 0:
            printf(f"---- End errors for file: {file_path}")

        total_error_count += error_count

    printf(f"~~~~~ Finished analyzing {len(files)} files! ~~~~~")
    if total_error_count > 0:
        print_err(f"Found: {total_error_count} errors")
        if total_error_count != expected_error_count:
            if total_error_count > expected_error_count:
                print_err("Expected error count was exceeded!")
            else:
                print_err("Expected error count was not reached!")
            sys.exit(1)
    else:
        print_ok("No errors found.")


def evaluate_special_conditions(xml_file_path: str):
    """Checks file specific conditions that could not be evaluated with XSD schemas"""
    try:
        errorCount = 0
        xml_doc = lxml.etree.parse(xml_file_path)
        if os.path.basename(xml_file_path) in special_conditions:
            for func in special_conditions[os.path.basename(xml_file_path)]:
                errorCount += func(xml_doc.getroot(), xml_file_path)
        return errorCount
    except Exception as err:
        print_err(err)
        return 1


def parse_isaac_xml_file(xml_file_path: str, xsd_file_path: str):
    """Returns an array of errors or `None` if validation succeeded."""
    try:
        isaac_types_path = os.path.join(XSD_DIRECTORY, "isaacTypes.xsd")
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
    global root_folder, expected_error_count, recursive, ignore_warnings
    printf("Evaluate settings:")

    if "INPUT_ROOTFOLDER" in os.environ:
        root_folder = os.environ["INPUT_ROOTFOLDER"]
    if "GITHUB_WORKSPACE" in os.environ:
        root_folder = os.environ["GITHUB_WORKSPACE"] + "/" + root_folder
    printf("\tRoot folder: ", root_folder)

    if "INPUT_RECURSIVE" in os.environ:
        recursive = bool(os.environ["INPUT_RECURSIVE"])
    printf("\tRecursive: ", recursive)

    if "INPUT_EXPECTEDERRORCOUNT" in os.environ:
        expected_error_count = int(os.environ["INPUT_EXPECTEDERRORCOUNT"])
    printf("\tExpected Error Count: ", expected_error_count)

    if "INPUT_IGNORE" in os.environ:
        if not os.environ["INPUT_IGNORE"] == "":
            file_ignore_list.extend(os.environ["INPUT_IGNORE"].split(","))
    printf("\tIgnored files: ", file_ignore_list)

    if "INPUT_IGNOREWARNINGS" in os.environ:
        ignore_warnings = bool(os.environ["INPUT_IGNOREWARNINGS"])
    printf("\tTreat warning as error: ", ignore_warnings)


if __name__ == "__main__":
    main()
