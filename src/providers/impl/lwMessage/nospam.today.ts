import lwMessageCommons from './_constructor';

export default class nospam$today extends lwMessageCommons {
    domainsPath = '/';
    initialPath = '/';
    refetchPath = '/mailbox';

    constructor() {
        super('nospam.today', true);
    }
}