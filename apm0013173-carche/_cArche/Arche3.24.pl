#!/tools/gt3/bin/perl
#
# v1.0   mae mar 2009
# V1.1   mae Mar 18 2009 - Reversed order of data and template files; added {else} and GE/GT/LE/LT operators
# v1.2   mae May 05 2009 - Added nested include file capability to the templates. Also changed NE and IN operators from ! and # to # and @
# v1.3   mae May 27 2009 - Added code to fix open inconsistencies between Unix and Windows versions of PERL
# v1.4   mae Jun 24 2009 - Added code to use global variables instead of command line 
# v2.0   mae Aug 17 2009 - Renamed to ART2 for Advanced Router Tool 2.0 and included the following new logic:
#                          Added new logic for SELECT-CASE-ENDCASE and FOR EACH-ENDEACH processing. 
#                          Also added global variables and key file / field information in the GLOBALS file
#                          Converted over to "strict" variable controls and FileHandle OO programming for OS independent file handles.
# v2.1   mae Dec 07 2009 - Fixed bug with Keyfield logic where reading keyfile generated premature EOF
# v2.2   mae Mar 19 2010 - Added SET command for global variables. 
#                          Keyfield globals now take an optional extra value which is the field name in the secondary file to match to the
#                            fieldname specified for the match.
#                          FOREACH command also takes an optional 4th value, which is the field in the EACH file to match to the variable in item 2
# v2.3   mae Jun 18 2010 - Changed logic to not open EACH files if presently not including this code. Also need to skip close of same files.
# v2.4   mae Oct 05 2010 - Added new IP function constructs
# v2.41  mae Oct 28 2010 - Fixed bug with SET commands not tracking conditional status
# v2.5   mae Nov 05 2010 - Added FilenameFormat global command for alternate file names
# v2.51  mae Nov 12 2010 - Added "uc" and "lc" functions for case conversion; added "add" and "sub" functions for number manipulation
# v2.52  mae Nov 30 2010 - Added "isv4sn" function to test if an IP address is part of a CIDR block
# v2.53  mae Jan 17 2011 - Added "mul" and "div" under number functions; made function processing recursive
# v2.54  mae Feb 02 2011 - More math functions - Floor, Ceiling, Int, RoundUp, RoundDown, Concat, Concatsp, Max
# v2.55  mae Mar 31 2011 - Added clear function for global text variables
#                          Added Host1 and HostN functions for 1st and last host in subnet
#                          Added logic to support For-Each nesting
#                          Added FilenameAlias global parameter to allow for alternate names for external files (typically files in For-Each constructs)
# v3.00  mae May 06 2011 - Added argument passing to include files
#                        -   Arguments will fall into new class of variables (Locals)
#                        -   Can be invoked either with a {PushArgs}{V1}{Vn} explicitly
#                        -   Or {PushArgs}{V1}{Vn} can be extrapolated from the include construct: >>[INCFILE] (Arg1, Arg2, ...)
#                        -   {PopArgs} construct within include module will retrieve arguments from LOCAL array
#                        -   Internally, includes will be bracketed with {PushLocal} and {PopLocal} commands to control extent of Locals
#                        -   Variable processing will be 1) Local, 2) Global, 3) Main Fields, 4) Key File Fields, 5) Each Fields
#                        -   SET and CLEAR function will now handle both Locals and Globals
#                        -   GSET, GCLEAR & LSET, LCLEAR function pairs specifically for Globals and Locals respectively
# v3.01  mae Mar 24 2012 - Added AS feature to key file (1:1) connections to allow for multiple concurrent data records
#                        -   Default AS name will be the filename, unless specified as an additional argument in the Globals file
#                        -   Also converted Key fields to use hashes. Key = <AS name>.<field name>
#                        - Included "process" option to Append command to treat input lines as possible commands
# v3.03  mae Mar 01 2014 - Changed name to ARCHE and ARTfuncs to ArcheFuncs
# v3.04  mae May 05 2014 - Added ReplaceVariables calls to arguments to ForNext code
# v3.05  MAE Aug 27 2014 - Moved all commands to Hash functions and internal subroutines
#                        - Version information for all scripts
#                        - Allowing control characters in output configurations
#                        - Local folder for customer specific templates
#                        - PERL-like IF (false = blank, 0, FALSE; otherwise true)
#                        - Allowing for complex keys for KeyFiles and For-Each files
#                        - Revision controls for created configurations
# v3.05b MAE Sep 02 2014 - Fixed a bug in the __ProcessSet function where it was setting values when the OK2output flag was not set
# v3.05c MAE Sep 16 2014 - Fixed a bug in the template pre-processing when the final line in a file did not end in a line delimiter
#                        - Corrected logic for using the new KeyTable for Key Files / Fields
# v3.05  MAE Nov 03 2014 - Promoted ARCHE from Beta to production
# v3.06  MAE Jun 01 2015 - Added FilenameAlternate options to allow for dynamic filename assignment at open for For-Each
#                        - Recoded to use "ArcheFuncs" instead of "ArcheFuncs_3.05" 
# v3.07  MAE Sep 25 2015 - Included ReplaceVariables in the For-Each processing for the source "field"
# v3.20  MAE Apr 24 2017 - Added JSON formatted data support

use strict;
use FileHandle;
use English;
use feature "switch";
use Getopt::Long;	#core module: allows named, switches in cmd line -file filename -flags     http://perldoc.perl.org/Getopt/Long.html
use JSON;
use lib "/code/_cArche/"; 
use ArcheFuncs;

# Definition of the elements in a REPEAT table entry base elements
use constant RptTYPE			=> 0;
use constant RptCMDSTART		=> RptTYPE + 1;
use constant RptCMDEND			=> RptCMDSTART + 1;
use constant RptMATCHLEVEL		=> RptCMDEND + 1;
use constant RptMATCHVAR		=> RptMATCHLEVEL + 1;
use constant RptENDFIXED		=> RptMATCHVAR;

# Definition of the elements in a REPEAT table entry - FOREACH
use constant RptFILE			=> RptENDFIXED + 1;
use constant RptINTFIELDNAME		=> RptFILE + 1;
use constant RptEXTFIELDNAME		=> RptINTFIELDNAME + 1;

# Definition of the elements in a REPEAT table entry - WHILE
use constant RptWHILEVAR		=> RptENDFIXED + 1;
use constant RptWHILEOP			=> RptWHILEVAR + 1;
use constant RptWHILEVALUE		=> RptWHILEOP + 1;

# Definition of the elements in a REPEAT table entry - FORNEXT
use constant RptFORVAR			=> RptENDFIXED + 1;
use constant RptSTARTVALUE		=> RptFORVAR + 1;
use constant RptENDVALUE		=> RptSTARTVALUE + 1;
use constant RptINCREMENT		=> RptENDVALUE + 1;

# Definition of the elements in a REPEAT table entry - FORIN
use constant RptFORINVAR		=> RptENDFIXED + 1;
use constant RptARRAY			=> RptFORINVAR + 1;
use constant RptELEMENT			=> RptARRAY + 1;

# Definitions for the various REPEAT types or methods
use constant RepeatFOREACH		=> 1;
use constant RepeatWHILE		=> 2;
use constant RepeatFORNEXTINC		=> 3;
use constant RepeatFORNEXTDEC		=> 4;
use constant RepeatFORIN		=> 5;

# Definitions for the various REPEAT options
use constant RepeatCONTINUE		=> 1;
use constant RepeatNEXT			=> 2;
use constant RepeatLAST			=> 3;
use constant RepeatSTART		=> 4;
use constant RepeatEND			=> 5;

# Definitions for the various MATCH classes and modes
use constant MatchClassNONE		=> "None";
use constant MatchClassIF		=> "If";
use constant MatchClassSELECT		=> "Select";
use constant MatchClassPERL		=> "Perl";

use constant MatchNOMATCH		=> "NoMatch";
use constant MatchMATCH			=> "Match";
use constant MatchSKIP			=> "Skip";

# Definitions for the elements in the KeyData tables
use constant KeyFILE			=> 0;
use constant KeyALIAS			=> KeyFILE + 1;
use constant KeyUSEALIAS		=> KeyALIAS + 1;
use constant KeyEXTFIELDS		=> KeyUSEALIAS + 1;
use constant KeyEXTFLDNUMS		=> KeyEXTFIELDS + 1;
use constant KeyINTFIELDS		=> KeyEXTFLDNUMS + 1;
use constant KeyINTFLDNUMS		=> KeyINTFIELDS + 1;
use constant KeyFIELDNAMES		=> KeyINTFLDNUMS + 1;
use constant KeyFIELDS			=> KeyFIELDNAMES + 1;

# Version control
our $NAME = "ARCHE";
our $VERSION = 3.07;	# read from outside as: print "$NAME version: ${$NAME}::VERSION\n";
our $SUB_VERSION = "Production";
our %REQ_VERSIONS = (
	"ArcheFuncs"	=> 3.06);

# Global variables
my %Globals = (
    form => "Tab",
    template => "",
    templatepath => "",
    local_templatepath => "",
    data => "",
    datapath => "",
    outputpath => "",
    outputext => ".txt",
    filenamefieldname => "Hostname",
    filenamefieldnum => -1,
    filenameformat => "",
    filenameoption => "Simple",
    tempfile => "",
    verbose => "No",
    printwarn => 0,
    dumpglobals => "no",
    tracemode => 0,
    reorder_code => 0,
    revisions => 0
    );

my @GlobalOptions = [
    "form",
    "template",
    "templatepath",
    "local_templatepath",
    "data",
    "datapath",
    "outputpath",
    "outputext",
    "filenamefieldname",
    "filenamefieldnum",
    "filenameformat",
    "filenameoption",
    "tmpfile",
    "verbose",
    "printwarn",
    "dumpglobals",
    "tracemode",
    "reorder_code",
    "revisions",
    ] ;

my @tmpxref = ();

# Data Placeholders for alternate input forms
my @each_files = ();
my %each_data;

# Other variables
my %args;
my @cmd_argv = ();				#stores un-named cmd line argument
my $cmd_argv_count = @ARGV;
my $globalfile = "";
my $input_line = "";
my @Gatoms = ();
my @Gatoms_repl = ();
my @variable = ();
my @value = ();
my @Ggvar = ();
my @Ggval = ();
my %GlobalVars = ();
my %HardGlobalVars = ();
my $gvar;
my $gval;
my %Lvars = ();
my %LvarsDepth = ();
my $LvarDepth = 0;
my %LocalVars = ();
my @Gevar = ();
my @Geval = ();
my @argval = ();
my @argstack = ();
my %keyxref = ();
my @keytable = ();
my @globalkeyfiles = ();
my $keyerr = 0;
my $keyfound;
my $OK2output;
my $OK2output_prev;
my @OK2output_stack = ();
my $NumHardGlobals;
my $ArcheTrue;
my $ArcheFalse;

## Match variables
my @match_mode_stack = ();
my @match_class_stack = ();
my @match_var_stack = ();
my @match_var_repl_stack = ();
my $match_class = MatchClassNONE;
my $match_mode = MatchNOMATCH;
my $match_var = "";
my $match_var_repl = "";

## Operators
my %Oper2char = (
	"@@" => "INC",		# In - case in-sensitive
	"IN" => "IN",		# In - case sensitive
	"##" => "##",		# Numeric not equal
	"NE" => "NE",
	">=" => "GE",
	"GE" => "GE",
	"GT" => "GT",
	"<=" => "LE",
	"LE" => "LE",
	"LT" => "LT"
);
my %Oper1char = (
	"@"  => "IN",		# In - case sensitive
	"="  => "==",		# Numeric equal
	"#"  => "NE",
	">"  => "GT",
	"<"  => "LT",
);

## Commands
my %ArcheCommands = (
	append		=> sub {return __ARCHEcmd_append ()},
	case		=> sub {return __ARCHEcmd_case ()},
	clear		=> sub {return __ProcessSet ($Gatoms_repl[1], "", "Both")},
	debug		=> sub {return __ARCHEcmd_debug ()},
	debugmode	=> sub {return __ARCHEcmd_debugmode ()},
	dumparg		=> sub {return __ARCHEcmd_dumparg ()},
	dumpglobal	=> sub {return __ARCHEcmd_dumpglobal ()},
	dumplocal	=> sub {return __ARCHEcmd_dumplocal ()},
	else		=> sub {return __ARCHEcmd_else ()},
	elsecase	=> sub {return __ARCHEcmd_elsecase ()},
	elseif		=> sub {return __ARCHEcmd_elseif ()},
	end		=> sub {return __ARCHEcmd_end ()},
	endarray	=> sub {return __ARCHEcmd_endarray ()},
	endcase		=> sub {return __ARCHEcmd_endselect ()},
	endeach		=> sub {return 0},
	endfor		=> sub {return 0},
	endin		=> sub {return 0},
	endselect	=> sub {return __ARCHEcmd_endselect ()},
	endtable	=> sub {return __ARCHEcmd_endtable ()},
	endwhile	=> sub {return 0},
	foreach		=> sub {return 0},
	fornext		=> sub {return 0},
	for		=> sub {return 0},
	gclear		=> sub {return __ProcessSet ($Gatoms_repl[1], "", "Global")},
	gset		=> sub {return __ProcessSet ($Gatoms_repl[1], $Gatoms_repl[2], "Global")},
	if		=> sub {return __ARCHEcmd_if ()},
	last		=> sub {return 0},
	lclear		=> sub {return __ProcessSet ($Gatoms_repl[1], "", "Local")},
	lookup		=> sub {return __ARCHEcmd_lookup ()},
	lset		=> sub {return __ProcessSet ($Gatoms_repl[1], $Gatoms_repl[2], "Local")},
	next		=> sub {return 0},
	popargs		=> sub {return __ARCHEcmd_popargs ()},
	poplocal	=> sub {return __ARCHEcmd_poplocal ()},
	pushargs	=> sub {return __ARCHEcmd_pushargs ()},
	pushlocal	=> sub {return __ARCHEcmd_pushlocal ()},
	select		=> sub {return __ARCHEcmd_select ()},
	set		=> sub {return __ProcessSet ($Gatoms_repl[1], $Gatoms_repl[2], "Both")},
	while		=> sub {return 0},
	);

my %ArcheCommandArgs = (
	append		=> (1, 2),
	case		=> (1, -1),
	clear		=> (1, 1),
	debug		=> (0, 0),
	debugmode	=> (1, 1),
	dumparg		=> (0, 1),
	dumpglobal	=> (0, 1),
	dumplocal	=> (0, 1),
	else		=> (0, 0),
	elsecase	=> (0, 0),
	elseif		=> (1, -1),
	end		=> (0, 0),
	endarray	=> (0, 0),
	endcase		=> (0, 0),
	endeach		=> (0, 0),
	endfor		=> (0, 0),
	endin		=> (0, 0),
	endselect	=> (0, 0),
	endtable	=> (0, 0),
	endwhile	=> (0, 0),
	foreach		=> (2, 4),
	fornext		=> (3, 4),
	for		=> (3, 3),
	gclear		=> (1, 1),
	gset		=> (2, 2),
	if		=> (1, -1),
	last		=> (0, 0),
	lclear		=> (1, 1),
	lookup		=> (0, 0),
	lset		=> (2, 2),
	next		=> (0, 0),
	popargs		=> (1, -1),
	poplocal	=> (0, 0),
	pushargs	=> (1, -1),
	pushlocal	=> (0, 0),
	select		=> (1, 1),
	set		=> (2, 2),
	while		=> (2, 2)
	);

my %ArcheCommandOpPos = (
	append		=> (0, 0),
	case		=> (2, 2),
	clear		=> (0, 0),
	debug		=> (0, 0),
	debugmode	=> (0, 0),
	dumparg		=> (0, 0),
	dumpglobal	=> (0, 0),
	dumplocal	=> (0, 0),
	else		=> (0, 0),
	elsecase	=> (0, 0),
	elseif		=> (3, 3),
	end		=> (0, 0),
	endarray	=> (0, 0),
	endcase		=> (0, 0),
	endeach		=> (0, 0),
	endfor		=> (0, 0),
	endin		=> (0, 0),
	endselect	=> (0, 0),
	endtable	=> (0, 0),
	endwhile	=> (0, 0),
	foreach		=> (0, 0),
	fornext		=> (0, 0),
	for		=> (0, 0),
	gclear		=> (0, 0),
	gset		=> (0, 0),
	if		=> (3, 3),
	last		=> (0, 0),
	lclear		=> (0, 0),
	lookup		=> (0, 0),
	lset		=> (0, 0),
	next		=> (0, 0),
	popargs		=> (0, 0),
	poplocal	=> (0, 0),
	pushargs	=> (0, 0),
	pushlocal	=> (0, 0),
	select		=> (0, 0),
	set		=> (0, 0),
	while		=> (3, 3)
	);

my %RepeatStartCmds = (
	foreach		=> RepeatFOREACH,
	fornext		=> RepeatFORNEXTINC,
	for		=> RepeatFORIN,
	while		=> RepeatWHILE);

my %RepeatEndCmds = (
	endeach		=> RepeatFOREACH,
	endfor		=> RepeatFORNEXTINC,
	endin		=> RepeatFORIN,
	endwhile	=> RepeatWHILE);

my $tpl_line;
my $cfg_line;
my $cfg_line_repl;
my $cmd_line;
my $cmd_line_num;
my $ltfound;
my $cmatch;
my $matchtype;
my $prev_cond;
my $data_record;
my $cfg_file;
my $trace_file;
my $Gatom0;
my $Gatom1;
my $Gatom2;
my $column_header;
my ($i, $j);
my $func;
my $fstart;
my $fend;
my $flen;
my $fnfmt;
my $fnvalid;
my $outpath;
my @fnreal = ();
my @fnalias = ();
my %fnalternate = ();
my $debugmode = "NO";

## Repeat table entries
my @repeat_table = ();
my @repeat_stack = ();
my @repeat_cmds = ();
my @repeat_lines = ();

## Each table entries
my $etable = 0;
my @efiles = ();
my @eextkeyfield = ();
my @eintkeyfield = ();
my @ekeyfieldnum = ();
my @ecmdstart = ();
my @ecmdend = ();

# File handles
my $global_fh;
my $data_fh;
my $tempfile_fh;
my $keyfh;

local $/ = $RS;
local $| = 1;		#No STDOUT Buffering, flush buffer with every print regardless of end of line

GetOptions(\%args,
	# Customize cmd line arguments here (specific per script)
	"version",
	"help|?|man",			# saves in $args{help} a value if either -help, -? or -man were argumented
	'<>' => \&cmd_argv_handler,	#unnammed arguments are sent to this function to handle them
	) or directions ();

validate_arguments ();

ArcheFuncs::CheckVersion(3.05);

# Get name of control information file
$globalfile = $cmd_argv[0];

ProcessGlobals ($globalfile);

# Let's check for some critical global values
if ($Globals{template}  eq "") {die "$0: Template filename is not defined in file $globalfile ";}
if (($Globals{data} eq "") && ($Globals{form} eq "Tab")) {
	print "Data filename is not defined in file $globalfile \n";
	exit
	}

###########################################
##
## Insert JSON branch here
##
###########################################

if ($Globals{form} eq "Tab") {	
	# Data File
	$Globals{data} = $Globals{datapath} . $Globals{data};
	$data_fh = EZOpen ($Globals{data}, $Globals{datapath}, "", "Router data file", 478);

	# Read header record and place variables in an array
	$column_header = <$data_fh>;
	chomp($column_header);
	@variable = split(/\t/, $column_header);
} elsif ($Globals{form} eq "JSON") {
	# Fields "variable" and "value" loaded as part of JSON processing
} else {
	die "$0: Invalid Global file form ($Globals{form}) in $globalfile ";
}

$i = 0;
for my $var (@variable){
	if ($var eq $Globals{filenamefieldname}) {
		$Globals{filenamefieldnum} = $i;
		print "  Filename Field Num: $Globals{filenamefieldnum} \n" if $Globals{printwarn};
	}
	$i ++;
}

if ($Globals{filenamefieldnum} == -1) {
	if ($Globals{filenameoption} eq "Simple") {
		die "Error - invalid FilenameField entry ($Globals{filenamefieldname})";
	} else {
		# If not specifically defined, assume that the first column in the table is the key field
		$Globals{filenamefieldnum} = 1;
	}
} 

# If any keyfile errors, we need to exit. But this way we get them all defined first before we terminate.
if (PrepKeyFields ()) {exit};

# Template File
PreProcTpl ($Globals{template}, $Globals{tempfile}, $Globals{verbose}, $Globals{printwarn});

# Read rest of <data-file>, substituting variables in <template-file>
# with data values, and writing out the config.
$fnvalid = -1;

$ArcheTrue = ArcheFuncs::ArcheFuncsTRUE();
$ArcheFalse = ArcheFuncs::ArcheFuncsFALSE();

my $more_records = 1;

READ_DATA:
while ($more_records) {
	if ($Globals{form} eq "Tab") {
		if ($data_record = <$data_fh>) {
			chomp($data_record);
			@value = split(/\t/,$data_record);
			print "Preparing to process data for ($value[$Globals{filenamefieldnum}])  . . .\n";
		} else {
			$more_records = 0;
			goto READ_DATA;
		}
	} elsif ($Globals{form} eq "JSON") {
        $more_records = 0;
		# Fields "variable" and "value" loaded as part of JSON processing
	}

	$fnvalid = 1;
    $outpath = $Globals{outputpath};

	if ($Globals{filenameoption} eq "Simple") {
		# Simple filename - if field is empty, FN = invalid
		unless ($value[$Globals{filenamefieldnum}]) {
			$fnvalid = 0;
		}
	} else {
		# Not sure yet, let's just get a copy of the file name format to process it
		$fnfmt = $Globals{filenameformat};
	}

	$i = 0;
	for my $var (@variable){
		if ($value[$i] eq "") {
			## print "  *** Data file has a null value for $var \n" if $Globals{verbose} eq "Yes";
		}
		if ($Globals{filenameoption} eq "Complex") {
			# Need to replace variables with their values
			$fnfmt =~ s/<$variable[$i]>/$value[$i]/g;
			$outpath =~ s/<$variable[$i]>/$value[$i]/g;
		}
		$i ++;
	}

	if ($Globals{filenameoption} eq "Complex") {
		# OK - Filename format name option, lets make sure all the fields were replaced
		if (index($fnfmt, '<') >= 0) {
			# oops - must have missed one
			print "  *** Some fields not replaced in file name format ($fnfmt) \n";
			$fnvalid = 0;
		}
	}
	# Make sure we have a good value for the config file name
    if ($fnvalid == 0) {
        if ($Globals{form} eq "JSON") {
            $more_records = 0;
        }
    	next READ_DATA;
    }

	LoadKeyFields ();

	# Now it's time to output to the configuration file the results
	# excluding those lines that do not meet selected criteria
	if ($Globals{filenameoption} eq "Complex") {
        if (!-e $outpath) {
            mkdir $outpath;
        }
		$cfg_file = $outpath . $fnfmt;
		print "Generating config for ($fnfmt)  . . .\n";
		$trace_file = $outpath . $fnfmt . ".trace" . $Globals{outputext};
		print "  Output trace is in ($trace_file) \n" if $Globals{tracemode};
	} else {
		$cfg_file = $Globals{outputpath} . $value[$Globals{filenamefieldnum}];
		print "Generating config for ($value[$Globals{filenamefieldnum}])  . . .\n";
		$trace_file = $Globals{outputpath} . $value[$Globals{filenamefieldnum}] . ".trace" . $Globals{outputext};
		print "  Output trace is in ($trace_file) \n" if $Globals{tracemode};
	}

	# If we are saving revisions, now is the time to do it
	if ($Globals{revisions} > 0) {
		my $cfg_base = $cfg_file . ".rev";
		# Delete the last revision asked for
		unlink ($cfg_base . $Globals{revisions} . $Globals{outputext});
		# If any previous revisions exist, rename them 1 rev # higher
		$i = $Globals{revisions} - 1;
		while ($i >= 1) {
			if (-e ($cfg_base . $i . $Globals{outputext})) {
				rename ($cfg_base . $i. $Globals{outputext}, $cfg_base . ($i + 1) . $Globals{outputext});
			}
			$i --;
		}
		# Finally if there is an old file, rename it to Rev 1
		if (-e ($cfg_file . $Globals{outputext})) {
			rename ($cfg_file . $Globals{outputext}, $cfg_base . "1" . $Globals{outputext});
		}
	}

	$cfg_file = $cfg_file . $Globals{outputext};
	open (CFIL, "> $cfg_file") || die "Problem opening cfg file, $cfg_file, for output ";
	if ($Globals{tracemode}) {
		open (TRFIL, "> $trace_file") || die "Problem opening trace file, $trace_file, for output ";
		print TRFIL "Starting to trace output at line 1 in $Globals{tempfile} \n";
	}

	# Set printing conditional to 1, meaning we include it
	$OK2output = 1;
	$OK2output_prev = 1;

	# Setup a stack to save printing and select conditions. As we encounter nested conditionals, we can save the old state
	@OK2output_stack = ();
	@match_class_stack = ();
	@match_mode_stack = ();
	@match_var_stack = ();
	$match_class = MatchClassNONE;
	$match_mode = MatchNOMATCH;

	# Also reset repeatable status tables
	@repeat_table = ();
	@repeat_stack = ();
	@repeat_cmds = ();
	@repeat_lines = ();

	# Time to reset the variables - clear out the locals and reset the globals to just the hard (options file) values
	%Lvars = ();
	%LvarsDepth = ();
	$LvarDepth = 0;
	@Gevar = ();
	@Geval = ();
	%GlobalVars = ();
	@argval = ();
	@argstack = ();

	# Use a copy of the template information to create a baseline configuration
	open (TEMPL, "< $Globals{tempfile}") || die "Problem re-opening temporary template file $Globals{tempfile} ";

	$tpl_line = 1;	
	while ($cfg_line = <TEMPL>) {
		chomp($cfg_line);

		# Now it's time to output to the configuration file the results
		# excluding those lines that do not meet selected criteria
		@Gatoms = Atomize($cfg_line);
		GlobalAtomize ();

		# Only process repeatable keyword commands here (FOREACH, FORNEXT, FOR, WHILE)
		# The rest of the conditionals and keywords will be handled in the ProcessLine subroutine

		if (@repeat_stack > 0) {
			PreProcessRepeat ($cfg_line);
		} elsif (exists ($RepeatStartCmds {$Gatom0})) {
			PreProcessRepeat ($cfg_line);
		} else {
			ProcessLine ($cfg_line, $tpl_line);
		}
		$tpl_line ++;
	}
	close CFIL;
	if ($Globals{tracemode}) {
		$tpl_line --;
		print TRFIL "EOF at $tpl_line in $Globals{tempfile} \n";
		close TRFIL;
	}

	close TEMPL;

	if (($Globals{printwarn}) && ($fnvalid == 1)) {&find_unsubstituted;}

}

if ($Globals{dumpglobals} eq "yes") {
	while (($gvar, $gval) = each %HardGlobalVars) {
		print "  Global Variable:    $gvar : $gval \n";
	}
	while (($gvar, $gval) = each %GlobalVars) {
		print "  Global Variable:    $gvar : $gval \n";
	}

	## for ($i = 0; $i <= $#Ggvar; $i++) {
	##	print "Global variable ($Ggvar[$i]): last value: ($Ggval[$i]) \n";
	## }
}

exit;

sub ProcessLine {
	my ($line, $line_num) = @_;
	my $operator;
	my $CmdRtn;
	## my $cond_join = join ("|", @OK2output_stack);

	## NEXT and LAST commands are handled in other routines, so skip them and just return now	
	if (($Gatom0 eq "next") || ($Gatom0 eq "last")) {return};

	# Replace all variables with their corresponding data values
	if (index ($line, "<") >= 0) {
		$cfg_line_repl = ReplaceVariables ($line);
	} else {
		$cfg_line_repl = $line;
	}
	## print "in Process Line - after var replace ($cfg_line) \n" if $Globals{verbose} eq "Yes";

	# Replace all functions with their results
	$cfg_line_repl = ArcheFuncs::ProcessFunction ($cfg_line_repl, $tpl_line, $cfg_line, $OK2output);

	if ($#Gatoms < 0) {
		#
		# OK now - no conditionals in original line, just a possible line of output. So, do we include it???
		#
		if ($OK2output) {
			$cfg_line_repl = RemoveEscapes ($cfg_line_repl);
			print CFIL "$cfg_line_repl\n";
			print "$cfg_line_repl\n" if $Globals{verbose} eq "Screen";
		} else {
			print "Skipping line: $cfg_line" if $Globals{verbose} eq "Yes";
		}
		return;
	}

	##
	## Since we could have replaced command atoms, re-split the command line
	##
	@Gatoms_repl = Atomize ($cfg_line_repl);

	if (@Gatoms_repl == 0) {
		#
		# OK now - no conditional, just a possible line of output. So, do we include it???
		#
		if ($OK2output) {
			$cfg_line_repl = RemoveEscapes ($cfg_line_repl);
			print CFIL "$cfg_line_repl\n";
			print "$cfg_line_repl\n" if $Globals{verbose} eq "Screen";
		} else {
			print "Skipping line: $cfg_line" if $Globals{verbose} eq "Yes";
		}
		return;
	}

	if (exists ($ArcheCommands{$Gatom0})) {
		$cmd_line = $line;
		$cmd_line_num = $line_num;
		$CmdRtn = &{$ArcheCommands{$Gatom0}};
	} else {
		##
		## Handle implied "IF"s here; PERL "IF"s are processed by the IF command handler
		##
		if (@Gatoms == 1) {
			print "found single atom ($Gatom0) - processing \n" if $Globals{verbose} eq "Yes";
		}
		# Save the old value of the output conditional
		push (@OK2output_stack, $OK2output);
		$OK2output_prev = $OK2output;
		## Save previous match class and reset to IF
		push @match_class_stack, $match_class;
		$match_class = MatchClassIF;
		## Save previous match mode
		push @match_mode_stack, $match_mode;
		$match_mode = ($OK2output) ? MatchNOMATCH : MatchSKIP;

		if ($match_mode eq MatchNOMATCH) {
			# Let's see if we match so we know how to process
			if (@Gatoms == 1) {
				$match_mode = MatchCheck1 ($Gatoms_repl[0], $match_class);
			} else {
				$operator = FindOperator ($line, 2);
				$match_mode = MatchCheck ($Gatoms_repl[0], $operator, 1);
			}
			$OK2output = ($match_mode eq MatchMATCH) ? $OK2output_prev : 0;
		}
		if ($Globals{tracemode}) {TraceOutput ($line, $line_num, $cfg_line_repl, $match_class)};
	}
}

sub __ARCHEcmd_if {
	##
	## Handle explicit (PERL) "IF"s here
	##
	my $operator;

	# We don't have a match yet and we are not skipping over this, so let's see if we match
	push (@OK2output_stack, $OK2output);
	$OK2output_prev = $OK2output;
	## Save previous match class
	##  - Set to NOMATCH if we have an empty value
	##  - Otherwise (we have a value), if OK to output, the set to MATCH
	##  - Unless not OK to output, then set to SKIP
	push @match_class_stack, $match_class;
	$match_class = MatchClassPERL;
	## Save previous match mode, then determine how we need to set the mode
	push @match_mode_stack, $match_mode;
	if ($OK2output) {
		$match_mode = MatchNOMATCH;
	} else {
		$match_mode = MatchSKIP;
	}
	if ($match_mode eq MatchNOMATCH) {
		if (@Gatoms == 2) {
			$match_mode = MatchCheck1 ($Gatoms_repl[1], $match_class);
		} else {
			$operator = FindOperator ($cmd_line, 3);
			$match_mode = MatchCheck ($Gatoms_repl[1], $operator, 2);
		}
		$OK2output = ($match_mode eq MatchMATCH) ? $OK2output_prev : 0;
	}
	if ($Globals{tracemode}) {TraceOutput ($cmd_line, $cmd_line_num, $cfg_line_repl, $match_class)};
	return 1;
}

sub __ARCHEcmd_elseif {
	my $operator;
	
	if ($match_mode eq MatchNOMATCH) {
		##
		## We don't have a match yet and we are not skipping over this, so let's see if we match
		##
		if (@Gatoms == 2) {
			$match_mode = MatchCheck1 ($Gatoms_repl[1], $match_class);
		} else {
			$operator = FindOperator ($cmd_line, 3);
			$match_mode = MatchCheck ($Gatoms_repl[1], $operator, 2);
		}
		$OK2output  = ($match_mode eq MatchMATCH) ? $OK2output_prev : 0;
	} else {
		##
		## Previous "if" or "elseif" was a Match, so now we need to skip the rest
		##
		$OK2output = 0;
		$match_mode = MatchSKIP;
	}
	if ($Globals{tracemode}) {TraceOutput ($cmd_line, $cmd_line_num, $cfg_line_repl, $match_class)};
	return 1;
}

sub __ARCHEcmd_else {
	if ($match_mode eq MatchNOMATCH) {
		##
		## We don't have a match yet, so let's just set the output flag to Yes and set match mode flag to MATCHED
		##
		$OK2output = $OK2output_prev;
		$match_mode = MatchMATCH
	} else {
		##
		## Previous "if" or "elseif" was a Match, so now we need to skip the rest
		##
		$OK2output = 0;
		$match_mode = MatchSKIP;
	}
	if ($Globals{tracemode}) {TraceOutput ($cmd_line, $cmd_line_num, $cfg_line_repl, $match_class)};
	return 1;
}

sub __ARCHEcmd_end {
	# restore previous match class and mode
	$match_class = pop @match_class_stack;
	$match_mode  = pop @match_mode_stack;
	# End of conditional, resume previous printing condition
	$OK2output = pop @OK2output_stack;
	$OK2output_prev = $OK2output_stack [$#OK2output_stack];
	if ($Globals{tracemode}) {TraceOutput ($cmd_line, $cmd_line_num, $cfg_line_repl, $match_class)};
	return 1;
}

sub __ARCHEcmd_select {
	## Save previous match mode; reset to NOMATCH unless not OK to output, then set to SKIP
	push @match_mode_stack, $match_mode;
	$match_mode = ($OK2output) ? MatchNOMATCH : MatchSKIP;

	## Save previous match class, set mode to SELECT
	push @match_class_stack, $match_class;
	$match_class = MatchClassSELECT;
	
	## Now lets save the variables from previous Selects
	push @match_var_stack, $match_var;
	push @match_var_repl_stack, $match_var_repl;
	
	$match_var = $Gatoms[1];
	$match_var_repl = $Gatoms_repl[1];
	
	## Also push conditional print flag
	push (@OK2output_stack, $OK2output);
	$OK2output_prev = $OK2output;
	$OK2output = 0;
	return 1;
}

sub __ARCHEcmd_case {
	my $operator;
	
	if ($match_mode eq MatchNOMATCH) {
		##
		## We don't have a match yet and we are not skipping over this, so let's see if we match
		##
		$operator = FindOperator ($cmd_line, 2);
		$match_mode = MatchCheck ($match_var_repl, $operator, 1);
		$OK2output = ($match_mode eq MatchMATCH) ? $OK2output_prev : 0;
	} else {
		##
		## Previous "case" was a match, so skip all remaining steps
		##
		$OK2output = 0;
		$match_mode = MatchSKIP;
	}
	if ($Globals{tracemode}) {TraceOutput ($cmd_line, $cmd_line_num, $cfg_line_repl, $match_class)};
	return 1;
}

sub __ARCHEcmd_elsecase {
	if ($match_mode eq MatchNOMATCH) {
		##
		## We don't have a match yet, so let's just set the output flag to Yes and set match mode flag to MATCHED
		##
		$OK2output = $OK2output_prev;
		$match_mode = MatchMATCH
	} else {
		##
		## Previous "case" was a match, so skip all remaining steps
		##
		$OK2output = 0;
	}
	if ($Globals{tracemode}) {TraceOutput ($cmd_line, $cmd_line_num, $cfg_line_repl, $match_class)};
	return 1;
}

sub __ARCHEcmd_endselect {
	# Now lets restore the variables from the previous Select
	$match_var_repl = pop @match_var_repl_stack;
	$match_var = pop @match_var_stack;

	# As well as the previous match class and mode
	$match_class = pop @match_class_stack;
	$match_mode  = pop @match_mode_stack;

	# Restore previous printing condition
	$OK2output = pop @OK2output_stack;
	$OK2output_prev = $OK2output_stack [$#OK2output_stack];
	if ($Globals{tracemode}) {TraceOutput ($cmd_line, $cmd_line_num, $cfg_line_repl, $match_class)};
	return 1;
}

sub __ARCHEcmd_dumparg {
	my $prefix = ($Gatom1 eq "") ? "" :$Gatom1 . " ";
	my $i = 0;
	for my $arg (@argval) {
		print $prefix . "Arguments stack dump ($i): Value: ($arg) \n" if $Globals{printwarn};
		print CFIL $prefix . "Arguments stack dump ($i): Value: ($arg) \n";
		$i ++;
	}
	if (@argval == 0) {
		print $prefix . "Arguments stack dump: NONE \n" if $Globals{printwarn};
		print CFIL $prefix . "Arguments stack dump: NONE \n";
	}
	return 1;
}

sub __ARCHEcmd_dumplocal {
	my $prefix = ($Gatom1 eq "") ? "" :$Gatom1 . " ";
	while (my ($lvar, $lval) = each %Lvars) {
		my $lv_depth = $LvarsDepth{$lvar};
		print $prefix . "Locals dump: Var: ($lvar) Value: ($lval) Depth: ($lv_depth)\n" if $Globals{printwarn};
		print CFIL $prefix . "Locals dump: Var: ($lvar) Value: ($lval) Depth: ($lv_depth)\n";
	}
	return 1;
}

sub __ARCHEcmd_dumpglobal {
	my $prefix = ($Gatom1 eq "") ? "" : $Gatom1 . " ";
	while (($gvar, $gval) = each %HardGlobalVars) {
		print $prefix . "Globals dump: Var: ($gvar) Value: ($gval) \n" if $Globals{printwarn};
		print CFIL $prefix . "Globals dump: Var: ($gvar) Value: ($gval) \n";
	}
	while (($gvar, $gval) = each %GlobalVars) {
		print $prefix . "Globals dump: Var: ($gvar) Value: ($gval) \n" if $Globals{printwarn};
		print CFIL $prefix . "Globals dump: Var: ($gvar) Value: ($gval) \n";
	}
	return 1;
}

sub __ARCHEcmd_pushargs {
	my $lsize = $#argval;
	push (@argstack, $lsize);
	push (@argval, reverse (@Gatoms_repl[1..$#Gatoms_repl]));
	return 1;
}

sub __ARCHEcmd_popargs {
	my $popvalue;
	
	## Pop off the values one at a time, appling them to local variables defined in the remaining atoms
	for my $argvar (@Gatoms[1..$#Gatoms]) {
		## But don't exceed the number of entries we from the last attempt
		if ($#argval > $argstack[$#argstack]) {
			$popvalue = pop (@argval); 
			print "PopArgs: Var: ($argvar) Value: ($popvalue) \n" if $Globals{verbose} ne "No";
			print CFIL "PopArgs: Var: ($argvar) Value: ($popvalue) \n" if $Globals{verbose} ne "No";
			____ProcessSet ($argvar, $popvalue, "Local");
		}
	}
	## If there are any left over, dispose of them
	if ($#argval > $argstack[$#argstack]) { 
		$#argval = $argstack[$#argstack];
	}
	pop @argstack;
	return 1;
}

sub __ARCHEcmd_pushlocal {
	## Change the Local Variable depth so that new locals get assigned the correct level
	$LvarDepth ++;
	return 1;
}

sub __ARCHEcmd_poplocal {
	my @vars2remove = ();
	my $lvar;
	## Look for all Local Variables at this depth and delete them, then decrement depth
	foreach $lvar (keys %Lvars) {
		if ($LvarsDepth{$lvar} == $LvarDepth) {push (@vars2remove, $lvar)}
	}
	foreach $lvar (@vars2remove) {DeleteLocal ($lvar)};
	$LvarDepth --;
	return 1;
}

sub __ARCHEcmd_lookup {
	if (@Gatoms < 3) {
		print "Error - Key Field $Gatom1 does not contain linked filename \n"
	} else {
		my $alias = CreateKeyTableEntry (@Gatoms);
		LookupKeyTable ($alias);
	}
	return 1;
}

sub __ARCHEcmd_append {
	my $process = @Gatoms_repl > 2 ?  1 : 0;
	my $app_line = 1;
	my $app_fn;
	my $app_fh;
	my $cfg_line;
	my @SaveGatoms = @Gatoms;

	if ($OK2output) {
		## Open the file shown and copy all of it to the output file
		$app_fn = $Gatoms_repl[1];
		## if ((index ($app_fn, "/") < 0) && (index ($app_fn, "\\") < 0)) {
			## If the filename does not already have a pathname component, then append the template path to the filename
		## If the filename does not already have a pathname component, then append the template path to the filename
		##	$app_fn = $Globals{templatepath} . $app_fn;
		##}
		$app_fh = EZOpen ($app_fn, $Globals{templatepath}, $Globals{local_templatepath}, "Append-Include file", 1059);

		while ($cfg_line = <$app_fh>) {
			if ($process) {
				chomp ($cfg_line);
				@Gatoms = Atomize($cfg_line);
				GlobalAtomize ();
				# Only process repeatable keyword commands here (FOREACH, FORNEXT, FOR, WHILE)
				# The rest of the conditionals and keywords will be handled in the ProcessLine subroutine
				if (@repeat_stack > 0) {
					PreProcessRepeat ($cfg_line);
				} elsif (($Gatom0 eq "foreach") || ($Gatom0 eq "fornext") || ($Gatom0 eq "for") || ($Gatom0 eq "while")) {
					PreProcessRepeat ($cfg_line);
				} else {
					ProcessLine ($cfg_line, $app_line);
				}
				$app_line++;
			} else {
				$cfg_line = RemoveEscapes ($cfg_line);
				print CFIL "$cfg_line";
				print "$cfg_line" if $Globals{verbose} eq "Screen";
			}
		}
		close $app_fh;
	}
	return 1;
}

sub __ARCHEcmd_debug {
	if ($debugmode eq "SCREEN") {
		print "$Gatoms[1..$#Gatoms] \n";
	} elsif (($debugmode eq "YES") && ($OK2output == 1)) {
		print CFIL "$Gatoms[1..$#Gatoms] \n";
	}
	return 1;
}

sub __ARCHEcmd_debugmode {
	$debugmode = uc ($Gatoms[1]);
	return 1;
}

sub __ProcessSet {
	my ($setvar, $setval, $flag) = @_;
	if (!$OK2output) {return};
	
	my $i;

	if ($flag eq "Local") {
		# Check existing locals first. If found, reset value	
		$Lvars {$setvar} = $setval;
		if (!exists ($LvarsDepth {$setvar})) {$LvarsDepth {$setvar} = $LvarDepth};
	} elsif ($flag eq "Global") {
		$GlobalVars {$setvar} = $setval;
	} else {
		## No flag, so see if the local exists first. If not, then create a new global.
		if (exists ($Lvars {$setvar})) {
			## Since we are not creating a new local here, no need to check and set depth
			$Lvars {$setvar} = $setval;
		} else {
			$GlobalVars {$setvar} = $setval;
		}
	}

	return;
}

sub RemoveEscapes {
	my $line = $_[0];
	
	$line =~ s/\\\{/{/g;
	$line =~ s/\\\}/}/g;
	$line =~ s/\\\[/[/g;
	$line =~ s/\\]/]/g;
	$line =~ s/\\</</g;
	$line =~ s/\\>/>/g;
	return $line;
}

sub Atomize {
	my ($line) = @_;
	my @atoms = ();

	$line =~ s/^\s*//;
	$line =~ s/\s*$//;

	if (substr($line, 0, 1) ne '{') {
		## if first thing in the line is NOT an open brace, then no need to process as a command
		## so just return an empty array 
		return @atoms;
	}

	# Split conditionals based on the ending brace
	if (index ($line, "}") >= 0) {
		@atoms = split(/\}/, $line);
		# print "Current printing condition from stack: ($prev_cond) \n" if $Globals{verbose} eq "Yes";
		for my $atom (@atoms) {
			# Just in case there is something before the opening brace, like an operator, remove it
			while (substr ($atom, 0, 1) ne '{') {
				$atom = substr ($atom, 1);
				die "Error in line $tpl_line ($cfg_line) of $Globals{tempfile} \n($tmpxref[$tpl_line])\n trying to atomize control constructs" if (length ($atom) == 0);
			}
			# Now remove the opening brace
			$atom = substr ($atom, 1);
		}
	}

	return @atoms;
}

sub GlobalAtomize {
	$Gatom0 = ($#Gatoms >= 0) ? lc($Gatoms[0]) : "";
	$Gatom1 = ($#Gatoms >= 1) ? lc($Gatoms[1]) : "";
	$Gatom2 = ($#Gatoms >= 2) ? lc($Gatoms[2]) : "";
}

sub CreateKeyFieldEntry {
	my @atoms = @_;
	my @keyentry = ();
	my $keyfile;
	my $keyalias;
	my $keyusealias;
	my @ext_flds = ();
	my @ext_fld_nums = ();
	my @int_flds = ();
	my @int_fld_nums = ();
	my %fields = ();
	my @field_names = ();
	my $keyfh;
	my $i;

	$keyfile = $atoms[2];
	$keyalias = (@atoms < 5) ? $keyfile : $atoms[4];
	$keyusealias = ($#atoms >= 4);

	## Check to see if we have already loaded info on this table. If so, just return
	if (exists $keyxref {$keyalias}) {return $keyalias};

	@ext_flds = (index ($atoms [1], '|') > 0) ? split(/\|/,$atoms[1]) : ($atoms[1]);
	## Set all ext field numbers to -1, which signals a general field / var lookup
	for $i (0..$#ext_flds) {push @ext_fld_nums, -1};
	# If an additional field, it is the name of the field in the secondary file to link to
	# Otherwise just use the same field name for both files
	if (@atoms < 4) {
		@int_flds = @ext_flds;
	} else {
		@int_flds = (index ($atoms [3], '|') > 0) ? split(/\|/,$atoms[3]) : ($atoms[3]);
	}
	
	$keyfh = EZOpen ($keyfile, $Globals{datapath}, "", "Secondary key file", 1207);
	my $column_header = <$keyfh>;
	close $keyfh;
	chomp($column_header);
	# extract variable names from the file header
	@field_names = split(/\t/, $column_header);
	for my $int_field (@int_flds) {
		$i = 0;
		$keyfound = -1;
		for my $field (@field_names) {
			if ($int_field eq $field) {$keyfound = $i};
			$i ++;
		}
		if ($keyfound > -1) {
			push @int_fld_nums, $keyfound;
		} else {
			print "  Linked File $keyfile file: Cannot find key field ($int_field) in the list of variables for key file\n";
		}
	}
	$i = 0;
	for my $field (@field_names) {
		$fields {$field} = "";
	}

	$keyentry [KeyFILE] = $keyfile;
	$keyentry [KeyALIAS] = $keyalias;
	$keyentry [KeyUSEALIAS] = $keyusealias;
	$keyentry [KeyEXTFIELDS] = \@ext_flds;
	$keyentry [KeyEXTFLDNUMS] = \@ext_fld_nums;
	$keyentry [KeyINTFIELDS] = \@int_flds;
	$keyentry [KeyINTFLDNUMS] = \@int_fld_nums;
	$keyentry [KeyFIELDNAMES] = \@field_names;
	$keyentry [KeyFIELDS] = \%fields;
	push @keytable, [@keyentry];
	$keyxref {$keyalias} = $#keytable;

	return  $keyalias;
}

sub PrepKeyFields {
	my $keyerr = 0;
	my $numkeys;
	my $key_flds;

	## If JSON data, key fields already incorporated into main data record
	
	if ($Globals{form} eq "JSON") {
        return $keyerr;
    }
	
	## For all the keyfiles definded from the Globals file, let's try to match to main record variables
	for my $k (0..$#keytable) {
		$key_flds = $keytable [$k] -> [KeyEXTFIELDS];
		$numkeys = @$key_flds - 1;
		for my $extfld (0..$numkeys) {
			for my $v (0..$#variable) {
				if ($variable [$v] eq $keytable [$k][KeyEXTFIELDS][$extfld]) {
					$keytable [$k][KeyEXTFLDNUMS][$extfld] = $v;
				}
			}
			## If any key field cannot be found, set the error flag.
			if ($keytable [$k][KeyEXTFLDNUMS][$extfld] == -1) {
				## Include PRINTERROR code here for main variable not found
				$keyerr = 1;
			}
		}
	}

	return $keyerr;
}

sub LoadKeyFields {
	if ($Globals{form} eq "Tab") {
		for my $alias (@globalkeyfiles) {
			LookupKeyTable ($alias);
		}
	}
}

sub LookupKeyTable {
	my $alias = $_[0];
	my $keyentry = $keyxref {$alias};
	my $keyfile = $keytable [$keyentry] ->[KeyFILE];
	my $keyfh;
	my $key_record;
	my @kfields = ();
	my $keyfound = 0;
	my $ktbl = $keytable [$keyentry] -> [KeyEXTFIELDS];
	my $numkeys = @$ktbl - 1;
	my @extkey;
	my $keyvar;
	my $i;

	## First clear all the variables in case we don't find a matching record
	
	for $keyvar (@{$keytable [$keyentry] -> [KeyFIELDNAMES]}) {
		#
		# v3.0 change - if key file record not found, use "**NULL**" instead of empty field ("") as default value
		#
		## while (@katoms < $num_fields) {push (@katoms, "**NULL**")};
		$keytable [$keyentry][KeyFIELDS]{$keyvar} = "";
	}

	for my $kf (0..$numkeys) {
		## If Ext Field Num = -1, use ReplaceVariables to match against all fields & vars
		## Else assume that the Ext Field Num points to a main field value and use that
		if ($keytable[$keyentry][KeyEXTFLDNUMS][$kf] == -1) {
			$extkey [$kf] = ReplaceVariables ("<" . $keytable[$keyentry][KeyEXTFIELDS][$kf] . ">");
		} else {
			$extkey [$kf] = $value [$keytable[$keyentry][KeyEXTFLDNUMS][$kf]];
		}
	}

	# Key File
	$keyfh = EZOpen ($keyfile, $Globals{datapath}, "", "Secondary key file", 1321);
	# Read and discard headers
	$key_record = <$keyfh>;
	while ($key_record = <$keyfh>) {
		chomp($key_record);
		@kfields = split(/\t/,$key_record);
		$keyfound = 1;
		for my $kf (0..$numkeys) {
			if ($kfields [$keytable[$keyentry][KeyINTFLDNUMS][$kf]] ne $extkey [$kf]) {
				$keyfound = 0;
			}
		}
		if ($keyfound) {
			$i = 0;
			while ($i <= $#kfields) {
				$keyvar = $keytable [$keyentry][KeyFIELDNAMES][$i]; 
				$keytable [$keyentry][KeyFIELDS]{$keyvar} = $kfields [$i];
				$i ++;
			}
			last;
		}
	}

	if ($keyfound == 0) {
		print "Record not found in KeyFile $keyfile, for key value ????? \n" if ($Globals{printwarn}) ;
	}

	close $keyfh;
}

sub TraceOutput {
	my ($line, $line_no, $line_repl, $class) = @_;

	print TRFIL "Line $line_no in $Globals{tempfile} \n";
	print TRFIL "  Line  (raw): $line \n";
	print TRFIL "  Line (repl): $line_repl \n";
	if (!$class) {$class = MatchClassNONE;}
	if ($class eq MatchClassSELECT) {
		print TRFIL "    Select   : $match_var (raw) $match_var_repl (replaced) \n";
	}
	if ($OK2output) {
		print TRFIL "    including to: \n";
	} else {
		print TRFIL "    skipping to: \n";
	}

	return;
}

sub PreProcessRepeat {
	my ($cmd_line) = @_;
	my $rtablenum = @repeat_table;
	my @rtable;
	my $efile;
	my $i;

	if (index ($cmd_line, '{') < 0) {
		## No conditional / command, so just push the line onto the commands stack and return
		push (@repeat_cmds, $cmd_line);
		push (@repeat_lines, $tpl_line);
		return;
	}

	##
	## FOREACH command pre-processing
	##
	if ($Gatom0 eq "foreach") {
		## Save the number of the Each table entry into a control stack
		push (@repeat_stack, $rtablenum);
		## Also load a place keeper into the Each command stack
		push (@repeat_cmds, ('{*REPEAT*}{' . $rtablenum . '}'));
		push (@repeat_lines, $tpl_line);
		## Assume Each File is atom 2
		$efile = $Gatoms[2];
		$i = 0;
		## Now check to see if there is an alias
		for my $freal (@fnreal) {
			if ($freal eq $efile) {
				## Found a match - use the alias instead
				$efile = $fnalias [$i];
			}
			$i ++;
		}
		# Complete basic REPEAT table entry
		@rtable = RepeatTableHeader(RepeatFOREACH);
		
		$rtable [RptFILE]         = $efile;
		$rtable [RptEXTFIELDNAME] = $Gatoms[1];
		if (@Gatoms > 3) {
			$rtable [RptINTFIELDNAME] = $Gatoms[3];
		} else {
			$rtable [RptINTFIELDNAME] = $Gatoms[1];
		}
		push (@repeat_table, [@rtable]);
	##
	## FOR-IF command pre-processing
	##
	} elsif (($Gatom0 eq "for") && (lc($Gatoms[2]) eq "in")) {
		## Save the number of the Each table entry into a control stack
		push (@repeat_stack, $rtablenum);
		## Also load a place keeper into the Each command stack
		push (@repeat_cmds, ('{*REPEAT*}{' . $rtablenum . '}'));
		push (@repeat_lines, $tpl_line);
		# Complete basic REPEAT table entry
		@rtable = RepeatTableHeader(RepeatFORIN);

		$rtable [RptFORINVAR] = $Gatoms[1];
		$rtable [RptARRAY]    = [split (/\|/, ReplaceVariables($Gatoms[3]))];
		$rtable [RptELEMENT]  = 0;
		push (@repeat_table, [@rtable]);
	##
	## FOR-NEXT command pre-processing
	##
	} elsif (($Gatom0 eq "for") || ($Gatom0 eq "fornext")) {
		## Save the number of the Each table entry into a control stack
		push (@repeat_stack, $rtablenum);
		## Also load a place keeper into the Each command stack
		push (@repeat_cmds, ('{*REPEAT*}{' . $rtablenum . '}'));
		push (@repeat_lines, $tpl_line);
		# Complete basic REPEAT table entry
		@rtable = RepeatTableHeader(RepeatFORNEXTINC);		# Assume increment for now

		$rtable [RptFORVAR]     = $Gatoms[1];
		$rtable [RptSTARTVALUE] = $Gatoms[2];
		$rtable [RptENDVALUE]   = $Gatoms[3];
		# Check to see if an increment was provided. If so, use it; otherwise default to 1
		if (@Gatoms > 4) {
			$rtable [RptINCREMENT] = $Gatoms[4];
			if (ReplaceVariables($Gatoms[4]) < 0) {
				$rtable [RptTYPE] = RepeatFORNEXTDEC;		# Oops - Increment is really a decrement
			}
		} else {
			if (ReplaceVariables($rtable [RptSTARTVALUE]) <= ReplaceVariables($rtable [RptENDVALUE])) {
				$rtable [RptINCREMENT] = 1;
			} else {
				$rtable [RptINCREMENT] = -1;
				$rtable [RptTYPE] = RepeatFORNEXTDEC;	# Oops - Increment is really a decrement
			}
		}
		push (@repeat_table, [@rtable]);
	##
	## WHILE command pre-processing
	##
	} elsif ($Gatom0 eq "while") {
		## Save the number of the Each table entry into a control stack
		push (@repeat_stack, $rtablenum);
		## Also load a place keeper into the Each command stack
		push (@repeat_cmds, ('{*REPEAT*}{' . $rtablenum . '}'));
		push (@repeat_lines, $tpl_line);
		# Complete basic REPEAT table entry
		@rtable = RepeatTableHeader(RepeatWHILE);

		$rtable [RptWHILEVAR]   = $Gatoms[1];
		$rtable [RptWHILEVALUE] = $Gatoms[2];
		$rtable [RptWHILEOP]    = FindOperator ($cmd_line, 3);
		push (@repeat_table, [@rtable]);
	##
	## END command processing
	##
	} elsif (exists ($RepeatEndCmds {$Gatom0})) {
		## ??????????????????????????????????????????????????????
		## ??????????????????????????????????????????????????????
		##
		## We really should add in a check to make sure that we have the correct end for the
		## repeat command that we are processing
		##
		## ??????????????????????????????????????????????????????
		## ??????????????????????????????????????????????????????

		## Get the Each table entry we are working on
		$rtablenum = pop (@repeat_stack);
		## Set the end command that corresponds to this Each table
		$repeat_table [$rtablenum] [RptCMDEND] = $#repeat_cmds;
		## If we popped everything off the stack, then we need to start real processing
		if (@repeat_stack == 0) {
			if ($Globals{verbose} ne "No") {
				print "Done with repeat pre-preocessing - Commands are:\n";
				for my $cmd (@repeat_cmds) {
					print "CMD: $cmd \n";
				}	
			}
			## Start with the first Each table entry
			$rtablenum = 0;
			ProcessRepeat ($rtablenum);
			
			## Done - So do some basic cleanup
			RepeatCleanup ();
		}
	} else {
		## Some other conditional, so just push it onto the stack for now
		push (@repeat_cmds, $cmd_line);
		push (@repeat_lines, $tpl_line);
	}

	return;
}

sub RepeatTableHeader {
	my ($repeat_type) = @_;
	my @rtable = ();

	$rtable [RptTYPE]       = $repeat_type;
	$rtable [RptCMDSTART]   = $#repeat_cmds;
	$rtable [RptCMDEND]     = -1;
	$rtable [RptMATCHLEVEL] = $#match_class_stack;
	$rtable [RptMATCHVAR]   = $#match_var_stack;

	return @rtable;
}

sub RepeatCleanup {
	@repeat_table = ();
	@repeat_stack = ();
	@repeat_cmds = ();
	@Gevar = ();
	@Geval = ();
}

sub ProcessRepeat {
	my ($rpos)	= @_;
	my @rtable	= @{$repeat_table [$rpos]};
	my $rtype	= $rtable [RptTYPE];
	my $rcmdstart	= $rtable [RptCMDSTART];
	my $rcmdend	= $rtable [RptCMDEND];

	if ($OK2output) {
		## Since we have not really processed any match constructs (IF / SELECT),
		## we need to set these values here dynamically as we process the repeats themselves
		$repeat_table [$rpos] [RptMATCHLEVEL] = $#match_class_stack;
		$repeat_table [$rpos] [RptMATCHVAR]   = $#match_var_stack;

		if ($Globals{tracemode}) {TraceOutputRepeat ($rpos, RepeatSTART, $rcmdstart)};
		if ($rtype == RepeatFOREACH) {
			ProcessRepeatForEach ($rpos, $rcmdstart, $rcmdend);
		} elsif ($rtype == RepeatFORNEXTINC) {
			ProcessRepeatForNextInc ($rpos, $rcmdstart, $rcmdend);
		} elsif ($rtype == RepeatFORNEXTDEC) {
			ProcessRepeatForNextDec ($rpos, $rcmdstart, $rcmdend);
		} elsif ($rtype == RepeatFORIN) {
			ProcessRepeatForIn ($rpos, $rcmdstart, $rcmdend);
		} elsif ($rtype == RepeatWHILE) {
			ProcessRepeatWhile ($rpos, $rcmdstart, $rcmdend);
		}
		if ($Globals{tracemode}) {TraceOutputRepeat ($rpos, RepeatEND, $rcmdend)};
	}

	return;
}

sub ProcessRepeatForEach {
	my ($rpos, $rcmdstart, $rcmdend)    = @_;
	my @rtable    = @{$repeat_table [$rpos]};
	my $rtn;

	my $eachfile;
	my $eachfh;
	my $eachfield;
	my $eachfield2;
	my $eachfieldval = "**NO**MATCH**";
	my $eachfieldnum = -1;
	my $eachdata;
	my $evarlength;
	my @evars = ();
	my @evals = ();
	my $ecmd;
	my $enext;
	my $i;
	my $eachrecnum = 1;

	$eachfile   = $rtable [RptFILE];
	$eachfield  = $rtable [RptEXTFIELDNAME];
	$eachfield2 = $rtable [RptINTFIELDNAME];

	if ($Globals{form} eq "Tab") {
		## v3.06 - Add in logic to look for an alternate filename
		if (exists $fnalternate{$eachfile}) {
			## If the alternate filename exists, use it instead 
			$eachfile = $fnalternate {$eachfile};
		}

		## We need to convert the external key field name into the appropriate value
		## First look at normal variables
		$eachfieldval = ReplaceVariables("<" . $eachfield . ">");
		if ($eachfield eq ("<" . $eachfield . ">")) {
			$eachfieldval = "**NO**MATCH**";
		}

		$eachfh = EZOpen ($eachfile, $Globals{datapath}, "", "File containing FOR-EACH data", 1608);
		#
		# Read header record and place variable names in an array
		#
		$column_header = <$eachfh>;
		chomp($column_header);
	} elsif ($Globals{form} eq "JSON") {
		if (exists $each_data {$eachfile}) {
			$column_header = ${$each_data {$eachfile}}[0];
		} else {
			die "$0: Each file $eachfile not found in JSON data";
		}
	}
	@evars = split(/\t/, $column_header);

	## Save the length of the Each Vars/Vals array before we add our values
	$evarlength = $#Gevar;
	## Add this file's variables to the list
	push (@Gevar, @evars);
	## Now lets find the key field
	$i = 0;
	for my $var (@evars){
		if ($var eq $eachfield2) {
			$eachfieldnum = $i;
		}
		$i ++;
	}

	my $more_records = 1;

	EACH_DATA:
	while ($more_records) {
		if ($Globals{form} eq "Tab") {
			if ($eachdata = <$eachfh>) {
				chomp($eachdata);
			} else {
				$more_records = 0;
				goto EACH_DATA;
			}
		} elsif ($Globals{form} eq "JSON") {
			my $numrecs = $#{$each_data {$eachfile}};
			$eachdata = ${$each_data {$eachfile}}[$eachrecnum];
			$eachrecnum ++;
			if ($eachrecnum > $numrecs) {$more_records = 0};
		}

		@evals = split(/\t/,$eachdata);
		while ($#evals < $#evars) {
			push (@evals, "");
		}
		if ($#evals > $#evars) {
			$#evals = $#evars;
		}
			
		if ($Globals{form} eq "Tab") {
			next EACH_DATA if ($evals[$eachfieldnum] ne $eachfieldval);
		}

		## Now that we have the same number of vars and values, strip the old values and push the new values onto end of array
		$#Geval = $evarlength;
		push (@Geval, @evals);
		## And check for any null entries
		for ($i=0; $i<=$#evals; $i++) {
			if ($evals[$i] eq "") {
				print "  *** Each File ($eachfile), Key $evals[$eachfieldnum]: $evars[$i] has a null value \n" if $Globals{verbose} eq "Yes";
			}
		}

		$rtn = ProcessRepeatCmds ($rpos, $rcmdstart, $rcmdend);
		last EACH_DATA if $rtn == RepeatLAST;
	}

	## Strip off the variables and values we just added
	$#Gevar = $evarlength;
	$#Geval = $evarlength;
	## And close the file we opened
	if ($Globals{form} eq "Tab") {
		close $eachfh;
	}

	return;
}

sub ProcessRepeatForNextInc {
	my ($rpos, $rcmdstart, $rcmdend) = @_;

	my @rtable = @{$repeat_table [$rpos]};
	my $forvar_exists;
	my $forvar;
	my $rtn;
	my $i;
	my $for_var_name = $rtable [RptFORVAR];
	my $startvalue   = ReplaceVariables ($rtable [RptSTARTVALUE]);
	my $endvalue     = ReplaceVariables ($rtable [RptENDVALUE]);
	my $increment    = ReplaceVariables ($rtable [RptINCREMENT]);

	print "Preparing to preocess FOR-NEXT (inc) ($rpos) ($rcmdstart) ($rcmdend) \n" if $Globals{verbose} eq "Yes";

	#
	# Save the "FOR-NEXT" variable in the Local variable list
	#
	$forvar_exists = exists ($Lvars{$for_var_name});
	__ProcessSet ($for_var_name, $startvalue, "Local");
	#
	# Standard For-Next loop
	#
	print "For ($for_var_name) = $startvalue to $endvalue step $increment \n" if $Globals{verbose} eq "Yes";
	For_Next:
	for ($forvar = $startvalue; $forvar <= $endvalue; $forvar = $forvar + $increment) {
		__ProcessSet ($for_var_name, $forvar, "Local");
		print "In loop  (" . $for_var_name . ") = (" . $Lvars {$for_var_name} . ") \n" if $Globals{verbose} ne "No";
		$rtn = ProcessRepeatCmds ($rpos, $rcmdstart, $rcmdend);
		print "After processing, return = ($rtn) \n" if $Globals{verbose} eq "Yes";
		last For_Next if $rtn == RepeatLAST;
	}
	#
	# Remove "FOR-NEXT" variable from the Each variable list
	#
	if (!$forvar_exists) {DeleteLocal ($for_var_name)};

	return;
}

sub ProcessRepeatForNextDec {
	my ($rpos, $rcmdstart, $rcmdend) = @_;

	my @rtable    = @{$repeat_table [$rpos]};
	my $forvar_exists;
	my $forvar;
	my $rtn;
	my $i;
	my $for_var_name = $rtable [RptFORVAR];
	my $startvalue = ReplaceVariables ($rtable [RptSTARTVALUE]);
	my $endvalue   = ReplaceVariables ($rtable [RptENDVALUE]);
	my $increment  = ReplaceVariables ($rtable [RptINCREMENT]);

	#
	# Save the "FOR-NEXT" variable in the Each variable list
	#
	$forvar_exists = exists ($Lvars{$for_var_name});
	__ProcessSet ($for_var_name, $rtable [RptSTARTVALUE], "Local");
	#
	# Decrementing loop, so we need to compare FOR variable as >= END / STOP value
	# Since INCREMENT is already a negative #, adding the negative is like subtracting the positive
	#
	ForNext:
	for ($forvar = $startvalue; $forvar >= $endvalue; $forvar = $forvar + $increment) {
		__ProcessSet ($for_var_name, $forvar, "Local");
		$rtn = ProcessRepeatCmds ($rpos, $rcmdstart, $rcmdend);
		last ForNext if $rtn == RepeatLAST;
	}
	#
	# Remove "FOR-NEXT" variable from the Each variable list, unless pre-existing
	#
	if (!$forvar_exists) {DeleteLocal ($for_var_name)};

	return;
}

sub ProcessRepeatForIn {
	my ($rpos, $rcmdstart, $rcmdend) = @_;

	my @rtable    = @{$repeat_table [$rpos]};
	my @forarray;
	my $for_var_name;
	my $forvar;
	my $forvar_exists;
	my $rtn;
	my $i;

	#
	# Save the "FOR-IN" variable in the Each variable list
	#
	$for_var_name = $rtable [RptFORINVAR];
	@forarray = @{$rtable [RptARRAY]};
	$forvar_exists = exists ($Lvars{$for_var_name});
	__ProcessSet ($rtable [RptFORINVAR], 0, "Local");
	#
	# Since INCREMENT is already a negative #, adding the negative is like subtracting the positive
	#
	ForIn:
	for $forvar (@forarray) {
		__ProcessSet ($for_var_name, $forvar, "Local");
		$rtn = ProcessRepeatCmds ($rpos, $rcmdstart, $rcmdend);
		last ForIn if $rtn == RepeatLAST;
	}
	#
	# Remove "FOR-NEXT" variable from the Each variable list, unless pre-existing
	#
	if (!$forvar_exists) {DeleteLocal ($for_var_name)};

	return;
}

sub ProcessRepeatWhile {
	my ($rpos, $rcmdstart, $rcmdend) = @_;
	my @rtable = @{$repeat_table [$rpos]};
	my @forarray;
	my $for_var_name;
	my $forvar;
	my $rtn;
	my $i;
	my $op;
	my $while_var;
	my $while_val;
	my $loop;
	my $wvartemp;
	my $wvaltemp;

	$op = $rtable[RptWHILEOP];
	$while_var = $rtable [RptWHILEVAR];
	$while_val = $rtable [RptWHILEVALUE];
	$loop = MatchMATCH;
	while ($loop eq MatchMATCH) {
		$wvartemp = ReplaceVariables ($while_var);
		$wvartemp = ArcheFuncs::ProcessFunction ($wvartemp, $tpl_line, $cfg_line, $OK2output);

		$wvaltemp = ReplaceVariables ($while_val);
		$wvaltemp = ArcheFuncs::ProcessFunction ($wvaltemp, $tpl_line, $cfg_line, $OK2output);
			
		$loop = WhileMatchCheck ($wvartemp, $op, $wvaltemp);
		if ($loop eq MatchMATCH) {
			if (ProcessRepeatCmds ($rpos, $rcmdstart, $rcmdend) == RepeatLAST) {$loop = MatchNOMATCH};
		}
	}

	return;
}

sub ProcessRepeatCmds {
	my ($rpos, $rcmdstart, $rcmdend) = @_;
	my $rcmd;
	my $rcmd_trimmed;
	my $rcmd_line;
	my @ratoms;
	my $rnext;
	my $i;

	## Now to process the commands for this REPEAT block
	## The '+1' skips over this group's "*REPEAT*" placeholder
	for ($i = $rcmdstart + 1; $i <= $rcmdend; $i ++) {
		$rcmd = $repeat_cmds[$i];
		$rcmd_trimmed = $rcmd;
		$rcmd_trimmed =~ s/^\s*//;
		$rcmd_line = $repeat_lines [$i];
		## Wait a minute - let's see if we have another Each block nested inside
		if (substr($rcmd, 0, 10) eq '{*REPEAT*}') {
			## We do, so find the entry in the Each table for this block
			@ratoms = Atomize ($rcmd);
			$rnext = $ratoms[1];
			ProcessRepeat ($rnext);
			## Since the preceeding call processed the commands for this section, 
			##   Reset the pointer to the last command processed, so the increment will work correctly
			$i = $repeat_table [$rnext] [RptCMDEND];
		} elsif (lc(substr($rcmd_trimmed, 0, 6)) eq '{next}') {
			if ($OK2output) {
				ReduceMatchStack ($rpos);
				## If we found a NEXT command and we are processing, then return now with the NEXT flag
				if ($Globals{tracemode}) {TraceOutputRepeat ($rpos, RepeatNEXT, $rcmd_line)};
				return RepeatNEXT;
			}
		} elsif (lc(substr($rcmd_trimmed, 0, 6)) eq '{last}') {
			if ($OK2output) {
				ReduceMatchStack ($rpos);
				## If we found a LAST command and we are processing, then return now with the LAST flag
				if ($Globals{tracemode}) {TraceOutputRepeat ($rpos, RepeatLAST, $rcmd_line)};
				return RepeatLAST;
			}
		} else {
			## Nothing special, so just process and proceed to the next line
			@Gatoms = Atomize ($rcmd);
			GlobalAtomize ();
			ProcessLine ($rcmd, $rcmd_line);
		}
	}

	return RepeatCONTINUE;
}
sub ReduceMatchStack {
	my ($rpos) = @_;
	my @rtable = @{$repeat_table [$rpos]};
	my $match_level = $rtable [RptMATCHLEVEL];

	while ($#match_class_stack > $match_level) {
		# As well as the previous match class and mode
		$match_class = pop @match_class_stack;
		$match_mode  = pop @match_mode_stack;
		# Restore previous printing condition
		$OK2output = pop @OK2output_stack;
		$OK2output_prev = $OK2output_stack [$#OK2output_stack];
	}

	$match_level = $rtable [RptMATCHVAR];

	while ($#match_var_stack > $match_level) {
		# Now lets restore the variables from the previous Select
		$match_var_repl = pop @match_var_repl_stack;
		$match_var = pop @match_var_stack;
	}
	return;
}

sub TraceOutputRepeat {
	my ($rpos, $rmode, $rline)    = @_;
	my @rtable    = @{$repeat_table [$rpos]};
	my $rtype     = $rtable [RptTYPE];
	my $rcmdstart = $rtable [RptCMDSTART];
	my $rcmdend   = $rtable [RptCMDEND];
	my $rpt_type;

	if ($rtype == RepeatFOREACH) {
		$rpt_type = "For-Each";
	} elsif ($rtype == RepeatFORNEXTINC) {
		$rpt_type = "For-Next (incrementing)";
	} elsif ($rtype == RepeatFORNEXTDEC) {
		$rpt_type = "For-Next (decrementing)";
	} elsif ($rtype == RepeatFORIN) {
		$rpt_type = "For-In";
	} elsif ($rtype == RepeatWHILE) {
		$rpt_type = "While";
	}

	if ($rmode == RepeatSTART) {
		if ($OK2output) {print TRFIL "** Start of REPEATING construct: $rpt_type for template lines $repeat_lines[$rcmdstart] to $repeat_lines[$rcmdend] \n"};
	} elsif ($rmode == RepeatEND) {
		if ($OK2output) {print TRFIL "** END of REPEATING construct: $rpt_type at line $repeat_lines[$rcmdend] \n"};
	} elsif ($rmode == RepeatNEXT) {
		print TRFIL "** NEXT command invoked at at line $rline, returning control to line $repeat_lines[$rcmdstart] \n";
	} elsif ($rmode == RepeatLAST) {
		print TRFIL "** LAST command invoked at at line $rline, exiting repeat at line $repeat_lines[$rcmdend] \n";
	}

	return;
}

sub DeleteLocal {
	delete ($LvarsDepth {$_[0]});
	delete ($Lvars {$_[0]});
	return;
}

sub MatchCheck {
	my ($Matom1, $matchtype, $Matom_start) = @_;
	# Assume no match to start
	my $match_return = MatchNOMATCH;

	if ($matchtype eq "EQ") {
		for ($i=$Matom_start; $i<=$#Gatoms_repl; $i++) {
			# If we match any other value, set the conditional flag to true
			if ($Matom1 eq $Gatoms_repl[$i]) {return MatchMATCH};
		}
	} elsif ($matchtype eq "==") {
		for ($i=$Matom_start; $i<=$#Gatoms_repl; $i++) {
			# If we match any other value, set the conditional flag to true
			if (+($Matom1) == +($Gatoms_repl[$i])) {return MatchMATCH};
		}
	} elsif ($matchtype eq "NE") {
		# Reverse - assume we match none
		$match_return = MatchMATCH;
		for ($i=$Matom_start; $i<=$#Gatoms_repl; $i++) {
			# If we match any value, set the conditional flag to false
			if ($Matom1 eq $Gatoms_repl[$i]) {return MatchNOMATCH};
		}
	} elsif ($matchtype eq "##") {
		# Reverse - assume we match none
		$match_return = MatchMATCH;
		for ($i=$Matom_start; $i<=$#Gatoms_repl; $i++) {
			# If we match any value, set the conditional flag to false
			if (+($Matom1) == +($Gatoms_repl[$i])) {return MatchNOMATCH};
		}
	##
	## Binary operations from this point on, so this is pretty standard logic for most operators
	##
	} elsif ($matchtype eq "IN") {
		if (index (lc($Matom1),lc($Gatoms_repl[$Matom_start])) >= 0) {return MatchMATCH};
	} elsif ($matchtype eq "INC") {
		if (index ($Matom1,$Gatoms_repl[$Matom_start]) >= 0) {return MatchMATCH};
	} elsif ($matchtype eq "GT") {
		if (0+($Matom1) > 0+($Gatoms_repl[$Matom_start])) {return MatchMATCH};
	} elsif ($matchtype eq "GE") {
		if (0+($Matom1) >= 0+($Gatoms_repl[$Matom_start])) {return MatchMATCH};
	} elsif ($matchtype eq "LT") {
		if (0+($Matom1) < 0+($Gatoms_repl[$Matom_start])) {return MatchMATCH};
	} elsif ($matchtype eq "LE") {
		if (0+($Matom1) <= 0+($Gatoms_repl[$Matom_start])) {return MatchMATCH};
	}

	return $match_return;
}

sub MatchCheck1 {
	my ($CheckAtom, $MatchClass) = @_;
	my $match_return = MatchMATCH;

	if ($MatchClass eq MatchClassPERL) {
		if (($CheckAtom eq "") || ($CheckAtom eq $ArcheFalse)) {
			$match_return = MatchNOMATCH;
		} elsif ($CheckAtom =~ /[\+-]?\d+\.?\d*/) {
			if ((0 + $CheckAtom) == 0) {$match_return = MatchNOMATCH};
		}
	} elsif ($MatchClass eq MatchClassIF) {
		if ($CheckAtom eq "") {
			# No entry - must be a null value, so no match and no printing
			$match_return = MatchNOMATCH;
		}
	} elsif (index ($Gatoms_repl[1], "<") >= 0) {
		# Unknown variable - so treat it as a mis-match
		$match_return = MatchNOMATCH;
	}

	return $match_return;
}

sub WhileMatchCheck {
	my ($Matom1, $matchtype, $Matom2) = @_;

	if ($matchtype eq "EQ") {
		if ($Matom1 eq $Matom2) {return MatchMATCH};
	} elsif ($matchtype eq "==") {
		if (+($Matom1) == +($Matom2)) {return MatchMATCH};
	} elsif ($matchtype eq "NE") {
		if ($Matom1 ne $Matom2) {return MatchMATCH};
	} elsif ($matchtype eq "##") {
		if (+($Matom1) != +($Matom2)) {return MatchMATCH};
	##
	## Binary operations from this point on, so this is pretty standard logic for most operators
	##
	} elsif ($matchtype eq "IN") {
		if (index (lc($Matom1),lc($Matom2)) >= 0) {return MatchMATCH};
	} elsif ($matchtype eq "INC") {
		if (index ($Matom1,$Matom2) >= 0) {return MatchMATCH};
	} elsif ($matchtype eq "GT") {
		if (+($Matom1) > +($Matom2)) {return MatchMATCH};
	} elsif ($matchtype eq "GE") {
		if (+($Matom1) >= +($Matom2)) {return MatchMATCH};
	} elsif ($matchtype eq "LT") {
		if (+($Matom1) < +($Matom2)) {return MatchMATCH};
	} elsif ($matchtype eq "LE") {
		if (+($Matom1) <= +($Matom2)) {return MatchMATCH};
	}

	return MatchNOMATCH;
}

sub ReplaceVariables {
	my ($inline) = @_;
	my $ltfound = index ($inline, "<");
	my $gtfound = index ($inline, ">");
	my $var;
	my $val;
	my $repvar;
	my $i;
	my %ke_flds;

	if (($ltfound >= 0) && ($gtfound >= 0)) {
		#
		# Replace all variables with their corresponding data values
		# 1st Locals, 2nd Globals; 3rd Main variables; 4th Keyed variables; 5th Each file(s) variables
		#
		while (($var, $val) = each %Lvars) {$inline =~ s/<$var>/$val/g};

		while (($var, $val) = each %HardGlobalVars) {$inline =~ s/<$var>/$val/g};

		while (($var, $val) = each %GlobalVars) {$inline =~ s/<$var>/$val/g};

		for ($i = 0; $i <= $#variable; $i++) {$inline =~ s/<$variable[$i]>/$value[$i]/g};

		for (my $k = 0; $k <= $#keytable; $k++) {
			if ($keytable[$k][KeyUSEALIAS]) {
				my $alias = $keytable[$k][KeyALIAS];
				for $var (@{$keytable[$k][KeyFIELDNAMES]}) {
					$val = $keytable[$k][KeyFIELDS]{$var};
					$repvar = $alias . "." . $var;
					$inline =~ s/<$repvar>/$val/g;
				}
			} else {
				for $var (@{$keytable[$k][KeyFIELDNAMES]}) {
					$val = $keytable[$k][KeyFIELDS]{$var};
					$inline =~ s/<$var>/$val/g;
				}
			}
		}
		$i = 0;
		for $var (@Gevar) {
			$inline =~ s/<$var>/$Geval[$i]/g;
			$i ++;
		}
	}
	return $inline;
}

sub FindOperator {
	my ($line, $op_pos) = @_;
	my $operator = "";
	my @atoms = ();
	my $atomx;

	if (index($line, '{') < 0) {return $operator};

	$line =~ s/^\s*//;
	$line =~ s/\s*$//;
	# Split conditionals based on the ending squiggle bracket
	@atoms = split(/\}/, $line);
	# If number of atoms less than expected operator position - no operator
	if (@atoms < $op_pos) {return $operator};

	# Default matchtype is EQuals (no operator) / 0 to many
	$operator = "EQ";
	# Subtract one since the array is zero offset
	$op_pos --;
	# Get the element to test
	$atomx = $atoms [$op_pos];

	if (exists ($Oper2char {substr($atomx,0,2)})) {
		$operator = $Oper2char {substr($atomx,0,2)};
	} elsif (exists ($Oper1char {substr($atomx,0,1)})) {
		$operator = $Oper1char {substr($atomx,0,1)};
	}

	return $operator;
}

sub find_unsubstituted {
#    #    #    #    #    #    #    #    #    #    #    #    #    #    #
#
# find and report any parameterized values in
# conifg template that were not substituted
# when the actual config file was generated
#

	open(CFG, "<$cfg_file") || die "Problem opening config file: $cfg_file ";

	my $input_line;
	my $found = "no";
	my $start_regexp = "<";
	my $end_regexp = ">";
	my $string = "";
	my @parameter = ();
	my @no_substitution = ();
	my @chars;
	my $result;
	my @result_array = ();

	while ($input_line = <CFG>) {
		if ($input_line =~ /$start_regexp/) {
			@chars = split(//,$input_line);
			for $i (@chars) {
				if ($i =~ /$start_regexp/) {$found = "yes"}
				if (($i =~ /$end_regexp/) && ($#parameter >= 0)) {
					$found = "no";
					$string = join("",@parameter);
					$result = !grep(/$string/,@no_substitution);
					@result_array = grep(/$string/,@no_substitution);
					if (!grep(/$string/,@no_substitution)){push(@no_substitution,$string)}
					$string = ""; 
					@parameter = ();
				}
				if (($found eq "yes") && ($i ne $start_regexp)) {push(@parameter,$i)}
			}
		}
	}
	close CFG;

	if ($#no_substitution != -1) {
		print "In $cfg_file, these parameters were not substituted: \n";
		for $i (@no_substitution) {print "    <$i>\n"}
	}
}

sub PreProcTpl {

# Embed any files referenced by the config template.
#
#    #    #    #    #    #    #    #    #    #    #    #    #    #    #
#
# The template file can reference files that are to be embedded into it.
# Open the template file, and look for refences to expressions of the form
# >>path/filename.  If there are any, embed the referenced file into the
# config template at the that location.

	my ($TemplateFile, $TempTemplate, $verbose, $warning) = @_;
	my @file_handles = ();
	my @lines = ();
	my @file_names = ();
	my $file_name = "";
	my $current_fh;
	my $tempfile_fh;
	my $template_line;
	my $linenum = 1;
	my $incname;
	my $template_lines = 0;
	my $txtfile;
	my $null;
	my $chp;
	my $start;
	my $end;
	my $arglist;
	my $xref;
	my @args;

	print "in PreProc: $TemplateFile \n" if $verbose eq "Yes";
	push (@tmpxref, $TempTemplate);

	$file_name = $TemplateFile;

	$current_fh = EZOpen ($file_name, "", "", "Main template file", 2212);

	$tempfile_fh = FileHandle->new();
	open ($tempfile_fh, "> $TempTemplate") || die "Problem opening temporary template file $TempTemplate";

	# Use a stack of channels, filenames, and line numbers to keep track of where we are	
	push (@file_handles, $current_fh);
	push (@lines, $linenum);
	push (@file_names, $file_name);

	while (@file_handles > 0) {
		while ($template_line = <$current_fh>) {
			$xref = "$file_name ($linenum)";
			print "$file_name ($linenum): $Globals{template}_line" if $Globals{verbose} ne "No";
			$linenum ++;
			if ($template_line =~ /^\s*\>\>/) {
				## Hidden command to reset/clear local variables
				print "Include file: $Globals{template}_line" if $Globals{verbose} ne "No";
				print "Include file: PushLocal \n" if $Globals{verbose} ne "No";
				print $tempfile_fh "{PushLocal}\n";
				$template_lines ++;
				push (@tmpxref, "$xref - Pushlocal");
				push (@lines, $linenum);
				$linenum = 1;
				push (@file_names, $file_name);
				($null, $file_name) = split(/\>\>/, $template_line);
				chomp ($file_name);
				##
				## Add logic here to extract arguments if any into a PushArgs command
				##
				$start = index ($file_name, "(");
				if ($start > -1) {
					$arglist = substr ($file_name, ($start + 1));
					$end = index ($arglist, ")");
					if ($end > -1) {
						$arglist = substr ($arglist, 0, ($end - 1));
						@args = split (/,/, $arglist);
						$arglist = "{PushArgs}";
						for my $arg (@args) {
							while (substr ($arg, -1) eq " ") {$arg = substr($arg, 0, -1)};
							while (substr ($arg, 0, 1) eq " ") {$arg = substr($arg, 1)};
							$arglist = $arglist . "{" . $arg . "}";
						}
						print "Include file: $arglist\n" if $Globals{verbose} ne "No";
						print $tempfile_fh "$arglist\n";
						$template_lines ++;
						push (@tmpxref, "$xref - PushArgs");
					}
					$file_name = substr ($file_name, 0, ($start - 1));
					while (substr ($file_name, -1) eq " ") {$file_name = substr($file_name, 0, -1)};
				}
				
				while (substr ($file_name,0,1) eq " ") {$file_name = substr($file_name,1)};
				push (@file_handles, $current_fh);

				#open the include file and insert it in the template
				$current_fh = EZOpen ($file_name, $Globals{templatepath}, $Globals{local_templatepath}, "Template include file", 2268);
			} elsif ($template_line =~ /^s*\#\#/) {
				## ignore
			} else {
				chomp ($template_line);
				print $tempfile_fh $template_line."\n";
				$template_lines ++;
				push (@tmpxref, "$xref");
			}
		}
		close ($current_fh);

		if (@file_handles > 1) {
			print "Include file: PopLocal \n" if $verbose ne "No";
			print $tempfile_fh "{PopLocal}\n";
			$template_lines ++;
			push (@tmpxref, "$xref - PopLocal");
		}

		$current_fh = pop @file_handles;
		$file_name = pop @file_names;
		$linenum = pop @lines;
	}
	print "Number of lines in final template: $Globals{template}_lines \n" if $Globals{verbose} eq "Yes";

	close ($tempfile_fh);
}

sub ProcessGlobals {
    my $global_file = $_[0];
	my @key_atoms = ();
	my $alias;
	my $tablefilename;
	my $arrayfilename;
	my @input_lines;

	# Open Globals File
	$Globals{printwarn} = 1;
	$global_fh = EZOpen ($global_file, "", "", "Global information file", 2306);
	$Globals{printwarn} = 0;

	@input_lines = <$global_fh>;
	close($global_fh);

	my $line0 = $input_lines[0];
    chomp $line0;
    if ($line0 eq "{") {
		@input_lines = ProcessJSON (\@input_lines);
		$Globals{form} = "JSON";
	}
	
	# Read <globals-file>, extracting control values
	READ_GLOBALS:
	for my $input_line (@input_lines) {
		chomp($input_line);
		@Gatoms = split(/\:/,$input_line,2);
		next READ_GLOBALS if @Gatoms == 0;	
		$Gatom0 = lc($Gatoms[0]);

		## print "Processing global command ($Gatom0) from ($input_line)\n";
		
		if (@Gatoms < 2) {
			print "Warning - Global parameter $Gatoms[0] is missing data. A default will be used if possible. \n";
			next READ_GLOBALS;	
		}
		if ($Gatom0 eq "templatefile") {$Globals{template} = $Gatoms[1]}
		elsif ($Gatom0 eq "templatepath") {$Globals{templatepath} = $Gatoms[1]}
		elsif ($Gatom0 eq "localtemplatepath") {$Globals{local_templatepath} = $Gatoms[1]}
		elsif ($Gatom0 eq "datafile") {$Globals{data} = $Gatoms[1]}
		elsif ($Gatom0 eq "datapath") {$Globals{datapath} = $Gatoms[1]}
		elsif ($Gatom0 eq "outputpath") {$Globals{outputpath} = $Gatoms[1]}
		elsif ($Gatom0 eq "outputext") {$Globals{outputext} = $Gatoms[1]}
		elsif ($Gatom0 eq "filenamefield") {$Globals{filenamefieldname} = $Gatoms[1]}
		elsif ($Gatom0 eq "filerevisions") {$Globals{revisions} = $Gatoms[1]}
		elsif ($Gatom0 eq "filenameformat") {$Globals{filenameformat} = $Gatoms[1]; $Globals{filenameoption} = "Complex"}
		elsif ($Gatom0 eq "tmpfile") {$Globals{tempfile} = $Gatoms[1]}
		elsif ($Gatom0 eq "tempfile") {$Globals{tempfile} = $Gatoms[1]}
		elsif ($Gatom0 eq "filenamealias") {
			@Gatoms = split(/\:/,$input_line);
			if (@Gatoms < 3) {
				print "Error - Filename $Gatoms[1] does not have an alias listed \n"
			} else {
				push (@fnreal, $Gatoms[1]);
				push (@fnalias, $Gatoms[2]);
			}}
		elsif ($Gatom0 eq "filenamealternate") {
				@Gatoms = split(/\:/,$input_line);
				if (@Gatoms < 3) {
					print "Error - Alternate $Gatoms[1] does not have an filename listed \n"
				} else {
					if (exists $fnalternate{$Gatoms[1]}) {
						print "Error - Alternate $Gatom1 already has an filename associated, skipping $Gatom2 \n"
					} else {
						$fnalternate {$Gatoms[1]} = $Gatoms[2];
					}
				}
			}
		elsif ($Gatom0 eq "globalvar") {
				@Gatoms = split(/\:/,$input_line);
				if (@Gatoms < 3) {
					print "Error - Global Variable $Gatom1 does not have a value \n"
				} else {
						$HardGlobalVars{$Gatoms[1]} = $Gatoms[2];
					## push (@Ggvar, $Gatom1);
					## push (@Ggval, $Gatom2);
				}
			}
		elsif ($Gatom0 eq "keyfield") {
				@Gatoms = split(/\:/,$input_line);
				if (@Gatoms < 3) {
					print "Error - Key Field $Gatoms[1] does not contain linked filename \n"
				} else {
					$alias = CreateKeyFieldEntry (@Gatoms);
					push @globalkeyfiles, $alias;
				}
			}
		elsif ($Gatom0 eq "verbose") {
				if (lc($Gatoms[1]) eq "yes") {$Globals{verbose} = "Yes"}
				elsif (lc($Gatoms[1]) eq "screen") {$Globals{verbose} = "Screen"}
				else {
					default {$Globals{verbose} = "No"}
				}
			}
		elsif ($Gatom0 eq "warnings") {$Globals{printwarn} = (lc($Gatoms[1]) eq "no") ? 0 : 1}
		elsif ($Gatom0 eq "trace") {$Globals{tracemode} = (lc($Gatoms[1]) eq "yes") ? 1 : 0}
		elsif ($Gatom0 eq "debug") {$debugmode = uc($Gatoms[1])}
		elsif ($Gatom0 eq "dumpglobals") {$Globals{dumpglobals} = (lc($Gatoms[1]) eq "yes") ? "yes" : "no"}
		elsif ($Gatom0 eq "reorder") {$Globals{reorder_code} = (lc($Gatoms[1]) eq "yes") ? 1 : 0}
		else {
			print "Processing globals, unknown keyword: $Gatoms[0], unknown keyword value: $Gatoms[1] \n";
		}
	}

	if ($Globals{verbose} eq "Yes") {$Globals{printwarn} = 1;}

	# v1.3 fix
	if ($^O ne 'MSWin32') {
		# Assume UNIX if not MS Windows
		# UNIX uses forward slashs, so the local directory is "./"
		if ($Globals{templatepath} eq "") {$Globals{templatepath} = './';}
		if ($Globals{outputpath} eq "") {$Globals{outputpath} = './';}
		if ($Globals{datapath} eq "") {$Globals{datapath} = './';}
		if ($Globals{tempfile} eq "") {$Globals{tempfile} = './ztpl.tmp';}
	} else {
		# Windows uses back slashs, so the local directory is ".\"
		if ($Globals{templatepath} eq "") {$Globals{templatepath} = '.\\';}
		if ($Globals{outputpath} eq "") {$Globals{outputpath} = '.\\';}
		if ($Globals{datapath} eq "") {$Globals{datapath} = '.\\';}
		if ($Globals{tempfile} eq "") {$Globals{tempfile} = '.\\ztpl.tmp';}
	}

	if ($Globals{printwarn} == 1) {
		print "Preparing to generate configuration files using the following: \n";
		print "  Template File:       $Globals{template} \n";
		print "  Template Path:       $Globals{templatepath} \n";
		print "  Local Template Path: $Globals{local_templatepath} \n";
		print "  Temporary File:      $Globals{tempfile} \n";
		print "  Data File:           $Globals{data} \n";
		print "  Data Path:           $Globals{datapath} \n";
		print "  Output Path:         $Globals{outputpath} \n"; 
		print "  Output Extension:    $Globals{outputext} \n"; 
		print "  Filename Field:      $Globals{filenamefieldname} \n";
		print "  Filename Format:     $Globals{filenameformat} \n";
		print "  Filename Option:     $Globals{filenameoption} \n";
		if (@fnreal > 0) {
			$i = 0;
			for (@fnreal) {
				print "  Filename Alias:      $fnreal[$i] : $fnalias[$i] \n";
				$i ++;
			}
		}
		if ($Globals{verbose} eq "Yes") {
			print "  Verbosity:           Full \n";
		} elsif ($Globals{verbose} eq "Screen") {
			print "  Verbosity:           Screen \n";
		} else {
			print "  Verbosity:           Sparse \n";
		}
		if ($Globals{printwarn}) {
			print "  Warning output:      Yes \n";
		} else {
			print "  Warning output:      No \n";
		}
		if ($debugmode ne "NO") {
			print "  Debug mode:          $debugmode \n";
		}
		##if (@Ggvar > 0) {
		##	$i = 0;
		##	for (@Ggvar) {
		##		print "  Global Variable:    $Ggvar[$i] : $Ggval[$i] \n";
		##		$i ++;
		##	}
		##}
		while (($gvar, $gval) = each %HardGlobalVars) {
			print "  Global Variable:     $gvar : $gval \n";
		}
##		if (@keyfile > 0) {
##			$i = 0;
##			for (@keyfile) {
##				print "  Linked Files:        $keyfieldMain[$i] : $keyfile[$i] : $keyfieldSecond[$i] : $keyfileas[$i]\n";
##				$i ++;
##			}
##		}
	}

}

sub ProcessJSON {
	my @input = @{$_[0]};
	my $json_input = join ("", @input);
    my $test = substr ($json_input, 501, 30);
	my $ARCHEjson = decode_json $json_input;
	my @input_lines = ();
	my %ARCHEhash = %{$ARCHEjson};

	## Process "globals" entries
	## Insert into return array
	
	my %globalvars = %{$ARCHEhash{globals}};

	foreach my $key (keys %globalvars){
		my $value = $globalvars{$key};
		push @input_lines, "$key:$value";
	}

	## Process "main_data" entries (Main date file + keyfile records)
	## Use global variables "@variable" and "@value"

	my $mainhash = $ARCHEhash{main_data};

	for my $key (keys %{$mainhash} ){
		my $value = $$mainhash{$key};
		push @variable, $key;
		push @value, $value;
	}
	
	## Process remaining groups as clusters of "Each" file records

	foreach my $key (keys %ARCHEhash) {
		if (($key ne "globals") && ($key ne "main_data")) {
			push @each_files, $key;
		}
	}

	foreach my $efile (@each_files) {
	
		## The following code does the following:
		##   1) It converts the JSON format data into a tab separated set of records
		##   2) It makes sure that field headers are the first line in the file
		##   3) It makes sure that all fields are included even if one JSON record is sparse
		##   4) It creates data records for the balance of the data
		
		my @each_records = @{$ARCHEhash{$efile}};
		my %eheader;
		my @efields = ();
		my $fieldnum = 0;
		my @erecords = ();
		my $epos;
		foreach my $erecord (@each_records) {
			for my $ekey (keys %{$erecord} ){
				my $evalue = $$erecord{$ekey};
				if (exists $eheader{$ekey}) {
					$epos = $eheader{$ekey};
				} else {
					$eheader{$ekey} = $fieldnum;
					$epos = $fieldnum;
					$fieldnum ++;
				}
				$efields [$epos] = $evalue;
			}
			push @erecords, join ("\t", @efields);
		}
		@efields = ();
		while ((my $ekey, my $evalue) = each %eheader) {
			$efields [$evalue] = $ekey;
		}
		my $line = join ("\t", @efields);
		unshift (@erecords, $line);
		$each_data {$efile} = [@erecords];
	}
	
	return @input_lines

#############################################################################
###
### Need to add code to complete the saving of the main data record and the Each files
###
###
#############################################################################

	
}

sub EZOpen {
	## my ($fn, $ftype, $pwarn, $loc) = @_;
	my ($fn, $fpath1, $fpath2, $ftype, $loc) = @_;
	my $txt_fn = $fn . ".txt";
	my $new_fh = FileHandle->new();
	my $new_fn = "";
	
	if ($fpath2) {
		if (-e ($fpath2 . $fn)) {
			$new_fn = $fpath2 . $fn;
		} elsif (-e ($fpath2 . $txt_fn)) {
			$new_fn = $fpath2 . $txt_fn;
		}
	}
	
	if ($fpath1 && !($new_fn)) {
		if (-e ($fpath1 . $fn)) {
			$new_fn = $fpath1 . $fn;
		} elsif (-e ($fpath1 . $txt_fn)) {
			$new_fn = $fpath1 . $txt_fn;
		}
	}

	if (!($new_fn)) {
		if (-e ($fn)) {
			$new_fn = $fn;
		} elsif (-e ($txt_fn)) {
			$new_fn = $txt_fn;
		}
	}

	if (!(-e $new_fn)) {die "$0: filename:($fn) type: ($ftype) from ($loc) does not exist "}; 
	if (!(-r $new_fn)) {die "$0: $ftype file, $fn, does not have READ permission "};
	if (-z $new_fn) {die "$0: $ftype file, $fn, is empty"};
				
	open ($new_fh, "< $new_fn") || die "Problem opening $ftype file $fn";
	return $new_fh;
}

####################################################

sub cmd_argv_handler { push(@cmd_argv, @_); }	# tiny function to handle un-named arguments

sub validate_arguments {
	# Cmd Line Arguments Validation function, edit as Needed based on the cmd line arguments
	if ($args{version}) {version_info ()}
	if ($#cmd_argv < 0) {directions ()}
	if ($args{help} || lc($cmd_argv[0]) eq "help") {directions()}
}

sub directions {
	print "\nUsage: $0 <global-file> <optional switches>\n";
	print "\n Where:\n";
	print "  <global-file> is a text file containing program directives which will \n";
	print "    control program flow including defining the template and data files \n";
	print "    as well as directories for files, field number for filenames, and \n";
	print "    other controls such as the extension on the configuration filename.\n";
	print "\n";
	print "  Optional Switches\n";
	print "    -help \n";
	print "       Will display this message \n";
	print "    -version \n";
	print "       Will display the present program version as well as: \n";
	print "       1) A list of related /required files (packages) and \n";
	print "       2) Their required minimum version number. \n";
	exit 2
}

sub version_info {
	my $full_version = ($SUB_VERSION) ? $VERSION . "(" . $SUB_VERSION . ")" : $VERSION;
	my $full_pkg_vers;
	my $i = 0;

	print "Main program: $NAME \n";
	print "Version:      $full_version \n";
	print "Required Packages: \n";
	while (my ($pkg_name, $pkg_vers) = each %REQ_VERSIONS) {
		my $ext_pkg = $pkg_name . "::GetVersion";
		## no strict "refs";
		$full_pkg_vers = &{$ext_pkg};
		## use strict "refs";
		$i ++;
		print "  $i : $pkg_name, rev: $pkg_vers (Current package version: $full_pkg_vers)\n";
	}
	if (!$i) {
		print "  None \n";
	}
	exit 2
}

