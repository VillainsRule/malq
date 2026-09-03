import lwMessageCommons from './_constructor';

export default class beeinbox$com extends lwMessageCommons {
    domainsPath = '/';
    initialPath = '/';
    refetchPath = '/';

    ignoredEmails = ['no-reply@beeinbox.com'];

    constructor() {
        super('beeinbox.com', false);
    }
}