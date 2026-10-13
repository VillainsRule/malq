import lwMessageCommons from './_constructor';

export default class emailct$com extends lwMessageCommons {
    domainsPath = '/mailbox';
    initialPath = '/mailbox';
    refetchPath = '/mailbox';

    constructor() {
        super('emailct.com', false);
    }
}
