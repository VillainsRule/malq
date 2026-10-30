import lwMessageCommons from './_constructor';

export default class tmail$fomayan$org extends lwMessageCommons {
    domainsPath = '/mailbox';
    initialPath = '/mailbox';
    refetchPath = '/mailbox';

    ignoredDomains = ['.name.ng'];

    constructor() {
        super('tmail.fomayan.org', true);
    }
}