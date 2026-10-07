import lwMessageCommons from './_constructor';

export default class tmail$wibucrypto$pro extends lwMessageCommons {
    domainsPath = '/mailbox';
    initialPath = '/mailbox';
    refetchPath = '/mailbox';

    ignoredDomains = ['.name.ng'];

    constructor() {
        super('tmail.wibucrypto.pro', true);
    }
}