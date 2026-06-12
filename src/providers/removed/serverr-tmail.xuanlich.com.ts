import lwMessageCommons from '../impl/lwMessage/_constructor';

export default class tmail$xuanlich$com extends lwMessageCommons {
    initialPath = '/mailbox';
    refetchPath = '/mailbox';

    password = '111111';

    constructor() {
        super('tmail.xuanlich.com', false);
    }
}