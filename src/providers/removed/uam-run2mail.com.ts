import laravelCommons from '../impl/laravel/_constructor';

export default class run2mail$com extends laravelCommons {
    domain = 'run2mail.com';
    messageEndpoint = 'en/get_messages';
    domainPage = '/';
    utcOffset = 1;
}