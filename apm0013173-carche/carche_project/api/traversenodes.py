"""This module was created for the checking specific nodes in
Jinja template AST. And return the variables in jinja template, based on
some conditions"""

from jinja2 import Environment, nodes
import netaddr

from .netaddrfunction import NetaddrFunctions


def find_node_recursively(ast, nodeitem):
    """
    Recursively iterate the AST and find specific node.
    Return the list of the specified node item.

    Parameters:
    ast (AST):  The AST object from parsed template.
    nodeitem    (jinja2 nodes): The specific nodes from jinja2

    Returns:
    child   (list): Return the list of specific node items.
    """
    for child in ast.iter_child_nodes():
        if isinstance(child, nodeitem):
            yield child
        else:
            for result in find_node_recursively(child, nodeitem):
                yield result


def iterate_tuple_with_node_names(argstuple, results):
    """
    Iterate the list of the node item and check if the type is Name.
    If the condition is match get the item name property.
    And append it to the existing list.

    Parameters:
    argstuple   (list):   List of node items
    results (list): Exiting list of the results

    Returns:
    results (list):    Return the changed list

    """
    for data in argstuple:
        if data and data[0] and isinstance(data[0], nodes.Name):
            results.append(data[0].name)

    return results


def node_name_variables(ast):
    """
    This function is find node items which type is Name.
    And check for the property name. Append it to the list,
    and return this list.

    Parameters:
    ast (AST):  The AST object from parsed template.

    Returns:
    results (list):    List of variables by name node
    """
    results = []
    for item in find_node_recursively(ast, nodes.Name):
        if isinstance(item, nodes.Name):
            results.append(item.name)

    return results


def node_getattr_variables(ast):
    """
    This function is find node items which type is Getattr.
    And check for the nested nodes variables. Append it to the list,
    and return this list.

    Parameters:
    ast (AST):  The AST object from parsed template.

    Returns:
    results (list):    List of variables by getattr node
    """
    results = []
    argstuple = []
    for item in find_node_recursively(ast, nodes.Getattr):
        if isinstance(item.node, nodes.Call):
            argstuple = call_node_helper(item, argstuple)

        if isinstance(item.node, nodes.Getitem):
            results = getattr_getitem_node_helper(item, results)

        if isinstance(item, nodes.Getattr):
            results = getattr_node_helper(item, results)

    results = iterate_tuple_with_node_names(argstuple, results)

    return results


def call_node_helper(item, argstuple):
    """
    Helper function returning the result of variables based on
    specific conditions for call node.

    Parameters:
    item (node item):  The item for the check based on defined condition
    argstuple (list):    The list which is already contains some variables

    Returns:
    argstuple (list):    List of variables changed based on conditions
    """
    for field in item.node.iter_fields():
        if field[0] == "args" and field[1]:
            if len(field[1]) == 1:
                argstuple.append(field[1])
                continue
            if len(field[1]) > 1:
                for data in field[1]:
                    argstuple.append(data)
                continue

    return argstuple


def getattr_getitem_node_helper(item, results):
    """
    Helper function returning the result of variables based on
    specific conditions for getitem node.

    Parameters:
    item (node item):  The item for the check based on defined condition
    results (list):    The list which is already contains some variables

    Returns:
    results (list):    List of variables changed based on conditions
    """
    for element in item.node.iter_fields():
        if element[0] == "node" and element[1]:
            if isinstance(element[1], nodes.Name):
                results.append(element[1].name)
        if element[0] == "arg" and element[1]:
            if isinstance(element[1], nodes.Name):
                results.append(element[1].name)
                continue
            if isinstance(element[1], nodes.Tuple):
                for data in element[1].items:
                    if isinstance(data, nodes.Name):
                        results.append(data.name)
                continue

    return results


def getattr_node_helper(item, results):
    """
    Helper function returning the result of variables based on
    specific conditions for getattr node.

    Parameters:
    item (node item):  The item for the check based on defined condition
    results (list):    The list which is already contains some variables

    Returns:
    results (list):    List of variables changed based on conditions
    """
    for element in item.iter_fields():
        if element[0] == "node" and element[1]:
            if isinstance(element[1], nodes.Name):
                results.append(element[1].name)
        if element[0] == "attr" and element[1]:
            results.append(element[1])

    return results


def node_getittem_variables(ast):
    """
    This function is find node items which type is Getitem.
    And check for the nested nodes variables. Append it to the list,
    and return this list.

    Parameters:
    ast (AST):  The AST object from parsed template.

    Returns:
    results (list):    List of variables by getitem node
    """
    results = []
    argstuple = []
    for item in find_node_recursively(ast, nodes.Getitem):
        if isinstance(item.node, nodes.Call):
            argstuple = call_node_helper(item, argstuple)

        if isinstance(item, nodes.Getitem):
            results = getitem_node_helper(item, results)

    results = iterate_tuple_with_node_names(argstuple, results)
    return results


def getitem_node_helper(item, results):
    """
    Helper function returning the result of variables based on
    specific conditions for getitem node.

    Parameters:
    item (node item):  The item for the check based on defined condition
    results (list):    The list which is already contains some variables

    Returns:
    results (list):    List of variables changed based on conditions
    """
    if isinstance(item.node, nodes.Name) and item.node.name:
        results.append(item.node.name)
    for data in item.iter_fields():
        if (data[0] == "arg" and isinstance(data[1], nodes.Const)
                and data[1].value):
            results.append(data[1].value)

    return results


def node_filters_variables(ast):
    """
    This function is find node items which type is Filter.
    And check for the variables. Append it to the list,
    and return this list.

    Parameters:
    ast (AST):  The AST object from parsed template.

    Returns:
    results (list):    List of variables by filter node
    """
    results = []
    argstuple = []
    for item in find_node_recursively(ast, nodes.Filter):
        for field in item.iter_fields():
            if field[0] == "args" and field[1]:
                argstuple.append(field[1])

    results = iterate_tuple_with_node_names(argstuple, results)
    return results


def for_iter_variables(ast):
    """
    This function is find node items which type is For.
    And check for the variables in iter section. Append it to the list,
    and return this list.

    Parameters:
    ast (AST):  The AST object from parsed template.

    Returns:
    results (list):    List of variables by filter node
    """
    results = []
    for item in find_node_recursively(ast, nodes.For):
        for data in item.iter_fields():
            if data[0] == "iter" and isinstance(data[1], nodes.Name):
                results.append(data[1].name)

    return results


def wrapper(func, *args):
    """
    Wrapper function, call the specific function with arguments.

    Parameters:
    func (function):  The references for the function which should be called.
    args (arguments):   The input parameters to the function which should be
                        called.

    Returns:
    function call (data):   Returning the data based on called function.

    """
    return func(*args)


def jinja_template_variables(template):
    """
    This function is using function, which will return the variables,
    based on different type of the node item for the parsed template.
    Also removing the functions from returned variables.

    Parameters:
    template (string):  Template string.

    Returns:
    finalvariables (list):  List of variables
    """
    env = Environment()
    netaddrfunctions = NetaddrFunctions.list()

    for netaddrf in netaddrfunctions:
        env.globals[netaddrf] = getattr(netaddr, netaddrf, None)

    parsedtemplate = env.parse(template, env)

    traversefunctions = [
        node_name_variables, node_getattr_variables,
        node_getittem_variables, node_filters_variables,
        for_iter_variables
    ]
    finalvars = []
    for traverfunction in traversefunctions:
        if wrapper(traverfunction, parsedtemplate):
            finalvars.append(wrapper(traverfunction, parsedtemplate))

    uniquelist = list(set(item1 for item2 in finalvars for item1 in item2))
    return [data for data in uniquelist if data not in netaddrfunctions]
