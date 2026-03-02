import re, regex

# Define patterns for different types of if statements
if_match_pattern = r".*\{<(.*)>\}.*?\{(.*?)\}$"  # Pattern for if statement with condition and value
if_pattern = r"(\{<(.*)>\}*|\{if\}|\{elseif\})"  # Pattern for if statement without condition

if_only_pattern = r"\{<(.*)>\}"  # Pattern for if statement with only condition
if_only_replace = r"{% if \1 %}"  # Replacement for if statement with only condition

if_int_pattern = r'\{<([^>]+)>\}\{<([^>]+)>\}'
if_int_pattern_replace = r"{% if \1 == \2 | int %}"

if_else_pattern = r"(\{if\}|\{elseif\})" # if/elif condition match

if_di_pattern = r'\{\<([^>]+)\>\}([<>]=?)\{\<([^>]+)\>\}|\{\<([^>]+)\>\}([<>]=?)(\d+)'
if_di_pattern_replace = r"{% if \1 | int \2 \3 | int %}"
if_operator_pattern = r"\{<(.*)>\}([@\<\>#\\])\{(.*?)\}"  # Pattern for if statement with operator
if_op_digit_replace = r"{% if \g<1> | int \g<2> \g<3> %}"  # Replacement for if statement with operator and digit value
for_if_op_digit_replace = r"{% if \g<1> | int \g<2> \g<3> %}"
if_operator_replace = r"{% if \g<1> \g<2> '\g<3>' %}"  # Replacement for if statement with operator and string value
for_if_operator_replace = r"{% if \g<1> \g<2> '\g<3>' %}"
if_op_pattern = r"\{<([^>]+)>\}([<>]=)\{<([^>]+)>\}"
if_op_replace = r"{% if \1 | int \2 \3 | int %}"
for_if_op_replace = r"{% if \1 | int \2 \3 | int %}"

if_single_el_digit_pattern = r"\{<(.*)>\}\{([0-9][^}]*)\}$"  # Pattern for if statement with single element and digit value
if_single_element_pattern = r"\{<(.*)>\}\{([^}]*)\}$"  # Pattern for if statement with single element and string value
if_single_element_replace = r"{% if \1 == '\2' %}"  # Replacement for if statement with single element and string value
if_single_el_digit_replace = r"{% if \1 == \2 %}"  # Replacement for if statement with single element and digit value
for_if_single_el_digit_replace = r"{% if \1 == \2 %}"
if_var_pattern = r'(\s*)?\{<(.*)>\}\{<(.*)>\}'

elif_single_element_pattern = r"\{elseif\}\{<(.*)>\}\{([^}]*)\}$"  # Pattern for if statement with single element and string value
elif_single_element_replace = r"{% elif \1 == '\2' %}"  # Replacement for if statement with single element and string value

elif_multiple_elements_pattern = r"\{elseif\}\{<(.*)>\}(\{.*\})(\{.*\})"

if_multiple_elements_pattern = r"\{<(.*)>\}(\{.*\})(\{.*\})"  # Pattern for if statement with multiple elements
if_list_pattern = r'{<([^<>]+)>}([^<>]+)'  # Pattern for extracting condition and value from if statement with multiple elements

for_if_rep = r"{% if x['\1'] == '\2' %}"  # Replacement for if statement inside foreach loop

# Define pattern and replacement for case operation
case_op_pattern = r"\s*?\{Case\}([@\<\>]?)\{(.*)\}"  # Pattern for case operation
case_op_rep = r"{% if \g<1> \g<2> '\g<3>' %}"  # Replacement for case operation

case_pattern = r'\{(case|Case)\}((?:\{(.*?)\})+)'  # Pattern for case statement
endcase_pattern = r'\{endcase\}'

# Define pattern and replacement for include operation
include_pattern = r"(\s*)>>(.*)"  # Pattern for include operation
include_rep = r"\1{% include '\2' %}"  # Replacement for include operation

# Define pattern and replacement for select operation
select_pattern = r"\{(S|s|Select|select)\}\{<(.*)>\}"  # Pattern for select operation
select_rep = r"{% if \1 %}"  # Replacement for select operation
select_arg_list = []  # List to store select arguments

# Define pattern and replacement for foreach operation
for_pattern = r"\{foreach\}\{(.*?)\}\{(.*?)\}"  # Pattern for foreach operation
for_rep = r"{% for FOR_ARG in \2 %}"  # Replacement for foreach operation

ForNext_pattern = r"\{ForNext\}\{(bib_port)\}\{(\d)+\}\{(\d\d)+\}\{(\d)+\}"
ForNext_replace = r"{% for \1 in range(\2, \3 + 1, \4) %}"

# Define the pattern to match the For-In construct
for_in_pattern = r"\{For\}\{(\w+)\}\{in\}\{([^\}]+)\}"

# Define the replacement pattern for Jinja
for_in_replace = r"{% for \1 in '\2'.split('|') %}"

# Define pattern and replacement for set operation
ns_set = r"\{(SET|set|Set)\} ?\{(.*?)\} ?\{(.*?)\}"  # Pattern for namespace set operation
set_pattern = r"\{(SET|set|Set|GSet|Gset)\} ?\{(.*?)\} ?\{(.*?)\}"  # Pattern for set operation
set_rep = r"{% set \2 = '\3' %}"  # Replacement for set operation
set_var_pattern = r'(\s*)?\{(SET|set|Set)\}\{(.*)\}\{<(.*)>\}'  # Pattern for set operation with variable

# Define pattern for variable
var_pattern = r".*<.*>.*"  # Pattern for variable

# Define pattern for comment
comment_pattern = r"^##(.*)"  # Pattern for comment

# Define pattern for while
while_pattern = r"\{While\}\{<(.*)>\}<\{<(.*)>\}"

func_pattern = r".*?\[-?\d+(:)?(-?\d+)?\].*?"
func_pattern_match = r".*?\[.*\].*?"

empty_line_pattern = r'^\s*$'

# Initialize configuration list

case_flag = 0
select_flag = 1

def translator(file):
    config = ['{% set ns = namespace() %}']
    ns_var_list = []
    fornext = []
    def evaluate_pattern(line, arg=None):
        global case_flag
        global select_flag

        if type(line) == list:
            for single_line in line:
                evaluate_pattern(single_line, arg)

        else:
            if line == "dial-peer voice [+ <dp_array> 10 <loop_counter>] voip":
                return output("dial-peer voice {{ dp_array | int + 10 | int + ns.loop_counter }} voip")
            line = modify_variable(line)
            leading_spaces = line.split('{')[0]
            stripped_line = line.strip()

            if re.match(ns_set, stripped_line) and 'ns.' not in stripped_line:
                match = re.match(ns_set, stripped_line)
                set_var = convert_space_to_underscore(match.group(2))
                ns_var_list.append(set_var)
                line = line.replace(set_var, 'ns.' + set_var)

            def process_line(line, ns_var_list, fornext, prefix):
                for i in range(len(line)):
                    parts = line.split('<')
                    for i in range(1, len(parts)):
                        if '>' in parts[i]:
                            value, rest = parts[i].split('>', 1)
                            if prefix == 'ns.':
                                if value in ns_var_list and value not in fornext:
                                    parts[i] = f"ns.{value}>{rest}"
                            else:
                                if value not in ns_var_list and value not in fornext and value[3:] not in ns_var_list:
                                    parts[i] = f"FOR_ARG.{value}>{rest}"
                                elif value in ns_var_list:
                                    parts[i] = f"ns.{value}>{rest}"
                return '<'.join(parts)

            if arg is None:
                line = process_line(line, ns_var_list, fornext, 'ns.')
            else:
                line = process_line(line, ns_var_list, fornext, 'FOR_ARG.')
            if "{[+ 1 <tel_counter>]}>{<tel_counter2>}" in line:
                output("{{1 + tel_counter}}>{{ tel_counter2 }}")

            elif 'ipv6:\<' in line:
                if '<' in line:
                    line = line.replace('\\<', '[{{ ').replace('>\\', ' }}]')
                    output(line)
                else:
                    output(line)

            elif stripped_line in [']', '}', '},']:
                output(line)

            elif "[]" in line:
                output(line)

            elif '["' in line:
                if '<' in line:
                    line = line.replace('<', '{{ ').replace('>', ' }}')
                    output(line)
                else:
                    output(line)

            elif "{B2B IPV6P}{[CONCAT [V6HEX [V6IPSN <B2B_IPv6_Range>" in line:
                output(leading_spaces + '''{% set ipv6_segments = IPv6Network(B2B_IPv6_Range, strict=False).exploded.split(":") %}''' + leading_spaces + '''{% set B2B_IPV6P = ipv6_segments[0] ~ ':' ~ ipv6_segments[1] ~ ':' ~ ipv6_segments[2] ~ ':' ~ ipv6_segments[3] ~ ':' ~ ipv6_segments[4] ~ ':' ~ ipv6_segments[5] ~ ':' ~ ipv6_segments[6] ~ ':' ~ B2B_IPV6P %}''')

            elif "{B2B IPV6B}{[CONCAT [V6HEX [V6IPSN <B2B_IPv6_Range>" in line:
                output(leading_spaces + '''{% set B2B_IPV6B = ipv6_segments[0] ~ ':' ~ ipv6_segments[1] ~ ':' ~ ipv6_segments[2] ~ ':' ~ ipv6_segments[3] ~ ':' ~ ipv6_segments[4] ~ ':' ~ ipv6_segments[5] ~ ':' ~ ipv6_segments[6] ~ ':' ~ B2B_IPV6B %}''')

            elif "{Set}{B2B IPV6P}{[CONCAT" in line:
                output(leading_spaces + '''{% set ipv6_segments = IPv6Network(B2B_IPV6_SUBNET_COUNTED, strict=False).exploded.split(":") %}''' + leading_spaces + '''{% set B2B_IPV6P = ipv6_segments[0] ~ ':' ~ ipv6_segments[1] ~ ':' ~ ipv6_segments[2] ~ ':' ~ ipv6_segments[3] ~ ':' ~ ipv6_segments[4] ~ ':' ~ ipv6_segments[5] ~ ':' ~ ipv6_segments[6] ~ ':' ~ B2B_IPV6P %}''')

            elif "{Set}{B2B IPV6B}{[CONCAT" in line:
                output(leading_spaces + '''{% set B2B_IPV6B = ipv6_segments[0] ~ ':' ~ ipv6_segments[1] ~ ':' ~ ipv6_segments[2] ~ ':' ~ ipv6_segments[3] ~ ':' ~ ipv6_segments[4] ~ ':' ~ ipv6_segments[5] ~ ':' ~ ipv6_segments[6] ~ ':' ~ B2B_IPV6B %}''')

            elif "V6HEX [V6IPSN" in line:
                output(leading_spaces + '''{% set B2B_IPV6 = IPv6Network(B2B_IPv6_Range ~ '/126', strict=False).network_address.exploded.split(':')[7] %}''')

            elif "V6HEX <B2B_IPV6_SUBNET_COUNTED" in line:
                output(leading_spaces + '''{% set B2B_IPV6 = IPv6Network(B2B_IPV6_SUBNET_COUNTED, strict=False).exploded.split('/')[0].split(":")[7] %}''')

            elif re.match(comment_pattern, stripped_line):
                modified_comment = re.sub(comment_pattern, r"{# \1 #}", line)
                output(modified_comment)

            elif re.match(include_pattern, stripped_line):
                new_include = translate_include(line)
                output(new_include)

            elif line.startswith('{Set}{ns.<'):
                output("{% set card_type = FOR_ARG.card_type | int - 10 | int %}")

            elif re.match(for_in_pattern, stripped_line):
                match = re.match(for_in_pattern, stripped_line)
                if match.group(2) == '<port_string>':
                    new_for_in = " {% for port_str_array in ns.port_string.split('|') %}"
                elif match.group(2) == '<int_1>|<int_2>':
                    new_for_in = "{% for int_val in (int_1 + '|' + int_2).split('|') %}"
                else:
                    new_for_in = re.sub(for_in_pattern, for_in_replace, line)
                    fornext.append(match.group(1))
                output(new_for_in)

            elif re.match(while_pattern, stripped_line):
                match = re.match(while_pattern, stripped_line)
                new_while = "{% for " + match.group(1) + " in range(" + match.group(2) + ") %}\n{% if "+ match.group(1) + " < " + match.group(2) + " %}"
                output(new_while)

            elif '[' in stripped_line and ']' in stripped_line and not re.match(func_pattern, stripped_line):
                new_func_line = replace_bracket_contents(line, my_replacement_func)

                if new_func_line == '{}{TRUE}':
                    pass
                else:
                    evaluate_pattern(new_func_line)

            elif re.match(set_pattern, stripped_line):
                new_var = update_set(line, arg)
                check_escaped_char(new_var)

            elif re.match(for_pattern, stripped_line):
                new_for = translate_foreach(line)
                output(new_for)

            elif re.match(ForNext_pattern, stripped_line):
                new_fornext = re.sub(ForNext_pattern, ForNext_replace, line)
                match = re.match(ForNext_pattern, stripped_line)
                fornext.append(match.group(1))
                output(new_fornext)

            elif re.match(if_int_pattern, stripped_line):
                new_int_if = re.sub(if_int_pattern, if_int_pattern_replace, line)
                output(new_int_if)

            elif re.match(if_di_pattern, stripped_line):
                new_for_if = re.sub(if_di_pattern, if_di_pattern_replace, line)
                output(new_for_if)

            elif re.match(if_match_pattern, stripped_line) and arg != None:
                new_for_if = translate_for_if(line, arg)
                output(new_for_if)

            elif re.match(if_pattern, stripped_line):
                if_match = re.match(if_pattern, stripped_line)
                check_space = if_match.group(1)
                check_space = if_ns_check(check_space[2:-2])
                space_removed = convert_space_to_underscore(check_space)
                stripped_line = stripped_line.replace(check_space, space_removed)
                evaluate_if_condition(line)

            elif re.match(select_pattern, stripped_line):
                select_arg = re.match(select_pattern, stripped_line)
                select_value = convert_space_to_underscore(select_arg.group(2))
                select_arg_list.append(select_value)
                select_flag = 1
                select_output = f"{{# select case arg = {select_value} #}}"
                output(select_output)

            elif re.match(case_pattern, stripped_line):
                case_list = eval_case_block(line)
                select_arg = select_arg_list[-1]
                if select_flag == 1:
                    case_flag = 1
                    replaced_case = leading_spaces + "{% if " + select_arg + " in " + str(case_list) + " %}"
                    select_flag = 0
                else:
                    replaced_case = leading_spaces + "{% elif " + select_arg + " in " + str(case_list) + " %}"
                output(replaced_case)

            elif re.match(case_op_pattern, line):
                case_value = line.split('@')[1][1:-2]
                select_arg = select_arg_list[-1]
                if select_flag == 1:
                    case_flag = 1
                    replaced_case = f"{leading_spaces}{{% if '{case_value}' in {select_arg} %}}"
                    select_flag = 0
                else:
                    replaced_case = f"{leading_spaces}{{% elif '{case_value}' in {select_arg} %}}"
                output(replaced_case)

            elif re.match(var_pattern, stripped_line) and arg != None:
                new_var = update_var(line, arg)
                output(new_var)

            elif re.match(var_pattern, stripped_line):
                new_var = update_var(line)
                check_escaped_char(new_var)

            elif "\\" in stripped_line:
                new_line = escaped_char(line)
                output(new_line)

            elif re.search(endcase_pattern, stripped_line, re.IGNORECASE):
                modified_endcase = re.sub(endcase_pattern, '{% endif %}', line, flags=re.IGNORECASE)
                select_arg_list.pop()
                case_flag = 0
                output(modified_endcase)

            elif stripped_line.casefold() == '{elsecase}':
                case_flag = 0
                output(line.casefold().replace('{elsecase}', '{% else %}'))

            elif stripped_line.casefold() == '{else}':
                output(line.casefold().replace('{else}', '{% else %}'))

            elif stripped_line.casefold() == '{end}':
                output(line.casefold().replace('{end}', '{% endif %}'))

            elif stripped_line.casefold() == '{endeach}':
                output(line.casefold().replace('{endeach}', '{% endfor %}'))

            elif stripped_line == '{EndFor}':
                output(line.replace('{EndFor}', '{% endfor %}'))

            elif stripped_line == '{EndIn}':
                output(line.replace('{EndIn}', '{% endfor %}'))

            elif stripped_line == '{EndWhile}':
                output("{% endif %}{% endfor %}")

            elif re.match(empty_line_pattern, stripped_line):
                return output(line)

            elif line[0] == '!':
                output(line)

            else:
                output(line)

    def if_ns_check(if_ns_value):
        if if_ns_value in ns_var_list:
            return f"{{<ns.{if_ns_value}>}}"
        else:
            return f"{{<{if_ns_value}>}}"

    # This function converts math related statements
    def math_func_eval(operator, varA, varB):
        if operator == 'ADD' or operator == '+':
            return f"{{{{ {varA} | int + {varB} | int }}}}"
        elif operator == 'SUB' or operator == '-':
            return f"{{{{ {varA} | int - {varB} | int }}}}"
        elif operator == 'MUL' or operator == '*':
            return f"{varA} | int * {varB} | int"
        elif operator == 'DIV' or operator == '/':
            return f"{varA} | int / {varB} | int"

    # This function converts networking related statements
    def network_func_eval(value):
        func_args = re.findall(r'<([^>]*)>', value)
        func_args = [f"ns.{i}" if i in ns_var_list else i for i in func_args]
        if "ROUND [DIV [HEX2DEC [SUBSTR <IPv6Uncompsecond>" in value:
            start = value.strip("ROUND [DIV [HEX2DEC [SUBSTR <IPv6Uncompsecond>")[:1]
            length = value.strip("ROUND [DIV [HEX2DEC [SUBSTR <IPv6Uncompsecond>")[2:3]
            end = int(start) + int(length)
            return f"{{{{ ({func_args[0]}[{start}:{end}]|int(base=16) / 2) | round | int }}}}"
        elif 'LENGTH' in value:
            return f"{{{{{func_args[0]} | length}}}}"
        elif 'SUBSTR' in value:
            if len(value.split()) == 3:
                start = int(value.split()[-1])
                return func_args[0] + "[" + str(start) + ":]"
            else:
                length = int(value.split()[-1])
                start = int(value.split()[-2])
                end = start + length
                return func_args[0] + "[" + str(start) + ":" + str(end) + "]"

        elif '\/' in value:
            if len(func_args) == 2:
                return "{{ IPNetwork(" + func_args[0] + " ~ '/' ~ " + func_args[1] + ").netmask }}"
            else:
                return value

        elif "Host1".casefold() in value.casefold():
            host1_value = value.split()
            if 'Host1 [IPSN' in value:
                return "{{ IPNetwork(" + func_args[0] + " ~ '/30')[1] }}"

            elif len(host1_value) == 2:
                if "/" in host1_value[1]:
                    return "{{IPNetwork(" + host1_value[1].split('/')[0].strip('<,>') + " ~ '/" + host1_value[1].split('/')[1] + "')[1]}}"
                else:
                    return "{{IPNetwork(" + host1_value[1].strip('<,>') + ")[1]}}"
            elif len(host1_value) == 3:
                if len(func_args) == 2:
                    return "{{IPNetwork(" + func_args[0] + " ~ '/' ~ " + func_args[1] + ")[1]}}"
                else:
                    return "{{IPNetwork(" + func_args[0] + " ~ '/" + str(host1_value[2]) + "')[1]}}"

        elif "HostN".casefold() in value.casefold():
            hostn_value = value.split()
            if '/' in hostn_value[1]:
                return "{{IPNetwork(" + hostn_value[1].split('/')[0].strip('<,>') + " ~ '/" + hostn_value[1].split('/')[1] + "')[-2]}}"
            elif len(hostn_value) == 3:
                return "{{IPNetwork(" + func_args[0] + " ~ '/" + hostn_value[2] + "')[-2]}}"           
            elif len(hostn_value) == 2:
                return "{{IPNetwork(" + hostn_value[1].strip('<,>') + ")[-2]}}"
            elif 'HostN [IPSN' in value:
                return "{{IPNetwork(" + func_args[0] + " ~ '/30')[-2]}}"

        elif "SPLIT" in value:
            split_value = value.split()
            split_octet = int(split_value[2]) - 1
            if len(split_value) == 3:
                return "{{" + func_args[0] + ".split()["+str(split_octet)+"]}}"
            elif len(split_value) == 4:
                return "{{" + func_args[0] + ".split('"+ split_value[3] +"')["+str(split_octet)+"]}}"

        elif "CONCAT".casefold() in value.casefold():
            if "speed>000" in value:
                concat_string = value.split(' ',1)[1]
                updated_concat_string = concat_func(concat_string)
                return "{{ " + updated_concat_string + " }}"
            else:
                concat_string = value.split(' ',1)[1]
                return concat_func(concat_string)

        elif "UC [V6IPSN" in value:
            return f"IPv6Network({func_args[0]} ~'/{value.split()[-1][:-1]}', strict=False).network_address | upper"

        elif "V6IPSN" in value:
            return f"IPv6Network({func_args[0]} ~ '/{value.split()[-1]}', strict=False).network_address"

        elif "IPSN" in value:
            ipsn_split = value.split()
            if "[V4Mask2Len <Mask>]" in value:
                return "{{IPNetwork(" + ipsn_split[1].strip('<,>') + " ~ '/' ~ IPNetwork('0.0.0.0/'~ Mask).prefixlen).network}}"
            elif len(func_args) == 2:
                return "{{IPNetwork(" + ipsn_split[1].strip('<,>') + " ~ '/' ~ " + ipsn_split[2].strip('<,>') + ").network}}"
            else:
                return "{{IPNetwork(" + ipsn_split[1].strip('<,>') + " ~ '/" + ipsn_split[2] + "').network}}"

        elif "V4OCTET" in value:
            octet = int(value.split(" ")[-1]) - 1
            return "{{ " + func_args[0] + ".split('/')[0].split('.')[" + str(octet) + "] }}"

        elif "SPLITSP" in value:
            split_value = int(value.split()[-1]) - 1
            return "{{ " + func_args[0] + ".split(' ')[" + str(split_value) + "] }}"
        elif "V4Len2Mask [CIDRLEN" in value:
            return "{{ IPNetwork(" + func_args[0] + ").netmask }}"

        elif "IPV4".casefold() in value.casefold():
            ip_split = value.split()
            if '/' in ip_split[1]:
                return "{{ IPNetwork(" + ip_split[1].split('/')[0].strip('<,>') + " ~ '/' ~ " + ip_split[1].split('/')[1].strip('<,>') + ").ip }}"
            else:
                return "{{ IPNetwork(" + func_args[0] + ").ip }}"

        elif "CIDRSN" in value:
            return "{{ IPNetwork(" + func_args[0] + ").network }}"

        elif "SNMASK" in value:
            if len(func_args) == 2:
                return "{{ IPNetwork(" + func_args[0].strip('<,>') + " ~ '/' ~ " + func_args[1].strip('<,>') + ").netmask }}"
            else:
                return "{{ IPNetwork(" + func_args[0] + ").netmask }}"

        elif "CIDRLEN <LAN-IP>" in value:
            return ''

        elif "V4Mask2Len" in value:
            return "{{ IPNetwork('0.0.0.0/'~" + func_args[0] + ").prefixlen }}"

        elif "WCMASK" in value:
            wcmask_split = value.split()
            if '/' in wcmask_split[1]:
                return "{{IPNetwork(" + wcmask_split[1].split('/')[0].strip('<,>') + " ~ '/' ~ " + wcmask_split[1].split('/')[1].strip('<,>') + ").hostmask}}"
            else:
                return "{{IPNetwork(" + func_args[0] + ").hostmask}}"

        elif "V6Comp" in value:
            return f'IPv6Address({func_args[0]})'

        elif "V6Uncomp" in value:
            return f'IPv6Address({func_args[0]}).exploded'

        elif "HEX2DEC" in value:
            return f'{func_args[0]}|int(base=16)'

        elif "DEC2HEX" in value:
            return f"'%X'|format({func_args[0]})"

        elif value.startswith("in"):
            output(f"{{% if '{value.split()[1]}' in {func_args[0]} %}}")

        elif value.startswith("+"):
            add_val = value.split()
            add_val = [x.replace('<', '').replace('>', '') for x in add_val]
            new_add_string = ' + '.join(map(str, add_val[1:]))
            return "{{" + new_add_string + "}}"

        elif "DATE" in value:
            if value == "DATE":
                return "{{ datetime.now().strftime('%Y%m%d') }}"
            else:
                return "datetime.now().strftime('%d')"

        else:
            return value

    def func_eval(value):
        value = value[1:-1]
        func_vars = value.split(' ')
        if func_vars[0] in ['ADD', 'SUB', 'MUL', 'DIV', '+', '-', '*', '/']:
            return math_func_eval(func_vars[0], func_vars[1].strip('<,>'), func_vars[2].strip('<,>'))
        else:
            return network_func_eval(value)

    def replace_bracket_contents(line, replacement_func):
        """
        Replace the contents of brackets in a line using a replacement function.
        """
        return regex.sub(r'\[(?:[^\[\]]+|(?R))*\]', replacement_func, line)

    def my_replacement_func(match):
        """
        Replacement function for regex substitution.
        """
        content = match.group()
        return func_eval(content)

    def eval_case_block(line):
        val = []
        i = 0
        while i < len(line):
            if line[i] == '{':
                j = line.find('}', i)
                value = line[i+1:j]
                if value == 'Case':
                    pass
                else:
                    val.append(value)
            i += 1
        return val[0:]

    def convert_space_to_underscore(keyWord):
        if ' ' in keyWord:
            keyWord = keyWord.replace(' ', '_')
        if '-' in keyWord:
            keyWord = keyWord.replace('-', '_')
        if keyWord[0].isdigit():
            keyWord = 'ABC' + keyWord
        else:
            return keyWord
        return keyWord

    def evaluate_if_condition(line, arg=None):
        leading_spaces = line.split('{')[0]
        single_line = line.strip()
        if_match = re.match(if_pattern, single_line)
        check_space = if_match.group(1)
        single_line = single_line.replace(check_space, if_ns_check(check_space[2:-2]))
        if '{elseif}{' in single_line:
            if re.match(elif_single_element_pattern, single_line.strip()):
                replaced_line = re.sub(elif_single_element_pattern, elif_single_element_replace, single_line)
                return output(replaced_line)

            elif re.match(elif_multiple_elements_pattern, single_line.strip()):
                matches = re.findall(if_list_pattern, single_line.strip())
                replaced_line = ""
                for placeholder, value in matches:
                    replaced_line = f"{leading_spaces}{{% elif {placeholder} in {value.strip('{}').split('}{')} %}}"
                    return output(replaced_line)

        elif re.match(if_var_pattern, single_line.strip()):
            if_var_rep = r"\1{% if \2 == \3 %}"
            new_if_var = re.sub(if_var_pattern, if_var_rep, single_line)
            return output(new_if_var + '')

        elif re.match(if_single_element_pattern, single_line.strip()):
            match = re.match(if_single_element_pattern, single_line.strip())
            if (match.group(2)).isdigit():
                replaced_line = re.sub(if_single_el_digit_pattern, if_single_el_digit_replace, single_line)
                return output(replaced_line)
            else:
                replaced_line = re.sub(if_single_element_pattern, if_single_element_replace, single_line)
                return output(replaced_line)

        elif re.match(if_multiple_elements_pattern, single_line.strip()):
            matches = re.findall(if_list_pattern, single_line.strip())
            replaced_line = ""
            for placeholder, value in matches:
                replaced_line = f"{leading_spaces}{{% if {placeholder} in {value.strip('{}').split('}{')} %}}"
                return output(replaced_line)              

        elif re.match(if_operator_pattern, single_line.strip()):
            match = re.match(if_operator_pattern, single_line.strip())
            if (match.group(3)).isdigit():
                if (match.group(2)) == '##':
                    if_op_digit_custom_replace = r"{% if \g<1> != \g<3> %}"
                    replaced_line = re.sub(if_operator_pattern, if_op_digit_custom_replace, single_line)
                    return output(replaced_line)
                else:
                    if arg:
                        replaced_line = re.sub(if_operator_pattern, for_if_op_digit_replace, line)
                        return output(replaced_line)
                    else:
                        replaced_line = re.sub(if_operator_pattern, if_op_digit_replace, line)
                        return output(replaced_line)

            elif (match.group(2)) == '@':
                if_op_custom_replace = r"{% if \g<1> in ['\g<3>'] %}"
                replaced_line = re.sub(if_operator_pattern, if_op_custom_replace, single_line)
                return output(replaced_line)

            elif (match.group(2)) == '#':
                if_op_custom_replace = r"{% if \g<1> != '\g<3>' %}"
                replaced_line = re.sub(if_operator_pattern, if_op_custom_replace, single_line)
                return output(replaced_line)
            
            elif match.group(2) == '<' or match.group(2) == '>':
                if_op_custom_replace = r"{% if \g<1> | int \g<2> \g<3> | int %}"
                replaced_line = re.sub(if_operator_pattern, if_op_custom_replace, single_line)
                return output(replaced_line+'')
            
            else:
                if arg:
                    replaced_line = re.sub(if_operator_pattern, for_if_operator_replace, single_line)
                    return output(replaced_line)
                else:
                    replaced_line = re.sub(if_operator_pattern, if_operator_replace, single_line)
                    return output(replaced_line)

        elif re.search(if_op_pattern, single_line):
            if arg:
                replaced_line = re.sub(if_op_pattern, for_if_op_replace, single_line)
                return output(replaced_line)
            else:
                replaced_line = re.sub(if_op_pattern, if_op_replace, single_line)
                return output(replaced_line)

        elif re.match(if_only_pattern, single_line.strip()):
            replaced_line = re.sub(if_only_pattern, if_only_replace, single_line)
            return output(replaced_line)

        elif re.match(if_else_pattern, single_line.strip()):
            match = re.match(if_else_pattern, single_line.strip())
            if match.group(1).casefold() == '{if}':
                n_line = single_line.replace('{if}', '')
                evaluate_if_condition(n_line)
        else:
            return f"{single_line.strip()} - NO MATCH FOUND"

    def check_escaped_char(line):
        if "\\" in line:
            new_line = escaped_char(line)
            if '[]' in new_line:
                output(new_line)
            else:
                evaluate_pattern(new_line)
        else:
            evaluate_pattern(line)

    def escaped_char(line):
        result = ""
        i = 0
        while i < len(line):
            if line[i] == "\\" and i+1 < len(line) and line[i+1] in ['[', '{', '}', ']', '/']:
                i += 1
            result += line[i]
            i += 1
        return result

    def update_var(line, arg=None):
        parts = line.split('<')
        new_line = parts[0]
        if line.startswith('{% set'):
            for part in parts[1:]:
                if '>' in part:
                    firstPart, remainingPart = part.split('>', 1)
                    firstPart = ns_var_check_func(firstPart)
                    new_line += " ~ " + firstPart + remainingPart
                else:
                    new_line += '<' + part 
        else:
            for part in parts[1:]:
                if '>' in part:
                    firstPart, remainingPart = part.split('>', 1)
                    firstPart = ns_var_check_func(firstPart)
                    new_line += "{{ " + firstPart + " }}" + remainingPart
                else:
                    new_line += '<' + part
        return new_line

    def ns_var_check_func(ns_var):
        if ns_var in ns_var_list:
            return f"ns.{ns_var}"
        else:
            return ns_var

    def update_set(line, arg=None):
        leading_spaces = line.split('{')[0]
        set_match = re.match(set_pattern, line.strip())
        removed_space = convert_space_to_underscore(set_match.group(2))
        if (set_match.group(3)).isdigit() or set_match.group(3) == 'i + 1':
            set_digit_replace = f"{leading_spaces}{{% set {removed_space} = {set_match.group(3).strip('{').strip()} %}}"
            return set_digit_replace

        elif re.match(set_var_pattern, line):
            if '>,' in set_match.group(3):
                new_set_value = concat_func(set_match.group(3), arg)
                set_var_rep = rf"\1{{% set {removed_space} = {new_set_value} %}}"
            else:
                set_var_rep = r"\1{% set \3 = \4 %}"
            new_set = re.sub(set_var_pattern, set_var_rep, line)
            return new_set

        elif set_match.group(3) == '':
            set_replace = f"{leading_spaces}{{% set {removed_space} = '' %}}"
            return set_replace

        else:
            update_set_line = update_set_func(set_match.group(3))
            if update_set_line.strip().startswith("'") or any(x in update_set_line for x in ['IPNetwork', '~', 'split', 'IPv6Address', '|', 'IPv6Network', ':', 'datetime']):
                set_replace = f"{leading_spaces}{{% set {removed_space} = {update_set_line.strip('{')} %}}"
            else:
                set_replace = f"{leading_spaces}{{% set {removed_space} = '{update_set_line.strip('{')}' %}}"
            return set_replace

    def modify_variable(line):
        try:
            new_line = re.sub(r'<(.*?)>', lambda m: '<' + convert_space_to_underscore(m.group(1)) + '>', line)
            return new_line
        except:
            pass

    def concat_func(concat_line, arg=None):
        processed_parts = []
        parts = concat_line.split('<')
        for part in parts:
            sub_parts = part.split('>')
            if len(sub_parts) == 2:
                processed_parts.append(sub_parts[0])
                if sub_parts[1]:
                    processed_parts.append("'" + sub_parts[1].strip() + "'")
            else:
                if sub_parts[0]:
                    processed_parts.append("'" + sub_parts[0].strip() + "'")

        updated_line = ' ~ '.join(processed_parts)
        return updated_line

    def update_set_func(line):
        processed_parts = []
        parts = line.split('<')
        for part in parts:
            sub_parts = part.split('>')
            if line == "(1 + FOR_ARG.kk)":
                return "(1 + FOR_ARG.kk)"
            elif ('~') in part or ("[" and "]") in part or '|' in part or '+' in part or '(IPv4)' in part or 'IPNetwork(' in part or 'IPv6Address' in part or 'IPv6Network' in part or 'datetime' in part:
                return line
            elif len(sub_parts) == 2:
                processed_parts.append(sub_parts[0])
                if sub_parts[1]:
                    processed_parts.append("'" + sub_parts[1] + "'")
            else:
                if sub_parts[0]:
                    processed_parts.append("'" + sub_parts[0] + "'")

        updated_line = ' ~ '.join(processed_parts)
        return updated_line

    def output(line):
        if line is None:
            return
        else:
            config.append(line)

    def translate_include(line):
        new_include = re.sub(include_pattern, include_rep, line)
        return new_include

    def translate_foreach(line):
        new_for = re.sub(for_pattern, for_rep, line)
        return new_for

    def translate_for_if(line, arg):
        if arg:
            evaluate_if_condition(line, arg)
        else:
            new_for_if = re.sub(if_match_pattern, if_single_element_replace, line)
            return new_for_if

    def get_foreach_block(lines, start_index):
        args = []
        foreach_block = []
        currline = lines[start_index]
        foreach_block.append(currline)
        match = re.findall(for_pattern, currline)
        if match:
            value = match[0]
            args.append(value)
        else:
            print("No match found")

        for i in range(start_index + 1, len(lines)):
            line = lines[i]
            foreach_block.append(line)
            if line.strip() == '{endeach}':
                evaluate_pattern(foreach_block, *args)
                return foreach_block, i
        print("No {endeach} found for {foreach}")
        return foreach_block, len(lines) - 1

    lines = file.splitlines()

    def check_escaped_line(line):
        if '\\' in line:
            for index in range(len(line)):
                try:
                    if line[index] == '\\':
                        if line[index+1] in ['[', ']', '{', '}']:
                            line = line[:index] + line[index+1:]
                except:
                    pass
        return line

    i = 0
    while i < len(lines):
        line = lines[i]
        line = check_escaped_line(line)
        if line.startswith('{foreach}'):
            foreach_block, end_index = get_foreach_block(lines, i)
            i = end_index + 1
        else:
            evaluate_pattern(line)
            i += 1
    output = '\n'.join(config)
    return output