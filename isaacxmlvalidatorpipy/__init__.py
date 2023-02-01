# This script is the entry-point for the pypi commandline function

from isaac_xml_validator import *

def execute():
    read_github_env_vars()
    main()