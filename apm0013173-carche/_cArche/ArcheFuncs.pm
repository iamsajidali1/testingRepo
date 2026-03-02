#!/tools/gt3/bin/perl

# ************************************************************************* #
#     Rosenbaum Managed Services Outsourcing Engineering Collaboration      #
#                                                                           #
#                        - Tools & Automation -                             #
#                                                                           #
#        Lead:       Elias, Mark             [me2751@att.com]               #
#        Programmer: Ramos, Luciano Federico [lr870e@att.com]               #
#                                                                           #
#        URL:        http://                                                #
#                                                                           #
# ************************************************************************* #
#
#	By convention, functions prefixed with double-underscore,
#	example __MyFunction() should only be called from within the package
#	(due to their use of $self as reference) they will not work if called from outside the package)
#
# ************************************************************************* #
# Change Log
#
# V1.01  MAE - Added aliases to many math functions
# v1.02  MAE - Added logical functions and comparators
# v2.03  MAE - Added functions to return "{", "}", "<", and ">"
# v3.04  MAE - Baseline version with new functions
# v3.04b MAE - Added SHIFT and DSCP functions as well as sub-versioning
# v3.05  MAE - Added Escape character logic
# v3.06  MAE - Added EVEN & ODD functions
# v3.06a MAE - Added IP & CIDR v4 Valid functions
# v3.06b MAE - Added IP & CIDR v6 Valid functions
# v3.06c MAE - Added Word function
#
# ************************************************************************* #

my @atoms;
my $function;

my $template_line;
my $config_line;
my $function_line;
my $rpn1;
my $rpn2;

package ArcheFuncs;

use strict;
use English;

use constant ArcheTRUE	=> "TRUE";
use constant ArcheFALSE	=> "FALSE";

our $NAME = "ArcheFuncs";
our $VERSION=3.06;	# read from outside as: print "$NAME version: ${$NAME}::VERSION\n";
			# but use $NAME::CheckVersion($requested_Version); to check version from outside
			# this function provides user friendly version miss-match message with download link
our $SUB_VERSION = "Production (subversion C)";

my %HexBits = (
		0	=> "0000",
		1	=> "0001",
		2	=> "0010",
		3	=> "0011",
		4	=> "0100",
		5	=> "0101",
		6	=> "0110",
		7	=> "0111",
		8	=> "1000",
		9	=> "1001",
		a	=> "1010",
		b	=> "1011",
		c	=> "1100",
		d	=> "1101",
		e	=> "1110",
		f	=> "1111"
		);
	
my %dscp_vals = (
		cs7	    => 56,
		cs6	    => 48,
		cs5	    => 40,
		ef	    => 46,
		cs4	    => 32,
		af41	=> 34,
		ef42	=> 36,
		af43	=> 38,
		cs3	    => 24,
		af31	=> 26,
		af32	=> 28,
		af33	=> 30,
		cs2	    => 16,
		af21	=> 18,
		af22	=> 20,
		af23	=> 22,
		cs1	    => 8,
		af11	=> 10,
		af12	=> 12,
		af14	=> 14,
		be	    => 0
		);
	

my %ArcheFunctions = (
	##
	## IP V4 Functions
	##    
		ipv4		=> sub {return IPv4_format ($atoms[1])}, 
		isv4sn		=> sub {return Is_IPv4_Subnet ($atoms[1], $atoms[2])},
		ipsn		=> sub {return IPv4_Subnet ($atoms[1], $atoms[2])},
		cidrsn		=> sub {return CIDRv4_Subnet ($atoms[1])},
		snmask		=> sub {return CIDRv4_to_SNMask ($atoms[1])},
		wcmask		=> sub {return CIDRv4_to_WCMask ($atoms[1])},
		port		=> sub {return Port_from_IP ($atoms[1])},
		cidrlen		=> sub {return CIDRv4Len ($atoms[1])},
		v4octet		=> sub {return __v4octet (@atoms)},
		ipv4tocidr	=> sub {return __IPv4toCIDR ($atoms[1], $atoms[2])},
		wcv4tocidr	=> sub {return __WCv4toCIDR ($atoms[1], $atoms[2])},
		v4mask2len	=> sub {return __MaskLen (__IPv4_to_Bits ($atoms[1]))},
		v4len2mask	=> sub {return __Bits_to_IPv4(__SNmask_in_Bits (32, $atoms[1]))},
		wcv4tobits	=> sub {return __WCmaskToBits ($atoms[1], 32)},
		ipv4valid	=> sub {return __ipv4valid ($atoms[1])},
		cidrv4valid	=> sub {return __cidrv4valid ($atoms[1])},
	##
	## IP V6 Functions
	##    
		ipv6		=> sub {return IPv6_format ($atoms[1], "IPv6")},
		isv6sn		=> sub {return Is_IPv6_Subnet ($atoms[1], $atoms[2])},
		v6ipsn		=> sub {return IPv6_Subnet ($atoms[1], $atoms[2])},
		v6cidrsn	=> sub {return CIDRv6_Subnet ($atoms[1])},
		v6snmask	=> sub {return CIDRv6_SNMask ($atoms[1])},
		v6wcmask	=> sub {return CIDRv6_WCMask ($atoms[1])},
		v6cidrlen	=> sub {return IPv6_format ($atoms[1], "LEN")},
		v6hex		=> sub {return __v6hex (@atoms)},
		ipv6tocidr	=> sub {return __IPv6toCIDR ($atoms[1], $atoms[2])},
		wcv6tocidr	=> sub {return __WCv6toCIDR ($atoms[1], $atoms[2])},
		v6comp		=> sub {return __v6comp ($atoms[1])},
		v6uncomp	=> sub {return __v6uncomp ($atoms[1])},
		v6mask2len	=> sub {return __MaskLen (__IPv6only_to_Bits ($atoms[1]))},
		v6len2mask	=> sub {return __Bits_to_IPv6only (__SNmask_in_Bits (128, $atoms[1]))},
		wcv6tobits	=> sub {return __WCmaskToBits ($atoms[1], 128)},
		ipv6valid	=> sub {return __ipv6valid ($atoms[1])},
		cidrv6valid	=> sub {return __cidrv6valid ($atoms[1])},
	##
	## Other IP functions
	##
		## 3 atoms assumes data as IP and Length
		## otherwise assume data as CIDR
		host1		=> sub {return (@atoms == 3) ? IPv4Host (1, $atoms[1], $atoms[2]) : IPv4Host (1, IPv4_format($atoms[1]), CIDRv4Len($atoms[1]))},
		hostn		=> sub {return (@atoms == 3) ? IPv4Host (-1, $atoms[1], $atoms[2]) : IPv4Host (-1, IPv4_format($atoms[1]), CIDRv4Len($atoms[1]))},
	##
	## Text functions
	##
		uc		    => sub {return __uc ($function)},
		lc		    => sub {return __lc ($function)},
		concat		=> sub {return __concat (@atoms)},
		concatsp	=> sub {return __concatsp (@atoms)},
		index		=> sub {return __index ($function)},
		substr		=> sub {return __substr ($function)},
		split		=> sub {return __split ($function)},
		splitsp		=> sub {return __splitsp ($function)},
		length		=> sub {return __length ($function)},
		len		    => sub {return __length ($function)},
		date	   	=> sub {return __date (lc((@atoms == 1) ? "YYYYMMDD" : $atoms[1]))},
		pad		    => sub {return __rpad ($function)},
		lpad		=> sub {return __pad ($function)},
		rpad		=> sub {return __rpad ($function)},
		lbracket	=> sub {return '{'},
		rbracket	=> sub {return '}'},
		langle		=> sub {return '<'},
		rangle		=> sub {return '>'},
		word		=> sub {return __word (@atoms)},
	##
	## Math functions
	##
		add		    => sub {return __add (@atoms)},
		'+'		    => sub {return __add (@atoms)},
		sub		    => sub {return __sub (@atoms)},
		'-'		    => sub {return __sub (@atoms)},
		mul		    => sub {return __mul (@atoms)},
		'*'		    => sub {return __mul (@atoms)},
		div		    => sub {return __div (@atoms)},
		'/'		    => sub {return __div (@atoms)},
		floor		=> sub {return __floor (@atoms)},
		ceiling		=> sub {return __ceiling (@atoms)},
		int		    => sub {return int($atoms[1])},
		round		=> sub {return __round (@atoms)},
		roundup		=> sub {return __roundup (@atoms)},
		rounddown	=> sub {return __rounddown (@atoms)},
		min		    => sub {return __min (@atoms)},
		max		    => sub {return __max (@atoms)},
		hex2dec		=> sub {return __hex2dec ($atoms[1])},
		dec2hex		=> sub {return __dec2hex ($atoms[1])},
		shift		=> sub {return __shift (@atoms)},
		dscp		=> sub {return __dscp ($atoms[1])},
        calc        => sub {return __calc (@atoms)},
	##
	## Logical functions
	##
		not		    => sub {return ($atoms[1] eq ArcheTRUE) ? ArcheFALSE : ArcheTRUE},
		"!"		    => sub {return ($atoms[1] eq ArcheTRUE) ? ArcheFALSE : ArcheTRUE},
		and		    => sub {return __and (@atoms)},
		"&&"		=> sub {return __and (@atoms)},
		or		    => sub {return __or (@atoms)},
		"||"		=> sub {return __or (@atoms)},
		true		=> sub {return ArcheTRUE},
		false		=> sub {return ArcheFALSE},
		blank		=> sub {return ($atoms[1] eq "") ? ArcheTRUE : ArcheFALSE},
	##
	## Compare text functions
	##
		eq		    => sub {return __eq ($function)},
		'='		    => sub {return __eq ($function)},
		ne		    => sub {return __ne ($function)},
		'#'		    => sub {return __ne ($function)},
		in		    => sub {return __in ($function)},
		'@'		    => sub {return __in ($function)},
		inc		    => sub {return __inc ($function)},
		'@@'		=> sub {return __inc ($function)},
	##
	## Compare regex functions
	##
		'=~'		=> sub {return __regex_eq ($function)},
		'!~'		=> sub {return __regex_ne ($function)},
	##
	## Compare numeric functions
	##
		'=='		=> sub {return ($atoms[1] == $atoms[2]) ? ArcheTRUE : ArcheFALSE},
		'##'		=> sub {return ($atoms[1] != $atoms[2]) ? ArcheTRUE : ArcheFALSE},
		gt		    => sub {return ($atoms[1] > $atoms[2]) ? ArcheTRUE : ArcheFALSE},
		'>'		    => sub {return ($atoms[1] > $atoms[2]) ? ArcheTRUE : ArcheFALSE},
		ge		    => sub {return ($atoms[1] >= $atoms[2]) ? ArcheTRUE : ArcheFALSE},
		'>='	   	=> sub {return ($atoms[1] >= $atoms[2]) ? ArcheTRUE : ArcheFALSE},
		lt		    => sub {return ($atoms[1] < $atoms[2]) ? ArcheTRUE : ArcheFALSE},
		'<'		    => sub {return ($atoms[1] < $atoms[2]) ? ArcheTRUE : ArcheFALSE},
		le		    => sub {return ($atoms[1] <= $atoms[2]) ? ArcheTRUE : ArcheFALSE},
		'<='		=> sub {return ($atoms[1] <= $atoms[2]) ? ArcheTRUE : ArcheFALSE},
		even		=> sub {return int($atoms[1]/2) == $atoms[1]/2 ? ArcheTRUE : ArcheFALSE},
		odd		    => sub {return int($atoms[1]/2) == $atoms[1]/2 ? ArcheFALSE : ArcheTRUE}
	);
	
my %ArcheFunctArgs = (
	##
	## IP V4 Functions
	##    
		ipv4		=> (1, 1),
		isv4sn		=> (2, 2),
		ipsn		=> (2, 2),
		cidrsn		=> (1, 1),
		snmask		=> (1, 1),
		wcmask		=> (1, 1),
		port		=> (1, 1),
		cidrlen		=> (1, 1),
		v4octet		=> (2, 2),
		ipv4tocidr	=> (2, 2),
		wcv4tocidr	=> (2, 2),
		v4mask2len	=> (1, 1),
		v4len2mask	=> (1, 1),
		wcv4tobits	=> (1, 1),
		ipv4valid	=> (1, 1),
		cidrv4valid	=> (1, 1),
	##
	## IP V6 Functions
	##    
		ipv6		=> (1, 1),
		isv6sn		=> (2, 2),
		v6ipsn		=> (2, 2),
		v6cidrsn	=> (1, 1),
		v6snmask	=> (1, 1),
		v6wcmask	=> (1, 1),
		v6cidrlen	=> (1, 1),
		v6hex		=> (2, 2),
		ipv6tocidr	=> (2, 2),
		wcv6tocidr	=> (2, 2),
		v6comp  	=> (1, 1),
		v6uncomp	=> (1, 1),
		v6mask2len	=> (1, 1),
		v6len2mask	=> (1, 1),
		wcv6tobits	=> (1, 1),
		ipv6valid	=> (1, 1),
		cidrv6valid	=> (1, 1),
	##
	## Other IP functions
	##
		## 3 atoms assumes data as IP and Length
		## otherwise assume data as CIDR
		host1		=> (1, 2),
		hostn		=> (1, 2),
	##
	## Text functions
	##
		uc		    => (1, -1),
		lc		    => (1, -1),
		concat		=> (2, -1),
		concatsp	=> (2, -1),
		index		=> (2, 3),
		substr		=> (2, 3),
		split		=> (2, 3),
		splitsp		=> (1, 1),
		length		=> (1, 1),
		len		    => (1, 1),
		date		=> (0, 1),
		pad		    => (2, 3),
		lpad		=> (2, 3),
		rpad		=> (2, 3),
		lbracket	=> (0, 0),
		rbracket	=> (0, 0),
		langle		=> (0, 0),
		rangle		=> (0, 0),
		word		=> (2, -1),
	##
	## Math functions
	##
		add		    => (2, -1),
		'+'		    => (2, -1),
		sub		    => (2, -1),
		'-'		    => (2, -1),
		mul		    => (2, -1),
		'*'		    => (2, -1),
		div		    => (2, 2),
		'/'		    => (2, 2),
		floor		=> (2, 2),
		ceiling		=> (2, 2),
		int		    => (1, 1),
		round		=> (2, 3),
		roundup		=> (2, 3),
		rounddown	=> (2, 3),
		min		    => (2, -1),
		max		    => (2, -1),
		hex2dec		=> (1, 1),
		dec2hex		=> (1, 1),
		shift		=> (2, 2),
		dscp		=> (1, 1),
		calc		=> (1, -1),
	##
	## Logical functions
	##
		not		    => (1, 1),
		"!"		    => (1, 1),
		and		    => (2, -1),
		"&&"	    => (2, -1),
		or	    	=> (2, -1),
		"||"		=> (2, -1),
		true		=> (0, 0),
		false		=> (0, 0),
		blank		=> (1, 1),
	##
	## Compare text functions
	##
		eq		    => (2, 2),
		'='		    => (2, 2),
		ne		    => (2, 2),
		'#'		    => (2, 2),
		in		    => (2, 2),
		'@'		    => (2, 2),
		inc		    => (2, 2),
		'@@'		=> (2, 2),
	##
	## Compare regex functions
	##
		'=~'		=> (2, 2),
		'!~'		=> (2, 2),
	##
	## Compare numeric functions
	##
		'=='		=> (2, 2),
		'##'		=> (2, 2),
		gt		    => (2, 2),
		'>'		    => (2, 2),
		ge		    => (2, 2),
		'>='		=> (2, 2),
		lt		    => (2, 2),
		'<'		    => (2, 2),
		le		    => (2, 2),
		'<='		=> (2, 2),
		even		=> (1, 1),
		odd		    => (1, 1)
	);

my %RPNfunctions = (
		index		=> sub {return __index ($function)},
		length		=> sub {return __length ($function)},
		len			=> sub {return __length ($function)},
	##
	## Math functions
	##
		add			=> sub {return __add (@atoms)},
		sub			=> sub {return __sub (@atoms)},
		mul			=> sub {return __mul (@atoms)},
		div			=> sub {return __div (@atoms)},
		floor		=> sub {return __floor (@atoms)},
		ceiling		=> sub {return __ceiling (@atoms)},
		int			=> sub {return int($atoms[1])},
		round		=> sub {return __round (@atoms)},
		roundup		=> sub {return __roundup (@atoms)},
		rounddown	=> sub {return __rounddown (@atoms)},
		min			=> sub {return __min (@atoms)},
		max			=> sub {return __max (@atoms)},
		hex2dec		=> sub {return __hex2dec ($atoms[1])},
		shift		=> sub {return __shift (@atoms)},
		dscp		=> sub {return __dscp ($atoms[1])}
	);

my %RPNopers = (
	"**" => sub {return $rpn1 ** $rpn2},
	"+"  => sub {return $rpn1 + $rpn2},
	"-"  => sub {return $rpn1 - $rpn2},
	"*"  => sub {return $rpn1 * $rpn2},
	"/"  => sub {return $rpn1 / $rpn2},
	"^"  => sub {return $rpn1 ** $rpn2},
	"&"	 => sub {return $rpn1 & $rpn2},
	"|"  => sub {return $rpn1 | $rpn2},
	"!"  => sub {return $rpn1 ! $rpn2},
	"%"  => sub {return $rpn1 % $rpn2}
	);

my %Opers = (
	"**" => [4, "R"],
	"+"  => [2, "L"],
	"-"  => [2, "L"],
	"*"  => [3, "L"],
	"/"  => [3, "L"],
	"^"  => [4, "R"],
	"&"	 => [1, "L"],
	"|"  => [1, "L"],
	"!"  => [1, "L"],
	"%"  => [3, "L"]
);

my %Oper2char = (
	"**" => {4, "R"}
);

my %Oper1char = (
	"+"  => {2, "L"},
	"-"  => {2, "L"},
	"*"  => {3, "L"},
	"/"  => {3, "L"},
	"^"  => {4, "R"},
	"&"	 => {1, "L"},
	"|"  => {1, "L"},
	"!"  => {1, "L"},
	"%"  => {3, "L"}
);
	
## Table and Array Reference Variables
my $RefTableHeaders;
my $RefTableValues;
my $RefTableKeys;
my $RefTableKeyValues;
my $RefTablePointer;
my $RefTableSize;
my $TableOffset = 1;
my $RefArrayValues;
my $RefArrayDim;

1;	#end the Package with a Succesfull result

sub CheckVersion {
	my ($requested) = @_;
	if ($requested <= $VERSION) { return; }
	my $string = "\n$NAME" . ".pm version too low, please download new \"$NAME" . ".pm\"\n\n";
	$string.= "Your $NAME" . ".pm version is $VERSION($SUB_VERSION), but you need version $requested.\n";
	print $string;
	exit 1;
}

sub GetVersion {
	my $vers = ($SUB_VERSION) ? $VERSION . "(" . $SUB_VERSION . ")" : $VERSION;
	return $vers;
}

sub ArcheCheckFunction {return exists ($ArcheFunctions{$_[0]})};

sub ArcheGetArgCount {return $ArcheFunctArgs{$_[0]}};

sub ArcheFuncsTRUE {return ArcheTRUE};

sub ArcheFuncsFALSE {return ArcheFALSE};

sub ArcheFuncsLoadAtoms {push (@atoms, @_)};

sub ArcheFuncsLoadFuncs {$function = $_[0]};

sub SetTableRefs {
	my ($name, $ref) = @_;

	if ($name eq "TableHeader") {
        $RefTableHeaders = $ref;
    } elsif ($name eq "TableValues")  {
        $RefTableValues = $ref;
    } elsif ($name eq "TableKeys") {
        $RefTableKeys = $ref;
    } elsif ($name eq "TableKeyVals") {
        $RefTableKeyValues = $ref;
    } elsif ($name eq "TablePointer") {
        $RefTablePointer = $ref;
    } elsif ($name eq "TableSize") {
        $RefTableSize = $ref;
    } elsif ($name eq "TableOffset")  {
        $TableOffset = $ref;
    } elsif ($name eq "ArrayValues")  {
        $RefArrayValues = $ref;
    } elsif ($name eq "ArrayDim") {
        $RefArrayDim = $ref;
	}
}

sub ProcessFunction {
	my ($repl_string, $position, $orig_string) = @_;
	my $fstart = EscapeIndex($repl_string, '[');
	
	$template_line = $position;
	$config_line = $orig_string;

	while ($fstart >= 0) {
		$repl_string = __ProcessFunction ($fstart, $repl_string);
		$fstart = EscapeIndex($repl_string, '[');
	}

	return $repl_string;
}	

sub __ProcessFunction {
	my ($fstart, $inline) = @_;
	my $cline = $inline;
	my $FuncRtn = "";
	my $fend;
	my $fnext;
	my $flen;
	my $atom0;
	my $func_local;
	
	$function_line = $cline;

	$fend = EscapeIndex($cline, ']', ($fstart + 1));
	$fnext = EscapeIndex($cline, '[', ($fstart + 1));
	if ($fnext < 0) {$fnext = length($cline) + 1};
	## print "Processing ($cline); Start = $fstart; End = $fend; Next = $fnext \n";
	while ($fnext < $fend) {
		$cline = __ProcessFunction($fnext, $cline);
		## Reload END and NEXT values as string size could have changed
		$fend = EscapeIndex($cline, ']', ($fstart + 1));
		$fnext = EscapeIndex($cline, '[', ($fstart + 1));
		if ($fnext < 0) {$fnext = length($cline) + 1};
		## print "After Re-Processing ($cline); Start = $fstart; End = $fend; Next = $fnext \n";
	}
	$flen = $fend - $fstart + 1;
	## Get portion between the brackets
	$function = substr($cline, $fstart, $flen);
	## Now strip the brackets
	$function = substr($function,1,-1);
	## print "Found the function ($function) \n";
				
	@atoms = split(/ /,$function);
	$atom0 = lc($atoms[0]);

	if (exists ($ArcheFunctions{$atom0})) {
		$FuncRtn = &{$ArcheFunctions{$atom0}};
	} else {
		print "Unknown function call in line $template_line; configuration line: $config_line; function: $function_line.\n";
	}

	substr($cline, $fstart, $flen, $FuncRtn);
	
	return $cline;
}


sub EscapeIndex {
	my ($string, $char, $startpos) = @_;
	if (@_ == 2) {$startpos = 0};
	my $escchar = '\\' . $char;
	
	my $epos = index($string, $escchar, $startpos);
	my $pos = index($string, $char, $startpos);
	if (($pos < $epos) || ($epos == -1)){
		# Char before the escaped version or escaped version not found,
		# so just return the position of the desired character
		return $pos;
	}
	while (($pos > $epos) && ($pos != -1)) {
		$startpos = $epos + 2;
		$epos = index($string, $escchar, $startpos);
		$pos = index($string, $char, $startpos);
		if ($epos == -1) {
			return $pos;
		}
	}
	
	return $pos;	
}

#############################################################
##
## IPv4 functions
##
#############################################################

##	ipv4		=> sub {return __v4format ($atoms[1], "IPv4")}, 
##	isv4sn		=> sub {return __isv4subnet ($atoms[1], $atoms[2])},
##	ipsn		=> sub {return __v4subnet ($atoms[1], $atoms[2])},
##	cidrsn		=> sub {return CIDRv4_Subnet ($atoms[1])},
##	snmask		=> sub {return __v4snmask ($atoms[1])},
##	wcmask		=> sub {return __v4wcmask ($atoms[1])},
##	port		=> sub {return Port_from_IP ($atoms[1])},
##	cidrlen		=> sub {return __v4format ($atoms[1], "LEN")},
##	v4octet		=> sub {return __v4octet (@atoms)},
##	ipv4tocidr	=> sub {return __IPv4toCIDR ($atoms[1], $atoms[2])},

sub __ipv4valid {
	my @atoms = split(/([\.\/:])/,$_[0]);
	if ($#atoms < 6) {return ArcheFALSE};
	if ($atoms[0] < 0 || $atoms[0] > 255) {return ArcheFALSE};
	if ($atoms[1] ne "\.") {return ArcheFALSE};
	if ($atoms[2] < 0 || $atoms[2] > 255) {return ArcheFALSE};
	if ($atoms[3] ne "\.") {return ArcheFALSE};
	if ($atoms[4] < 0 || $atoms[4] > 255) {return ArcheFALSE};
	if ($atoms[5] ne "\.") {return ArcheFALSE};
	if ($atoms[6] < 0 || $atoms[6] > 255) {return ArcheFALSE};
	return ArcheTRUE;
}

sub __cidrv4valid {
	my @atoms = split(/([\.\/:])/,$_[0]);
	if ($#atoms < 8) {return ArcheFALSE};
	if ($atoms[0] < 0 || $atoms[0] > 255) {return ArcheFALSE};
	if ($atoms[1] ne "\.") {return ArcheFALSE};
	if ($atoms[2] < 0 || $atoms[2] > 255) {return ArcheFALSE};
	if ($atoms[3] ne "\.") {return ArcheFALSE};
	if ($atoms[4] < 0 || $atoms[4] > 255) {return ArcheFALSE};
	if ($atoms[5] ne "\.") {return ArcheFALSE};
	if ($atoms[6] < 0 || $atoms[6] > 255) {return ArcheFALSE};
	if ($atoms[7] ne "\/") {return ArcheFALSE};
	if ($atoms[8] < 0 || $atoms[8] > 32) {return ArcheFALSE};
	return ArcheTRUE;
}

sub __ipv6valid {
	my $ipv6 = IPv6_ZeroExpand($_[0]);
	my @atoms = split(/[\.\/:]/,$ipv6);

	if ($#atoms < 7) {return ArcheFALSE};
	for my $atom (@atoms) {
		if (!__validv6hex ($atom)) {return ArcheFALSE};
	}
	return ArcheTRUE;
}

sub __cidrv6valid {
	my $ipv6 = IPv6_ZeroExpand($_[0]);
	my @atoms = split(/[\/:]/,$ipv6);
	my $len;
	
	if ($#atoms < 8) {return ArcheFALSE};
	$len = $atoms[8];
	$#atoms = 7;
	for my $atom (@atoms) {
		if (!__validv6hex ($atom)) {return ArcheFALSE};
	}
	if (($len < 0) || ($len > 128)) {return ArcheFALSE};
	
	return ArcheTRUE;
}

sub __v4octet {
	my @splitatoms = split (/\./, $_[1]);
	return @splitatoms[($_[2] - 1)];
}

sub __v6hex {
	my @splitatoms = split (/:/, IPv6_ZeroExpand($_[1]));
	return @splitatoms[($_[2] - 1)];
}

sub __validv6hex {
	my @chars = split (//, lc ($_[0]));
	for my $char (@chars) {
		if ((($char lt "a") || ($char gt "f")) && (($char lt "0") || ($char gt "9"))) {return 0};
	}
	if (__hex2dec($_[0]) > 65535) {return 0};
	return 1;
}

#############################################################
##
## Text functions
##
#############################################################

sub __uc {
	my $atom1 = substr($_[0],2);
	$atom1 =~ s/^\s*//;
	return uc ($atom1);
}

sub __lc {
	my $atom1 = substr($_[0],2);
	$atom1 =~ s/^\s*//;
	return lc ($atom1);
}

sub __concat {
	my $rtn = "";
	shift @_;
	for my $atom (@_) {$rtn .= $atom};
	return $rtn;
}

sub __concatsp {
	my $rtn = "";
	shift @_;
	for my $atom (@_) {$rtn .= $atom . " "};
	return substr ($rtn, 0, -1);
}

sub __index {
	my @atoms = ($_[0] =~ /(".*?"|\S+)/g);
	my $a1 = __RemoveQuotes ($atoms[1]);
	my $a2 = __RemoveQuotes ($atoms[2]);
	return (@atoms == 3 ? index ($a2, $a1) : index ($a2, $a1, $atoms[3]));
}

sub __substr {
	my @atoms = ($_[0] =~ /(".*?"|\S+)/g);
	my $a1 = __RemoveQuotes ($atoms[1]);
	my $a2 = __RemoveQuotes ($atoms[2]);
	return (@atoms == 3 ? substr ($a1, $a2) : substr ($a1, $a2, $atoms[3]));
}

sub __split {
	my @atoms = ($_[0] =~ /(".*?"|\S+)/g);
	my $spl = quotemeta ((@atoms == 3) ? "|" : $atoms[3]);
	my @satoms = split (/$spl/, __RemoveQuotes ($atoms[1]));
	return @satoms[($atoms[2] - 1)];
}

sub __splitsp {
	my @atoms = ($_[0] =~ /(".*?"|\S+)/g);
	my @splitatoms = split (/\s+/, __RemoveQuotes ($atoms[1]));
	return @splitatoms[($atoms[2] - 1)];
}

sub __length {
	my @atoms = ($_[0] =~ /(".*?"|\S+)/g);
	return length (__RemoveQuotes ($atoms[1]));
}

sub __pad {
	my @atoms = ($_[0] =~ /(".*?"|\S+)/g);
	my $a1 = __RemoveQuotes ($atoms[1]);
	my $a2 = __RemoveQuotes ($atoms[2]);
	while (length ($a1) < $atoms[3]) {$a1 = $a2 . $a1}
	return $a1;
}

sub __rpad {
	my @atoms = ($_[0] =~ /(".*?"|\S+)/g);
	my $a1 = __RemoveQuotes ($atoms[1]);
	my $a2 = __RemoveQuotes ($atoms[2]);
	while (length ($a1) < $atoms[3]) {$a1 = $a1 . $a2}
	return $a1;
}

sub __word {
	my $a1 = $_[1] - 1;
	my $a2 = __RemoveQuotes ($_[2]);
	my $i = 3;
	while ($i < $#_) {
		$a2 .= " " . __RemoveQuotes ($_[$i]);
		$i++
	}
	my @words = split (/ /, $a2);
	return ($words[$a1]);
}

#############################################################
##
## Math functions
##
#############################################################

sub __add {
	my $rtn = 0;
	shift @_;
	for my $atom (@_) {$rtn += $atom};
	return $rtn;
}

sub __sub {
	my $rtn = 2 * $_[1];
	shift @_;
	for my $atom (@_) {$rtn -= $atom};
	return $rtn;
}

sub __mul {
	my $rtn = 1;
	shift @_;
	for my $atom (@_) {$rtn *= $atom};
	return $rtn;
}

sub __div{
	if ($_[2] == 0) {
		print "WARNING: Function at ($template_line) in ($config_line) ($function_line) attempted a divide by zero \n";
		return 0;
	}
	return $_[1] / $_[2];
}

sub __floor {
	if ($_[2] == 0) {
		print "WARNING: Function at ($template_line) in ($config_line) ($function_line) attempted Floor of zero \n";
		return -1;
	}
	return int($_[1] / $_[2])*$_[2];
}

sub __ceiling {
	if ($_[2] == 0) {
		print "WARNING: Function at ($template_line) in ($config_line) ($function_line) attempted Ceiling of zero \n";
		return 0;
	}
	return int(($_[1] + $_[2] - 1) / $_[2]) * $_[2] ;
}

sub __round {
	my $scale = ((@_ == 2) ? 1 : 10 ** $_[2]);
	my $div1 = $_[1] / $scale;
	return (($div1 - int($div1)) >= .5) ? (int($div1) + 1) * $scale : int($div1) * $scale;
}

sub __roundup {
	my $scale = ((@_ == 2) ? 1 : 10 ** $_[2]);
	my $div1 = $_[1] / $scale;
	return ($div1 != int($div1)) ? (int($div1) + 1) * $scale : int($div1) * $scale;
}

sub __rounddown {
	my $scale = (@_ == 2) ? 1 : 10 ** $_[2];
	return int($_[1] / $scale) * $scale;
}

sub __min {
	my $rtn = $_[1];
	shift @_;
	for my $atom (@_) {if ($rtn > $atom) {$rtn = $atom}};
	return $rtn;
}

sub __max {
	my $rtn = $_[1];
	shift @_;
	for my $atom (@_) {if ($rtn < $atom) {$rtn = $atom}};
	return $rtn;
}

sub __hex2dec {
	my ($hex) = @_;
	my @hex = split (//,$hex);
	my $dec = 0;
	
	for my $char (@hex) {
		$dec = ($dec * 16) + index("0123456789abcdef", lc($char));
	}

	return $dec;
}
		
sub __dec2hex {
	my ($dec) = @_;
	my $hex = "";
	
	while ($dec > 0) {
		$hex = substr ("0123456789abcdef", ($dec & 15), 1) . $hex;
		$dec = int ($dec / 16);
	}
	
	if (!$hex) {$hex = "0";}
	
	return $hex;
}

sub __shift {
	my $rtn = $_[1];
	my $bits = $_[2];
	$rtn = int ($rtn * (2 ** $bits));
	return $rtn;
}

sub __dscp {
	my $dscp = lc ($_[0]);
	my $rtn;
	if (exists ($dscp_vals{$dscp})) {
		$rtn = $dscp_vals{$dscp};
	} elsif ($dscp =~ /^\d+$/) {
		$rtn = $dscp;
	} else {
		$rtn = 0;
	}
	return $rtn;
}

sub __calc {
    my @c_items = @_;
    shift @c_items;
    my $c_item = join ("", @c_items);
	return __rpn (__shunting (__tokenize ($c_item)));
}

sub __tokenize {
	my $inline = lc ($_[0]);
	my @inchar = split(//,$inline);
	my @tokens = ();
	my $token = -1;
	my $lastok = "";
	
	for my $char (@inchar) {
		if (($lastok eq "'") || ($lastok eq '"')) {
			if ($char eq $lastok) {
				$tokens [$token] = $char . $tokens[$token] . $char;
				$lastok = "";
			} else {
				$tokens [$token] .= $char;
			}
		} elsif (($char eq "'") || ($char eq '"')) {
			$token ++;
			$tokens [$token] = "";
			$lastok = $char;
		} elsif ((($char ge "0") && ($char le "9")) || ($char eq ".")) {
			if ($lastok ne "num") {$token ++};
			$lastok = "num";
			$tokens [$token] .= $char;
		} elsif (($char ge "a") && ($char le "z")) {
			if ($lastok ne "func") {$token ++};
			$lastok = "func";
			$tokens [$token] .= $char;
		} elsif (($char eq "(") || ($char eq ")") || ($char eq ",")) {
			$token ++;
			$lastok = "";
			$tokens [$token] = $char;
		} elsif ($char eq " ")  {
			$lastok = "";
		} else {
			if (($char eq "-") && (@tokens == 0)) {
				## If the first character in the line is a minus, assume unary minus, so make it part of the next number
                $lastok = "num";
				$token ++;
				$tokens [$token] = $char;
            } else {
				if ($lastok eq "op") {
					my $op2 = $tokens[$token] . $char;
					if (exists $Oper2char {$op2}) {
						$tokens [$token] .= $char;
						$lastok = "";
					} else {
						if ($char eq "-") {
							## If the second character in a multi character op is a minus, assume unary minus, so make it part of the next number
			                $lastok = "num";
							$token ++;
							$tokens [$token] = $char;
						} else {
							$token ++;
							$lastok = "op";
							$tokens [$token] = $char;
						}
					}
				} else {
					$token ++;
					$lastok = "op";
					$tokens [$token] = $char;
				}
			}
		}
	}
	
	foreach $token (@tokens) {
		if ($token =~ /^[a-z][a-z0-9]*$/) {
            if (not exists ($RPNfunctions {$token})) {
				print "Bad token - $token - Invalid function\n";
                return [0];
            }
        }
        
	}
	return @tokens;
}

sub __shunting {
	my @output = ();
	my @stack = ();
	my @where = ();
	my @argcnt = ();
	my @Oper;
	my $op;
	my $where;
	my $args;
	my $prec;
	my $assoc;
	my $prevprec;
	my $prevassoc;
	
	foreach my $token (@_) {
		if (($token =~ /^-?\d+\.*\d*$/) || ($token =~ /\'.*\'/) || ($token =~ /\".*\"/)){
			push (@output, $token);
			if (@where > 0) {
				pop (@where);
				push (@where, "TRUE");
			}
		} elsif (exists ($RPNfunctions {$token})) {
			push (@stack, $token);
			push (@argcnt, 0);
			if (@where > 0) {
				pop (@where);
				push (@where, "TRUE");
			}
			push (@where, "FALSE");
		} elsif ($token eq ",") {
			until ($stack [$#stack] eq "(") {
				push (@output, pop (@stack));
				if (@stack == 0) {return "Missing Right Paren. Output = " . join("|", @output)};
			}
			$where = pop (@where);
			if ($where eq "TRUE") {
				$args = pop (@argcnt);
				$args ++;
				push (@argcnt, $args);
				push (@where, "FALSE");
			}
		} elsif (exists ($Opers {$token})) {
			($prec, $assoc) = __GetPrecAssoc ($token);
			my $stackTop = $stack [$#stack];
			if (exists ($Opers {$stackTop})) {
				($prevprec, $prevassoc) = __GetPrecAssoc ($stackTop);				
				my $OperTop = 1;
				while ($OperTop) {
					if ((($assoc eq "L") && ($prec <= $prevprec)) || (($assoc eq "R") && ($prec < $prevprec))) {
						push (@output, pop (@stack));
						$OperTop = 0;
						$stackTop = $stack [$#stack];
						if (exists ($Opers {$stackTop})) {
							($prevprec, $prevassoc) = __GetPrecAssoc ($stackTop);
							$OperTop = 1;
						}
					} else {
						$OperTop = 0;
					}
				}
			}
			push (@stack, $token);
		} elsif ($token eq "(") {
			push (@stack, $token);
		} elsif ($token eq ")") {
			until ($stack[$#stack] eq "(") {
				push (@output, pop (@stack));
				if (@stack == 0) {return "Missing Left Paren. Output = " . join("|", @output)};
			}
			pop (@stack);
			if (exists ($RPNfunctions {$stack [$#stack]})) {
				$op = pop (@stack);
				$where = pop (@where);
				$args = pop (@argcnt);
				if ($where eq "TRUE") {$args++};
				push (@output, $args);
				push (@output, $op);
			}
		}
	}
	
	while (@stack > 0) {
		push (@output, pop (@stack));
    }
    
	return @output;
}	

sub __GetPrecAssoc {
	my $tok = $_[0];
	my $prec = 0;
	my $assoc = "L";

	if (exists ($Opers {$tok})) {
			($prec, $assoc) = @{$Opers {$tok}};	
	}
	return ($prec, $assoc);
}

sub __rpn {
	my @stack = ();
	my $op;
	my $args;
	my $line;
	
	foreach my $token (@_) {
		if (exists ($RPNfunctions {$token})) {
			$args = pop (@stack);
			@atoms = [];
			$atoms[0] = $token;
			push (@atoms, splice (@stack, -($args)));
			$function = join (" ", @atoms);
			my $val = &{$RPNfunctions {$token}};
			push (@stack, $val);
		} elsif (exists ($RPNopers {$token})) {
			$rpn2 = pop (@stack);
			$rpn1 = pop (@stack);
			my $rtn = &{$RPNopers {$token}};
			push (@stack, $rtn);
		} else {
			push (@stack, $token);
		}
	}	
    
	return $stack[0];
}	

##
#############################################################
##
## Logical functions
##
#############################################################

sub __and {
	shift @_;
	for my $atom (@_) {if ($atom eq ArcheFALSE) {return ArcheFALSE}};
	return ArcheTRUE;
}

sub __or {
	shift @_;
	for my $atom (@_) {if ($atom eq ArcheTRUE) {return ArcheTRUE}};
	return ArcheFALSE;
}

#############################################################
##
## Compare text functions
##
#############################################################

sub __eq {
	my @atoms = ($_[0] =~ /(".*?"|\S+)/g);
	return (__RemoveQuotes ($atoms[1]) eq __RemoveQuotes ($atoms[2])) ? ArcheTRUE : ArcheFALSE;
}

sub __ne {
	my @atoms = ($_[0] =~ /(".*?"|\S+)/g);
	return (__RemoveQuotes ($atoms[1]) ne __RemoveQuotes ($atoms[2])) ? ArcheTRUE : ArcheFALSE;
}

sub __in {
	my @atoms = ($_[0] =~ /(".*?"|\S+)/g);
	return index (lc(__RemoveQuotes ($atoms[2])),lc(__RemoveQuotes ($atoms[1]))) >= 0 ? ArcheTRUE : ArcheFALSE;
}

sub __inc {
	my @atoms = ($_[0] =~ /(".*?"|\S+)/g);
	return index (__RemoveQuotes ($atoms[2]),__RemoveQuotes ($atoms[1])) >= 0 ? ArcheTRUE : ArcheFALSE;
}


#############################################################
##
## Compare regex functions
##
#############################################################

sub __regex_eq {
	my @atoms = ($_[0] =~ /(".*?"|\S+)/g);
	return (__RemoveQuotes ($atoms[1]) =~ __RemoveQuotes ($atoms[2])) ? ArcheTRUE : ArcheFALSE;
}

sub __regex_ne {
	my @atoms = ($_[0] =~ /(".*?"|\S+)/g);
	return (__RemoveQuotes ($atoms[1]) !~ __RemoveQuotes ($atoms[2])) ? ArcheTRUE : ArcheFALSE;
}

#############################################################
##
## Other functions
##
#############################################################

sub __date {
	my ($date_fmt) = @_;
	my ($sec,$min,$hour,$day,$month,$year,$wday,$yday,$isdst) = localtime();
	my @mon = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec");
	my $year4 = $year + 1900;
	my $year2 = sprintf("%02d", $year % 100);
	my $year1 = $year % 100;
	my $month3 = $mon[$month];
	my $month2 = sprintf("%02d", ($month+1));
	my $month1 = $month + 1;
	my $day2 = sprintf("%02d", $day);
	
	$_ = $date_fmt;
	s/yyyy/$year4/;
	s/yy/$year2/;
	s/y/$year1/;
	s/mmm/$month3/;
	s/mm/$month2/;
	s/m/$month1/;
	s/dd/$day2/;
	s/d/$day/;
	
	return $_;
}

##
## Internal functions
##

sub __RemoveQuotes {
	my $line = $_[0];
	my $pos = index ($line, '"');
	if ($pos >= 0) {
		$line = substr ($line, ($pos + 1));
		$pos = index ($line, '"');
		if ($pos >= 0) {
			$line = substr ($line, 0, $pos);
		}
	}
	return $line;
}
	

sub IPv4_format {
	my ($arg) = @_;
	my @atoms = split(/([\.\/:])/,$arg);
	my $ipv4 = join (".", $atoms[0], $atoms[2], $atoms[4], $atoms[6]);

	return $ipv4;
}

sub Is_IPv4_Subnet {
	my ($cidr, $ip) = @_;
	my $ipv4 = IPv4_format ($cidr);
	my $len = CIDRv4Len ($cidr);
	my $start_ip = IPv4_Subnet ($ipv4, $len);
	## Convert CIDR IP to decimal
	my @atoms = split(/([\.\/:])/,$start_ip);
	my $start_ipv4dec = (((($atoms[0] * 256) + $atoms[2]) * 256) + $atoms[4]) * 256 + $atoms[6];
	my $wc_mask;
	my $end_ipv4dec;
	my $ipv4dec;
	
	## Special check for /32 host IPs
	if ($len == 32) {return ($ip eq $start_ip) ? ArcheTRUE : ArcheFALSE};

	## Do the same for the IP to check
	@atoms = split(/([\.\/:])/,$ip);
	$ipv4dec = (((($atoms[0] * 256) + $atoms[2]) * 256) + $atoms[4]) * 256 + $atoms[6];

	## Now the tricky part - to create the broadcast address for the subnet
	## Get the wildcard mask for the CIDR block
	$wc_mask = CIDRv4_to_WCMask ($cidr);
	## Convert to decimal and add to starting IP
	@atoms = split(/([\.\/:])/,$wc_mask);
	$end_ipv4dec = $start_ipv4dec + (((($atoms[0] * 256) + $atoms[2]) * 256) + $atoms[4]) * 256 + $atoms[6];

	return (($ipv4dec > $start_ipv4dec) && ($ipv4dec < $end_ipv4dec)) ? ArcheTRUE : ArcheFALSE;

}

sub IPv4Host {
	my ($offset, $ipv4, $cidrlen) = @_;
	my $sn_ipv4;
	my @atoms;
	my $sn_ipv4dec;
	my $end_ipv4dec;
	my $wcmask; 
	my $cidr;

	## Special check for /32 host IPs
	if ($cidrlen == 32) {return $ipv4};

	## Get Subnet and convert to decimal
	$sn_ipv4 = IPv4_Subnet ($ipv4, $cidrlen);
	@atoms = split(/([\.\/:])/,$sn_ipv4);
	$sn_ipv4dec = (((($atoms[0] * 256) + $atoms[2]) * 256) + $atoms[4]) * 256 + $atoms[6];

	if ($offset == 1) {
		## If offset is 1, get first host in subnet (SN + 1); unless /31 subnet
		if ($cidrlen < 31) {$sn_ipv4dec ++};
		return Dec2IP($sn_ipv4dec);
	} else {
		## If offset is -1, get last host in subnet (SN + WCmask - 1)
		$cidr = $sn_ipv4 . "/" . $cidrlen;
		$wcmask = CIDRv4_to_WCMask ($cidr); 
		@atoms = split(/([\.\/:])/,$wcmask);
		$end_ipv4dec = $sn_ipv4dec + ((((($atoms[0] * 256) + $atoms[2]) * 256) + $atoms[4]) * 256 + $atoms[6]);
		## If /31 subnet, do not decrement from subnet mask
		if ($cidrlen < 31) {$end_ipv4dec --};
		return Dec2IP($end_ipv4dec);
	}
}

sub CIDRv4_Subnet {
	my ($cidr) = @_;
	my $ipv4 = IPv4_format ($cidr);
	my $len = CIDRv4Len ($cidr);

	return (IPv4_Subnet ($ipv4, $len));
}

sub IPv4_Subnet {
	my ($ip, $len) = @_;
	my @atoms = split(/([\.\/:])/,$ip);
	my $ipv4dec = (((($atoms[0] * 256) + $atoms[2]) * 256) + $atoms[4]) * 256 + $atoms[6];
	my $subnet = 0;
	my $bitval = 1;
	my $i;

	for ($i = 32; $i > 0; $i --){
		if (($ipv4dec & 1) == 1) {
			if ($i <= $len) {
				$subnet += $bitval;
			}
		}
		$ipv4dec = int($ipv4dec / 2);
		$bitval = $bitval * 2;
	}
		
    return Dec2IP ($subnet);
}

sub IPv4Mask {
    return __Bits_to_IPv4 (__SNmask_in_Bits (32, $_[0]));
}

sub Dec2IP {
	my ($decip) = @_;
	my $oct1 = int($decip /256 /256 / 256);
	my $oct2 = int($decip /256 /256) - ($oct1 * 256) ;
	my $oct3 = int($decip /256) - ($oct1 * 256 * 256) - ($oct2 * 256);
	my $oct4 = $decip - int($decip/256) * 256;

	my $ip = join (".", $oct1, $oct2, $oct3, $oct4);
	return $ip;
}

sub CIDRv4_to_SNMask {
	my ($arg) = @_;
	my @atoms = split(/([\.\/:])/,$arg);
	my $snmask;

	$snmask = ($#atoms < 8) ? "0.0.0.0" : IPv4Mask($atoms [8]);

	return $snmask;
}

sub CIDRv4_to_WCMask {
	my ($arg) = @_;
	my @atoms = split(/([\.\/:])/,$arg);
	my $len = $#atoms < 8 ? 0 : $atoms[8];
	return __Bits_to_IPv4 (__WCmask_in_Bits (32, $len));
}

sub Port_from_IP {
	my ($arg) = @_;
	my @atoms = split(/([\.\/:])/,$arg);
	my $port = $#atoms < 8 ? 0 : $atoms[8];

    return $port;
}

sub CIDRv4Len {
	my ($arg) = @_;
	my @atoms = split(/([\.\/:])/,$arg);
	my $len = $#atoms < 8 ? 0 : $atoms[8];

	return $len;
}

sub __MaskLen {
	return (length($_[0]) == 32 ? unpack ("%32b*", pack ("B32", $_[0])) : unpack ("%128b*", pack ("B128", $_[0])));
}

sub __IPv4toCIDR {
	return ($_[0] . '/' . __MaskLen (__IPv4_to_Bits ($_[1])));
}

sub __IPv6toCIDR {
	return ($_[0] . '/' . __MaskLen (__IPv6only_to_Bits ($_[1])));
}

sub __WCmaskToBits {
	return ($_[1], - __MaskLen (($_[1] == 32 ? __IPv4_to_Bits ($_[0]) : __IPv6only_to_Bits ($_[0]))));
}

sub __WCv4toCIDR {
	return ($_[0] . '/' . (32 - __MaskLen (__IPv4_to_Bits ($_[1]))));
}

sub __WCv6toCIDR {
	return ($_[0] . '/' . (128 - __MaskLen (__IPv6only_to_Bits ($_[1]))));
}

sub __Bits_to_IPv4 {
	return join(".", unpack("C4C4C4C4", pack("B32", $_[0])));
}

sub __IPv4_to_Bits {
	return unpack ("B32", pack ("C4", split(/[\.\/:]/, $_[0])));
}

sub __Bits_to_IPv6only {
	return join (":", unpack ("H4H4H4H4H4H4H4H4", pack ("B128", $_[0])));
}

sub __IPv6only_to_Bits {
	return unpack("B128", pack ("H4H4H4H4H4H4H4H4", split (/:/,IPv6_ZeroExpand($_[0]))));
}

sub __SNmask_in_Bits {
	## Max bits (32 or 128), mask bit length
	return ("1" x $_[1] . "0" x ($_[0] - $_[1]));
}

sub __WCmask_in_Bits {
	return ("0" x $_[1] . "1" x ($_[0] - $_[1]));
}

sub Hex2Bits {
	my ($hex) = @_;
	my @hex = split (//,$hex);
	my $bits = "";
	my $bits4;
	my $hexpos; 

	for my $char (@hex) {
		$bits = $bits . $HexBits{lc($char)};
	}
	while (length($bits) < 16) {
		$bits = "0000" . $bits;
	}

	return $bits;
}

sub Bits2Hex {
	my ($bits, $zero) = @_;
	my @bits = split (//,$bits);
	my $hex = "";
	my $bits4;
	my $hexpos;
	my $bit4values = "0000|0001|0010|0011|0100|0101|0110|0111|1000|1001|1010|1011|1100|1101|1110|1111|";

	while ($#bits > 0) {
		$bits4 = shift (@bits) . shift (@bits) . shift (@bits) . shift (@bits);
		$hexpos = int (index($bit4values, $bits4) /5);
		$hex = $hex . substr("0123456789abcdef", $hexpos, 1);
	}

	if ($zero) {
		while ((substr($hex, 0, 1) eq "0") && (length ($hex) > 1)) {
			$hex = substr ($hex, 1);
		}
	}

	return $hex;
}

sub IPv6_format {
	my ($cidr, $return) = @_;
	my @atoms = split(/\//, $cidr);
	my $len = $atoms[1];
	my $ipv6 = $atoms[0];		## substr ($cidr, 0, (index ('/', $cidr) - 2));

	if ($return eq "IPv6") {
		return $ipv6;
	} elsif ($return eq "LEN") {
		return $len;
	}
}

sub IPv6_ZeroExpand {
	my ($ip) = @_;
	my @atoms;

	if (index ($ip, "::") >= 0) {
		## Special case #1 - only "::" => Return all zeroes
		if ($ip eq "::") {return "0:0:0:0:0:0:0:0";}
		
		## Special case #2 - ends with "::" => append trailing 0 before expanding
		if (substr ($ip, -2, 2) eq "::") {$ip = $ip . "0"};
	
		## Special case #3 - Starts with "::" => prepend leading 0 before expanding
		if (substr ($ip, 1, 2) eq "::") {$ip = "0" . $ip};

		@atoms = split(/:/,$ip);
		while ($#atoms < 7) {
			$ip =~ s/::/:0::/;
			@atoms = split(/:/,$ip);
		}
		$ip =~ s/::/:0:/;
	}

	return $ip;
}

sub IPv6_ZeroSuppress {
	my ($ip) = @_;
	## By starting with an ending zero, we can also suppress to the last colon-hex field
	my $pattern = ":0:0:0:0:0:0:0";

	$_ = $ip;

	## Special case for all zeroes / default route
	if ($ip eq "0:0:0:0:0:0:0:0") {return "::"};

	while (length ($pattern) > 1) {
		if (s/$pattern/::/) {
			s/::\.0/::0.0/;
			return $_;
		}
		$pattern = substr ($pattern, 0, -1);
	}

	return $ip;
}
	
sub IPv6_Subnet {
	my ($ip, $len) = @_;
	my @atoms;
	my $v6bits = "";
	my $bitval = 1;
	my $i;
	my $ipv6 = IPv6_ZeroExpand ($ip);
	my $ipv6bits = "";
	my $hex7;
	my $hex8;
	my $snbits;
	my $subnet = "";
	my $v6format = "IPV6";

	# print "*V6SN  IP: $($ip) IPv6: ($ipv6) \n";
	if (index ($ipv6, ".") >= 0) {
		## IPv4 mapped / compatible address
		@atoms = split(/[\.\/:]/,$ipv6);
		$hex7 = V4Octets2Hex ($atoms[6], $atoms[7]);
		$hex8 = V4Octets2Hex ($atoms[8], $atoms[9]);
		# print "*V6a SN ($ipv6) ($len) atoms ($#atoms): ",join ('|', @atoms), "\n";
		$atoms[6] = $hex7;
		$atoms[7] = $hex8;
		$#atoms = 7;
		# print "*V6b SN ($ipv6) ($len) atoms (@atoms): ",join ('|', @atoms), "\n";
		$v6format = "V4inV6";
	} else {
		@atoms = split(/[:\/]/,$ipv6);
	}

	## print "*Converting $ipv6 to bits \n";
	for my $hex (@atoms) {
		$snbits = Hex2Bits ($hex);
		## print "*Colon Hex value ($hex) = bits: $snbits \n";
		$ipv6bits = $ipv6bits . $snbits;
		}
	## print "* $ipv6bits \n";

	$snbits = substr ($ipv6bits, 0, $len);
	while (length ($snbits) < 128) {$snbits = $snbits . "0"};

	$subnet = IPv6_ZeroSuppress(Bits2IPv6($snbits, $v6format));

	return $subnet;
}

sub Is_IPv6_Subnet {
	my ($cidr, $ip2v6) = @_;
	my $ip1v6     = IPv6_ZeroExpand(IPv6_format ($cidr, "IPv6"));
	my $len       = IPv6_format ($cidr, "LEN");
	my $ip1v6bits = substr (IPv6toBits ($ip1v6), 0, $len);
	my $ip2v6bits = substr (IPv6toBits ($ip2v6), 0, $len);

	return ($ip1v6bits eq $ip2v6bits) ? ArcheTRUE : ArcheFALSE;

}

sub IPv6toBits {
	my ($ip) = @_;
	my $ipv6 = IPv6_ZeroExpand(IPv6_format ($ip, "IPv6"));
	my @atoms;
	my $ipv6bits = "";

	# print "*V6SN  IP: $($ip) IPv6: ($ipv6) \n";
	if (index ($ipv6, ".") >= 0) {
		## IPv4 mapped / compatible address
		@atoms = split(/[\.\/:]/,$ipv6);
		$atoms[6] = V4Octets2Hex ($atoms[6], $atoms[7]);
		$atoms[7] = V4Octets2Hex ($atoms[8], $atoms[9]);
		$#atoms = 7;
	} else {
		@atoms = split(/[:\/]/,$ipv6);
	}

	for my $hex (@atoms) {
		$ipv6bits = $ipv6bits . Hex2Bits ($hex);
	}

	return $ipv6bits;
}

sub Bits2IPv6 {
	my ($ipv6bits, $v6format) = @_;
	my $ipv6 = "";
	my $zerosup = 1;

	if ($v6format eq "IPV6") {
		while (length ($ipv6bits) > 0) {
			$ipv6 = $ipv6 . Bits2Hex (substr ($ipv6bits, 0, 16), $zerosup) . ":";
			$ipv6bits = substr ($ipv6bits, 16);
		}
		$ipv6 = substr ($ipv6, 0, -1);
		## print "*Format ($v6format) Bits ($ipv6bits): $ipv6 \n";
	} else {
		while (length ($ipv6bits) > 32) {
			$ipv6 = $ipv6 . Bits2Hex (substr ($ipv6bits, 0, 16), $zerosup) . ":";
			$ipv6bits = substr ($ipv6bits, 16);
		}
		# print "*Format ($v6format) Bits ($ipv6bits): $ipv6 \n";
		while (length ($ipv6bits) > 0) {
			$ipv6 = $ipv6 . Bin2Octet (substr ($ipv6bits, 0, 8), $zerosup) . ".";
			$ipv6bits = substr ($ipv6bits, 8);
		}
		$ipv6 = substr ($ipv6, 0, -1);
		# print "*Format ($v6format) Bits ($ipv6bits): $ipv6 \n";
	}

	return $ipv6;
}

sub CIDRv6_Subnet {
	my ($cidr) = @_;
	my @atoms = split(/\//, $cidr);
	my $len = $atoms[1];
	my $ipv6 = $atoms[0];		## substr ($cidr, 0, (index ('/', $cidr) - 2));

	# print "*CIDR SN cidr ($cidr) ($ipv6) ($len) atoms ($#atoms): ",join ('|', @atoms), "\n";

	return (IPv6_Subnet ($ipv6, $len));
}

sub CIDRv6_SNMask {
	my ($cidr) = @_;
	my $len = IPv6_format ($cidr, "LEN");
	my $mask = "";
	my $i;

	for ($i = 1; $i <= $len; $i ++) {$mask = $mask . "1"};
	while (length ($mask) < 128) {$mask = $mask . "0"};

	return IPv6_ZeroSuppress(Bits2IPv6($mask, "IPV6"));
}

sub CIDRv6_WCMask {
	my ($cidr) = @_;
	my $len = IPv6_format ($cidr, "LEN");
	my $mask = "";
	my $i;

	for ($i = 1; $i <= $len; $i ++) {$mask = $mask . "0"};
	while (length ($mask) < 128) {$mask = $mask . "1"};

	return IPv6_ZeroSuppress(Bits2IPv6($mask, "IPV6"));
}

sub __v6comp {
	my @atoms = __v6atoms (__v6expand ($_[0]));
	my $ipv6rtn = "";

	if (@atoms == 8) {
		for my $atom (@atoms) {
			while (length ($atom) > 1 && substr ($atom, 0, 1) eq "0") {$atom = substr ($atom, 1)};
			$ipv6rtn .= ($atom . ":");
		}
	} else {
		for my $atom (@atoms[0..5]) {
			while (length ($atom) > 1 && substr ($atom, 0, 1) eq "0") {$atom = substr ($atom, 1)};
			$ipv6rtn .= ($atom . ":");
		}

		for my $atom (@atoms[6..9]) {
			while (length ($atom) > 1 && substr ($atom, 0, 1) eq "0") {$atom = substr ($atom, 1)};
			$ipv6rtn .= ($atom . ".");
		}
	}
	return substr ($ipv6rtn, 0, -1);
}

sub __v6uncomp {
	my @atoms = __v6atoms (__v6expand ($_[0]));
	my $ipv6rtn = "";

	if (@atoms == 8) {
		for my $atom (@atoms) {
			while (length ($atom) < 4) {$atom = "0" . $atom};
			$ipv6rtn .= ($atom . ":");
		}
	} else {
		for my $atom (@atoms[0..5]) {
			while (length ($atom) < 4) {$atom = "0" . $atom};
			$ipv6rtn .= ($atom . ":");
		}

		for my $atom (@atoms[6..9]) {
			while (length ($atom) < 3) {$atom = "0" . $atom};
			$ipv6rtn .= ($atom . ".");
		}
	}
	return substr ($ipv6rtn, 0, -1);
}

sub __v6atoms {
	return split (/[\.\/:]/, $_[0]);
}

sub __v6expand {
	my ($ip) = @_;
	## If V4inV6, then the V4 section replaces 2 hex atoms, to the max atoms = 7, otherwise 8
	my $max = (index ($ip, ".") > 0) ? 7 : 8;
	my @atoms;

	if (index ($ip, "::") >= 0) {
		## Special case #1 - only "::" => Return all zeroes
		if ($ip eq "::") {return "0:0:0:0:0:0:0:0";}
		
		## Special case #2 - ends with "::" => append trailing 0 before expanding
		if (substr ($ip, -2, 2) eq "::") {$ip = $ip . "0"};
	
		## Special case #3 - Starts with "::" => prepend leading 0 before expanding
		if (substr ($ip, 0, 2) eq "::") {$ip = "0" . $ip};

		@atoms = split(/:/,$ip);
		while (@atoms < $max) {
			$ip =~ s/::/:0::/;
			@atoms = split(/:/,$ip);
		}
		$ip =~ s/::/:0:/;
	}

	return $ip;
}

sub V4Octets2Hex {
	my ($oct1, $oct2) = @_;
	my $bin1 = Octet2Bin ($oct1);
	my $bin2 = Octet2Bin ($oct2);
	my $hex = Bits2Hex (($bin1 . $bin2), 1);

	return $hex;
}

sub Octet2Bin {
	my ($octet) = @_;
	my $bin = "";

	while ($octet > 0) {
		if (($octet & 1) == 1) {
			$bin = "1" . $bin;
		} else {
			$bin = "0" . $bin;
		}
		$octet = int($octet / 2);
	}

	while (length ($bin) < 8) {$bin = "0" . $bin};

	return $bin;
}

sub Bin2Octet {
	my ($bin) = @_;
	my $octet = 0;
	my $bit = 1;

	while (length ($bin) > 0) {
		if (substr ($bin, -1, 1) eq "1") {
			$octet += $bit;
		}
		$bit *= 2;
		$bin = substr ($bin, 0, -1);
	}

	return $octet;
}
