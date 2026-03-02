import lwMessageCommons from './_constructor';

export default class mailtemp$net extends lwMessageCommons {
    initialPath = '';
    refetchPath = '';

    allowsDomainChange = false;

    constructor() {
        super('mailtemp.net', false);
    }
}