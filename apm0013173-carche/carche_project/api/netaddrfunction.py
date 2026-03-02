"""Define enum for netaddr functions """
from enum import Enum


class NetaddrFunctions(Enum):
    """Define template type enum class"""
    ipnetwork = 'IPNetwork'
    ipaddress = 'IPAddress'
    iprange = 'IPRange'
    ipglob = 'IPGlob'
    allmatchingcidrs = 'all_matching_cidrs'
    cidrabbrevtoverbose = 'cidr_abbrev_to_verbose'
    cidrexclude = 'cidr_exclude'
    cidrmerge = 'cidr_merge'
    iprangetocidrs = 'iprange_to_cidrs'
    iter_iprange = 'iter_iprange'
    iteruniqueips = 'iter_unique_ips'
    largestmatchingcidr = 'largest_matching_cidr'
    smallestmatchingcidr = 'smallest_matching_cidr'
    spanningcidr = 'spanning_cidr'
    eui = 'EUI'
    oui = 'OUI'
    iab = 'IAB'
    macbare = 'mac_bare'
    maccisco = 'mac_cisco'
    maceui48 = 'mac_eui48'
    macpgsql = 'mac_pgsql'
    macunix = 'mac_unix'
    validipv4 = 'valid_ipv4'
    validipv6 = 'valid_ipv6'
    validglob = 'valid_glob'
    validmac = 'valid_mac'

    @staticmethod
    def list():
        """
        This functions is create a list from the Enum NetaddrFunctions.

        Returns:
        (list):     Returning the list of NetaddrFunctions enum values.
        """
        return list(map(lambda c: c.value, NetaddrFunctions))
